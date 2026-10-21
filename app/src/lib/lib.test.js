// node --test src/lib/  (학교 시트가 있으면 SHEET=경로 로 실제 데이터 확인)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readWorkbook, parseWeekGrid, yearOf, weekGridTabs, defaultTab } from './sheet.js';
import { placeSchedule, suggestStarts, scheduleData, shiftRanges } from './schedule.js';
import { interpret, parsePeriods } from './interpret.js';
import { computeHours, dayCounts } from './hours.js';
import { demoTimetable } from './timetable.js';
import { demoRoster, autoAssign } from './assign.js';
import { DEFAULT_REQUIRED, autoLinks, tally } from './required.js';

test('표기 해석', () => {
  assert.deepEqual(interpret('(1학년) 입학식1-4').periods, [1, 2, 3, 4]);
  assert.deepEqual(interpret('(1학년) 입학식1-4').grades, [1]);
  assert.equal(interpret('(2,3학년) 중간고사').kind, 'full');
  assert.equal(interpret('(2,3학년) 중간고사').exam, true);
  assert.equal(interpret('부장회의1').kind, 'none');
  assert.equal(interpret('수련회2').kind, 'full');
  assert.equal(interpret('6(1)').kind, 'unknown');
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
