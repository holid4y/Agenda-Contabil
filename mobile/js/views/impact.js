import { STATUS, STATUS_ORDER } from '../data.js';
import { openProfile } from '../profile.js';
import { indicators, indicatorsCsv } from '../queries.js';
import { refresh } from '../router.js';
import { avatar, icon, toast } from '../ui.js';
import { addDays, addMonths, dateFull, dayKey, downloadFile, esc, fromDayKey, startOfDay, startOfMonth } from '../util.js';

const PERIODS = [
    ['month', 'Este mês'],
    ['quarter', '3 meses'],
    ['semester', '6 meses'],
    ['custom', 'Datas'],
];

const view = { period: 'quarter', from: null, to: null };

const periodRange = () => {
    const now = Date.now();
    const monthStart = startOfMonth(now);
    const end = addDays(startOfDay(now), 1);

    if (view.period === 'month') return { from: monthStart, to: addMonths(monthStart, 1) };
    if (view.period === 'quarter') return { from: addMonths(monthStart, -2), to: end };
    if (view.period === 'semester') return { from: addMonths(monthStart, -5), to: end };
    return {
        from: view.from ? fromDayKey(view.from) : addMonths(monthStart, -2),
        to: view.to ? addDays(fromDayKey(view.to), 1) : end,
    };
};

const periodLabel = ({ from, to }) => `${dateFull(from)} a ${dateFull(to - 86_400_000)}`;

const bars = (items, tone = 'primary') => {
    const max = Math.max(1, ...items.map((i) => i.count));
    return `<div class="bars">${items
        .map((i) => `<div class="tone-${tone}"><div class="bar-label"><span>${esc(i.name)}</span><b>${i.count}</b></div><div class="bar-track"><div class="bar-fill" style="width:${(i.count / max) * 100}%"></div></div></div>`)
        .join('')}</div>`;
};

export default function impact({ state, user }) {
    const range = periodRange();
    const data = indicators(state, range);
    const rate = data.attendanceRate === null ? '—' : `${Math.round(data.attendanceRate * 100)}%`;
    const types = data.individuals + data.organizations;
    const pctIndividual = types ? (data.individuals / types) * 100 : 0;
    const maxMonth = Math.max(1, ...data.peopleByMonth.map((m) => m.count));

    return {
        html: `<header class="appbar">
                <h1>Impacto</h1>
                <button class="icon-btn" type="button" id="profile" aria-label="Perfil e configurações" style="width:auto">${avatar(user.name)}</button>
            </header>
            <p class="muted" style="margin-bottom:12px">Indicadores do projeto para os relatórios.</p>

            <div class="seg" role="group" aria-label="Período">
                ${PERIODS.map(([value, text]) => `<button type="button" data-period="${value}" aria-pressed="${view.period === value}">${text}</button>`).join('')}
            </div>

            ${
                view.period === 'custom'
                    ? `<div class="field-row" style="margin-top:12px">
                        <div class="field"><label for="from">De</label><input class="input" id="from" type="date" value="${view.from ?? dayKey(range.from)}"></div>
                        <div class="field"><label for="to">Até</label><input class="input" id="to" type="date" value="${view.to ?? dayKey(range.to - 86_400_000)}"></div>
                    </div>`
                    : ''
            }
            <p class="hint-text" style="margin:10px 2px 14px">${esc(periodLabel(range))}</p>

            <section class="stats rise">
                <div class="stat tone-primary"><b>${data.total}</b><span>atendimentos no período</span></div>
                <div class="stat tone-moss"><b>${data.uniqueClients}</b><span>pessoas atendidas (únicas)</span></div>
                <div class="stat tone-bark"><b>${data.status.completed}</b><span>concluídos</span></div>
                <div class="stat tone-ochre"><b>${rate}</b><span>taxa de comparecimento</span></div>
            </section>

            <section class="card" style="margin-top:12px">
                <div class="card-head"><h2>Pessoas atendidas por mês</h2></div>
                <div class="columns" role="img" aria-label="${esc(data.peopleByMonth.map((m) => `${m.label}: ${m.count}`).join(', '))}">
                    ${data.peopleByMonth.map((m) => `<div class="column"><b>${m.count}</b><i style="height:${(m.count / maxMonth) * 100}px"></i><span>${esc(m.label)}</span></div>`).join('')}
                </div>
            </section>

            <section class="card">
                <div class="card-head"><h2>Pessoa física e jurídica</h2></div>
                <div class="split" role="img" aria-label="${data.individuals} pessoas físicas e ${data.organizations} pessoas jurídicas">
                    <i style="width:${pctIndividual}%;background:var(--primary)"></i><i style="width:${100 - pctIndividual}%;background:var(--ochre)"></i>
                </div>
                <div class="legend">
                    <span style="--tone:var(--primary)">Pessoa física: <b>${data.individuals}</b></span>
                    <span style="--tone:var(--ochre)">Pessoa jurídica: <b>${data.organizations}</b></span>
                </div>
                <div class="stats" style="margin-top:14px">
                    <div class="stat tone-clay"><b>${data.mei}</b><span>atendimentos de MEI</span></div>
                    <div class="stat tone-moss"><b>${data.thirdSector}</b><span>ONGs e terceiro setor</span></div>
                </div>
            </section>

            <section class="card">
                <div class="card-head"><h2>Demandas mais frequentes</h2></div>
                ${data.topDemands.length ? bars(data.topDemands) : '<p class="muted">Nenhum atendimento no período.</p>'}
            </section>

            <section class="card">
                <div class="card-head"><h2>Atendimentos por responsável</h2></div>
                ${data.byResponsible.length ? bars(data.byResponsible, 'moss') : '<p class="muted">Nenhum atendimento no período.</p>'}
            </section>

            <section class="card">
                <div class="card-head"><h2>Por situação</h2></div>
                <div class="bars">${STATUS_ORDER.map((s) => `<div class="tone-${STATUS[s].tone}"><div class="bar-label"><span>${STATUS[s].label}</span><b>${data.status[s]}</b></div><div class="bar-track"><div class="bar-fill" style="width:${data.total ? (data.status[s] / data.total) * 100 : 0}%"></div></div></div>`).join('')}</div>
            </section>

            <button class="btn btn-secondary btn-block" type="button" id="export" style="margin-top:14px">${icon('download')}Exportar em CSV</button>`,

        mount(root) {
            root.querySelector('#profile').addEventListener('click', openProfile);

            root.querySelectorAll('[data-period]').forEach((button) =>
                button.addEventListener('click', () => {
                    view.period = button.dataset.period;
                    refresh();
                }),
            );

            root.querySelector('#from')?.addEventListener('change', (event) => {
                view.from = event.target.value || null;
                refresh();
            });
            root.querySelector('#to')?.addEventListener('change', (event) => {
                view.to = event.target.value || null;
                refresh();
            });

            root.querySelector('#export').addEventListener('click', async () => {
                const labels = { period: periodLabel(range), status: Object.fromEntries(STATUS_ORDER.map((s) => [s, STATUS[s].label])) };
                try {
                    await downloadFile(`impacto-${dayKey(range.from)}-a-${dayKey(range.to - 86_400_000)}.csv`, indicatorsCsv(state, range, labels));
                    toast('Arquivo CSV gerado.');
                } catch {
                    toast('Não foi possível exportar o arquivo. Tente novamente.');
                }
            });
        },
    };
}

