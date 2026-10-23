import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../store.jsx';
import { useSharedSchedule } from '../App.jsx';
import { ToolFrame, SheetSource, Loaded, PeriodBar, Seg, Need, Ok, Warn, TOOLS } from '../ui.jsx';
import { weekGridTabs, defaultTab, parseWeekGrid, yearOf, XLSX, downloadWorkbook } from '../lib/sheet.js';
import { parseTimetable, demoTimetable, timetableSheet } from '../lib/timetable.js';
import { computeHours, dayCounts, lostOf } from '../lib/hours.js';
import { interpret, interpWith, fmtPeriods, parsePeriods } from '../lib/interpret.js';
import { norm, md, wdName } from '../lib/dates.js';

const T = TOOLS[1];

export default function HoursTool() {
  const { state, patch, set } = useStore();
  const shared = useSharedSchedule();
  const [view, setView] = useState(shared.sch && state.timetable ? 'result' : 'setup');
  const ready = shared.sch && state.timetable;
  if (view === 'setup' || !ready) return <Setup shared={shared} ready={ready} onRun={() => setView('result')} />;
  return <Result shared={shared} onSetup={() => setView('setup')} />;
}

function Setup({ shared, ready, onRun }) {
  const { state, patch, set } = useStore();
  const [wb, setWb] = useState(null);
  const [tab, setTab] = useState('');
  const [schErr, setSchErr] = useState('');
  const [ttErr, setTtErr] = useState('');
  const applyTab = (w, name, lbl) => {
    const p = parseWeekGrid(w.Sheets[name], yearOf(name, w.Sheets[name]));
    if (p.error) { setSchErr(p.error); return; }
    setSchErr('');
    patch('hours', { sch: { year: p.year, weeks: p.weeks, events: p.events.map(({ date, text }) => ({ date, text })), markers: p.markers }, schSource: `${name}${lbl ? ` (${lbl})` : ''}` });
  };
  const onSchedule = (w, lbl) => {
    const tabs = weekGridTabs(w);
    if (!tabs.length) throw new Error('“월 · 주 · 월~토” 머리글이 있는 주 단위 학사일정 탭을 찾지 못했어요.');
    setWb({ w, lbl, tabs });
    const t = defaultTab(w, tabs, /빈|사본/);
    setTab(t); applyTab(w, t, lbl);
  };
  return (
    <ToolFrame tool={T} title="시수계산" desc="학사일정의 휴일·고사·행사가 시간표의 어느 수업을 빼앗는지 반별·과목별로 세고, 기준 시수와 견줘요.">
      <div className="steps" style={{ '--cols': 3 }}>
        <div className={'step' + (shared.sch ? ' done' : '')}>
          <h2><span className="no">1</span>학사일정</h2>
          {shared.from === 'schedule' ? (
            <><Loaded>{shared.source}</Loaded><p className="hint">01 학사일정에서 만든 결과를 그대로 써요. 고치면 여기에도 바로 반영돼요.</p></>
          ) : (
            <>
              <SheetSource onWorkbook={onSchedule} compact />
              {wb && (
                <label className="field">학사일정 탭
                  <select className="select" value={tab} onChange={(e) => { setTab(e.target.value); applyTab(wb.w, e.target.value, wb.lbl); }}>{wb.tabs.map((t) => <option key={t}>{t}</option>)}</select>
                </label>
              )}
              {shared.sch && <Loaded>{shared.source}</Loaded>}
              {schErr && <p className="error">{schErr}</p>}
              <p className="hint">학교에서 쓰는 주 단위 학사일정 시트를 넣거나, <a href="#/schedule">01 학사일정</a>에서 새해 일정을 먼저 만드세요.</p>
            </>
          )}
        </div>
        <div className={'step' + (state.timetable ? ' done' : '')}>
          <h2><span className="no">2</span>시간표</h2>
          <SheetSource compact linkLabel="시간표 구글시트 링크" fileLabel="시간표 파일 올리기"
            onWorkbook={(w, lbl) => { set('timetable', { label: lbl, classes: parseTimetable(w), demo: false }); setTtErr(''); }} />
          <div className="row">
            <button className="btn sm" onClick={() => { const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, timetableSheet(demoTimetable()), '시간표'); downloadWorkbook(wb2, '시간표_양식(예시).xlsx'); }}><FileSpreadsheet size={14} aria-hidden />빈 양식 내려받기</button>
            <button className="btn sm ghost" onClick={() => set('timetable', { label: '예시 시간표', classes: demoTimetable(), demo: true })}><Sparkles size={14} aria-hidden />예시로 둘러보기</button>
          </div>
          {state.timetable && <Loaded>{state.timetable.label}{state.timetable.demo ? ' (가짜 데이터)' : ''} · {gradeSummary(state.timetable.classes)}</Loaded>}
          {ttErr && <p className="error">{ttErr}</p>}
          <p className="hint">첫 줄 <b>반 | 월1 | 월2 … | 금7</b>, 아래로 <b>1-1, 1-2 …</b> 반마다 한 줄씩 과목을 적은 모양이에요.</p>
        </div>
        <div className="step">
          <h2><span className="no">3</span>기준</h2>
          <label className="field">학기당 기준 주수
            <input className="input" type="number" min="1" max="25" value={state.hours.base} onChange={(e) => patch('hours', { base: Math.max(1, +e.target.value || 17) })} style={{ maxWidth: 120 }} />
          </label>
          <p className="hint">기준 시수 = 주당 시수 × 기준 주수. 중학교 연 34주 기준이면 학기당 17이에요.</p>
          <button className="btn primary" disabled={!ready} onClick={onRun} style={{ marginTop: 'auto' }}>시수 계산하기<ArrowRight size={16} aria-hidden /></button>
          {!ready && <p className="hint">학사일정과 시간표가 있어야 계산할 수 있어요.</p>}
        </div>
      </div>
    </ToolFrame>
  );
}
const gradeSummary = (classes) => [...new Set(classes.map((c) => c.grade))].sort().map((g) => `${g}학년 ${classes.filter((c) => c.grade === g).length}개 반`).join(', ');

function Result({ shared, onSetup }) {
  const { state, patch } = useStore();
  const classes = state.timetable.classes;
  const { overrides, base, rule } = state.hours;
  const R = useMemo(() => computeHours(shared.sch, classes, overrides, base), [shared.sch, classes, overrides, base]);
  const evList = useMemo(() => {
    const m = {};
    shared.sch.events.forEach((e) => { const k = norm(e.text); (m[k] ??= { text: e.text, dates: [] }).dates.push(e.date); });
    return Object.values(m).map((x) => ({ ...x, auto: interpret(x.text), it: interpWith(overrides, x.text) }));
  }, [shared.sch, overrides]);
  const unknown = evList.filter((x) => x.it.kind === 'unknown').length;
  const [tab, setTab] = useState('sum');
  const [sel, setSel] = useState({ grade: R.grades[0], sem: 'all', cls: classes[0].name, subj: null });
  const go = (cls, subj) => { setSel((s) => ({ ...s, cls, subj })); setTab('cls'); };
  const short = classes.reduce((n, c) => n + Object.keys(R.weekly[c.name]).filter((s) => gotOf(R.stats[c.name][s], 'all') < R.weekly[c.name][s] * base * 2).length, 0);
  return (
    <ToolFrame tool={T} band={`${shared.sch.year}학년도 · ${classes.length}개 반`} title="시수계산"
      desc={`${shared.source} × ${state.timetable.label}${state.timetable.demo ? ' (가짜 데이터)' : ''} · 기준 학기당 ${base}주`}
      actions={<>
        <button className="btn" onClick={onSetup}>입력 바꾸기</button>
        <button className="btn primary" onClick={() => exportHours(R, classes, evList, shared.sch.year, rule)}><Download size={16} aria-hidden />엑셀로 내려받기</button>
      </>}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Seg label="보기" value={tab} onChange={setTab} options={[
          { value: 'sum', label: '반별 요약' }, { value: 'cls', label: '반 상세' },
          { value: 'wd', label: '요일별 수업일수' }, { value: 'ev', label: '표기 해석', badge: unknown || null },
        ]} />
        <div className="row">{short ? <Warn>기준보다 모자란 반·과목 {short}곳</Warn> : <Ok>모든 반·과목이 기준을 채움</Ok>}{unknown ? <Need>정할 표기 {unknown}건</Need> : null}</div>
      </div>
      <div className="fade-in" key={tab}>
        {tab === 'sum' && <Summary R={R} classes={classes} sel={sel} setSel={setSel} go={go} />}
        {tab === 'cls' && <ClassDetail R={R} classes={classes} sel={sel} setSel={setSel} />}
        {tab === 'wd' && <Weekdays R={R} rule={rule} setRule={(v) => patch('hours', { rule: v })} />}
        {tab === 'ev' && <Interpret list={evList} overrides={overrides} setOverrides={(o) => patch('hours', { overrides: o })} />}
      </div>
    </ToolFrame>
  );
}

const gotOf = (st, sem) => (sem === 'all' ? st[1].got + st[2].got : st[sem].got);

function Summary({ R, classes, sel, setSel, go }) {
  const cls = classes.filter((c) => c.grade === sel.grade);
  const subs = [...new Set(cls.flatMap((c) => Object.keys(R.weekly[c.name])))];
  const mult = sel.sem === 'all' ? 2 : 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row">
        <Seg label="학년" value={sel.grade} onChange={(g) => setSel((s) => ({ ...s, grade: g }))} options={R.grades.map((g) => ({ value: g, label: `${g}학년` }))} />
        <Seg label="기간" value={sel.sem} onChange={(v) => setSel((s) => ({ ...s, sem: v }))} options={[{ value: 'all', label: '연간' }, { value: 1, label: '1학기' }, { value: 2, label: '2학기' }]} />
        <span className="hint">칸 = 확보 / 기준(주당 × {R.base}주{mult > 1 ? ' × 2학기' : ''}). 칸을 누르면 빠지는 날짜를 볼 수 있어요.</span>
      </div>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th className="l" scope="col">과목</th><th scope="col">주당</th>{cls.map((c) => <th key={c.name} scope="col">{c.name}</th>)}</tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s}>
                <td className="l">{s}</td><td>{R.weekly[cls[0].name][s] ?? '–'}</td>
                {cls.map((c) => {
                  const st = R.stats[c.name][s];
                  if (!st) return <td key={c.name}>–</td>;
                  const got = gotOf(st, sel.sem), need = R.weekly[c.name][s] * R.base * mult, d = got - need;
                  return (
                    <td key={c.name} className={d < 0 ? 'short' : 'good'}>
                      <button className="btn ghost sm" style={{ width: '100%', color: 'inherit', fontWeight: 'inherit' }} onClick={() => go(c.name, s)} aria-label={`${c.name} ${s} 확보 ${got} 기준 ${need}`}>
                        {got} / {need}<small>{d >= 0 ? '+' : ''}{d}</small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassDetail({ R, classes, sel, setSel }) {
  const c = classes.find((x) => x.name === sel.cls) || classes[0];
  const subs = Object.keys(R.weekly[c.name]);
  const subj = sel.subj && R.weekly[c.name][sel.subj] ? sel.subj : null;
  const losses = subj ? R.losses.filter((x) => x.c === c.name && x.s === subj).sort((a, b) => a.d.localeCompare(b.d) || a.p - b.p) : [];
  const byDay = useMemo(() => { const m = []; losses.forEach((x) => { const last = m[m.length - 1]; if (last && last.d === x.d && last.why === x.why) last.p.push(x.p); else m.push({ ...x, p: [x.p] }); }); return m; }, [losses]);
  const cell = (st, sem, need) => {
    const x = st[sem], e = R.exams[c.grade + '|' + sem] || {};
    return <><td>{e.mid ? x.mid : '–'}</td><td>{e.mid || e.fin ? x.fin : '–'}</td><td>{e.fin ? x.after : '–'}</td><td className={'hl' + (x.got < need ? ' short' : '')}>{x.got}</td><td>{lostOf(x)}</td><td>{need}</td></>;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row">
        <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>반
          <select className="select" value={c.name} onChange={(e) => setSel((s) => ({ ...s, cls: e.target.value }))}>{classes.map((x) => <option key={x.name}>{x.name}</option>)}</select>
        </label>
        <span className="hint">중간전·기말전·기말후는 그 학년 고사 날짜로 나눠요. 고사가 없으면 –. 과목을 누르면 빠지는 수업이 나와요.</span>
      </div>
      <div className="tablewrap">
        <table className="t">
          <thead>
            <tr><th className="l" rowSpan={2} scope="col">과목</th><th rowSpan={2} scope="col">주당</th><th colSpan={6} scope="colgroup">1학기</th><th colSpan={6} scope="colgroup">2학기</th><th colSpan={3} scope="colgroup">연간</th></tr>
            <tr>{[1, 2].flatMap((s) => ['중간전', '기말전', '기말후', '확보', '손실', '기준'].map((h) => <th key={s + h} scope="col">{h}</th>))}<th scope="col">확보</th><th scope="col">기준</th><th scope="col">차이</th></tr>
          </thead>
          <tbody>
            {subs.map((s) => {
              const st = R.stats[c.name][s], w = R.weekly[c.name][s], need = w * R.base, tot = gotOf(st, 'all'), d = tot - need * 2;
              return (
                <tr key={s} className={'click' + (subj === s ? ' sel' : '')} onClick={() => setSel((x) => ({ ...x, subj: s }))} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel((x) => ({ ...x, subj: s }))}>
                  <td className="l">{s}</td><td>{w}</td>{cell(st, 1, need)}{cell(st, 2, need)}<td className="hl">{tot}</td><td>{need * 2}</td><td className={d < 0 ? 'short' : 'good'}>{d >= 0 ? '+' : ''}{d}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {subj && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 16 }}>{c.name} {subj} — 빠지는 수업 {losses.length}시간</h3>
          <div className="tablewrap" style={{ maxHeight: '44vh' }}>
            <table className="t">
              <thead><tr><th scope="col">학기</th><th scope="col">날짜</th><th scope="col">빠지는 교시</th><th scope="col">구분</th><th className="l" scope="col">사유</th></tr></thead>
              <tbody>{byDay.map((x, i) => (
                <tr key={i}><td>{x.sem}</td><td>{md(x.d)}({wdName(x.d)})</td><td><PeriodBar periods={x.p} color={T.color} /></td><td>{x.type}</td><td className="l">{x.why}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const DAYROWS = (rule) => [
  ['전체 일수', (x) => x.all], ['휴일·휴업', (x) => x.off], ['출석일수', (x) => x.all - x.off, true], ['종일 행사·고사', (x) => x.full],
  ...(rule === 'half' ? [['절반 이상 빠진 날', (x) => x.half]] : []), ['수업일수', (x) => x.all - x.off - x.full - x.half, true], ['일부 교시 빠짐', (x) => x.part],
];

function Weekdays({ R, rule, setRule }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row">
        <span className="hint">수업일수에서 뺄 날</span>
        <Seg label="수업일수 기준" value={rule} onChange={setRule} options={[{ value: 'full', label: '종일 빠진 날만' }, { value: 'half', label: '절반 이상 빠진 날까지' }]} />
      </div>
      {R.grades.map((g) => (
        <div key={g} className="tablewrap" style={{ maxHeight: 'none' }}>
          <table className="t">
            <thead><tr><th scope="col">{g}학년</th><th className="l" scope="col">구분</th>{['월', '화', '수', '목', '금'].map((d) => <th key={d} scope="col">{d}</th>)}<th scope="col">계</th></tr></thead>
            <tbody>
              {[1, 2].flatMap((sem) => {
                const w = dayCounts(R, g, sem, rule), ex = R.exams[g + '|' + sem] || {};
                return [
                  ...DAYROWS(rule).map(([k, f, b], i) => (
                    <tr key={sem + k}>{i === 0 && <td rowSpan={DAYROWS(rule).length + 1}>{sem}학기</td>}<td className={'l' + (b ? ' hl' : '')}>{k}</td>{w.map((x, j) => <td key={j} className={b ? 'hl' : ''}>{f(x)}</td>)}<td className={b ? 'hl' : ''}>{w.reduce((n, x) => n + f(x), 0)}</td></tr>
                  )),
                  <tr key={sem + 'ex'}><td className="l" colSpan={7}><small>고사: 중간 {ex.mid ? md(ex.mid) : '없음'} · 기말 {ex.fin ? md(ex.fin) : '없음'}</small></td></tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Interpret({ list, overrides, setOverrides }) {
  const sorted = [...list].sort((a, b) => (a.it.kind === 'unknown' ? 0 : 1) - (b.it.kind === 'unknown' ? 0 : 1) || a.dates[0].localeCompare(b.dates[0]));
  const save = (x, part) => {
    const k = norm(x.text), cur = overrides[k] || {};
    const next = { ...cur, ...part };
    if (!next.kind && next.grades === undefined) { const o = { ...overrides }; delete o[k]; setOverrides(o); return; }
    if (!next.kind) next.kind = { full: 'full', periods: 'periods', off: 'off', move: 'move' }[x.auto.kind] || 'none';
    if (next.kind === 'periods' && !next.periods) next.periods = x.auto.periods || [];
    setOverrides({ ...overrides, [k]: next });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="hint">학사일정의 표기를 어떻게 읽었는지 보여 줘요. 점선 줄은 뜻을 몰라 시수에 넣지 않은 표기예요. ‘바꾸기’를 고르면 바로 다시 계산해요. 학년을 비우면 전체예요.</p>
      <div className="tablewrap">
        <table className="t">
          <thead><tr><th className="l" scope="col">학사일정 표기</th><th scope="col">횟수</th><th className="l" scope="col">읽은 뜻</th><th scope="col">교시</th><th scope="col">바꾸기</th><th scope="col">교시 지정</th><th scope="col">학년</th></tr></thead>
          <tbody>
            {sorted.map((x) => {
              const k = norm(x.text), o = overrides[k] || {};
              const g = o.grades !== undefined ? o.grades : x.auto.grades;
              const locked = x.auto.fixed;
              return (
                <tr key={k} style={x.it.kind === 'unknown' ? { outline: '1.5px dashed var(--rubric)', outlineOffset: -2 } : undefined}>
                  <td className="l">{x.text}</td><td>{x.dates.length}</td>
                  <td className="l" style={x.it.kind === 'unknown' ? { color: 'var(--rubric)', fontWeight: 600 } : undefined}>{x.it.why}{x.it.grades ? <small>{x.it.grades.join(',')}학년만</small> : null}</td>
                  <td>{x.it.kind === 'periods' || x.it.kind === 'move' ? <PeriodBar periods={[...x.it.periods, ...Object.keys(x.it.moves || {}).map(Number)]} color={T.color} /> : x.it.kind === 'full' || x.it.kind === 'off' ? <PeriodBar periods={[1, 2, 3, 4, 5, 6, 7]} color={x.it.kind === 'off' ? '#9893a5' : T.color} /> : '–'}</td>
                  <td>{locked ? <span className="hint">고정</span> : (
                    <select className="select sm" value={o.kind || ''} onChange={(e) => save(x, { kind: e.target.value || undefined })} aria-label={`${x.text} 해석 바꾸기`}>
                      <option value="">자동</option><option value="periods">교시 지정</option><option value="full">종일</option><option value="none">영향 없음</option><option value="off">휴업(전체)</option>
                    </select>
                  )}</td>
                  <td>{!locked && <input className="input sm" style={{ width: 70 }} placeholder="1-3" defaultValue={o.periods ? fmtPeriods(o.periods) : ''} aria-label={`${x.text} 교시`}
                    onBlur={(e) => { const p = parsePeriods(e.target.value); if (p) save(x, { kind: 'periods', periods: p }); }} />}</td>
                  <td>{!locked && <input className="input sm" style={{ width: 60 }} placeholder="전체" defaultValue={g ? g.join(',') : ''} aria-label={`${x.text} 학년`}
                    onBlur={(e) => { const v = e.target.value.trim(); const gs = v ? v.split(/[,\s]+/).map(Number).filter(Boolean) : null; if (JSON.stringify(gs) !== JSON.stringify(x.auto.grades) || o.grades !== undefined) save(x, { grades: gs }); }} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportHours(R, classes, evList, year, rule) {
  const wb = XLSX.utils.book_new();
  const a = [['반', '과목', '주당', '기준(학기)', '1학기 중간전', '1학기 기말전', '1학기 기말후', '1학기 확보', '1학기 손실', '2학기 중간전', '2학기 기말전', '2학기 기말후', '2학기 확보', '2학기 손실', '연간 확보', '연간 기준', '차이']];
  classes.forEach((c) => Object.keys(R.weekly[c.name]).forEach((s) => {
    const st = R.stats[c.name][s], w = R.weekly[c.name][s], need = w * R.base;
    const part = (sem) => { const x = st[sem]; return [x.mid, x.fin, x.after, x.got, lostOf(x)]; };
    const tot = gotOf(st, 'all');
    a.push([c.name, s, w, need, ...part(1), ...part(2), tot, need * 2, tot - need * 2]);
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), '반별 과목 시수');
  const l = [['반', '과목', '학기', '날짜', '요일', '교시', '구분', '사유']];
  R.losses.slice().sort((x, y) => x.c.localeCompare(y.c) || x.d.localeCompare(y.d) || x.p - y.p).forEach((x) => l.push([x.c, x.s, x.sem, x.d, wdName(x.d), x.p, x.type, x.why]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(l), '손실 내역');
  const w = [['학년', '학기', '구분', '월', '화', '수', '목', '금', '계']];
  R.grades.forEach((g) => [1, 2].forEach((sem) => { const ws = dayCounts(R, g, sem, rule); DAYROWS(rule).forEach(([k, f]) => w.push([g, sem, k, ...ws.map(f), ws.reduce((n, x) => n + f(x), 0)])); }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(w), '요일별 수업일수');
  const e = [['학사일정 표기', '횟수', '읽은 뜻', '학년']];
  evList.forEach((x) => e.push([x.text, x.dates.length, x.it.why, x.it.grades ? x.it.grades.join(',') : '전체']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(e), '표기 해석');
  XLSX.utils.book_append_sheet(wb, timetableSheet(classes), '시간표');
  downloadWorkbook(wb, `${year}_시수계산.xlsx`);
}
