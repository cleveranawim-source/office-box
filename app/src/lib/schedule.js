// 01 학사일정: 작년 행사를 같은 학기·주차·요일로 새해 달력에 옮긴다.
import { add, diff, ymd, mondayOf, norm, D, iso, md } from './dates.js';
import { HOLIDAYS, HOLIDAY_RE, DISC_RE } from './holidays.js';

const RANGE_RE = /\((\d{1,2})?\s*~\s*(\d{1,2})\)/g;

/** 작년과 같은 날짜가 든 주의 월요일 */
export function suggestStarts(old, newYear) {
  const dy = newYear - old.year;
  const same = (s) => mondayOf(ymd(+s.slice(0, 4) + dy, +s.slice(5, 7), +s.slice(8, 10)));
  return { 1: same(old.weeks['1-1']), 2: old.weeks['2-1'] ? same(old.weeks['2-1']) : '' };
}

/** '(14~21)', '(~13)' 같은 기간 날짜를 새해에 맞게 */
export function shiftRanges(text, oldDate, offset) {
  const base = D(oldDate);
  const toDate = (n) => {
    let d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), n));
    if (n < base.getUTCDate() && diff(oldDate, iso(d)) > 7) d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, n));
    return iso(d);
  };
  const out = text.replace(RANGE_RE, (m, a, b) => {
    const nb = +add(toDate(+b), offset).slice(8);
    return a ? `(${+add(toDate(+a), offset).slice(8)}~${nb})` : `(~${nb})`;
  });
  return [out, out !== text];
}

/**
 * @returns {{newYear, weeks, holidays, events, markers, refOnly, cmpOn, stats}}
 * events: {id, date, old, text, sub, status:'ok'|'range'|'conflict'|'disc', cmp:'same'|'diff', resolved:false}
 */
export function placeSchedule(old, { newYear, starts, ref = null }) {
  const newWeeks = {};
  Object.keys(old.weeks).forEach((k) => {
    const [s, w] = k.split('-').map(Number);
    if (starts[s]) newWeeks[k] = add(starts[s], 7 * (w - 1));
  });
  const holidays = {};
  Object.values(newWeeks).forEach((mon) => {
    for (let k = 0; k < 6; k++) { const d = add(mon, k); if (HOLIDAYS[d]) holidays[d] = HOLIDAYS[d]; }
  });
  const events = [], dropped = [];
  old.events.forEach((e, i) => {
    if (HOLIDAY_RE.test(e.text)) return; // 작년 공휴일은 버리고 새해 공휴일로
    const key = e.sem + '-' + e.week;
    if (!newWeeks[key]) { dropped.push(e); return; }
    const nd = add(newWeeks[key], e.wd);
    const [text, changed] = shiftRanges(e.text, e.date, diff(nd, e.date));
    let status = changed ? 'range' : 'ok', note = '';
    if (DISC_RE.test(e.text)) { status = 'disc'; note = `작년 ${md(e.date)}에 있던 재량휴업일이에요. 올해도 이 날로 할지 정해 주세요.`; }
    else if (holidays[nd]) { status = 'conflict'; note = `${holidays[nd]}과 겹쳐요. 다른 날로 옮기거나 그대로 둘지 정해 주세요.`; }
    events.push({ id: `e${i}`, date: nd, old: e.date, text, sub: e.sub, status, note, resolved: false });
  });
  const markers = {};
  Object.entries(old.markers).forEach(([d, m]) => {
    for (const [k, mon] of Object.entries(old.weeks)) {
      const off = diff(d, mon);
      if (off >= 0 && off < 7 && newWeeks[k]) { markers[add(newWeeks[k], off)] = m; break; }
    }
  });
  let refOnly = [], cmpOn = false;
  events.forEach((p) => { p.cmp = 'same'; });
  if (ref && !ref.error) {
    cmpOn = true;
    const refEv = ref.events.filter((e) => !HOLIDAY_RE.test(e.text));
    const refSet = new Set(refEv.map((e) => e.date + '|' + norm(e.text)));
    const toolSet = new Set(events.map((p) => p.date + '|' + norm(p.text)));
    events.forEach((p) => { p.cmp = refSet.has(p.date + '|' + norm(p.text)) ? 'same' : 'diff'; });
    refOnly = refEv.filter((e) => !toolSet.has(e.date + '|' + norm(e.text))).map((e) => ({ date: e.date, text: e.text }));
  }
  const same = events.filter((e) => e.cmp === 'same').length;
  return {
    newYear, weeks: newWeeks, holidays, events, markers, refOnly, cmpOn,
    stats: { total: events.length, same, dropped: dropped.length },
  };
}

export const needsDecision = (e) => (e.status === 'conflict' || e.status === 'disc') && !e.resolved;

/** 01 결과 → 02·03이 읽는 일정 모양 */
export function scheduleData(result) {
  const events = result.events.map((e) => ({ date: e.date, text: e.text }));
  Object.entries(result.holidays).forEach(([date, text]) => events.push({ date, text }));
  return { year: result.newYear, weeks: result.weeks, events, markers: result.markers };
}
