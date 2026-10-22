import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const mode = process.argv.includes('--demo') ? 'demo' : process.env.MOBILE_MODE ?? 'demo';
const apiUrl = mode === 'demo' ? '' : (process.env.MOBILE_API_URL ?? '').replace(/\/$/, '');
if (!['demo', 'server'].includes(mode)) throw new Error('MOBILE_MODE must be demo or server');
if (mode === 'server' && (!apiUrl.startsWith('https://') || new URL(apiUrl).username || new URL(apiUrl).password)) {
    throw new Error('Server builds require MOBILE_API_URL=https://your-server/api/v1 (without credentials)');
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'fonts', 'icons', 'js']) {
    await cp(file, `dist/${file}`, { recursive: true });
}

await writeFile('dist/js/config.js', `export const config = Object.freeze(${JSON.stringify({ mode, apiUrl })});\n`);
console.log(`Built mobile app (${mode})`);
