import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const build = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url));

test('Pages build stays in demo mode even with server environment variables', async () => {
    const directory = await mkdtemp(`${tmpdir()}/agenda-pages-`);
    try {
        for (const name of ['css', 'fonts', 'icons', 'js', 'android', 'tests']) {
            await mkdir(`${directory}/${name}`);
        }
        for (const name of ['index.html', 'manifest.webmanifest', 'sw.js', '.env']) {
            await writeFile(`${directory}/${name}`, 'fixture');
        }
        await run(process.execPath, [build, '--demo'], {
            cwd: directory,
            env: { ...process.env, MOBILE_MODE: 'server', MOBILE_API_URL: 'https://api.example.test/api/v1', MOBILE_FORMS_ALLOWED_HOSTS: 'forms.example.test' },
        });
        const config = await readFile(`${directory}/dist/js/config.js`, 'utf8');
        assert.match(config, /"mode":"demo","apiUrl":""/);
        assert.match(config, /"formsHosts":\[\]/);
        const files = await readdir(`${directory}/dist`);
        assert.ok(!files.includes('.env'));
        assert.ok(!files.includes('android'));
        assert.ok(!files.includes('tests'));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
