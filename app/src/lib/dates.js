// 날짜는 모두 'YYYY-MM-DD' 문자열(UTC 기준)로 다룬다.
export const DAYS = ['월', '화', '수', '목', '금', '토'];

export const D = (s) => new Date(s + 'T00:00:00Z');
export const iso = (d) => d.toISOString().slice(0, 10);
export const add = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const diff = (a, b) => Math.round((D(a) - D(b)) / 864e5);
export const ymd = (y, m, d) => iso(new Date(Date.UTC(y, m - 1, d)));
export const wdIndex = (s) => (D(s).getUTCDay() + 6) % 7;
export const wdName = (s) => DAYS[wdIndex(s)] || '일';
export const mondayOf = (s) => add(s, -wdIndex(s));
export const md = (s) => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`;
export const norm = (t) => String(t).replace(/\s+/g, '');
