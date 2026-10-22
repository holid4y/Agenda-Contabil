import { watchViewport } from './viewport.js';
import { config } from './config.js';
import { applyTheme } from './theme.js';
import { route, start } from './router.js';
import { icon } from './ui.js';
import agenda from './views/agenda.js';
import appointmentDetail from './views/appointment.js';
import { clientDetail, clientForm, clientList } from './views/clients.js';
import home from './views/home.js';
import impact from './views/impact.js';
import login from './views/login.js';
import newAppointment from './views/newAppointment.js';
import services from './views/services.js';

if (window.Capacitor?.isNativePlatform?.()) document.documentElement.classList.add('is-native');
watchViewport();
applyTheme();

route('/login', login, { public: true });
route('/', home, { tab: 'home' });
route('/agenda', agenda, { tab: 'agenda' });
route('/atendidos', clientList, { tab: 'clients' });
route('/atendidos/novo', clientForm);
route('/atendidos/:id', clientDetail);
route('/atendidos/:id/editar', clientForm);
route('/atendimentos/novo', newAppointment);
route('/atendimentos/:id', appointmentDetail);
route('/impacto', impact, { tab: 'impact' });
route('/servicos', services);

document.getElementById('tabbar').innerHTML = `
    <a class="tab" href="#/" data-tab="home">${icon('home')}Início</a>
    <a class="tab" href="#/agenda" data-tab="agenda">${icon('calendar')}Agenda</a>
    <a class="tab-new" href="#/atendimentos/novo" aria-label="Novo atendimento">${icon('plus')}</a>
    <a class="tab" href="#/atendidos" data-tab="clients">${icon('users')}Atendidos</a>
    <a class="tab" href="#/impacto" data-tab="impact">${icon('chart')}Impacto</a>`;

start(document.getElementById('view'));

if (config.mode === 'demo' && !window.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
