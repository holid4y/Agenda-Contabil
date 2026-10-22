import { test, expect } from '@playwright/test';

const sizes = [
    [280, 653], [320, 568], [360, 640], [390, 844], [412, 915],
    [540, 720], [320, 320], [568, 320], [844, 390], [768, 1024], [1024, 768], [1280, 800], [1920, 360],
];

async function login(page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#profile')).toBeVisible();
}

async function route(page, path) {
    await page.evaluate(path => { location.hash = path; }, path);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${path}`);
    await expect(page.locator('#view .page')).toBeVisible();
    await page.waitForFunction(() => document.querySelector('#view').scrollTop === 0);
}

async function fits(page, selector = '#view') {
    const overflow = await page.locator(selector).evaluate(root => {
        const bounds = root.getBoundingClientRect();
        return [...root.querySelectorAll('*')].filter(element => {
            if (element.closest('.sr-only, .columns') || !element.getClientRects().length) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
        }).map(element => `${element.tagName}.${element.className}`);
    });
    expect(overflow).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [width, height] of sizes) {
    test(`${width}×${height}: screens, calendar, sheets and navigation fit`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('/');
        await fits(page);
        await login(page);

        for (const path of ['/', '/agenda', '/atendidos', '/atendidos/novo', '/atendidos/1', '/atendimentos/1', '/atendimentos/novo', '/impacto', '/servicos']) {
            await route(page, path);
            await fits(page);
            const view = page.locator('#view');
            await view.evaluate(element => { element.scrollTop = element.scrollHeight; });
            await expect.poll(() => view.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2);
        }

        await route(page, '/atendimentos/novo');
        await page.locator('[data-client]').first().click();
        await fits(page);
        await page.locator('[data-category]').first().click();
        await page.locator('[data-service]').first().click();
        await page.locator('#next').click();
        await expect(page.locator('#when')).toBeVisible();
        await fits(page);
        await page.getByRole('button', { name: 'Agendar atendimento', exact: true }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: 'Agendar atendimento', exact: true })).toBeInViewport();

        await route(page, '/agenda');
        for (const mode of ['day', 'month', 'week']) {
            await page.locator(`[data-mode="${mode}"]`).click();
            await fits(page);
        }
        await page.locator('#profile').click();
        await fits(page, '.sheet');
        const sheet = page.locator('.sheet');
        const box = await sheet.boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
        await sheet.evaluate(element => { element.scrollTop = element.scrollHeight; });
        await expect(sheet.getByRole('link', { name: /projetosustentabilidade/ })).toBeInViewport();
        expect(errors).toEqual([]);
    });
}

test('rotation and short screens preserve form values and allow submission', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await route(page, '/atendidos/novo');
    await page.locator('#name').fill('Pessoa de teste');
    await page.locator('#phone').fill('51999999999');
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#name')).toHaveValue('Pessoa de teste');
    await fits(page);
    await page.getByRole('button', { name: 'Cadastrar atendido', exact: true }).click();
    await expect(page.locator('.banner h1')).toHaveText('Pessoa de teste');
});

test('safe areas leave navigation and dialogs accessible', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);
    await page.addStyleTag({ content: ':root { --safe-top: 30px; --safe-bottom: 24px; --safe-left: 24px; --safe-right: 24px; }' });
    await fits(page);
    expect((await page.locator('.appbar').boundingBox()).y).toBeGreaterThanOrEqual(30);
    await page.locator('#profile').click();
    await fits(page, '.sheet');
    await page.locator('.sheet').getByRole('button', { name: /Restaurar dados/ }).click();
    await fits(page, '.dialog');
    await expect(page.getByRole('button', { name: 'Restaurar', exact: true })).toBeInViewport();
});

test('keyboard resize keeps the focused field and submit button reachable', async ({ page }) => {
    await page.addInitScript(() => {
        const viewport = new EventTarget();
        Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
        Object.defineProperty(window, 'visualViewport', { value: viewport });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#password').focus();
    await page.evaluate(() => {
        visualViewport.height = 360;
        visualViewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('html')).toHaveClass(/keyboard-open/);
    await expect.poll(() => page.locator('#app').evaluate(element => element.clientHeight)).toBe(360);
    await expect(page.locator('#password')).toBeInViewport();
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#profile')).toBeVisible();
});

test('animations run normally and respect reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.page')).toHaveCSS('animation-name', 'page-in');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('.curtain--welcome')).toBeVisible();
    await page.locator('.curtain--welcome').click();
    await page.locator('#profile').click();
    await expect(page.locator('.sheet')).toHaveCSS('animation-name', 'sheet-up');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.sheet')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('.seg button').first()).toHaveCSS('transition-duration', '0s');
});

test('larger text wraps without hiding content or actions', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await login(page);
    for (const path of ['/', '/atendimentos/1', '/atendidos/novo', '/impacto']) {
        await route(page, path);
        await page.locator('#view').evaluate(root => {
            const sizes = [...root.querySelectorAll('*')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
            for (const [element, size] of sizes) element.style.fontSize = `${size * 2}px`;
        });
        await fits(page);
    }
});

test('native mode and dark theme keep the full available window', async ({ page }) => {
    await page.addInitScript(() => {
        window.Capacitor = { isNativePlatform: () => true };
        localStorage.setItem('agenda-contabil.theme', 'dark');
    });
    await page.setViewportSize({ width: 1024, height: 600 });
    await login(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const box = await page.locator('#app').boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: 1024, height: 600 });
    await fits(page);
});

test('published demo works from a subdirectory without contacting an API', async ({ page }) => {
    const requests = [];
    page.on('request', request => {
        if (new URL(request.url()).pathname.includes('/api/')) requests.push(request.url());
    });
    await page.goto('/dist/');
    const config = await page.evaluate(async () => (await import('./js/config.js')).config);
    expect(config).toEqual({ mode: 'demo', apiUrl: '' });
    await expect(page.locator('#email')).toHaveValue('admin@agenda.local');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#profile')).toBeVisible();
    await page.locator('#profile').click();
    await expect(page.locator('#reset')).toBeVisible();
    expect(requests).toEqual([]);
});
