const KEY = 'agenda-contabil.theme';
const query = window.matchMedia('(prefers-color-scheme: dark)');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const REVEAL_MS = 600;
const REVEAL_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

export const getPreference = () => {
    try {
        return localStorage.getItem(KEY) || 'auto';
    } catch {
        return 'auto';
    }
};

const resolve = () => {
    const preference = getPreference();
    return preference === 'dark' || (preference === 'auto' && query.matches) ? 'dark' : 'light';
};

const paint = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c1815' : '#f6f1e9');
};

function reveal(theme, origin) {
    const root = document.documentElement;
    const { left, top, width, height } = origin.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add('theme-transition');
    const transition = document.startViewTransition(() => paint(theme));

    transition.ready.then(
        () =>
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                { duration: REVEAL_MS, easing: REVEAL_EASING, pseudoElement: '::view-transition-new(root)' },
            ),
        () => {},
    );
    transition.finished.finally(() => root.classList.remove('theme-transition'));
}

export function applyTheme(origin = null) {
    const theme = resolve();
    const animate = origin !== null && 'startViewTransition' in document && !reduced() && document.documentElement.dataset.theme !== theme;

    if (animate) reveal(theme, origin);
    else paint(theme);
}

export function setPreference(value, origin = null) {
    try {
        localStorage.setItem(KEY, value);
    } catch {}
    applyTheme(origin);
}

query.addEventListener('change', () => applyTheme());
