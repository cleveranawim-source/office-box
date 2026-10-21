// 04 반배정: 조건(같은 반 금지·함께·반 고정)을 지키면서 인원·성비·성적·이전 반·특이사항을 고르게.
import { XLSX } from './sheet.js';

/** students: [{id, name, gender:'남'|'여'|'', score:number|null, prev:string, tags:string[]}] */
export function parseRoster(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const h = rows.findIndex((r) => r.some((c) => String(c).trim() === '이름'));
  if (h < 0) throw new Error('‘이름’ 머리글이 있는 명단을 찾지 못했어요. ‘빈 양식 내려받기’ 모양으로 맞춰 주세요.');
  const head = rows[h].map((c) => String(c).trim());
  const col = (...names) => head.findIndex((c) => names.some((n) => c.includes(n)));
  const ci = { id: col('번호', '학번'), name: col('이름'), gender: col('성별'), score: col('점수', '성적'), prev: col('이전', '현재반', '전년'), tags: col('특이', '태그', '비고') };
  const students = [];
  const seen = new Set();
  rows.slice(h + 1).forEach((r, i) => {
    const name = String(r[ci.name] ?? '').trim();
    if (!name) return;
    let id = ci.id >= 0 ? String(r[ci.id]).trim() : '';
    if (!id || seen.has(id)) id = `s${i + 1}`;
    seen.add(id);
    const g = String(r[ci.gender] ?? '').trim();
    const sc = ci.score >= 0 && r[ci.score] !== '' ? Number(r[ci.score]) : null;
    students.push({
      id, name,
      gender: /^(남|M|m)/.test(g) ? '남' : /^(여|F|f)/.test(g) ? '여' : '',
      score: Number.isFinite(sc) ? sc : null,
      prev: ci.prev >= 0 ? String(r[ci.prev]).trim() : '',
      tags: ci.tags >= 0 ? String(r[ci.tags]).split(/[,/·]/).map((s) => s.trim()).filter(Boolean) : [],
    });
  });
  if (!students.length) throw new Error('학생 줄을 찾지 못했어요.');
  // 둘째 시트 ‘조건’: 종류(금지/함께) | 학생 이름…
  const rules = [];
  const cws = wb.Sheets[wb.SheetNames.find((n) => /조건/.test(n))];
  if (cws) {
    XLSX.utils.sheet_to_json(cws, { header: 1, defval: '' }).forEach((r) => {
      const kind = /함께/.test(r[0]) ? 'together' : /금지|떨어|분리/.test(r[0]) ? 'apart' : null;
      if (!kind) return;
      const ids = r.slice(1).map((n) => students.find((s) => s.name === String(n).trim() || s.id === String(n).trim())?.id).filter(Boolean);
      if (ids.length >= 2) rules.push({ id: `r${rules.length + 1}`, kind, ids });
    });
  }
  return { students, rules };
}

export function rosterTemplate(students) {
  const wb = XLSX.utils.book_new();
  const rows = [['번호', '이름', '성별', '점수', '이전 반', '특이사항']];
  students.forEach((s) => rows.push([s.id, s.name, s.gender, s.score ?? '', s.prev, s.tags.join(', ')]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '명단');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['종류(금지/함께)', '학생', '학생', '학생'], ['금지', students[0]?.name ?? '', students[1]?.name ?? '']]), '조건');
  return wb;
}

const SUR = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국어은편용';
const GIV = ['민준', '서연', '도윤', '서윤', '시우', '지우', '하준', '하윤', '주원', '지유', '지호', '채원', '준서', '수아', '예준', '지아', '유준', '다은', '건우', '은서', '현우', '예은', '선우', '수빈', '연우', '소율', '정우', '예린', '승현', '하은', '민재', '윤서', '지환', '가은', '태윤', '나은', '시윤', '서현', '은우', '유나'];

/** 화면 확인용 가짜 명단 (예시) */
export function demoRoster(n = 120, prevClasses = 4) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const students = [];
  for (let i = 0; i < n; i++) {
    const gender = rnd() < 0.5 ? '남' : '여';
    students.push({
      id: String(20101 + i), name: SUR[Math.floor(rnd() * 40)] + GIV[Math.floor(rnd() * GIV.length)],
      gender, score: Math.round(55 + rnd() * 40 + (rnd() - 0.5) * 10),
      prev: `${Math.floor(rnd() * prevClasses) + 1}반`,
      tags: rnd() < 0.06 ? ['특수'] : rnd() < 0.05 ? ['다문화'] : rnd() < 0.08 ? ['리더'] : [],
    });
  }
  const rules = [
    { id: 'r1', kind: 'apart', ids: [students[3].id, students[17].id] },
    { id: 'r2', kind: 'apart', ids: [students[8].id, students[40].id, students[77].id] },
    { id: 'r3', kind: 'together', ids: [students[25].id, students[26].id] },
  ];
  return { students, rules };
}

function rng(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** 배정 평가: 위반(hard)과 고르기 점수(soft) */
export function evaluate(students, rules, fixed, classCount, assign, weights) {
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const cls = Array.from({ length: classCount }, () => []);
  students.forEach((s) => { const c = assign[s.id]; if (c != null) cls[c].push(s); });
  const violations = [];
  rules.forEach((r) => {
    const cs = r.ids.map((id) => assign[id]);
    if (r.kind === 'apart') {
      const seen = {};
      r.ids.forEach((id, i) => { (seen[cs[i]] ??= []).push(id); });
      Object.entries(seen).forEach(([c, ids]) => { if (ids.length > 1) violations.push({ rule: r, cls: +c, ids }); });
    } else if (new Set(cs).size > 1) violations.push({ rule: r, ids: r.ids });
  });
  Object.entries(fixed).forEach(([id, c]) => { if (byId[id] && assign[id] !== c) violations.push({ rule: { kind: 'fixed', ids: [id] }, ids: [id], cls: c }); });
  const n = students.length / classCount;
  const scored = students.filter((s) => s.score != null);
  const mean = scored.reduce((a, s) => a + s.score, 0) / (scored.length || 1);
  const prevExp = {}, tagExp = {};
  students.forEach((s) => {
    if (s.prev) prevExp[s.prev] = (prevExp[s.prev] || 0) + 1 / classCount;
    s.tags.forEach((t) => { tagExp[t] = (tagExp[t] || 0) + 1 / classCount; });
  });
  const men = students.filter((s) => s.gender === '남').length / classCount;
  let soft = 0;
  const per = cls.map((list) => {
    const m = list.filter((s) => s.gender === '남').length;
    const sc = list.filter((s) => s.score != null);
    const avg = sc.length ? sc.reduce((a, s) => a + s.score, 0) / sc.length : 0;
    const prev = {}; list.forEach((s) => { if (s.prev) prev[s.prev] = (prev[s.prev] || 0) + 1; });
    const tag = {}; list.forEach((s) => s.tags.forEach((t) => { tag[t] = (tag[t] || 0) + 1; }));
    soft += weights.size * (list.length - n) ** 2;
    if (weights.gender) soft += weights.gender * (m - men) ** 2;
    if (weights.score && sc.length) soft += weights.score * ((avg - mean) / 2) ** 2;
    if (weights.prev) Object.entries(prevExp).forEach(([p, exp]) => { soft += weights.prev * ((prev[p] || 0) - exp) ** 2; });
    if (weights.tags) Object.entries(tagExp).forEach(([t, exp]) => { soft += weights.tags * ((tag[t] || 0) - exp) ** 2; });
    return { size: list.length, men: m, women: list.filter((s) => s.gender === '여').length, avg, prev, tag };
  });
  return { violations, soft, cost: violations.length * 1000 + soft, per };
}

export const DEFAULT_WEIGHTS = { size: 4, gender: 3, score: 2, prev: 1, tags: 2 };

/** 뱀 순서 초기 배정 → 교환 탐색(담금질) */
export function autoAssign(students, rules, fixed, classCount, weights = DEFAULT_WEIGHTS, seed = 1) {
  const rand = rng(seed);
  // ‘함께’ 묶음은 한 덩어리로 움직인다
  const groupOf = {};
  rules.filter((r) => r.kind === 'together').forEach((r) => {
    const g = [...new Set(r.ids.flatMap((id) => groupOf[id] || [id]))];
    g.forEach((id) => { groupOf[id] = g; });
  });
  const units = [];
  const done = new Set();
  students.forEach((s) => { if (done.has(s.id)) return; const g = groupOf[s.id] || [s.id]; g.forEach((id) => done.add(id)); units.push(g); });
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const score = (u) => u.reduce((a, id) => a + (byId[id].score ?? 0), 0) / u.length;
  const assign = {};
  ['남', '여', ''].forEach((g) => {
    const list = units.filter((u) => byId[u[0]].gender === g).sort((a, b) => score(b) - score(a));
    list.forEach((u, i) => {
      const round = Math.floor(i / classCount), pos = i % classCount;
      const c = round % 2 ? classCount - 1 - pos : pos;
      const f = u.map((id) => fixed[id]).find((x) => x != null);
      u.forEach((id) => { assign[id] = f != null ? f : c; });
    });
  });
  let cur = evaluate(students, rules, fixed, classCount, assign, weights);
  const movable = units.filter((u) => u.every((id) => fixed[id] == null));
  const iters = Math.min(60000, 400 * students.length);
  let T = 2;
  for (let k = 0; k < iters; k++) {
    T = 2 * (1 - k / iters) + 0.01;
    const a = movable[Math.floor(rand() * movable.length)];
    if (!a) break;
    const ca = assign[a[0]];
    let b = null, cb;
    if (rand() < 0.25) { cb = Math.floor(rand() * classCount); if (cb === ca) continue; } // 옮기기
    else { b = movable[Math.floor(rand() * movable.length)]; cb = assign[b[0]]; if (b === a || cb === ca) continue; } // 맞바꾸기
    a.forEach((id) => { assign[id] = cb; });
    if (b) b.forEach((id) => { assign[id] = ca; });
    const next = evaluate(students, rules, fixed, classCount, assign, weights);
    if (next.cost <= cur.cost || rand() < Math.exp((cur.cost - next.cost) / T)) cur = next;
    else { a.forEach((id) => { assign[id] = ca; }); if (b) b.forEach((id) => { assign[id] = cb; }); }
  }
  return { assign, ...evaluate(students, rules, fixed, classCount, assign, weights) };
}
