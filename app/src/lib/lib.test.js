// node --test src/lib/  (학교 시트가 있으면 SHEET=경로 로 실제 데이터 확인)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readWorkbook, parseWeekGrid, yearOf, weekGridTabs, defaultTab, XLSX } from './sheet.js';
import { isHoliday } from './holidays.js';
import { placeSchedule, suggestStarts, scheduleData, shiftRanges } from './schedule.js';
import { interpret, parsePeriods } from './interpret.js';
import { computeHours, dayCounts } from './hours.js';
import { demoTimetable } from './timetable.js';
import { demoRoster, autoAssign, parseRoster, evaluate, DEFAULT_WEIGHTS } from './assign.js';
import { DEFAULT_REQUIRED, autoLinks, tally } from './required.js';

test('표기 해석', () => {
  assert.deepEqual(interpret('(1학년) 입학식1-4').periods, [1, 2, 3, 4]);
  assert.deepEqual(interpret('(1학년) 입학식1-4').grades, [1]);
  assert.equal(interpret('(2,3학년) 중간고사').kind, 'full');
  assert.equal(interpret('(2,3학년) 중간고사').exam, true);
  assert.equal(interpret('부장회의1').kind, 'none');
  assert.equal(interpret('수련회2').kind, 'full');
  assert.deepEqual(interpret('6(1)').moves, { 6: 1 });
  assert.deepEqual(interpret('사랑하는 삶1/6(1)').moves, { 6: 1 });
  // 행사명 뒤 '(5)'는 임장 교사 표시라 시수와 무관: 교시만 읽고 교시 바꿈으로 보지 않는다
  assert.deepEqual([interpret('독서감상문쓰기대회6(5)').periods, interpret('독서감상문쓰기대회6(5)').moves], [[6], undefined]);
  assert.deepEqual(interpret('동아리활동5-6(5)').periods, [5, 6]);
  assert.deepEqual(interpret('사랑하는 삶1/6(1)').periods, [1]);
  assert.deepEqual(interpret('영어듣기평가1-3(학년별)').periods, [1, 2, 3]);
  assert.equal(interpret('★월요일 시간표 운영★').kind, 'tt');
  assert.equal(interpret('대체공휴일(광복절)').kind, 'off');
  assert.deepEqual(parsePeriods('1-3, 6'), [1, 2, 3, 6]);
});

test('기간 날짜 옮기기', () => {
  assert.equal(shiftRanges('학생상담주간(14~21)', '2026-08-18', 364)[0], '학생상담주간(13~20)');
});

test('반배정: 예시 명단은 조건 위반 없이 고르게', () => {
  const { students, rules } = demoRoster(120);
  const r = autoAssign(students, rules, {}, 4);
  assert.equal(r.violations.length, 0);
  const sizes = r.per.map((p) => p.size);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `sizes ${sizes}`);
  const avgs = r.per.map((p) => p.avg);
  assert.ok(Math.max(...avgs) - Math.min(...avgs) < 2, `avgs ${avgs}`);
});

test('공휴일은 이름만 있을 때만 공휴일', () => {
  for (const t of ['추석 연휴', '대체공휴일(광복절)', '대체 휴일', '추석·개천절', '임시공휴일(지방선거)', '삼일절']) assert.ok(isHoliday(t), t);
  for (const t of ['현충일 추념식1', '한글날 기념 백일장3-4']) assert.ok(!isHoliday(t), t);
  assert.deepEqual(interpret('한글날 기념 백일장3-4').periods, [3, 4]);
  assert.deepEqual(interpret('(3학년) 재량휴업일').grades, [3]);
});

// 가짜 주 단위 시트: 1주(3/2~) 다음 한 주를 건너뛴 2주(3/16~)
function fakeSheet() {
  const days = (d) => Array.from({ length: 6 }, (_, i) => d + i);
  const aoa = [
    ['2026학년도 1학기 학사일정'], ['월', '주', '월', '화', '수', '목', '금', '토'],
    [3, 1, ...days(2)],
    ['', '', '학생상담주간(2~6)', '현충일 추념식1', '(3학년) 재량휴업일', '(2,3학년) 중간고사', '★월요일 시간표 운영★', ''],
    ['', '', '', '', '', '', '', ''],
    ['', 2, ...days(16)],
    ['', '', '', '학교폭력예방교육1/성교육2', '새로운 변화1', '', '', ''],
    ['', '', '', '', '6(1)', '', '', ''],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), '2026 학사일정');
  return wb;
}

test('가짜 시트: 읽기 → 배치 → 시수 → 필수교육', () => {
  const ws = fakeSheet().Sheets['2026 학사일정'];
  const old = parseWeekGrid(ws, yearOf('2026 학사일정', ws));
  assert.equal(old.weeks['1-2'], '2026-03-16', '건너뛴 주는 줄에 적힌 날짜를 따른다');
  const res = placeSchedule(old, { newYear: 2027, starts: suggestStarts(old, 2027) });
  const texts = res.events.map((e) => e.text);
  assert.ok(texts.includes('현충일 추념식1'), '공휴일 낱말이 든 행사도 옮긴다');
  assert.ok(texts.includes('학생상담주간(1~5)'));
  const slots = () => [0, 1, 2, 3, 4].map(() => [, 'A', 'B', 'C', 'D', 'E', 'F']);
  const classes = [{ name: '1-1', grade: 1, slots: slots() }, { name: '3-1', grade: 3, slots: slots() }];
  const R = computeHours(old, classes, {}, 17);
  const lost = (c, d) => R.losses.filter((x) => x.c === c && x.d === d);
  assert.equal(lost('1-1', '2026-03-04').length, 0, '3학년 재량휴업은 1학년과 무관');
  assert.equal(lost('3-1', '2026-03-04').length, 6);
  assert.deepEqual(lost('1-1', '2026-03-03').map((x) => x.p), [1]);
  assert.equal(lost('3-1', '2026-03-05').filter((x) => x.type === '고사').length, 6);
  // 6(1): 1교시는 행사, 1교시 과목(A)은 6교시에 하고 6교시 과목(F)만 빠진다
  assert.deepEqual(lost('1-1', '2026-03-18').map((x) => [x.s, x.p, x.type]), [['F', 6, '시간표 바꿈']]);
  assert.ok(lost('1-1', '2026-03-06').every((x) => x.type === '시간표 바꿈'));
  const links = autoLinks(old, DEFAULT_REQUIRED, [1, 2, 3]);
  assert.equal(links.find((l) => l.itemId === 'sex').amount, 1, '한 칸에 둘이면 제 조각 교시만');
});

test('반배정: 조건 시트의 모르는 이름·같은 이름은 오류', () => {
  const book = (cond) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['번호', '이름', '성별'], [1, '박지우', '여'], [2, '이서연', '여'], [3, '김민준', '남'], [4, '김민준', '남']]), '명단');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['종류', '학생', '학생'], cond]), '조건');
    return wb;
  };
  assert.throws(() => parseRoster(book(['금지', '박지우', '이서언'])), /이서언/);
  assert.throws(() => parseRoster(book(['금지', '박지우', '김민준'])), /김민준/);
  const { students, rules } = parseRoster(book(['금지', '박지우', '이서연']));
  assert.equal(rules.length, 1);
  assert.equal(evaluate(students, rules, {}, 2, { 1: 0, 2: 0, 3: 1, 4: 1 }, DEFAULT_WEIGHTS).violations.length, 1);
});

const SHEET = process.env.SHEET;
test('실제 학교 시트 (SHEET 있을 때)', { skip: !SHEET || !existsSync(SHEET || '') }, () => {
  const wb = readWorkbook(readFileSync(SHEET));
  const tabs = weekGridTabs(wb);
  assert.equal(defaultTab(wb, tabs), '2026 학사일정');
  const old = parseWeekGrid(wb.Sheets['2026 학사일정'], 2026);
  const ref = parseWeekGrid(wb.Sheets['2027 학사일정(1안)'], yearOf('2027 학사일정(1안)', wb.Sheets['2027 학사일정(1안)']));
  const starts = suggestStarts(old, 2027);
  assert.deepEqual(starts, { 1: '2027-03-01', 2: '2027-08-09' });
  const res = placeSchedule(old, { newYear: 2027, starts, ref });
  assert.equal(res.events.length, 206); // 시험판은 학기 마지막 주 4번째 줄(생활기록부 마감)을 놓쳤음
  assert.equal(res.stats.same, 151);
  // 시수: 2026 시트 출석일수가 손계산과 같아야 한다
  const R = computeHours(old, demoTimetable(), {}, 17);
  const att = (sem) => dayCounts(R, 2, sem, 'full').map((x) => x.all - x.off);
  assert.deepEqual(att(1), [17, 20, 20, 21, 19]);
  assert.deepEqual(att(2), [18, 20, 20, 19, 16]);
  // 범교과: 학교폭력 예방교육이 행사에서 연결된다
  const sch = scheduleData(res);
  const links = autoLinks(sch, DEFAULT_REQUIRED, [1, 2, 3]);
  const t = tally(DEFAULT_REQUIRED, links, [], [], [1, 2, 3]);
  assert.ok(t.violence[1].total >= 2, JSON.stringify(t.violence));
});
