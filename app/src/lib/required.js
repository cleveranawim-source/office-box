// 03 범교과·필수교육 편성: 학사일정 행사와 교과 편성을 필수교육에 연결하고 학년별로 채운 양을 센다.
import { interpret } from './interpret.js';
import { norm } from './dates.js';

// 기준은 흔히 쓰는 예시. 학교·교육청 지침에 맞게 화면에서 고쳐 쓴다. target이 null이면 ‘학교가 정함’.
export const DEFAULT_REQUIRED = [
  { id: 'violence', name: '학교폭력 예방교육', topic: '안전·건강', unit: '회', target: 2, basis: '학교폭력예방법 시행령 — 학기별 1회 이상', keywords: ['학교폭력', '폭력예방', '학생폭력', '사이버폭력'] },
  { id: 'sex', name: '성교육', topic: '안전·건강', unit: '시간', target: 15, basis: '교육부 학교 성교육 지침 — 연 15시간 이상', keywords: ['성교육', '성폭력', '성인지', '성평등'] },
  { id: 'prostitution', name: '성매매 예방교육', topic: '인권', unit: '시간', target: 1, basis: '성매매방지법 — 연 1회 1시간 이상', keywords: ['성매매'] },
  { id: 'family', name: '가정폭력 예방교육', topic: '인권', unit: '시간', target: 1, basis: '가정폭력방지법 — 연 1회 1시간 이상', keywords: ['가정폭력'] },
  { id: 'child', name: '아동학대 예방교육', topic: '인권', unit: '회', target: 1, basis: '연 1회 (교육청 지침 확인)', keywords: ['아동학대'] },
  { id: 'safety', name: '안전교육 (7대 영역)', topic: '안전·건강', unit: '시간', target: 51, basis: '학교안전교육 실시 기준 — 중학교 연 51시간', keywords: ['안전교육', '안전', '재난', '교통', '응급처치', '심폐소생', '소방', '민방위', '감염병', '약물', '흡연', '음주', '스마트폰', '인터넷', '도박'] },
  { id: 'drug', name: '흡연·음주·약물 예방교육', topic: '안전·건강', unit: '시간', target: null, basis: '학교보건법 — 학교가 시간 정함', keywords: ['흡연', '음주', '약물', '마약'] },
  { id: 'smart', name: '인터넷·스마트폰 과의존 예방교육', topic: '안전·건강', unit: '회', target: 1, basis: '지능정보화기본법 — 연 1회 이상', keywords: ['스마트폰', '과의존', '인터넷 중독', '인터넷'] },
  { id: 'gamble', name: '도박 예방교육', topic: '경제·금융', unit: '회', target: 1, basis: '연 1회 (교육청 지침 확인)', keywords: ['도박'] },
  { id: 'disability', name: '장애인식개선교육', topic: '인권', unit: '회', target: 2, basis: '특수교육법 시행규칙 — 연 2회 이상', keywords: ['장애인식', '장애이해'] },
  { id: 'multicultural', name: '다문화 이해교육', topic: '다문화', unit: '시간', target: 2, basis: '교육부 다문화교육 지원계획 — 연 2시간 이상', keywords: ['다문화'] },
  { id: 'dokdo', name: '독도교육', topic: '독도', unit: '시간', target: 10, basis: '교육부 독도교육 기본계획 — 연 10시간 이상', keywords: ['독도'] },
  { id: 'unification', name: '통일교육', topic: '통일', unit: '시간', target: null, basis: '통일교육 지원법 — 학교가 시간 정함', keywords: ['통일'] },
  { id: 'life', name: '생명존중·자살예방교육', topic: '인성', unit: '회', target: null, basis: '학교가 정함 (교육청 지침 확인)', keywords: ['생명', '자살예방', '회복 탄력성', '회복탄력성'] },
  { id: 'career', name: '진로교육', topic: '진로', unit: '시간', target: null, basis: '학교가 정함', keywords: ['진로'] },
  { id: 'human', name: '인권교육', topic: '인권', unit: '시간', target: null, basis: '학교가 정함', keywords: ['인권'] },
  { id: 'democracy', name: '민주시민교육', topic: '민주시민', unit: '시간', target: null, basis: '학교가 정함', keywords: ['민주시민', '선거', '학생자치'] },
  { id: 'eco', name: '환경·지속가능발전교육', topic: '환경·지속가능발전', unit: '시간', target: null, basis: '학교가 정함', keywords: ['환경', '기후', '탄소'] },
  { id: 'economy', name: '경제·금융교육', topic: '경제·금융', unit: '시간', target: null, basis: '학교가 정함', keywords: ['경제', '금융'] },
  { id: 'character', name: '인성교육', topic: '인성', unit: '시간', target: null, basis: '인성교육진흥법 — 학교가 정함', keywords: ['인성'] },
];

export const TOPICS = ['안전·건강', '인성', '진로', '민주시민', '인권', '다문화', '통일', '독도', '경제·금융', '환경·지속가능발전'];

const STAFF_ONLY_RE = /교직원|학부모|보호자|부장회의|신고의무자/;

const matches = (item, text) => item.keywords.some((k) => k && norm(text).includes(norm(k)));

/** 행사 하나가 차지하는 양: 시간 = 교시 수(종일은 dayPeriods), 회 = 1 */
function amountOf(item, it, dayPeriods) {
  if (item.unit === '회') return 1;
  if (it.kind === 'periods') return it.periods.length;
  if (it.kind === 'full') return dayPeriods;
  return 1;
}

/**
 * links: 학사일정에서 자동으로 찾은 연결 [{key, itemId, date, text, grades, amount, periods}]
 * excluded: 사용자가 끊은 자동 연결 key 목록
 */
export function autoLinks(sch, items, grades, dayPeriods = 6) {
  const out = [];
  if (!sch) return out;
  sch.events.forEach((e) => {
    if (STAFF_ONLY_RE.test(e.text)) return; // 교직원·학부모 대상 연수는 학생 필수교육이 아님
    const it = interpret(e.text);
    if (it.kind === 'off') return;
    items.forEach((item) => {
      if (!matches(item, e.text)) return;
      out.push({
        key: `${item.id}|${e.date}|${norm(e.text)}`, itemId: item.id, date: e.date, text: e.text,
        grades: it.grades || grades, amount: amountOf(item, it, dayPeriods),
        periods: it.kind === 'periods' ? it.periods : it.kind === 'full' ? Array.from({ length: dayPeriods }, (_, i) => i + 1) : [],
      });
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** manual: 교과·창체 편성 [{id, itemId, grades:[1,2], subject, content, amount}] */
export function tally(items, links, excluded, manual, grades) {
  const ex = new Set(excluded);
  const t = {};
  items.forEach((item) => {
    t[item.id] = {};
    grades.forEach((g) => { t[item.id][g] = { event: 0, subject: 0, total: 0 }; });
  });
  links.forEach((l) => {
    if (ex.has(l.key) || !t[l.itemId]) return;
    l.grades.forEach((g) => { if (t[l.itemId][g]) { t[l.itemId][g].event += l.amount; t[l.itemId][g].total += l.amount; } });
  });
  manual.forEach((m) => {
    if (!t[m.itemId]) return;
    m.grades.forEach((g) => { if (t[m.itemId][g]) { t[m.itemId][g].subject += +m.amount || 0; t[m.itemId][g].total += +m.amount || 0; } });
  });
  return t;
}

/** 'met' | 'short' | 'free'(기준 없음) | 'none'(편성 없음, 기준 없음) */
export function stateOf(item, cell) {
  if (item.target == null) return cell.total ? 'free' : 'none';
  return cell.total >= item.target ? 'met' : 'short';
}
