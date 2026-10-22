export function watchViewport() {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let width = window.innerWidth;
    let fullHeight = window.innerHeight;

    const update = () => {
        frame = 0;
        if (viewport && Math.abs(viewport.scale - 1) > 0.05) return;

        const active = document.activeElement;
        const editing = active?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
        const height = viewport?.height ?? window.innerHeight;

        if (width !== window.innerWidth || !editing) {
            width = window.innerWidth;
            fullHeight = window.innerHeight;
        }

        const keyboard = Boolean(editing && fullHeight - height > 120);
        root.style.setProperty('--app-height', `${height}px`);
        root.style.setProperty('--app-top', `${viewport?.offsetTop ?? 0}px`);
        root.classList.toggle('keyboard-open', keyboard);

        if (keyboard) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('resize', schedule, { passive: true });
    viewport?.addEventListener('resize', schedule, { passive: true });
    viewport?.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    update();
}
