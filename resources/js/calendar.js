import { calendarFile } from '../../mobile/js/calendar.js';
import { parseCalendar } from '../../mobile/js/calendarReader.js';

const key = 'agenda-calendar-draft';
const wallTime = (timestamp) => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(timestamp)
            .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
};

export function mountCalendarTools(Livewire) {
    document.querySelectorAll('[data-calendar-event]').forEach((root) => {
        if (root.dataset.ready) return;
        root.dataset.ready = 'true';

        root.querySelector('[data-calendar-download]').addEventListener('click', () => {
            const event = JSON.parse(root.dataset.calendarEvent);
            const url = URL.createObjectURL(new Blob([calendarFile(event)], { type: 'text/calendar;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'atendimento.ics';
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    });
    document.querySelectorAll('[data-calendar-import]').forEach((root) => {
        if (root.dataset.ready) return;
        root.dataset.ready = 'true';
        root.querySelector('[data-calendar-file]').addEventListener('change', async (event) => {
            const error = root.querySelector('[data-calendar-error]');
            const results = root.querySelector('[data-calendar-results]');
            error.hidden = true;
            results.replaceChildren();
            const file = event.target.files[0];
            if (!file) return;
            try {
                if (!/\.ics$/i.test(file.name) || file.size > 2_000_000)
                    throw new Error('Selecione um arquivo .ics de até 2 MB. Extraia arquivos ZIP antes de importar.');
                const parsed = await parseCalendar(await file.text(), { timeZone: 'America/Sao_Paulo' });
                error.textContent = parsed.warnings.join(' ');
                error.hidden = !parsed.warnings.length;
                if (!parsed.events.length)
                    results.textContent =
                        'Nenhum evento com horário no período de um ano atrás até dois anos à frente.';
                for (const item of parsed.events) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className =
                        'press block w-full rounded-xl border border-line bg-surface p-3 text-left text-sm';
                    button.textContent = `${item.title} · ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(item.start)} · Revisar`;
                    button.addEventListener('click', () => {
                        if (document.documentElement.dataset.preview !== undefined) {
                            error.hidden = false;
                            error.textContent =
                                'Esta prévia web é somente leitura. Para importar no demo interativo, abra a versão mobile em /app/ e use o mesmo arquivo.';
                            return;
                        }
                        sessionStorage.setItem(
                            key,
                            JSON.stringify({ ...item, start: wallTime(item.start), end: wallTime(item.end) }),
                        );
                        window.location.assign(`${root.dataset.createUrl}?calendar_import=1`);
                    });
                    results.append(button);
                }
            } catch (problem) {
                error.textContent = problem.message;
                error.hidden = false;
            }
        });
    });
    if (
        new URLSearchParams(location.search).get('calendar_import') === '1' &&
        document.querySelector('[data-calendar-draft]')
    ) {
        try {
            const draft = JSON.parse(sessionStorage.getItem(key) ?? 'null');
            if (draft) {
                Livewire.dispatch('calendar-import', { draft });
                sessionStorage.removeItem(key);
            }
        } catch {
            sessionStorage.removeItem(key);
        }
    }
}
