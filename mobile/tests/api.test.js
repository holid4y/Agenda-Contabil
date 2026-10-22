import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../js/api.js';

test('API sends JSON and bearer token without cookies or cache', async () => {
    const api = createApi('https://example.test/api/v1', async (url, options) => {
        assert.equal(url, 'https://example.test/api/v1/mobile/commands');
        assert.equal(options.headers.Authorization, 'Bearer secret');
        assert.equal(options.credentials, 'omit');
        assert.equal(options.cache, 'no-store');
        assert.deepEqual(JSON.parse(options.body), { name: 'changeStatus', args: [1, 'confirmed'] });
        return Response.json({ result: { id: 1 } });
    });
    api.setToken('secret');
    await api.request('/mobile/commands', { method: 'POST', body: { name: 'changeStatus', args: [1, 'confirmed'] } });
});

test('validation errors retain Laravel field messages', async () => {
    const api = createApi('', async () => Response.json({ errors: { email: ['E-mail inválido.'] } }, { status: 422 }));
    await assert.rejects(api.request('/login'), (error) => error instanceof ApiError && error.field === 'email' && error.message === 'E-mail inválido.');
});

test('expired authentication clears token', async () => {
    let calls = 0;
    const api = createApi('', async (_, options) => {
        if (++calls === 1) return Response.json({ message: 'Sessão expirada.' }, { status: 401 });
        assert.equal(options.headers.Authorization, undefined);
        return new Response(null, { status: 204 });
    });
    api.setToken('expired');
    await assert.rejects(api.request('/mobile/bootstrap'), (error) => error.status === 401);
    assert.equal(await api.request('/logout', { method: 'POST' }), null);
});

test('connection failures produce an actionable message', async () => {
    const api = createApi('', async () => { throw new TypeError('offline'); });
    await assert.rejects(api.request('/login'), (error) => error.status === 0 && error.message.includes('conexão'));
});
