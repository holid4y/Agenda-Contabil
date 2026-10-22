export function parseCalendar(text, { now = Date.now(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone, timeout = 5000 } = {}) {
    return new Promise((resolve, reject) => {
        if (typeof Worker !== 'function') {
            reject(new Error('Este navegador não permite importar calendários com segurança. Atualize-o ou use outro navegador.'));
            return;
        }
        const worker = new Worker(new URL('./calendarWorker.js', import.meta.url), { type: 'module' });
        const finish = (error, result) => {
            clearTimeout(timer);
            worker.terminate();
            error ? reject(error) : resolve(result);
        };
        const timer = setTimeout(() => finish(new Error('O calendário demorou demais para ser lido. Exporte um período menor e tente novamente.')), timeout);
        worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.result);
        worker.onerror = () => finish(new Error('Não foi possível ler o calendário. Confira o arquivo .ics e tente novamente.'));
        worker.postMessage({ text, now, defaultZone: timeZone });
    });
}
