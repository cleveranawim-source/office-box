// 학사일정 표기 해석: '입학식1-4' → 1~4교시, '(2,3학년) 중간고사' → 2·3학년 종일 …
import { HOLIDAY_RE, DISC_RE } from './holidays.js';
import { norm } from './dates.js';

const STAFF_RE = /교직원|부장회의|평정회|연수|정담회|총회|학부모|보호자|상담주간|캠페인|마감|제출|임원수련회|예비소집|방과후|교생실습|건강검진|소변검사|기도회|수능감독|민방위|소방합동훈련|전시마당|생활기록부/;
const DAYNUM_RE = /수련회|수련활동/; // 뒤 숫자가 교시가 아니라 ‘며칠째’
const FULL_RE = /고사|체육한마당|스포츠데이|역사탐방|나들이|체험학습|현장체험|축제/;
const TT_RE = /([월화수목금])요일\s*시간표/;
const SWAP_RE = /^\d\(\d\)$/;
const TIME_RE = /\d{1,2}:\d{2}/;
const GRADE_RE = /\(?\s*([1-6](?:\s*,\s*[1-6])*)\s*학년\s*\)?/;

/** kind: off | tt | full | periods | none | unknown */
export function interpret(text) {
  let t = text, grades = null;
  const g = t.match(GRADE_RE);
  if (g) { grades = g[1].split(',').map(Number); t = t.replace(g[0], '').trim(); }
  if (HOLIDAY_RE.test(t) || DISC_RE.test(t) || /^방학$/.test(t)) return { kind: 'off', grades: null, why: '휴일·휴업·방학', fixed: true };
  if (/대학수학능력시험/.test(t)) return { kind: 'off', grades: null, why: '수능일 — 시험장이면 휴업' };
  const tt = t.match(TT_RE);
  if (tt) return { kind: 'tt', wd: '월화수목금'.indexOf(tt[1]), grades, why: `${tt[1]}요일 시간표로 운영`, fixed: true };
  if (TIME_RE.test(t)) return { kind: 'none', grades, why: '수업 전후 시간' };
  if (SWAP_RE.test(t)) return { kind: 'unknown', grades, why: '교시 바꿈 표기 — 뜻을 정해 주세요' };
  let full = false, exam = false;
  const periods = new Set(), unknown = [];
  t.split(/[,/]/).map((s) => s.trim()).filter(Boolean).forEach((raw) => {
    if (STAFF_RE.test(raw) || SWAP_RE.test(raw)) return;
    if (DAYNUM_RE.test(raw)) { full = true; return; }
    const it = raw.replace(/\([^)]*[^\d)][^)]*\)\s*$/, '').trim(); // (학년별)·(스포츠데이)·(~13) 같은 꼬리 괄호
    let m = it.match(/(\d)\s*(?:-\s*(\d))?\s*(?:\(\d\))?$/);
    if (m && /[가-힣A-Za-z]/.test(it)) {
      const a = +m[1], b = m[2] ? +m[2] : a;
      if (a >= 1 && b <= 8 && a <= b) { for (let p = a; p <= b; p++) periods.add(p); return; }
    }
    m = it.match(/\((\d)\)$/);
    if (m) { periods.add(+m[1]); return; }
    if (FULL_RE.test(it)) { full = true; if (/고사/.test(it)) exam = true; return; }
    unknown.push(it);
  });
  if (full) return { kind: 'full', grades, exam, why: exam ? '고사 (종일)' : '종일 행사' };
  if (periods.size) { const p = [...periods].sort((a, b) => a - b); return { kind: 'periods', periods: p, grades, why: fmtPeriods(p) + '교시' }; }
  if (unknown.length) return { kind: 'unknown', grades, why: '교시 표기가 없어요' };
  return { kind: 'none', grades, why: '학생 수업과 무관' };
}

/** overrides: { [norm(text)]: {kind, periods?, grades?} } */
export function interpWith(overrides, text) {
  const a = interpret(text), o = overrides?.[norm(text)];
  if (!o) return a;
  const grades = o.grades !== undefined ? o.grades : a.grades;
  if (o.kind === 'off') return { kind: 'off', grades: null, why: '휴업 (직접 정함)', manual: true };
  if (o.kind === 'full') return { kind: 'full', grades, exam: /고사/.test(text), why: '종일 (직접 정함)', manual: true };
  if (o.kind === 'periods') return { kind: 'periods', periods: o.periods || [], grades, why: fmtPeriods(o.periods || []) + '교시 (직접 정함)', manual: true };
  return { kind: 'none', grades, why: '영향 없음 (직접 정함)', manual: true };
}

export const applies = (it, g) => !it.grades || it.grades.includes(g);

export const fmtPeriods = (p) => (p.length > 1 && p[p.length - 1] - p[0] === p.length - 1 ? `${p[0]}~${p[p.length - 1]}` : p.join('·'));

export function parsePeriods(v) {
  const out = new Set();
  String(v).split(/[,\s·]+/).forEach((x) => {
    const m = x.match(/^(\d)(?:\s*[-~]\s*(\d))?$/);
    if (m) for (let p = +m[1]; p <= +(m[2] || m[1]); p++) out.add(p);
  });
  return out.size ? [...out].sort((a, b) => a - b) : null;
}
