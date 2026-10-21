import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Sparkles, Shuffle, Trash2, Plus, Pin, PinOff } from 'lucide-react';
import { useStore } from '../store.jsx';
import { ToolFrame, SheetSource, Loaded, Need, Ok, TOOLS } from '../ui.jsx';
import { XLSX, downloadWorkbook } from '../lib/sheet.js';
import { parseRoster, rosterTemplate, demoRoster, autoAssign, evaluate } from '../lib/assign.js';

const T = TOOLS[3];
const KIND = { apart: '같은 반 금지', together: '같은 반으로', fixed: '반 고정' };

export default function AssignTool() {
  const { state, patch } = useStore();
  const a = state.assign;
  const [busy, setBusy] = useState(false);
  const [selId, setSelId] = useState(null);
  const byId = useMemo(() => Object.fromEntries((a.students || []).map((s) => [s.id, s])), [a.students]);
  const ev = useMemo(() => (a.students && a.result ? evaluate(a.students, a.rules, a.fixed, a.classCount, a.result.assign, a.weights) : null), [a]);
  const badIds = useMemo(() => new Set((ev?.violations || []).flatMap((v) => v.ids)), [ev]);

  const load = ({ students, rules }, label, demo) => patch('assign', { students, rules, fixed: {}, result: null, label, demo });
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const r = autoAssign(a.students, a.rules, a.fixed, a.classCount, a.weights, Date.now() % 100000);
      patch('assign', { result: { assign: r.assign } });
      setBusy(false);
    }, 20);
  };
  const move = (id, c) => patch('assign', (x) => ({ result: { assign: { ...x.result.assign, [id]: c } } }));
  const sel = selId && byId[selId];

  return (
    <ToolFrame tool={T} band={a.students ? `${a.students.length}명 · ${a.classCount}개 반` : undefined} title="반배정"
      desc="명단과 조건으로 반을 나눠요. 같은 반 금지·같은 반으로·반 고정은 반드시 지키고, 인원·성비·성적·이전 반·특이사항은 고르게 맞춰요."
      actions={ev && <button className="btn primary" onClick={() => exportAssign(a, ev)}><Download size={16} aria-hidden />반 명단 내려받기</button>}>
      <div className="steps" style={{ '--cols': 3 }}>
        <div className={'step' + (a.students ? ' done' : '')}>
          <h2><span className="no">1</span>학생 명단</h2>
          <SheetSource compact linkLabel="명단 구글시트 링크" fileLabel="명단 파일 올리기" onWorkbook={(w, lbl) => load(parseRoster(w), lbl, false)} />
          <div className="row">
            <button className="btn sm" onClick={() => downloadWorkbook(rosterTemplate(demoRoster(6).students), '반배정_명단_양식.xlsx')}><FileSpreadsheet size={14} aria-hidden />빈 양식 내려받기</button>
            <button className="btn sm ghost" onClick={() => load(demoRoster(120), '예시 명단', true)}><Sparkles size={14} aria-hidden />예시로 둘러보기</button>
          </div>
          {a.students && <Loaded>{a.label}{a.demo ? ' (가짜 이름)' : ''} · {a.students.length}명 (남 {a.students.filter((s) => s.gender === '남').length} · 여 {a.students.filter((s) => s.gender === '여').length})</Loaded>}
          <p className="hint">열: 번호 · 이름 · 성별 · 점수 · 이전 반 · 특이사항. 둘째 시트 ‘조건’에 금지/함께와 학생 이름을 적어도 돼요.</p>
        </div>
        <div className="step" aria-disabled={!a.students}>
          <h2><span className="no">2</span>조건 {a.rules.length + Object.keys(a.fixed).length ? <span className="count n">{a.rules.length + Object.keys(a.fixed).length}</span> : null}</h2>
          {!a.students ? <p className="empty">명단을 넣으면 조건을 더할 수 있어요.</p> : (
            <Rules a={a} byId={byId} patch={(p) => patch('assign', p)} />
          )}
        </div>
        <div className="step" aria-disabled={!a.students}>
          <h2><span className="no">3</span>나누기</h2>
          <label className="field">반 수
            <input className="input" type="number" min="2" max="20" value={a.classCount} style={{ maxWidth: 120 }}
              onChange={(e) => patch('assign', { classCount: Math.min(20, Math.max(2, +e.target.value || 2)), result: null })} />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <legend className="hint" style={{ marginBottom: 6 }}>고르게 맞출 것</legend>
            {[['gender', '성비'], ['score', '점수 평균'], ['prev', '이전 반 섞기'], ['tags', '특이사항 학생 나누기']].map(([k, l]) => (
              <label key={k} className="check"><input type="checkbox" checked={!!a.weights[k]} onChange={(e) => patch('assign', { weights: { ...a.weights, [k]: e.target.checked ? { gender: 3, score: 2, prev: 1, tags: 2 }[k] : 0 } })} />{l}</label>
            ))}
          </fieldset>
          <button className="btn primary" disabled={!a.students || busy} onClick={run} style={{ marginTop: 'auto' }}><Shuffle size={16} aria-hidden />{busy ? '나누는 중…' : a.result ? '다시 나누기' : '자동으로 나누기'}</button>
        </div>
      </div>

      {ev && (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row">
              {ev.violations.length ? <Need>조건 어긋남 {ev.violations.length}건</Need> : <Ok>조건 모두 지킴</Ok>}
              <span className="hint">학생을 누르고 옮길 반을 고르면 바로 다시 따져 봐요.</span>
            </div>
            {sel && (
              <div className="row" role="group" aria-label="고른 학생 옮기기" style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', borderRadius: 6, padding: '4px 8px' }}>
                <b>{sel.name}</b><span className="hint">{a.result.assign[sel.id] + 1}반</span>
                <select className="select sm" value={a.result.assign[sel.id]} onChange={(e) => move(sel.id, +e.target.value)} aria-label="옮길 반">
                  {Array.from({ length: a.classCount }, (_, i) => <option key={i} value={i}>{i + 1}반으로</option>)}
                </select>
                <button className="btn sm" onClick={() => patch('assign', (x) => { const f = { ...x.fixed }; if (f[sel.id] != null) delete f[sel.id]; else f[sel.id] = x.result.assign[sel.id]; return { fixed: f }; })}>
                  {a.fixed[sel.id] != null ? <><PinOff size={14} aria-hidden />고정 풀기</> : <><Pin size={14} aria-hidden />이 반에 고정</>}
                </button>
              </div>
            )}
          </div>
          {ev.violations.length > 0 && (
            <div className="todo" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {ev.violations.map((v, i) => (
                <button key={i} onClick={() => setSelId(v.ids[0])}><b>{KIND[v.rule.kind]}</b>{v.ids.map((id) => byId[id]?.name).join(', ')}{v.cls != null ? ` · ${v.cls + 1}반` : ''}</button>
              ))}
            </div>
          )}
          <div className="classes" style={{ '--cols': a.classCount }}>
            {ev.per.map((p, c) => (
              <section key={c} className="klass" aria-label={`${c + 1}반`}>
                <header>
                  <b>{c + 1}반</b>
                  <span>{p.size}명 · 남 {p.men} 여 {p.women}{a.students.some((s) => s.score != null) ? ` · 평균 ${p.avg.toFixed(1)}` : ''}</span>
                  {sel && a.result.assign[sel.id] !== c && <button className="btn sm" onClick={() => move(sel.id, c)}>{sel.name} 여기로</button>}
                </header>
                <ol>
                  {a.students.filter((s) => a.result.assign[s.id] === c).sort((x, y) => (x.gender + x.name).localeCompare(y.gender + y.name, 'ko')).map((s) => (
                    <li key={s.id}>
                      <button className={'stu' + (badIds.has(s.id) ? ' bad' : '')} aria-pressed={selId === s.id} onClick={() => setSelId(selId === s.id ? null : s.id)}>
                        <span className="g" aria-label={s.gender || '성별 없음'}>{s.gender || '–'}</span>
                        <span>{s.name}{a.fixed[s.id] != null && <Pin size={11} aria-label="고정" style={{ marginLeft: 4 }} />}{s.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
                        <span className="meta">{s.score ?? ''}{s.prev ? ` · ${s.prev}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </ToolFrame>
  );
}

function Rules({ a, byId, patch }) {
  const [kind, setKind] = useState('apart');
  const [names, setNames] = useState('');
  const [cls, setCls] = useState(1);
  const [err, setErr] = useState('');
  const findIds = (text) => {
    const parts = text.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    const ids = [], missing = [], dup = [];
    parts.forEach((p) => {
      const hits = a.students.filter((s) => s.name === p || s.id === p);
      if (!hits.length) missing.push(p); else if (hits.length > 1) dup.push(p); else ids.push(hits[0].id);
    });
    return { ids, missing, dup };
  };
  const add = (e) => {
    e.preventDefault();
    const { ids, missing, dup } = findIds(names);
    if (missing.length) { setErr(`명단에 없는 이름: ${missing.join(', ')}`); return; }
    if (dup.length) { setErr(`같은 이름이 여럿이에요: ${dup.join(', ')} — 번호로 적어 주세요.`); return; }
    if (kind === 'fixed') {
      if (!ids.length) { setErr('학생을 한 명 이상 적어 주세요.'); return; }
      patch((x) => ({ fixed: { ...x.fixed, ...Object.fromEntries(ids.map((id) => [id, cls - 1])) } }));
    } else {
      if (ids.length < 2) { setErr('학생을 두 명 이상 적어 주세요.'); return; }
      patch((x) => ({ rules: [...x.rules, { id: 'r' + Date.now(), kind, ids }] }));
    }
    setNames(''); setErr('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 170, overflow: 'auto' }}>
        {a.rules.map((r) => (
          <li key={r.id} className="row" style={{ justifyContent: 'space-between', fontSize: 13, flexWrap: 'nowrap' }}>
            <span><b>{KIND[r.kind]}</b> {r.ids.map((id) => byId[id]?.name || id).join(', ')}</span>
            <button className="btn ghost sm" onClick={() => patch((x) => ({ rules: x.rules.filter((y) => y.id !== r.id) }))} aria-label="조건 지우기"><Trash2 size={14} aria-hidden /></button>
          </li>
        ))}
        {Object.entries(a.fixed).map(([id, c]) => (
          <li key={id} className="row" style={{ justifyContent: 'space-between', fontSize: 13, flexWrap: 'nowrap' }}>
            <span><b>반 고정</b> {byId[id]?.name} → {c + 1}반</span>
            <button className="btn ghost sm" onClick={() => patch((x) => { const f = { ...x.fixed }; delete f[id]; return { fixed: f }; })} aria-label="고정 지우기"><Trash2 size={14} aria-hidden /></button>
          </li>
        ))}
        {!a.rules.length && !Object.keys(a.fixed).length && <li className="empty">아직 조건이 없어요.</li>}
      </ul>
      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row">
          <select className="select sm" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="조건 종류">{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          {kind === 'fixed' && <select className="select sm" value={cls} onChange={(e) => setCls(+e.target.value)} aria-label="고정할 반">{Array.from({ length: a.classCount }, (_, i) => <option key={i} value={i + 1}>{i + 1}반</option>)}</select>}
        </div>
        <div className="row">
          <input className="input sm" list="stu-names" value={names} onChange={(e) => setNames(e.target.value)} placeholder="이름을 쉼표로: 김민준, 이서연" aria-label="학생 이름" />
          <button className="btn sm" type="submit"><Plus size={14} aria-hidden />더하기</button>
        </div>
        <datalist id="stu-names">{a.students.slice(0, 400).map((s) => <option key={s.id} value={s.name} />)}</datalist>
        {err && <p className="error" role="alert">{err}</p>}
      </form>
    </div>
  );
}

function exportAssign(a, ev) {
  const wb = XLSX.utils.book_new();
  const head = ['반', '번호', '이름', '성별', '점수', '이전 반', '특이사항'];
  const row = (s) => [a.result.assign[s.id] + 1, s.id, s.name, s.gender, s.score ?? '', s.prev, s.tags.join(', ')];
  const all = a.students.slice().sort((x, y) => a.result.assign[x.id] - a.result.assign[y.id] || x.name.localeCompare(y.name, 'ko'));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...all.map(row)]), '전체');
  ev.per.forEach((p, c) => {
    const list = all.filter((s) => a.result.assign[s.id] === c);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`${c + 1}반 · ${p.size}명 · 남 ${p.men} 여 ${p.women}`], head, ...list.map(row)]), `${c + 1}반`);
  });
  const byId = Object.fromEntries(a.students.map((s) => [s.id, s]));
  const rules = [['조건', '학생', '지켜짐']];
  a.rules.forEach((r) => rules.push([KIND[r.kind], r.ids.map((id) => byId[id]?.name).join(', '), ev.violations.some((v) => v.rule === r) ? '어긋남' : '지킴']));
  Object.entries(a.fixed).forEach(([id, c]) => rules.push(['반 고정', `${byId[id]?.name} → ${c + 1}반`, a.result.assign[id] === c ? '지킴' : '어긋남']));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rules), '조건 확인');
  downloadWorkbook(wb, '반배정.xlsx');
}
