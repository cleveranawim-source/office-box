// 공용 화면 부품: 7칸 교시 막대, 시트 불러오기, 상태 표시, 도구 머리
import { useState } from 'react';
import { Link2, Upload, CircleCheck, CircleAlert } from 'lucide-react';
import { readWorkbook, fetchSheet } from './lib/sheet.js';
import { fmtPeriods } from './lib/interpret.js';

export const TOOLS = [
  { id: 'schedule', n: '01', name: '학사일정', title: '연간 학사일정 자동생성', color: 'var(--t1)', wash: 'var(--t1-wash)' },
  { id: 'hours', n: '02', name: '시수계산', title: '시수계산', color: 'var(--t2)', wash: 'var(--t2-wash)' },
  { id: 'required', n: '03', name: '범교과 편성', title: '범교과·필수교육 편성', color: 'var(--t3)', wash: 'var(--t3-wash)', ink: 'var(--ink-dark)' },
  { id: 'assign', n: '04', name: '반배정', title: '반배정', color: 'var(--t4)', wash: 'var(--t4-wash)', ink: 'var(--ink-dark)' },
];
export const toolById = (id) => TOOLS.find((t) => t.id === id);

/** 시그니처: 행사·손실·편성이 차지하는 교시를 7칸으로 */
export function PeriodBar({ periods = [], n = 7, color, ink, large = false, label = true }) {
  const set = new Set(periods);
  const text = periods.length ? `${fmtPeriods(periods)}교시` : '교시 없음';
  return (
    <span className={'pbar' + (large ? ' lg' : '')} style={{ '--n': n, '--c': color, '--on': ink }} role={label ? 'img' : undefined} aria-label={label ? text : undefined} aria-hidden={label ? undefined : true}>
      {Array.from({ length: n }, (_, i) => <i key={i} className={set.has(i + 1) ? 'on' : ''}>{i + 1}</i>)}
    </span>
  );
}

export function Need({ children }) { return <span className="chip need">{children}</span>; }
export function Ok({ children }) { return <span className="chip ok">{children}</span>; }
export function Quiet({ children }) { return <span className="chip quiet">{children}</span>; }
/** 계산으로 나온 모자람: 사람이 정할 것(붉은 점선)과 구분되는 먹색·회색 */
export function Warn({ children }) { return <span className="chip warn">{children}</span>; }

/** 구글시트 링크 또는 xlsx 파일 → onWorkbook(wb, label) */
export function SheetSource({ onWorkbook, linkLabel = '구글시트 링크', fileLabel = '엑셀 파일 올리기', compact = false }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const take = async (getBuf, label) => {
    setError(''); setBusy(true);
    try { await onWorkbook(readWorkbook(await getBuf()), label); }
    catch (e) { setError(e.message || '파일을 읽지 못했어요.'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (url.trim()) take(() => fetchSheet(url.trim()), '구글시트'); }}>
        <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={`${linkLabel} 붙여넣기`} aria-label={linkLabel} />
        <button className="btn" type="submit" disabled={busy || !url.trim()}><Link2 size={16} aria-hidden />{busy ? '불러오는 중…' : '불러오기'}</button>
      </form>
      <div className="row">
        <label className="btn file">
          <Upload size={16} aria-hidden />{fileLabel}
          <input type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) take(() => f.arrayBuffer(), f.name); }} />
        </label>
        {!compact && <span className="hint">구글시트는 ‘링크가 있는 모든 사용자 — 뷰어’로 공유돼 있어야 해요.</span>}
      </div>
      {error && <p className="error" role="alert"><CircleAlert size={16} aria-hidden style={{ flex: 'none', marginTop: 1 }} />{error}</p>}
    </div>
  );
}

export function Loaded({ children }) {
  return <p className="loaded"><CircleCheck size={16} aria-hidden />{children}</p>;
}

export function ToolFrame({ tool, band, title, desc, actions, children }) {
  return (
    <section className="tool">
      <div className="tool-band" style={{ background: tool.color, color: tool.ink || '#fff' }}>
        {tool.n}{band && <span>· {band}</span>}
      </div>
      <header className="tool-head">
        <div><h1>{title}</h1>{desc && <p>{desc}</p>}</div>
        {actions && <div className="actions">{actions}</div>}
      </header>
      <div className="tool-body">{children}</div>
    </section>
  );
}

export function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}{o.badge ? <span className="count">{o.badge}</span> : null}</button>
      ))}
    </div>
  );
}
