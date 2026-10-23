import { useMemo, useState } from 'react';
import { Download, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useStore } from '../store.jsx';
import { useSharedSchedule } from '../App.jsx';
import { ToolFrame, SheetSource, Loaded, PeriodBar, Ok, Quiet, Warn, TOOLS } from '../ui.jsx';
import { weekGridTabs, defaultTab, parseWeekGrid, yearOf, XLSX, downloadWorkbook } from '../lib/sheet.js';
import { DEFAULT_REQUIRED, TOPICS, autoLinks, tally, stateOf } from '../lib/required.js';
import { md, wdName } from '../lib/dates.js';

const T = TOOLS[2];

export default function RequiredTool() {
  const { state, patch } = useStore();
  const shared = useSharedSchedule();
  const grades = useMemo(() => (state.timetable ? [...new Set(state.timetable.classes.map((c) => c.grade))].sort() : [1, 2, 3]), [state.timetable]);
  const { items, excluded, manual } = state.required;
  const links = useMemo(() => autoLinks(shared.sch, items, grades), [shared.sch, items, grades]);
  const t = useMemo(() => tally(items, links, excluded, manual, grades), [items, links, excluded, manual, grades]);
  const [sel, setSel] = useState(items[0]?.id);
  const [topic, setTopic] = useState('');
  const item = items.find((i) => i.id === sel);
  const shown = items.filter((i) => !topic || i.topic === topic);
  const shortCount = items.filter((i) => grades.some((g) => stateOf(i, t[i.id][g]) === 'short')).length;

  const onSchedule = (w, lbl) => {
    const tabs = weekGridTabs(w);
    if (!tabs.length) throw new Error('“월 · 주 · 월~토” 머리글이 있는 주 단위 학사일정 탭을 찾지 못했어요.');
    const name = defaultTab(w, tabs, /빈|사본/);
    const p = parseWeekGrid(w.Sheets[name], yearOf(name, w.Sheets[name]));
    if (p.error) throw new Error(p.error);
    patch('hours', { sch: { year: p.year, weeks: p.weeks, events: p.events.map(({ date, text }) => ({ date, text })), markers: p.markers }, schSource: `${name} (${lbl})` });
  };
  const setItem = (id, part) => patch('required', (r) => ({ items: r.items.map((i) => (i.id === id ? { ...i, ...part } : i)) }));

  return (
    <ToolFrame tool={T} band={shared.sch ? `${shared.sch.year}학년도` : undefined} title="범교과·필수교육 편성"
      desc="법정 필수교육과 범교과 주제를 학사일정 행사, 교과·창체 편성과 이어 학년별로 채운 양을 기준과 견줘요."
      actions={<>
        <button className="btn" onClick={() => patch('required', { items: DEFAULT_REQUIRED, excluded: [] })} title="필수교육 목록과 기준을 처음 값으로"><RotateCcw size={16} aria-hidden />기준 처음으로</button>
        <button className="btn primary" disabled={!shared.sch && !manual.length} onClick={() => exportRequired(items, links, excluded, manual, t, grades, shared.sch?.year)}><Download size={16} aria-hidden />편성표 내려받기</button>
      </>}>
      {!shared.sch ? (
        <div className="steps" style={{ '--cols': 2 }}>
          <div className="step">
            <h2><span className="no">1</span>학사일정 이어받기</h2>
            <p className="hint">행사 이름에서 ‘학교폭력예방교육2’, ‘성교육’ 같은 말을 찾아 필수교육에 자동으로 이어요. <a href="#/schedule">01 학사일정</a>에서 만들었다면 그대로 쓰여요.</p>
            <SheetSource onWorkbook={onSchedule} compact />
          </div>
          <div className="step">
            <h2><span className="no">2</span>또는 교과 편성부터</h2>
            <p className="hint">학사일정 없이도 아래 표에서 필수교육을 골라 교과·창체 편성을 직접 적을 수 있어요.</p>
          </div>
        </div>
      ) : <Loaded>{shared.source} · 행사에서 {links.length}건 자동 연결 · 학년 {grades.join('·')}</Loaded>}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>범교과 주제
            <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">전체</option>{TOPICS.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
        </div>
        <div className="row">{shortCount ? <Warn>기준에 모자란 교육 {shortCount}개</Warn> : <Ok>기준 있는 교육 모두 채움</Ok>}</div>
      </div>

      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>
        <div className="tablewrap" style={{ maxHeight: 'none' }}>
          <table className="t">
            <thead><tr><th className="l" scope="col">필수교육</th><th className="l" scope="col">범교과 주제</th><th scope="col">기준 (연)</th>{grades.map((g) => <th key={g} scope="col">{g}학년</th>)}</tr></thead>
            <tbody>
              {shown.map((i) => (
                <tr key={i.id} className={'click' + (sel === i.id ? ' sel' : '')} onClick={() => setSel(i.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(i.id)}>
                  <td className="l" style={{ fontWeight: 600 }}>{i.name}</td>
                  <td className="l">{i.topic}</td>
                  <td>{i.target != null ? `${i.target}${i.unit}` : <span className="hint">학교가 정함</span>}</td>
                  {grades.map((g) => {
                    const c = t[i.id][g], s = stateOf(i, c);
                    return <td key={g} className={s === 'short' ? 'short' : s === 'met' ? 'good' : ''}>{s === 'none' ? '–' : `${c.total}${i.unit}`}{s === 'short' && <small>{i.target - c.total}{i.unit} 모자람</small>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="panel" aria-label="필수교육 편성 고치기">
          {item ? <Detail key={item.id} item={item} grades={grades} cells={t[item.id]} links={links.filter((l) => l.itemId === item.id)} excluded={excluded}
            manual={manual.filter((m) => m.itemId === item.id)} setItem={(p) => setItem(item.id, p)}
            toggle={(key) => patch('required', (r) => ({ excluded: r.excluded.includes(key) ? r.excluded.filter((k) => k !== key) : [...r.excluded, key] }))}
            addManual={(m) => patch('required', (r) => ({ manual: [...r.manual, { ...m, id: 'm' + Date.now(), itemId: item.id }] }))}
            removeManual={(id) => patch('required', (r) => ({ manual: r.manual.filter((m) => m.id !== id) }))} /> : <p className="hint">왼쪽 표에서 교육을 고르세요.</p>}
        </aside>
      </div>
      <p className="note">기준 시간은 흔히 쓰는 예시예요. 학교·교육청 지침과 다르면 오른쪽에서 고쳐 쓰세요. 행사는 이름 속 낱말로 이어 붙이고, ‘시간’ 단위는 표기된 교시 수(종일 행사는 6시간), ‘회’ 단위는 행사 하나를 1회로 세요.</p>
    </ToolFrame>
  );
}

function Detail({ item, grades, cells, links, excluded, manual, setItem, toggle, addManual, removeManual }) {
  const [form, setForm] = useState({ subject: '', content: '', grades: grades.slice(0, 1), amount: 1 });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>{item.name}</h3>
      <p className="hint">{item.basis}</p>
      <div className="grid2">
        <label className="field">기준 (연)<input className="input sm" type="number" min="0" value={item.target ?? ''} placeholder="학교가 정함" onChange={(e) => setItem({ target: e.target.value === '' ? null : Math.max(0, +e.target.value) })} /></label>
        <label className="field">단위<select className="select sm" value={item.unit} onChange={(e) => setItem({ unit: e.target.value })}><option>시간</option><option>회</option></select></label>
      </div>
      <label className="field">행사에서 찾을 낱말 (쉼표로)
        <input className="input sm" defaultValue={item.keywords.join(', ')} onBlur={(e) => setItem({ keywords: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} />
      </label>
      <div className="row">{grades.map((g) => { const s = stateOf(item, cells[g]); return <span key={g}>{s === 'short' ? <Warn>{g}학년 {cells[g].total}/{item.target}</Warn> : s === 'met' ? <Ok>{g}학년 {cells[g].total}/{item.target}</Ok> : <Quiet>{g}학년 {cells[g].total}{item.unit}</Quiet>}</span>; })}</div>
      <hr className="sep" />
      <h3 style={{ fontSize: 14 }}>학사일정 행사 {links.length}건</h3>
      {links.length === 0 ? <p className="empty">이어진 행사가 없어요. 찾을 낱말을 바꿔 보세요.</p> : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {links.map((l) => {
            const off = excluded.includes(l.key);
            return (
              <li key={l.key}>
                <label className="check" style={{ alignItems: 'flex-start', opacity: off ? 0.55 : 1, textDecoration: off ? 'line-through' : 'none' }}>
                  <input type="checkbox" checked={!off} onChange={() => toggle(l.key)} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5 }}>
                    <span><b className="num">{md(l.date)}({wdName(l.date)})</b> {l.text}</span>
                    <span className="row" style={{ gap: 6 }}>{l.periods.length ? <PeriodBar periods={l.periods} color={T.color} ink={T.ink} /> : null}<span className="hint">{l.amount}{item.unit} · {l.grades.join(',')}학년</span></span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <hr className="sep" />
      <h3 style={{ fontSize: 14 }}>교과·창체 편성 {manual.length}건</h3>
      {manual.map((m) => (
        <div key={m.id} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
          <span><b>{m.subject}</b> {m.content} · {m.grades.join(',')}학년 · {m.amount}{item.unit}</span>
          <button className="btn ghost sm" onClick={() => removeManual(m.id)} aria-label={`${m.subject} 편성 지우기`}><Trash2 size={14} aria-hidden /></button>
        </div>
      ))}
      <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (!form.subject.trim() || !form.grades.length) return; addManual({ ...form, subject: form.subject.trim(), amount: +form.amount || 1 }); setForm((f) => ({ ...f, content: '' })); }}>
        <div className="grid2">
          <label className="field">과목·창체<input className="input sm" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="예: 보건, 체육, 자율활동" /></label>
          <label className="field">{item.unit}<input className="input sm" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        </div>
        <label className="field">단원·내용<input className="input sm" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="예: 3단원 응급처치" /></label>
        <div className="row">{grades.map((g) => (
          <label key={g} className="check"><input type="checkbox" checked={form.grades.includes(g)} onChange={(e) => setForm({ ...form, grades: e.target.checked ? [...form.grades, g].sort() : form.grades.filter((x) => x !== g) })} />{g}학년</label>
        ))}</div>
        <button className="btn sm" type="submit" disabled={!form.subject.trim() || !form.grades.length} style={{ alignSelf: 'flex-start' }}><Plus size={14} aria-hidden />편성 더하기</button>
      </form>
    </div>
  );
}

function exportRequired(items, links, excluded, manual, t, grades, year) {
  const ex = new Set(excluded);
  const wb = XLSX.utils.book_new();
  const sum = [['필수교육', '범교과 주제', '기준', '단위', ...grades.flatMap((g) => [`${g}학년 편성`, `${g}학년 충족`]), '근거']];
  items.forEach((i) => sum.push([i.name, i.topic, i.target ?? '학교가 정함', i.unit, ...grades.flatMap((g) => { const s = stateOf(i, t[i.id][g]); return [t[i.id][g].total, s === 'met' ? '충족' : s === 'short' ? `${i.target - t[i.id][g].total} 모자람` : '']; }), i.basis]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), '편성 요약');
  const det = [['필수교육', '구분', '날짜·과목', '요일', '내용', '학년', '양', '단위']];
  items.forEach((i) => {
    links.filter((l) => l.itemId === i.id && !ex.has(l.key)).forEach((l) => det.push([i.name, '학사일정 행사', l.date, wdName(l.date), l.text, l.grades.join(','), l.amount, i.unit]));
    manual.filter((m) => m.itemId === i.id).forEach((m) => det.push([i.name, '교과·창체', m.subject, '', m.content, m.grades.join(','), m.amount, i.unit]));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(det), '편성 내역');
  downloadWorkbook(wb, `${year || ''}_범교과_필수교육_편성.xlsx`.replace(/^_/, ''));
}
