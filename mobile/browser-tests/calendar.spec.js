import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function login(page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#profile')).toBeVisible();
}

async function navigate(page, path) {
    await page.evaluate((path) => {
        location.hash = path;
    }, path);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${path}`);
}

const ics = () => {
    const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10).replaceAll('-', '');
    return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:google-browser-event\r\nDTSTART:${date}T120000Z\r\nDTEND:${date}T130000Z\r\nSUMMARY:Evento do Google\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
};

async function chooseFile(page) {
    await page.locator('#import-calendar').click();
    await page
        .locator('#calendar-file')
        .setInputFiles({ name: 'agenda.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics()) });
    await page.locator('[data-event]').first().click();
}

test('imports a reviewed event, keeps contact associations and refuses duplicate imports', async ({ page }) => {
    await login(page);
    await navigate(page, '/agenda');
    await chooseFile(page);
    await page.locator('#import-client').selectOption({ index: 1 });
    await page.locator('#import-service').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Importar atendimento', exact: true }).click();
    await expect(page.getByText('Evento importado como atendimento.')).toBeVisible();
    await chooseFile(page);
    await expect(page.locator('#import-error')).toHaveText('Este evento já foi importado.');
    await expect(page.getByRole('button', { name: 'Importar atendimento', exact: true })).toBeDisabled();
});

test('bad files show an error without creating appointments', async ({ page }) => {
    await login(page);
    await navigate(page, '/agenda');
    await page.locator('#import-calendar').click();
    await page
        .locator('#calendar-file')
        .setInputFiles({ name: 'agenda.ics', mimeType: 'text/calendar', buffer: Buffer.from('bad file') });
    await expect(page.locator('#calendar-error')).toBeVisible();
    await expect(page.locator('[data-event]')).toHaveCount(0);
});

test('published Pages demo imports calendars from its subdirectory', async ({ page }) => {
    await page.goto('/dist/');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.locator('#profile')).toBeVisible();
    await navigate(page, '/agenda');
    await chooseFile(page);
    await expect(page.locator('#import-client')).toBeVisible();
});

test('an impossible recurrence times out without freezing the page and a later import still works', async ({ page }) => {
    await login(page);
    await navigate(page, '/agenda');
    await page.locator('#import-calendar').click();
    const content = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:impossible-rule\r\nDTSTART:20261023T120000Z\r\nDTEND:20261023T130000Z\r\nRRULE:FREQ=DAILY;COUNT=2;BYMONTH=2;BYMONTHDAY=30\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    await page.locator('#calendar-file').setInputFiles({ name: 'impossible.ics', mimeType: 'text/calendar', buffer: Buffer.from(content) });
    await expect(page.locator('#calendar-error')).toContainText('demorou demais', { timeout: 10000 });
    await page.locator('#calendar-file').setInputFiles({ name: 'valid.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics()) });
    await expect(page.locator('[data-event]')).toHaveCount(1);
});

test('exports an actual calendar file and generates a Google Calendar link', async ({ page }) => {
    await login(page);
    await navigate(page, '/atendimentos/1');
    await expect(page.getByRole('link', { name: 'Google Agenda', exact: true })).toHaveAttribute(
        'href',
        /^https:\/\/calendar.google.com\/calendar\/render\?/,
    );
    const download = page.waitForEvent('download');
    await page.locator('#export-calendar').click();
    const result = await download;
    expect(await readFile(await result.path(), 'utf8')).toContain('BEGIN:VCALENDAR');
});

test('invalid client contacts show guidance and never produce a WhatsApp or email link', async ({ page }) => {
    await login(page);
    await page.evaluate(async () => {
        const { store } = await import('./js/store.js');
        store.commit((state) => {
            state.clients[0].email = 'bad?bcc=evil';
            state.clients[0].phone = '1234';
        });
    });
    await navigate(page, '/atendidos/1');
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    await expect(page.getByText('Cadastre um e-mail válido para escrever ao atendido.')).toBeVisible();
});

test('native calendar export writes a cache file and opens the system share sheet', async ({ page }) => {
    await page.addInitScript(() => {
        window.exportCalls = [];
        window.Capacitor = {
            isNativePlatform: () => true,
            Plugins: {
                Filesystem: {
                    writeFile: async (options) => {
                        window.exportCalls.push(options);
                        return { uri: 'file:///cache/atendimento.ics' };
                    },
                },
                Share: { share: async (options) => { window.exportCalls.push(options); } },
            },
        };
    });
    await login(page);
    await navigate(page, '/atendimentos/1');
    await page.locator('#export-calendar').click();
    await expect.poll(() => page.evaluate(() => window.exportCalls.length)).toBe(2);
    const calls = await page.evaluate(() => window.exportCalls);
    expect(calls[0].directory).toBe('CACHE');
    expect(calls[0].data).toMatch(/^BEGIN:VCALENDAR/);
    expect(calls[1].files).toEqual(['file:///cache/atendimento.ics']);
});
