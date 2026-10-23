import { useMemo, useState, useRef, useEffect } from 'react';
import { Download, RotateCcw, Plus, Trash2, Check, X, Wand2 } from 'lucide-react';
import { useStore } from '../store.jsx';
import { ToolFrame, SheetSource, Loaded, PeriodBar, Seg, Need, Ok, TOOLS } from '../ui.jsx';
import { weekGridTabs, defaultTab, parseWeekGrid, yearOf, XLSX, downloadWorkbook } from '../lib/sheet.js';
import { placeSchedule, suggestStarts, needsDecision } from '../lib/schedule.js';
import { SUPPORTED_YEARS } from '../lib/holidays.js';
import { interpret } from '../lib/interpret.js';
import { add, DAYS, md, wdName } from '../lib/dates.js';

const T = TOOLS[0];

export default function ScheduleTool() {
  const { state, set } = useStore();
  const [rebuild, setRebuild] = useState(!state.schedule);
  const result = state.schedule?.result;
  if (rebuild || !result) return <Setup onDone={() => setRebuild(false)} onCancel={result ? () => setRebuild(false) : null} />;
  return <Result result={result} source={state.schedule.source} onRebuild={() => setRebuild(true)}
    update={(fn) => set('schedule', (s) => ({ ...s, result: fn(s.result) }))} />;
}

function Setup({ onDone, onCancel }) {
  const { set } = useStore();
  const [wb, setWb] = useState(null);
  const [label, setLabel] = useState('');
  const [tabs, setTabs] = useState([]);
  const [src, setSrc] = useState('');
  const [newYear, setNewYear] = useState(SUPPORTED_YEARS[0]);
  const [starts, setStarts] = useState({ 1: '', 2: '' });
  const [cmp, setCmp] = useState('');
  const [error, setError] = useState('');
  const old = useMemo(() => (wb && src ? parseWeekGrid(wb.Sheets[src], yearOf(src, wb.Sheets[src])) : null), [wb, src]);

  const pickSrc = (w, name, ny) => {
    const p = parseWeekGrid(w.Sheets[name], yearOf(name, w.Sheets[name]));
    const y = p.error ? ny : SUPPORTED_YEARS.includes(p.year + 1) ? p.year + 1 : ny;
    setSrc(name); setNewYear(y);
    if (!p.error) setStarts(suggestStarts(p, y));
    const c = Object.keys(w.Sheets).find((n) => n.includes(String(y)) && /안/.test(n) && findable(w, n));
    setCmp(c || '');
  };
  const onWorkbook = (w, lbl) => {
    const t = weekGridTabs(w);
    if (!t.length) throw new Error('“월 · 주 · 월~토” 머리글이 있는 주 단위 학사일정 탭을 찾지 못했어요. 지금은 이 모양의 시트만 읽을 수 있어요.');
    setWb(w); setLabel(lbl); setTabs(t); setError('');
    pickSrc(w, defaultTab(w, t), newYear);
  };
  const run = () => {
    if (!old || old.error) { setError(old?.error || '작년 일정 탭을 골라 주세요.'); return; }
    if (!starts[1]) { setError('1학기 1주 월요일을 정해 주세요.'); return; }
    if (old.weeks['2-1'] && !starts[2]) { setError('2학기 1주 월요일을 정해 주세요. 비워 두면 2학기 행사가 빠져요.'); return; }
    const ref = cmp ? parseWeekGrid(wb.Sheets[cmp], yearOf(cmp, wb.Sheets[cmp])) : null;
    const result = placeSchedule(old, { newYear, starts, ref });
    set('schedule', { source: `${src} (${label})`, cmpName: cmp, result });
    onDone();
  };
  const weeks = old && !old.error ? { 1: Object.keys(old.weeks).filter((k) => k[0] === '1').length, 2: Object.keys(old.weeks).filter((k) => k[0] === '2').length } : null;

  return (
    <ToolFrame tool={T} title={T.title} desc="작년 학사일정을 새해 달력의 같은 학기·같은 주·같은 요일로 옮겨요. 새해 공휴일과 겹치는 행사, 재량휴업일은 선생님이 정하도록 따로 모아 드려요."
      actions={onCancel && <button className="btn" onClick={onCancel}><X size={16} aria-hidden />만든 결과로 돌아가기</button>}>
      <div className="steps" style={{ '--cols': 2 }}>
        <div className={'step' + (wb ? ' done' : '')}>
          <h2><span className="no">1</span>작년 학사일정 넣기</h2>
          <SheetSource onWorkbook={onWorkbook} />
          {wb && <Loaded>{label} · 학사일정 탭 {tabs.length}개</Loaded>}
          <p className="hint">시트는 이 브라우저 안에서만 읽고, 어디로도 보내지 않아요.</p>
        </div>
        <div className="step" aria-disabled={!wb}>
          <h2><span className="no">2</span>새해 설정</h2>
          {!wb ? <p className="empty">작년 시트를 넣으면 탭과 날짜를 자동으로 채워 드려요.</p> : (
            <>
              <div className="grid2">
                <label className="field">작년 일정 탭
                  <select className="select" value={src} onChange={(e) => pickSrc(wb, e.target.value, newYear)}>{tabs.map((t) => <option key={t}>{t}</option>)}</select>
                </label>
                <label className="field">만들 학년도
                  <select className="select" value={newYear} onChange={(e) => { const y = +e.target.value; setNewYear(y); if (old && !old.error) setStarts(suggestStarts(old, y)); }}>
                    {SUPPORTED_YEARS.map((y) => <option key={y} value={y}>{y}학년도</option>)}
                  </select>
                </label>
                <label className="field">1학기 1주 월요일
                  <input className="input" type="date" value={starts[1]} onChange={(e) => setStarts((s) => ({ ...s, 1: e.target.value }))} />
                </label>
                <label className="field">2학기 1주 월요일
                  <input className="input" type="date" value={starts[2]} onChange={(e) => setStarts((s) => ({ ...s, 2: e.target.value }))} />
                </label>
              </div>
              {weeks && <p className="hint">{old.year}학년도 · 1학기 {weeks[1]}주, 2학기 {weeks[2]}주 · 행사 {old.events.length}건을 읽었어요. 날짜는 작년 개학 주와 같은 주로 제안했어요.</p>}
              {old?.error && <p className="error">{old.error}</p>}
              <label className="field">견줘 볼 새해 안 (있으면)
                <select className="select" value={cmp} onChange={(e) => setCmp(e.target.value)}>
                  <option value="">견주지 않음</option>
                  {tabs.filter((t) => t !== src).map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn primary" onClick={run}><Wand2 size={16} aria-hidden />새해 달력에 배치하기</button>
            </>
          )}
        </div>
      </div>
      <p className="note">지금은 “월 · 주 · 월~토” 주 단위 달력 모양의 시트를 읽어요. 공휴일·대체공휴일은 {SUPPORTED_YEARS.join('·')}학년도 표가 들어 있고, 2028학년도는 정부 발표 후 확인이 필요해요.</p>
    </ToolFrame>
  );
}
const findable = (w, n) => weekGridTabs({ SheetNames: [n], Sheets: w.Sheets }).length > 0;

function Result({ result, source, onRebuild, update }) {
  const { state } = useStore();
  const [sem, setSem] = useState(1);
  const [sel, setSel] = useState(null);
  const [cmpOn, setCmpOn] = useState(result.cmpOn);
  const [dragOver, setDragOver] = useState(null);
  const needs = result.events.filter(needsDecision);
  const byDate = useMemo(() => {
    const m = {};
    result.events.forEach((e) => (m[e.date] ??= []).push(e));
    Object.values(m).forEach((l) => l.sort((a, b) => a.sub - b.sub));
    return m;
  }, [result.events]);
  const refBy = useMemo(() => { const m = {}; result.refOnly.forEach((r) => (m[r.date] ??= []).push(r)); return m; }, [result.refOnly]);
  const weekKeys = Object.keys(result.weeks).filter((k) => +k[0] === sem).sort((a, b) => +a.split('-')[1] - +b.split('-')[1]);
  const selected = result.events.find((e) => e.id === sel);

  const patchEvent = (id, part) => update((r) => ({ ...r, events: r.events.map((e) => (e.id === id ? { ...e, ...part } : e)) }));
  const moveEvent = (id, date) => update((r) => ({
    ...r, events: r.events.map((e) => {
      if (e.id !== id) return e;
      const hol = r.holidays[date];
      return { ...e, date, status: hol ? 'conflict' : e.status === 'conflict' ? 'ok' : e.status, note: hol ? `${hol}과 겹쳐요.` : e.note, resolved: e.status === 'conflict' && !hol ? true : e.resolved };
    }),
  }));
  const addEvent = (date) => {
    const id = 'n' + Date.now();
    update((r) => ({ ...r, events: [...r.events, { id, date, old: '', text: '새 행사', sub: 99, status: 'ok', cmp: 'diff', resolved: false }] }));
    setSel(id);
  };
  const removeEvent = (id) => { update((r) => ({ ...r, events: r.events.filter((e) => e.id !== id) })); setSel(null); };
  const focusEvent = (e) => { setSem(semOf(result, e.date)); setSel(e.id); setTimeout(() => document.getElementById('ev-' + e.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30); };

  return (
    <ToolFrame tool={T} band={`${result.newYear}학년도`} title={`${result.newYear}학년도 학사일정`}
      desc={`${source}에서 ${result.events.length}건을 옮겼어요.${result.stats.dropped ? ` 학기 시작일이 없어 ${result.stats.dropped}건은 옮기지 못했어요.` : ''}${result.cmpOn ? ` 견준 안과 같은 날짜 ${result.stats.same}건(${Math.round((result.stats.same / result.stats.total) * 100)}%).` : ''}`}
      actions={<>
        <button className="btn" onClick={onRebuild}><RotateCcw size={16} aria-hidden />다시 만들기</button>
        <button className="btn primary" onClick={() => exportSchedule(result)}><Download size={16} aria-hidden />엑셀로 내려받기</button>
      </>}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Seg label="학기" value={sem} onChange={setSem} options={[1, 2].map((s) => ({ value: s, label: `${s}학기`, badge: needs.filter((e) => semOf(result, e.date) === s).length || null }))} />
        <div className="row" style={{ gap: 16 }}>
          {result.cmpOn && <label className="check"><input type="checkbox" checked={cmpOn} onChange={(e) => setCmpOn(e.target.checked)} />{state.schedule.cmpName || '견준 안'}과 다른 곳 보기</label>}
          <span className="hint">행사를 끌어서 다른 날로 옮길 수 있어요.</span>
        </div>
      </div>
      <div className="split">
        <div className="cal">
          <table>
            <colgroup><col style={{ width: 40 }} /><col /><col /><col /><col /><col /><col style={{ width: '10%' }} /></colgroup>
            <thead><tr><th scope="col">주</th>{DAYS.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
            <tbody>
              {weekKeys.map((k, ki) => (
                <tr key={k}>
                  <td className="wk">{k.split('-')[1]}</td>
                  {DAYS.map((_, i) => {
                    const d = add(result.weeks[k], i);
                    const hol = result.holidays[d];
                    const day = +d.slice(8);
                    return (
                      <td key={d} className={[i === 5 && 'sat', hol && 'hol', dragOver === d && 'drop'].filter(Boolean).join(' ')}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(d); }} onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) moveEvent(id, d); }}>
                        <div className="d"><span>{day === 1 || (i === 0 && ki === 0) ? md(d) : day}{result.markers[d] && <span className="mk"> {result.markers[d]}</span>}</span>
                          <button className="add" onClick={() => addEvent(d)} aria-label={`${md(d)}에 행사 추가`}><Plus size={14} aria-hidden /></button></div>
                        {hol && <span className="h">{hol}</span>}
                        {(byDate[d] || []).map((e) => {
                          const it = interpret(e.text);
                          return (
                            <button key={e.id} id={'ev-' + e.id} className={['ev', needsDecision(e) && 'need', e.status === 'range' && 'range', cmpOn && e.cmp === 'diff' && 'diff'].filter(Boolean).join(' ')}
                              aria-pressed={sel === e.id} draggable onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)} onClick={() => setSel(sel === e.id ? null : e.id)}
                              title={(e.old ? `작년 ${md(e.old)}(${wdName(e.old)})` : '새로 넣은 행사') + (e.status === 'range' ? ' · 괄호 속 날짜를 새해에 맞게 고침' : '')}>
                              {e.text}
                              {it.kind === 'periods' && <PeriodBar periods={it.periods} color={T.color} label={false} />}
                            </button>
                          );
                        })}
                        {cmpOn && (refBy[d] || []).map((r, j) => <span key={j} className="refonly" title="견준 안에는 이 날짜에 있어요">{r.text}</span>)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="panel" aria-label="행사 고치기와 정할 것">
          {selected ? <Inspector key={selected.id} e={selected} holidays={result.holidays} onPatch={(p) => patchEvent(selected.id, p)} onMove={(d) => moveEvent(selected.id, d)} onRemove={() => removeEvent(selected.id)} onClose={() => setSel(null)} />
            : <p className="hint">달력의 행사를 누르면 여기서 이름과 날짜를 고칠 수 있어요.</p>}
          <hr className="sep" />
          <h3>사람이 정할 것 {needs.length ? <span className="count">{needs.length}</span> : null}</h3>
          {needs.length === 0 ? <Ok>모두 확인했어요</Ok> : (
            <div className="todo">
              {result.events.filter((e) => e.status === 'conflict' || e.status === 'disc').sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
                <button key={e.id} className={e.resolved ? 'done' : ''} onClick={() => focusEvent(e)}>
                  <b>{md(e.date)}({wdName(e.date)}) · {e.resolved ? '확인함' : e.status === 'disc' ? '재량휴업일' : '공휴일 겹침'}</b>{e.text}
                </button>
              ))}
            </div>
          )}
          <div className="legend" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--mute)' }}>
            <span className="mark"><span className="line dash" />정할 것: 공휴일 겹침, 재량휴업일</span>
            <span className="mark"><PeriodBar periods={[1, 2, 3]} color={T.color} label={false} />행사가 차지하는 교시</span>
            <span className="mark"><span style={{ color: 'var(--t1)', fontWeight: 700 }}>✎</span>괄호 속 날짜를 새해에 맞게 고친 행사</span>
            {result.cmpOn && <span className="mark"><span className="line strike" />견준 안에만 있는 행사</span>}
          </div>
        </aside>
      </div>
    </ToolFrame>
  );
}

function Inspector({ e, holidays, onPatch, onMove, onRemove, onClose }) {
  const ref = useRef(null);
  useEffect(() => { if (e.text === '새 행사') ref.current?.select(); }, [e.text]);
  const it = interpret(e.text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ justifyContent: 'space-between' }}>행사 고치기<button className="btn ghost sm" onClick={onClose} aria-label="닫기"><X size={16} aria-hidden /></button></h3>
      <label className="field">이름<input ref={ref} className="input" value={e.text} onChange={(ev) => onPatch({ text: ev.target.value })} /></label>
      <label className="field">날짜<input className="input" type="date" value={e.date} onChange={(ev) => ev.target.value && onMove(ev.target.value)} /></label>
      {holidays[e.date] && <p className="hint">이 날은 {holidays[e.date]}이에요.</p>}
      <div className="barrow"><span>교시 · {it.why}</span><PeriodBar periods={it.kind === 'periods' ? it.periods : it.kind === 'full' || it.kind === 'off' ? [1, 2, 3, 4, 5, 6, 7] : []} color={it.kind === 'off' ? '#9893a5' : T.color} large /></div>
      {e.old && <p className="hint">작년에는 {md(e.old)}({wdName(e.old)})에 있었어요.</p>}
      {e.status === 'range' && <p className="hint">✎ 괄호 속 날짜를 새해에 맞게 고쳤어요. 날짜가 아닌 괄호(교시·학년 등)라면 이름을 직접 바로잡아 주세요.</p>}
      {(e.status === 'conflict' || e.status === 'disc') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {e.resolved ? <Ok>확인함</Ok> : <Need>정할 것</Need>}
          <p className="hint">{e.note}</p>
          <div className="row">
            {e.status === 'conflict' && !e.resolved && <button className="btn sm" onClick={() => onMove(nextSchoolDay(e.date, holidays))}>다음 수업일로 옮기기</button>}
            <button className="btn sm" onClick={() => onPatch({ resolved: !e.resolved })}><Check size={14} aria-hidden />{e.resolved ? '다시 정할 것으로' : '이대로 둘게요'}</button>
          </div>
        </div>
      )}
      <button className="btn danger sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={onRemove}><Trash2 size={14} aria-hidden />행사 지우기</button>
    </div>
  );
}

const nextSchoolDay = (d, holidays) => { let n = add(d, 1); while (holidays[n] || [5, 6].includes((new Date(n + 'T00:00:00Z').getUTCDay() + 6) % 7)) n = add(n, 1); return n; };
function semOf(result, date) {
  for (const [k, mon] of Object.entries(result.weeks)) if (date >= mon && date <= add(mon, 6)) return +k[0];
  return 1;
}

/** 원래 모양(1·2학기 좌우, 주마다 날짜 줄 + 행사 줄) 엑셀 + 행사 목록 */
function exportSchedule(result) {
  const half = (sem) => {
    const rows = [[`${result.newYear}학년도 ${sem}학기 학사일정`, '', '', '', '', '', '', ''], ['월', '주', ...DAYS]];
    const merges = [];
    let lastMonth = null;
    Object.keys(result.weeks).filter((k) => +k[0] === sem).sort((a, b) => +a.split('-')[1] - +b.split('-')[1]).forEach((k) => {
      const mon = result.weeks[k];
      const dates = DAYS.map((_, i) => add(mon, i));
      const lines = dates.map((d) => [result.holidays[d], ...result.events.filter((e) => e.date === d).sort((a, b) => a.sub - b.sub).map((e) => e.text)].filter(Boolean));
      const h = Math.max(3, ...lines.map((l) => l.length));
      const m = +mon.slice(5, 7);
      const r0 = rows.length;
      rows.push([m !== lastMonth ? m : '', +k.split('-')[1], ...dates.map((d) => (result.markers[d] ? `${+d.slice(8)}${result.markers[d]}` : +d.slice(8)))]);
      lastMonth = m;
      for (let j = 0; j < h; j++) rows.push(['', '', ...lines.map((l) => l[j] || '')]);
      merges.push({ s: { r: r0, c: 1 }, e: { r: r0 + h, c: 1 } });
    });
    return { rows, merges };
  };
  const halves = [half(1), half(2)];
  const n = Math.max(...halves.map((h) => h.rows.length));
  const aoa = Array.from({ length: n }, (_, r) => halves.flatMap((h) => h.rows[r] || Array(8).fill('')));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = halves.flatMap((h, i) => h.merges.map((m) => ({ s: { r: m.s.r, c: m.s.c + 8 * i }, e: { r: m.e.r, c: m.e.c + 8 * i } })))
    .concat(halves.map((_, i) => ({ s: { r: 0, c: 8 * i }, e: { r: 0, c: 8 * i + 7 } })));
  ws['!cols'] = halves.flatMap(() => [{ wch: 4 }, { wch: 4 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${result.newYear} 학사일정`);
  const list = [['날짜', '요일', '구분', '내용', '작년 날짜', '확인']];
  Object.entries(result.holidays).forEach(([d, h]) => list.push([d, wdName(d), '휴일', h, '', '']));
  result.events.forEach((e) => list.push([e.date, wdName(e.date), '행사', e.text, e.old, needsDecision(e) ? '정할 것' : e.resolved ? '확인함' : e.status === 'range' ? '괄호 날짜 고침' : '']));
  list.splice(1, list.length, ...list.slice(1).sort((a, b) => a[0].localeCompare(b[0])));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(list), '행사 목록');
  downloadWorkbook(wb, `${result.newYear}_학사일정.xlsx`);
}
