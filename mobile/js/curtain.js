const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = () => document.getElementById('app');

const FAREWELL_MS = 1700;

const LOGO = `<svg class="curtain-logo" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g class="logo-arrows"><path d="M7.1 17.8A18 18 0 0 1 40.9 17.8M37.1 14.6L40.9 17.8L41.8 12.9"/><path d="M40.9 30.2A18 18 0 0 1 7.1 30.2M10.9 33.4L7.1 30.2L6.2 35.1"/></g>
    <path class="logo-coin" d="M28.6 18.6c-.9-1.5-2.6-2.4-4.6-2.4-2.7 0-4.6 1.4-4.6 3.5 0 4.8 9.6 2.6 9.6 7.9 0 2.2-2.1 3.8-5 3.8-2.2 0-4.1-.9-5-2.6M24 13v22"/>
</svg>`;

export const originOf = (element) => {
    const box = app().getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return [rect.left + rect.width / 2 - box.left, rect.top + rect.height / 2 - box.top];
};

const build = (phase, title, subtitle, origin) => {
    const curtain = document.createElement('div');
    curtain.className = `curtain curtain--${phase}`;
    curtain.setAttribute('role', 'status');
    curtain.setAttribute('aria-live', 'polite');
    if (origin) {
        curtain.style.setProperty('--origin-x', `${origin[0]}px`);
        curtain.style.setProperty('--origin-y', `${origin[1]}px`);
    }

    const text = document.createElement('div');
    text.className = 'curtain-content';
    text.innerHTML = `${LOGO}<p class="curtain-title"></p><p class="curtain-subtitle"></p>`;
    text.querySelector('.curtain-title').textContent = title;
    text.querySelector('.curtain-subtitle').textContent = subtitle;
    curtain.append(text);

    app().append(curtain);
    return curtain;
};

export function playWelcome(name, origin) {
    if (reduced()) return;

    const curtain = build('welcome', `Olá, ${name}`, 'Sua agenda está pronta.', origin);
    app().classList.add('is-welcoming');
    let fallback;

    const finish = () => {
        clearTimeout(fallback);
        curtain.remove();
        app().classList.remove('is-welcoming');
    };

    curtain.addEventListener('animationend', (event) => {
        if (event.animationName === 'curtain-leave') finish();
    });
    curtain.addEventListener('click', finish);
    fallback = setTimeout(finish, 3400);
}

export function playFarewell(name, origin, leave) {
    if (reduced()) {
        leave();
        return;
    }

    const farewell = build('farewell', `Até logo, ${name}`, 'Encerrando sua sessão com segurança…', origin);
    let done = false;

    const go = () => {
        if (done) return;
        done = true;
        leave();
        farewell.remove();

        const goodbye = build('signedout', 'Sessão encerrada', 'Seus dados continuam protegidos.');
        goodbye.addEventListener('animationend', (event) => {
            if (event.animationName === 'curtain-leave') goodbye.remove();
        });
        goodbye.addEventListener('click', () => goodbye.remove());
        setTimeout(() => goodbye.remove(), 2400);
    };

    farewell.addEventListener('click', go);
    window.setTimeout(go, FAREWELL_MS);
}
