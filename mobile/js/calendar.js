import ICAL from './vendor/ical.js';

const utc = (value) =>
    new Date(value)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, 'Z');
const escapeText = (value) =>
    String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\r\n|\r|\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

export function googleCalendarUrl(event) {
    if (!Number.isFinite(event.start) || !Number.isFinite(event.end) || event.end <= event.start)
        throw new Error('Horário inválido para exportar.');
    const query = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${utc(event.start)}/${utc(event.end)}`,
        details: event.description ?? '',
        location: event.location ?? '',
        ctz: 'America/Sao_Paulo',
    });
    return `https://calendar.google.com/calendar/render?${query}`;
}

export function calendarFile(event) {
    googleCalendarUrl(event);
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Agenda Contabil//PT-BR',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${escapeText(event.uid)}`,
        `DTSTAMP:${utc(Date.now())}`,
        `DTSTART:${utc(event.start)}`,
        `DTEND:${utc(event.end)}`,
        `SUMMARY:${escapeText(event.title)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        `LOCATION:${escapeText(event.location)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];
    return (
        lines
            .map((line) => {
                const parts = [];
                let current = '',
                    bytes = 0;
                for (const char of line) {
                    const length = new TextEncoder().encode(char).length;
                    if (bytes + length > 73) {
                        parts.push(current);
                        current = ' ';
                        bytes = 1;
                    }
                    current += char;
                    bytes += length;
                }
                return [...parts, current].join('\r\n');
            })
            .join('\r\n') + '\r\n'
    );
}

function wallInstant(time, zone) {
    const target = Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    let candidate = target;
    for (let attempt = 0; attempt < 4; attempt++) {
        const parts = Object.fromEntries(formatter.formatToParts(candidate).map((part) => [part.type, part.value]));
        const represented = Date.UTC(
            +parts.year,
            +parts.month - 1,
            +parts.day,
            +parts.hour,
            +parts.minute,
            +parts.second,
        );
        if (represented === target) return candidate;
        candidate += target - represented;
    }
    throw new Error('Horário inexistente no fuso do evento.');
}

function instant(time, property, defaultZone) {
    const zone = property?.getParameter('tzid') ?? defaultZone;
    return !zone || time.zone.tzid !== 'floating' ? time.toJSDate().getTime() : wallInstant(time, zone);
}

export function readCalendar(text, now = Date.now(), defaultZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
    if (new TextEncoder().encode(text).length > 2_000_000) throw new Error('O arquivo deve ter no máximo 2 MB.');
    const from = now - 366 * 86400000,
        to = now + 2 * 366 * 86400000;
    const events = [],
        warnings = [];
    ICAL.TimezoneService.reset();
    try {
        const calendar = new ICAL.Component(ICAL.parse(text));
        if (calendar.name !== 'vcalendar') throw new Error('Selecione um arquivo de calendário .ics válido.');
        for (const zone of calendar.getAllSubcomponents('vtimezone'))
            ICAL.TimezoneService.register(new ICAL.Timezone({ component: zone }));
        const components = calendar.getAllSubcomponents('vevent');
        if (components.length > 2000) throw new Error('O arquivo tem eventos demais. Exporte uma agenda menor.');
        for (const component of components) {
            for (const property of component.getAllProperties()) {
                const name = property.getParameter('tzid');
                if (!name || ICAL.TimezoneService.get(name)) continue;
                try {
                    new Intl.DateTimeFormat('en-GB', { timeZone: name }).format(0);
                    const zone = new ICAL.Timezone({ tzid: name });
                    zone.utcOffset = (time) => (Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute, time.second) - wallInstant(time, name)) / 1000;
                    ICAL.TimezoneService.register(zone);
                } catch {
                    warnings.push(`Fuso não reconhecido: ${name}.`);
                }
            }
        }
        const seen = new Set();
        for (const component of components) {
            if (component.hasProperty('recurrence-id')) continue;
            try {
                const event = new ICAL.Event(component);
                for (const exception of components.filter(
                    (other) => other.getFirstPropertyValue('uid') === event.uid && other.hasProperty('recurrence-id'),
                ))
                    event.relateException(new ICAL.Event(exception));
                if (!event.uid || event.uid.length > 512 || event.startDate.isDate)
                    throw new Error(
                        'Eventos sem identificador ou de dia inteiro precisam ser cadastrados manualmente.',
                    );
                if (component.getFirstPropertyValue('status') === 'CANCELLED') continue;
                const iterator = event.iterator();
                let count = 0,
                    occurrence;
                while ((occurrence = iterator.next())) {
                    if (++count > 10000 || events.length >= 500)
                        throw new Error('Limite de ocorrências atingido; exporte um período menor.');
                    const detail = event.getOccurrenceDetails(occurrence);
                    const source = detail.item.component;
                    const start = instant(
                        detail.startDate,
                        source.getFirstProperty('dtstart') ?? component.getFirstProperty('dtstart'),
                        defaultZone,
                    );
                    const end = instant(
                        detail.endDate,
                        source.getFirstProperty('dtend') ??
                            source.getFirstProperty('dtstart') ??
                            component.getFirstProperty('dtstart'),
                        defaultZone,
                    );
                    if (instant(occurrence, component.getFirstProperty('dtstart'), defaultZone) > to) break;
                    if (start > to) continue;
                    if (source.getFirstPropertyValue('status') === 'CANCELLED') continue;
                    if (start < from) continue;
                    if (!(end > start) || end - start > 8 * 3600000)
                        throw new Error('Evento sem horário final válido ou com duração maior que 8 horas.');
                    const key = event.isRecurring() ? `${event.uid}|${occurrence.toString()}` : event.uid;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    events.push({
                        key,
                        title: (detail.item.summary || 'Evento sem título').slice(0, 255),
                        description: (detail.item.description ?? '').slice(0, 2000),
                        location: (detail.item.location ?? '').slice(0, 255),
                        start,
                        end,
                    });
                }
            } catch (error) {
                warnings.push(error.message);
            }
        }
        return { events: events.sort((a, b) => a.start - b.start), warnings: [...new Set(warnings)] };
    } catch (error) {
        throw new Error(
            error.message?.includes('arquivo')
                ? error.message
                : 'Não foi possível ler o calendário. Confira o arquivo .ics e tente novamente.',
        );
    } finally {
        ICAL.TimezoneService.reset();
    }
}

export function appointmentEvent(state, appointment) {
    const client = state.clients.find((item) => item.id === appointment.clientId);
    const service = state.services.find((item) => item.slug === appointment.serviceSlug);
    return {
        uid: `atendimento-${appointment.id}@agenda-contabil`,
        title: `${service.name} · ${client.name}`,
        start: appointment.start,
        end: appointment.end,
        location: appointment.location ?? '',
        description: 'Atendimento da Agenda Contábil. Confira os detalhes e documentos na plataforma.',
    };
}
