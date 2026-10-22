import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCalendar, calendarFile, googleCalendarUrl } from '../js/calendar.js';
import { phoneNumber, emailLink, emailAddress, whatsappLink } from '../js/contacts.js';
import { buildSeed } from '../js/seed.js';
import { scheduleAppointment } from '../js/domain.js';

const now = Date.parse('2026-10-22T12:00:00Z');
const wrap = (body) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
const event = (body) => `BEGIN:VEVENT\r\nUID:google-event-1\r\n${body}\r\nEND:VEVENT`;

test('validates Brazilian and explicit international numbers without inventing a country code', () => {
    assert.equal(phoneNumber('(51) 99125-1538'), '5551991251538');
    assert.equal(phoneNumber('+55 (51) 99125-1538'), '5551991251538');
    assert.equal(phoneNumber('(51) 3595-2211'), '555135952211');
    assert.equal(phoneNumber('+1 415 555 2671'), '14155552671');
    for (const invalid of [
        '',
        '1234',
        '00000000000',
        '(20) 99999-9999',
        '(51) 12345-6789',
        '+55 912345678',
        'abc51991251538',
        '+55+51991251538',
    ]) {
        assert.equal(phoneNumber(invalid), null, invalid);
        assert.equal(whatsappLink(invalid), null);
    }
});

test('email links encode message content and reject malformed addresses and header injection', () => {
    assert.equal(emailAddress(' equipe+teste@example.com '), 'equipe+teste@example.com');
    for (const invalid of [
        '',
        'sem-arroba',
        'a@-example.com',
        'a..b@example.com',
        'a@example.com?bcc=outro@example.com',
        'a@example.com\r\nBcc:evil@example.com',
    ])
        assert.equal(emailLink(invalid), null);
    const link = emailLink('ana@example.com', 'Olá & teste', 'Linha 1\nLinha 2');
    assert.ok(link.startsWith('mailto:ana%40example.com?'));
    assert.equal(new URLSearchParams(link.split('?')[1]).get('body'), 'Linha 1\nLinha 2');
});

test('exports UTC timestamps, escaped Unicode and folded lines that can be imported again', () => {
    const input = {
        uid: 'agenda-test',
        title: 'João, organização; teste',
        description: 'Primeira linha\n' + 'ç'.repeat(100),
        location: 'Sala 205',
        start: now + 86400000,
        end: now + 90000000,
    };
    const text = calendarFile(input);
    assert.ok(text.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75));
    const parsed = readCalendar(text, now);
    assert.deepEqual(parsed.warnings, []);
    assert.equal(parsed.events[0].title, input.title);
    assert.equal(parsed.events[0].description, input.description);
    assert.equal(parsed.events[0].start, input.start);
    const google = new URL(googleCalendarUrl(input));
    assert.equal(google.hostname, 'calendar.google.com');
    assert.equal(google.searchParams.get('text'), input.title);
    assert.equal(google.searchParams.get('dates'), '20261023T120000Z/20261023T130000Z');
});

test('imports Google IANA timezones even when VTIMEZONE is absent', () => {
    const result = readCalendar(
        wrap(
            event(
                'DTSTART;TZID=America/Sao_Paulo:20261023T090000\r\nDTEND;TZID=America/Sao_Paulo:20261023T100000\r\nSUMMARY:Reunião',
            ),
        ),
        now,
    );
    assert.deepEqual(result.warnings, []);
    assert.equal(result.events[0].start, Date.parse('2026-10-23T12:00:00Z'));
});

test('an IANA start and UTC end preserve the original elapsed duration', () => {
    const result = readCalendar(wrap(event('DTSTART;TZID=Europe/Berlin:20261023T090000\r\nDTEND:20261023T080000Z')), now, 'America/Sao_Paulo');
    assert.deepEqual(result.warnings, []);
    assert.equal(result.events[0].start, Date.parse('2026-10-23T07:00:00Z'));
    assert.equal(result.events[0].end, Date.parse('2026-10-23T08:00:00Z'));
});

test('an exception moved beyond the import window does not hide later original occurrences', () => {
    const start = Date.UTC(2026, 9, 22, 12);
    const series = event('DTSTART:20281021T120000Z\r\nDTEND:20281021T130000Z\r\nRRULE:FREQ=DAILY;COUNT=3');
    const exception = event('RECURRENCE-ID:20281021T120000Z\r\nDTSTART:20281025T120000Z\r\nDTEND:20281025T130000Z');
    const result = readCalendar(wrap(series + '\r\n' + exception), start);
    assert.deepEqual(result.events.map((item) => new Date(item.start).toISOString().slice(0, 10)), ['2028-10-22', '2028-10-23']);
});

test('expands recurrence and excludes dates without duplicating repeated components', () => {
    const body = event(
        'DTSTART:20261023T120000Z\r\nDTEND:20261023T130000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:20261024T120000Z\r\nSUMMARY:Reunião',
    );
    const result = readCalendar(wrap(`${body}\r\n${body}`), now);
    assert.equal(result.events.length, 2);
    assert.notEqual(result.events[0].key, result.events[1].key);
});

test('skips cancelled and all-day events and rejects oversized or invalid files', () => {
    assert.equal(
        readCalendar(wrap(event('DTSTART:20261023T120000Z\r\nDTEND:20261023T130000Z\r\nSTATUS:CANCELLED')), now).events
            .length,
        0,
    );
    const allDay = readCalendar(wrap(event('DTSTART;VALUE=DATE:20261023\r\nDTEND;VALUE=DATE:20261024')), now);
    assert.equal(allDay.events.length, 0);
    assert.ok(allDay.warnings.length);
    assert.throws(() => readCalendar('invalid'), /calendário/);
    assert.throws(() => readCalendar('x'.repeat(2_000_001)), /2 MB/);
});

test('imported appointments use normal authorization, conflicts and duplicate checks', () => {
    const state = buildSeed();
    const input = {
        clientId: state.clients[0].id,
        serviceSlug: state.services.find((s) => s.active && !s.requiresDetails).slug,
        responsibleId: state.users[0].id,
        start: now + 300 * 86400000,
        end: now + 300 * 86400000 + 3600000,
        externalKey: 'google-original-uid',
    };
    const created = scheduleAppointment(state, state.users[0], input);
    assert.equal(created.externalKey, input.externalKey);
    assert.throws(
        () =>
            scheduleAppointment(state, state.users[0], {
                ...input,
                start: input.start + 86400000,
                end: input.end + 86400000,
            }),
        /já foi importado/,
    );
    assert.throws(
        () =>
            scheduleAppointment(
                state,
                state.users.find((u) => u.role === 'viewer'),
                { ...input, externalKey: 'other' },
            ),
        /permissão/,
    );
});

test('floating events can use the web timezone and embedded timezone definitions are honored', () => {
    const floating = readCalendar(wrap(event('DTSTART:20261023T090000\r\nDTEND:20261023T100000')), now, 'America/Sao_Paulo');
    assert.equal(floating.events[0].start, Date.parse('2026-10-23T12:00:00Z'));
    const zone = 'BEGIN:VTIMEZONE\r\nTZID:Custom/Test\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:-0300\r\nTZOFFSETTO:-0300\r\nEND:STANDARD\r\nEND:VTIMEZONE';
    const embedded = readCalendar(wrap(zone + '\r\n' + event('DTSTART;TZID=Custom/Test:20261023T090000\r\nDTEND;TZID=Custom/Test:20261023T100000')), now);
    assert.deepEqual(embedded.warnings, []);
    assert.equal(embedded.events[0].start, Date.parse('2026-10-23T12:00:00Z'));
});

test('recurrence overrides preserve original occurrence identity and adjusted times', () => {
    const series = event('DTSTART:20261023T120000Z\r\nDTEND:20261023T130000Z\r\nRRULE:FREQ=DAILY;COUNT=2');
    const override = event('RECURRENCE-ID:20261024T120000Z\r\nDTSTART:20261024T150000Z\r\nDTEND:20261024T160000Z\r\nSUMMARY:Alterado');
    const result = readCalendar(wrap(series + '\r\n' + override), now);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.events.length, 2);
    assert.equal(result.events[1].start, Date.parse('2026-10-24T15:00:00Z'));
    assert.equal(result.events[1].title, 'Alterado');
    assert.match(result.events[1].key, /12:00:00/);
});
