import { ValidationError } from './domain.js';

export class ApiError extends ValidationError {
    constructor(message, status = 0, field = null) {
        super(message, field);
        this.status = status;
    }
}

export function createApi(baseUrl, transport = fetch) {
    let token = null;
    return {
        clear() {
            token = null;
        },
        setToken(value) {
            token = value;
        },
        async request(path, { method = 'GET', body } = {}) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 20000);
            let response;
            try {
                response = await transport(`${baseUrl}${path}`, {
                    method,
                    headers: {
                        Accept: 'application/json',
                        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal,
                    cache: 'no-store',
                    credentials: 'omit',
                    redirect: 'error',
                });
            } catch {
                throw new ApiError('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.');
            } finally {
                clearTimeout(timeout);
            }
            const data = response.status === 204 ? null : await response.json().catch(() => null);
            if (!response.ok) {
                if (response.status === 401) token = null;
                const field = Object.keys(data?.errors ?? {})[0] ?? null;
                throw new ApiError(data?.errors?.[field]?.[0] ?? data?.message ?? 'Não foi possível concluir a operação.', response.status, field);
            }
            return data;
        },
    };
}
