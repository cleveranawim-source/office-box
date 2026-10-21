// 시간표: 반마다 slots[요일 0~4][교시 1~8] = 과목
import { XLSX } from './sheet.js';

const WD = '월화수목금';

export function parseTimetable(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const h = rows.findIndex((r) => r.some((c) => String(c).trim() === '반'));
  if (h < 0) throw new Error('첫 줄에 ‘반’ 머리글이 있는 시간표를 찾지 못했어요. ‘빈 양식 내려받기’ 모양으로 맞춰 주세요.');
  const head = rows[h], cc = head.findIndex((c) => String(c).trim() === '반');
  const cols = [];
  head.forEach((c, i) => { const m = String(c).match(/([월화수목금])\s*(\d)/); if (m) cols.push({ i, wd: WD.indexOf(m[1]), p: +m[2] }); });
  if (!cols.length) throw new Error('‘월1, 월2 … 금7’ 같은 요일·교시 머리글을 찾지 못했어요.');
  const classes = [];
  rows.slice(h + 1).forEach((r) => {
    const name = String(r[cc]).trim();
    const g = +(name.match(/^(\d)/) || [])[1];
    if (!name || !g) return;
    const slots = [[], [], [], [], []];
    cols.forEach((c) => { const s = String(r[c.i] ?? '').trim(); if (s) slots[c.wd][c.p] = s; });
    classes.push({ name, grade: g, slots });
  });
  if (!classes.length) throw new Error('반 줄을 찾지 못했어요. 반 이름은 1-1처럼 학년 숫자로 시작해야 해요.');
  return classes;
}

/** 화면 확인용 가짜 시간표: 학년별 3반, 월6·화7·수6·목7·금6교시 */
export function demoTimetable() {
  const per = [6, 7, 6, 7, 6];
  const plan = {
    1: { 국어: 4, 수학: 4, 영어: 4, 사회: 3, 과학: 4, 기술가정: 2, 체육: 3, 음악: 2, 미술: 2, 도덕: 1 },
    2: { 국어: 4, 수학: 4, 영어: 4, 역사: 3, 과학: 4, 기술가정: 2, 체육: 3, 음악: 1, 미술: 1, 도덕: 2, 정보: 1 },
    3: { 국어: 4, 수학: 4, 영어: 4, 역사: 3, 과학: 4, 기술가정: 2, 체육: 3, 음악: 1, 미술: 1, 도덕: 2, 정보: 1 },
  };
  const fixed = { 1: '주제선택', 2: '선택', 3: '선택' };
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const classes = [];
  [1, 2, 3].forEach((g) => [1, 2, 3].forEach((n) => {
    const pool = [];
    Object.entries(plan[g]).forEach(([s, k]) => { for (let i = 0; i < k; i++) pool.push(s); });
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const slots = [[], [], [], [], []];
    per.forEach((cnt, wd) => {
      for (let p = 1; p <= cnt; p++) {
        if ((wd === 1 || wd === 3) && p === 7) slots[wd][p] = fixed[g];
        else if (wd === 2 && p === 6) slots[wd][p] = '창체';
        else slots[wd][p] = pool.pop();
      }
    });
    classes.push({ name: `${g}-${n}`, grade: g, slots });
  }));
  return classes;
}

export function timetableSheet(classes) {
  const head = ['반'];
  for (const d of WD) for (let p = 1; p <= 7; p++) head.push(d + p);
  const rows = [head];
  classes.forEach((c) => {
    const r = [c.name];
    for (let wd = 0; wd < 5; wd++) for (let p = 1; p <= 7; p++) r.push(c.slots[wd][p] || '');
    rows.push(r);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

export function weeklyHours(cls) {
  const w = {};
  cls.slots.forEach((ps) => ps.forEach((s) => { if (s) w[s] = (w[s] || 0) + 1; }));
  return w;
}
