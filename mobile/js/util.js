import { phoneNumber, emailAddress } from './contacts.js';

// Dates are epoch ms in the device's local time; day keys are YYYY-MM-DD.

export const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const pad = (n) => String(n).padStart(2, '0');

const MINUTE = 60_000;
export const minutes = (n) => n * MINUTE;

export const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const timeStr = (ms) => {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromDayKey = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
};

/** Combines a day key and "HH:mm" into epoch ms. */
export const at = (key, time) => {
    const [y, m, d] = key.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
};

export const addDays = (ms, n) => {
    const d = new Date(ms);
    d.setDate(d.getDate() + n);
    return d.getTime();
};

export const startOfDay = (ms) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** Weeks start on Monday, like the agenda in the web system. */
export const startOfWeek = (ms) => {
    const d = new Date(startOfDay(ms));
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
};

export const startOfMonth = (ms) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

export const addMonths = (ms, n) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime();
};

export const monthKey = (ms) => dayKey(ms).slice(0, 7);

export const isSameDay = (a, b) => dayKey(a) === dayKey(b);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const fmt = (options) => new Intl.DateTimeFormat('pt-BR', options);
const F = {
    weekday: fmt({ weekday: 'long' }),
    weekdayShort: fmt({ weekday: 'short' }),
    long: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
    dayMonth: fmt({ day: 'numeric', month: 'long' }),
    monthYear: fmt({ month: 'long', year: 'numeric' }),
    monthShort: fmt({ month: 'short' }),
    short: fmt({ day: '2-digit', month: '2-digit' }),
    full: fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }),
};

export const weekday = (ms) => F.weekday.format(ms); // "quarta-feira"
export const weekdayShort = (ms) => F.weekdayShort.format(ms).replace('.', ''); // "qua"
export const dateLong = (ms) => F.long.format(ms); // "quarta-feira, 14 de outubro"
export const dayMonth = (ms) => F.dayMonth.format(ms); // "14 de outubro"
export const monthYear = (ms) => cap(F.monthYear.format(ms)); // "Outubro de 2026"
export const monthShort = (ms) => F.monthShort.format(ms).replace('.', ''); // "out"
export const dateShort = (ms) => F.short.format(ms); // "14/10"
export const dateFull = (ms) => F.full.format(ms); // "14/10/2026"
export const dateTime = (ms) => `${dateFull(ms)} ${timeStr(ms)}`;

export const relativeDay = (ms, now = Date.now()) => {
    const diff = Math.round((startOfDay(ms) - startOfDay(now)) / 86_400_000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    return cap(dateLong(ms));
};

export const capitalize = cap;

export const normalize = (s) =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim();

export const digits = (s) => String(s ?? '').replace(/\D/g, '');

export const initials = (name) => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const firstName = (name) => String(name).trim().split(/\s+/)[0];

export const formatPhone = (value) => {
    const d = digits(value);
    if (String(value).startsWith('+') || d.length > 11) return value;
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const dialNumber = phoneNumber;

const allSame = (d) => /^(\d)\1+$/.test(d);

export const isValidCpf = (value) => {
    const d = digits(value);
    if (d.length !== 11 || allSame(d)) return false;
    const check = (len) => {
        let sum = 0;
        for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };
    return check(9) === Number(d[9]) && check(10) === Number(d[10]);
};

export const isValidCnpj = (value) => {
    const d = digits(value);
    if (d.length !== 14 || allSame(d)) return false;
    const check = (len) => {
        const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    return check(12) === Number(d[12]) && check(13) === Number(d[13]);
};

export const formatDocument = (value) => {
    const d = digits(value);
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return value ?? '';
};

export const maskDocument = (value, type) => {
    const d = digits(value).slice(0, type === 'organization' ? 14 : 11);
    if (type === 'organization') {
        return d
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

export const isEmail = (value) => emailAddress(value) !== null;

export const downloadFile = async (filename, content, type = 'text/csv;charset=utf-8') => {
    const prefix = type.startsWith('text/csv') ? '\ufeff' : '';
    if (window.Capacitor?.isNativePlatform?.()) {
        const filesystem = window.Capacitor.Plugins?.Filesystem;
        const share = window.Capacitor.Plugins?.Share;
        if (!filesystem || !share) throw new Error('Atualize a instalação do aplicativo para exportar arquivos.');
        const file = await filesystem.writeFile({ path: filename, data: prefix + content, directory: 'CACHE', encoding: 'utf8' });
        await share.share({ title: filename, files: [file.uri], dialogTitle: 'Salvar ou abrir arquivo' });
        return;
    }
    // The BOM makes Excel read the accents.
    const blob = new Blob([prefix, content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
