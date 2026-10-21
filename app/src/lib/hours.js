// 02 시수계산: 학사일정 × 시간표 → 반별·과목별 확보·손실 시수
import { add, wdIndex, DAYS } from './dates.js';
import { interpWith, applies } from './interpret.js';
import { weeklyHours } from './timetable.js';

const blank = () => ({ gross: 0, off: 0, exam: 0, event: 0, swapOut: 0, got: 0, mid: 0, fin: 0, after: 0 });

/** sch: {weeks, events:[{date,text}]}, classes: 시간표, overrides: 표기 해석 바꾸기, base: 학기당 기준 주수 */
export function computeHours(sch, classes, overrides, base) {
  const byDate = {};
  sch.events.forEach((e) => (byDate[e.date] ??= []).push(e));
  const semDays = { 1: [], 2: [] };
  Object.entries(sch.weeks).forEach(([k, mon]) => { const s = +k[0]; for (let i = 0; i < 5; i++) semDays[s].push(add(mon, i)); });
  semDays[1].sort(); semDays[2].sort();
  const grades = [...new Set(classes.map((c) => c.grade))].sort();
  const day = {}, exams = {};
  [1, 2].forEach((sem) => semDays[sem].forEach((d) => grades.forEach((g) => {
    const info = { off: null, ttWd: wdIndex(d), full: null, exam: false, lost: {} };
    (byDate[d] || []).forEach((e) => {
      const it = interpWith(overrides, e.text);
      if (!applies(it, g)) return;
      if (it.kind === 'off') info.off = info.off || e.text;
      else if (it.kind === 'tt') info.ttWd = it.wd;
      else if (it.kind === 'full') { info.full = info.full || e.text; info.exam = info.exam || it.exam; }
      else if (it.kind === 'periods') it.periods.forEach((p) => { info.lost[p] = info.lost[p] || e.text; });
      const ek = g + '|' + sem;
      exams[ek] ??= {};
      if (/중간고사/.test(e.text) && !exams[ek].mid) exams[ek].mid = d;
      if (/기말고사/.test(e.text) && !exams[ek].fin) exams[ek].fin = d;
    });
    day[g + '|' + d] = info;
  })));
  const stats = {}, losses = [], weekly = {};
  classes.forEach((c) => {
    stats[c.name] = {};
    weekly[c.name] = weeklyHours(c);
    Object.keys(weekly[c.name]).forEach((s) => { stats[c.name][s] = { 1: blank(), 2: blank() }; });
    [1, 2].forEach((sem) => {
      const ex = exams[c.grade + '|' + sem] || {};
      semDays[sem].forEach((d) => {
        const info = day[c.grade + '|' + d];
        const own = c.slots[wdIndex(d)];
        own.forEach((s) => { if (s) stats[c.name][s][sem].gross++; });
        const used = c.slots[info.ttWd];
        const seg = ex.mid && d < ex.mid ? 'mid' : !ex.fin || d < ex.fin ? 'fin' : 'after';
        const lose = (s, p, type, why) => losses.push({ c: c.name, s, sem, d, p, type, why });
        if (info.off) { own.forEach((s, p) => { if (s) { stats[c.name][s][sem].off++; lose(s, p, '휴일·휴업', info.off); } }); return; }
        if (info.ttWd !== wdIndex(d)) own.forEach((s, p) => { if (s) { stats[c.name][s][sem].swapOut++; lose(s, p, '시간표 바꿈', `${DAYS[info.ttWd]}요일 시간표 운영`); } });
        used.forEach((s, p) => {
          if (!s || !stats[c.name][s]) return;
          const st = stats[c.name][s][sem];
          if (info.full) { st[info.exam ? 'exam' : 'event']++; lose(s, p, info.exam ? '고사' : '행사', info.full); return; }
          if (info.lost[p]) { st.event++; lose(s, p, '행사', info.lost[p]); return; }
          st.got++; st[seg]++;
        });
      });
    });
  });
  const dayList = {};
  grades.forEach((g) => {
    const maxP = [0, 1, 2, 3, 4].map((wd) => Math.max(0, ...classes.filter((c) => c.grade === g).map((c) => c.slots[wd].length - 1)));
    [1, 2].forEach((sem) => {
      dayList[g + '|' + sem] = semDays[sem].map((d) => {
        const i = day[g + '|' + d], mp = maxP[i.ttWd];
        return { d, off: !!i.off, full: !!i.full, lostN: Object.keys(i.lost).filter((p) => +p <= mp).length, maxP: mp };
      });
    });
  });
  return { base, stats, losses, weekly, dayList, exams, grades };
}

/** rule: 'full' = 종일 빠진 날만 뺌, 'half' = 절반 이상 교시가 빠진 날도 뺌 */
export function dayCounts(R, g, sem, rule) {
  const w = [0, 1, 2, 3, 4].map(() => ({ all: 0, off: 0, full: 0, half: 0, part: 0 }));
  (R.dayList[g + '|' + sem] || []).forEach((x) => {
    const c = w[wdIndex(x.d)];
    c.all++;
    if (x.off) c.off++;
    else if (x.full || (x.maxP && x.lostN >= x.maxP)) c.full++;
    else if (rule === 'half' && x.lostN * 2 >= x.maxP) c.half++;
    else if (x.lostN) c.part++;
  });
  return w;
}

export const lostOf = (x) => x.off + x.exam + x.event + x.swapOut;
