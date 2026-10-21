import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from './store.jsx';
import { TOOLS, PeriodBar, Need, Ok, Warn } from './ui.jsx';
import { needsDecision, scheduleData } from './lib/schedule.js';
import { interpWith, interpret } from './lib/interpret.js';
import { computeHours } from './lib/hours.js';
import { norm } from './lib/dates.js';
import { autoLinks, tally, stateOf } from './lib/required.js';
import ScheduleTool from './tools/ScheduleTool.jsx';
import HoursTool from './tools/HoursTool.jsx';
import RequiredTool from './tools/RequiredTool.jsx';
import AssignTool from './tools/AssignTool.jsx';

const useRoute = () => {
  const get = () => (location.hash.replace(/^#\/?/, '') || 'home');
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
};

/** 도구들이 함께 쓰는 학사일정: 01 결과가 있으면 그것, 없으면 02에서 올린 것 */
export function useSharedSchedule() {
  const { state } = useStore();
  return useMemo(() => {
    if (state.schedule?.result) return { sch: scheduleData(state.schedule.result), source: `01에서 만든 ${state.schedule.result.newYear}학년도 학사일정`, from: 'schedule' };
    if (state.hours.sch) return { sch: state.hours.sch, source: state.hours.schSource, from: 'hours' };
    return { sch: null, source: '', from: null };
  }, [state.schedule, state.hours.sch, state.hours.schSource]);
}

export default function App() {
  const route = useRoute();
  const { state, reset, saveError } = useStore();
  const [confirming, setConfirming] = useState(false);
  const workYear = state.schedule?.result?.newYear || state.hours.sch?.year || null;
  const stored = [
    state.schedule && `학사일정 ${state.schedule.result.newYear}`,
    state.timetable && `시간표 ${state.timetable.classes.length}개 반`,
    state.assign.students && `학생 명단 ${state.assign.students.length}명`,
  ].filter(Boolean);
  const page = { schedule: <ScheduleTool />, hours: <HoursTool />, required: <RequiredTool />, assign: <AssignTool /> }[route] || <Home />;
  return (
    <div className="shell">
      <aside className="rail">
        <a className="brand" href="#/">교무자동화도구 박스<small>학교 교무 계획을 한곳에서</small></a>
        <div className="year">작업 학년도<b>{workYear ? `${workYear}학년도` : '아직 없음'}</b></div>
        <nav aria-label="도구">
          <a href="#/" aria-current={route === 'home' ? 'page' : undefined}><span className="n" />도구 고르기</a>
          {TOOLS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} aria-current={route === t.id ? 'page' : undefined}>
              <span className="n">{t.n}</span><span className="tab" style={{ background: t.color }} />{t.name}
            </a>
          ))}
        </nav>
        <div className="store">
          <strong>이 브라우저에 저장됨</strong>
          {stored.length ? stored.map((s) => <div key={s}>{s}</div>) : <div>아직 없음</div>}
          {saveError && <p className="warn" role="alert">{saveError}</p>}
          {stored.length > 0 && (confirming ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#fff' }}>모든 데이터를 지울까요? 되돌릴 수 없어요.</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="danger" onClick={() => { reset(); setConfirming(false); location.hash = '#/'; }}>지우기</button>
                <button className="danger" onClick={() => setConfirming(false)}>취소</button>
              </div>
            </div>
          ) : (
            <button className="danger" onClick={() => setConfirming(true)}><Trash2 size={13} aria-hidden />데이터 지우기</button>
          ))}
        </div>
      </aside>
      <main className="board" key={route}>{page}</main>
    </div>
  );
}

function Home() {
  const { state } = useStore();
  const shared = useSharedSchedule();
  const s = state.schedule?.result;
  const needs = s ? s.events.filter(needsDecision).length : 0;
  const tt = state.timetable;
  const unknown = useMemo(() => {
    if (!shared.sch) return 0;
    const seen = new Set();
    return shared.sch.events.filter((e) => { const k = norm(e.text); if (seen.has(k)) return false; seen.add(k); return interpWith(state.hours.overrides, e.text).kind === 'unknown'; }).length;
  }, [shared.sch, state.hours.overrides]);
  const req = useMemo(() => {
    const grades = tt ? [...new Set(tt.classes.map((c) => c.grade))].sort() : [1, 2, 3];
    const items = state.required.items;
    const links = autoLinks(shared.sch, items, grades);
    const t = tally(items, links, state.required.excluded, state.required.manual, grades);
    const targeted = items.filter((i) => i.target != null);
    const met = targeted.filter((i) => grades.every((g) => stateOf(i, t[i.id][g]) === 'met')).length;
    const short = targeted.filter((i) => grades.some((g) => stateOf(i, t[i.id][g]) === 'short')).length;
    const ex = new Set(state.required.excluded);
    const periods = [...new Set(links.filter((l) => !ex.has(l.key)).flatMap((l) => l.periods))].sort((x, y) => x - y);
    return { met, short, targeted: targeted.length, any: links.length + state.required.manual.length, periods };
  }, [shared.sch, state.required, tt]);
  const a = state.assign;
  // 교시 막대는 실제 데이터에서: 01 정할 행사가 걸린 교시, 02 행사로 가장 많이 빠지는 교시, 03 필수교육 행사가 쓰는 교시
  const bar01 = s ? [...new Set(s.events.filter(needsDecision).flatMap((e) => { const it = interpret(e.text); return it.kind === 'periods' ? it.periods : []; }))].sort((x, y) => x - y) : null;
  const bar02 = useMemo(() => {
    if (!shared.sch || !tt) return null;
    const R = computeHours(shared.sch, tt.classes, state.hours.overrides, state.hours.base);
    const cnt = {};
    R.losses.forEach((l) => { if (l.type === '행사') cnt[l.p] = (cnt[l.p] || 0) + 1; });
    const max = Math.max(0, ...Object.values(cnt));
    return Object.keys(cnt).filter((p) => cnt[p] >= max * 0.6).map(Number).sort((x, y) => x - y);
  }, [shared.sch, tt, state.hours.overrides, state.hours.base]);
  const steps = [
    !s || needs > 0,
    !(shared.sch && tt) || unknown > 0,
    !!shared.sch && req.short > 0,
    !a.students || !a.result,
  ];
  const next = steps.findIndex(Boolean);

  const cells = [
    {
      t: TOOLS[0], sum: s ? `${s.newYear} ← 작년` : '',
      desc: '작년 학사일정 시트를 넣으면 새해 달력의 같은 주·같은 요일로 옮겨요. 공휴일과 겹친 행사는 따로 모아 드려요.',
      io: [['작년 시트', state.schedule?.source || '아직 없음'], ['배치한 행사', s ? `${s.events.length}건` : '—']],
      status: s ? (needs ? <Need>정할 것 {needs}건</Need> : <Ok>모두 확인함</Ok>) : null,
      bar: bar01, barLabel: '정할 행사가 걸린 교시', cta: s ? (needs ? '정할 것 보기' : '달력 열기') : '작년 시트 넣기',
    },
    {
      t: TOOLS[1], sum: tt ? `${tt.classes.length}개 반` : '',
      desc: '휴일·고사·행사로 빠지는 수업을 반별·과목별·요일별로 세고, 기준 시수보다 모자란 곳을 찾아요.',
      io: [['학사일정', shared.sch ? (shared.from === 'schedule' ? '01에서 이어받음' : '따로 올림') : '아직 없음'], ['시간표', tt ? `${tt.classes.length}개 반${tt.demo ? ' (예시)' : ''}` : '아직 없음']],
      status: shared.sch && tt ? (unknown ? <Need>정할 표기 {unknown}건</Need> : <Ok>표기 모두 해석함</Ok>) : null,
      bar: bar02, barLabel: '행사로 가장 많이 빠지는 교시', cta: shared.sch && tt ? '시수 보기' : '시간표 넣기',
    },
    {
      t: TOOLS[2], sum: shared.sch ? `${shared.sch.year}학년도` : '',
      desc: '법정 필수교육과 범교과 주제를 학사일정 행사와 교과·창체 편성에 연결하고, 학년별로 채운 시간을 확인해요.',
      io: [['기준 채움', shared.sch ? `${req.met} / ${req.targeted}` : '—'], ['연결된 편성', shared.sch ? `${req.any}건` : '학사일정 필요']],
      status: shared.sch ? (req.short ? <Warn>기준에 모자란 교육 {req.short}개</Warn> : <Ok>기준 모두 채움</Ok>) : null,
      bar: shared.sch ? req.periods : null, barLabel: '필수교육 행사가 쓰는 교시', cta: shared.sch ? '편성표 보기' : '편성 시작',
    },
    {
      t: TOOLS[3], sum: a.students ? `${a.students.length}명` : '',
      desc: '학생 명단과 조건(같은 반 금지·함께·반 고정)으로 반을 나누고, 성비·성적·이전 반을 고르게 맞춰요.',
      io: [['학생 명단', a.students ? `${a.students.length}명${a.demo ? ' (예시)' : ''}` : '아직 없음'], ['조건', `${a.rules.length}개`]],
      status: a.result ? (a.result.violations?.length ? <Need>조건 어긋남 {a.result.violations.length}건</Need> : <Ok>조건 모두 지킴</Ok>) : null,
      bar: null, cta: a.result ? '반 명단 보기' : a.students ? '반 나누기' : '명단 올리기',
    },
  ];
  return (
    <div className="home fade-in">
      <div>
        <h1>무엇을 할까요?</h1>
        <p className="lede">네 도구는 데이터가 이어져요. 01에서 만든 학사일정이 02 시수계산과 03 범교과 편성에 그대로 쓰여요.</p>
      </div>
      <div className="timetable">
        {cells.map((c, i) => (
          <section key={c.t.id} className="col" aria-labelledby={`h-${c.t.id}`}>
            <div className="hd" style={{ background: c.t.color, color: c.t.ink || '#fff' }}>{c.t.n} {c.t.name}<span>{c.sum}</span></div>
            <div className="cell">
              <h2 id={`h-${c.t.id}`}>{c.t.title}</h2>
              <p>{c.desc}</p>
              <div className="io">{c.io.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
              {c.bar && (
                <div className="barrow">
                  <span>{c.barLabel}</span>
                  <PeriodBar periods={c.bar} color={c.t.color} large />
                  {!c.bar.length && <span className="hint">해당 교시 없음</span>}
                </div>
              )}
              {c.status}
              <span className="nexthint" id={i === next ? 'next-hint' : undefined} style={i === next ? undefined : { visibility: 'hidden' }} aria-hidden={i !== next}>다음에 할 일</span>
              <a className={'btn block' + (i === next ? ' primary' : '')} href={`#/${c.t.id}`} aria-describedby={i === next ? 'next-hint' : undefined}>{c.cta}<ArrowRight size={16} aria-hidden /></a>
            </div>
          </section>
        ))}
      </div>
      <div className="legend">
        <span className="mark"><span className="line" />확정</span>
        <span className="mark"><span className="line dash" />사람이 정할 것</span>
        <span className="mark"><span className="line strike" />제외</span>
        <span className="mark"><span className="chip warn" style={{ padding: '0 6px', fontSize: 11 }}>−4</span>기준보다 모자람(계산)</span>
        <span className="privacy"><ShieldCheck size={15} aria-hidden />데이터는 이 컴퓨터의 브라우저에만 저장되고 어디로도 보내지 않아요</span>
      </div>
    </div>
  );
}
