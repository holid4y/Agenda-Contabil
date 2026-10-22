import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './browser-tests',
    fullyParallel: true,
    workers: 4,
    use: {
        baseURL: 'http://127.0.0.1:8082',
        serviceWorkers: 'block',
        isMobile: true,
        hasTouch: true,
        reducedMotion: 'reduce',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run build:demo && python3 -m http.server 8082 --bind 127.0.0.1',
        url: 'http://127.0.0.1:8082',
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'ignore',
    },
    projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
        { name: 'webkit', use: { browserName: 'webkit' } },
    ],
});
