import { parseCalendar } from './calendarReader.js';
import { can } from './domain.js';
import { store } from './store.js';
import { refresh } from './router.js';
import { esc, dateTime } from './util.js';
import { openSheet, toast } from './ui.js';

export function openCalendarImport() {
    if (!can(store.user, 'appointments.write')) return;
    openSheet({
        title: 'Importar de outra agenda',
        html: `<p class="muted">No Google Agenda pelo computador, abra Configurações → Importar e exportar → Exportar. Extraia o ZIP e escolha um arquivo .ics. Você pode transferir esse arquivo para o celular.</p>
            <p class="hint-text" style="margin-top:8px">O app Google Agenda não exporta arquivos. A leitura direta da conta Google ficará disponível quando a integração OAuth for configurada.</p>
            <div class="field" style="margin-top:16px"><label for="calendar-file">Arquivo de calendário (até 2 MB)</label><input class="input" id="calendar-file" type="file" accept=".ics,text/calendar"></div>
            <p id="calendar-error" class="error-text" role="alert" hidden></p><div id="calendar-results" class="list" style="margin-top:12px"></div>`,
        mount(sheet, close) {
            sheet.querySelector('#calendar-file').addEventListener('change', async (event) => {
                const file = event.target.files[0];
                const results = sheet.querySelector('#calendar-results');
                const error = sheet.querySelector('#calendar-error');
                results.replaceChildren();
                error.hidden = true;
                if (!file) return;
                try {
                    if (!/\.ics$/i.test(file.name) || file.size > 2_000_000)
                        throw new Error('Escolha um arquivo .ics de até 2 MB. Extraia arquivos ZIP antes de importar.');
                    const parsed = await parseCalendar(await file.text());
                    error.textContent = parsed.warnings.join(' ');
                    error.hidden = !parsed.warnings.length;
                    results.innerHTML = parsed.events.length
                        ? parsed.events
                              .map(
                                  (item, index) =>
                                      `<button class="choice" type="button" data-event="${index}"><span class="grow">${esc(item.title)}<small>${esc(dateTime(item.start))}</small></span><span>Revisar</span></button>`,
                              )
                              .join('')
                        : '<p>Nenhum evento com horário no período de um ano atrás até dois anos à frente.</p>';
                    results.querySelectorAll('[data-event]').forEach((button) =>
                        button.addEventListener('click', () => {
                            close();
                            reviewEvent(parsed.events[Number(button.dataset.event)]);
                        }),
                    );
                } catch (problem) {
                    error.textContent = problem.message;
                    error.hidden = false;
                }
            });
        },
    });
}

function reviewEvent(event) {
    const state = store.state;
    const duplicate = state.appointments.some(
        (item) => item.externalKey === event.key || event.key === `atendimento-${item.id}@agenda-contabil`,
    );
    const options = (items, selected) =>
        items
            .map(
                (item) =>
                    `<option value="${esc(item.id ?? item.slug)}" ${String(item.id ?? item.slug) === String(selected) ? 'selected' : ''}>${esc(item.name)}</option>`,
            )
            .join('');
    openSheet({
        title: 'Revisar evento',
        html: `<p><b>${esc(event.title)}</b></p><p class="muted">${esc(dateTime(event.start))} – ${esc(dateTime(event.end))}</p>
            <p class="hint-text">O evento só vira atendimento depois que você escolher o atendido, serviço e responsável. Os conflitos de horário serão verificados ao salvar.</p>
            <form class="form" id="calendar-review" style="margin-top:16px">
                <div class="field"><label for="import-client">Atendido</label><select class="select" id="import-client" required><option value="">Selecione</option>${options(state.clients.filter((item) => item.active))}</select></div>
                <div class="field"><label for="import-service">Serviço</label><select class="select" id="import-service" required><option value="">Selecione</option>${options(state.services.filter((item) => item.active).map((item) => ({ ...item, id: item.slug })))}</select></div>
                <div class="field"><label for="import-responsible">Responsável</label><select class="select" id="import-responsible" required>${options(
                    state.users.filter((item) => item.active && item.role !== 'viewer'),
                    store.user.id,
                )}</select></div>
                <p class="error-text" id="import-error" role="alert" ${duplicate ? '' : 'hidden'}>${duplicate ? 'Este evento já foi importado.' : ''}</p>
                <button class="btn btn-primary btn-block" type="submit" ${duplicate ? 'disabled' : ''}>Importar atendimento</button>
            </form>`,
        mount(sheet, close) {
            const form = sheet.querySelector('#calendar-review');
            form.addEventListener('submit', async (submitEvent) => {
                submitEvent.preventDefault();
                const button = form.querySelector('[type=submit]');
                if (button.disabled || !form.reportValidity()) return;
                button.disabled = true;
                try {
                    await store.action('scheduleAppointment', {
                        clientId: Number(form.querySelector('#import-client').value),
                        serviceSlug: form.querySelector('#import-service').value,
                        responsibleId: Number(form.querySelector('#import-responsible').value),
                        serviceDetails: event.title,
                        notes: [event.title, event.description].filter(Boolean).join('\n').slice(0, 2000),
                        start: event.start,
                        end: event.end,
                        location: event.location,
                        externalKey: event.key,
                    });
                    close();
                    refresh();
                    toast('Evento importado como atendimento.');
                } catch (error) {
                    const box = form.querySelector('#import-error');
                    box.textContent = error.message;
                    box.hidden = false;
                } finally {
                    button.disabled = false;
                }
            });
        },
    });
}
