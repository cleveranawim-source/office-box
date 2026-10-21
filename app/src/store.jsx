// 앱 상태: 이 브라우저(localStorage)에만 저장한다.
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_REQUIRED } from './lib/required.js';
import { DEFAULT_WEIGHTS } from './lib/assign.js';

export const KEY = 'office-box/v1';

export const initialState = () => ({
  schedule: null, // { source, result }
  timetable: null, // { label, classes, demo }
  hours: { sch: null, schSource: '', overrides: {}, base: 17, rule: 'full' },
  required: { items: DEFAULT_REQUIRED, excluded: [], manual: [] },
  assign: { students: null, rules: [], fixed: {}, classCount: 4, weights: DEFAULT_WEIGHTS, result: null, label: '', demo: false },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw);
    const base = initialState();
    const required = { ...base.required, ...saved.required };
    // 새로 생긴 필수교육은 예전 저장본에도 덧붙인다 (선생님이 고친 기준은 그대로)
    const have = new Set(required.items.map((i) => i.id));
    required.items = [...required.items, ...DEFAULT_REQUIRED.filter((i) => !have.has(i.id))];
    return { ...base, ...saved, hours: { ...base.hours, ...saved.hours }, required, assign: { ...base.assign, ...saved.assign } };
  } catch {
    return initialState();
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [saveError, setSaveError] = useState('');
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); setSaveError(''); }
      catch { setSaveError('브라우저 저장 공간이 모자라 저장하지 못했어요. 결과를 엑셀로 내려받아 두세요.'); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [state]);
  const api = useMemo(() => ({
    state,
    saveError,
    set: (slice, value) => setState((s) => ({ ...s, [slice]: typeof value === 'function' ? value(s[slice]) : value })),
    patch: (slice, part) => setState((s) => ({ ...s, [slice]: { ...s[slice], ...(typeof part === 'function' ? part(s[slice]) : part) } })),
    reset: () => { try { localStorage.removeItem(KEY); } catch { /* 저장소 접근 불가 */ } setState(initialState()); },
  }), [state, saveError]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
