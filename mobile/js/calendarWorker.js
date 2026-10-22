import { readCalendar } from './calendar.js';

self.onmessage = ({ data }) => {
    try {
        self.postMessage({ result: readCalendar(data.text, data.now, data.defaultZone) });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
