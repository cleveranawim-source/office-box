// 엑셀·구글시트 읽기와 주 단위 달력형(월 · 주 · 월~토) 학사일정 시트 해석.
import * as XLSX from 'xlsx';
import { add, ymd } from './dates.js';

export { XLSX };

export function readWorkbook(buf) {
  return XLSX.read(buf, { type: 'array', cellFormula: true });
}

export function sheetIdOf(url) {
  const m = String(url).match(/\/spreadsheets\/d\/([\w-]+)/);
  return m ? m[1] : null;
}

export async function fetchSheet(url) {
  const id = sheetIdOf(url);
  if (!id) throw new Error('구글시트 링크 모양이 아니에요. 주소창의 https://docs.google.com/spreadsheets/d/… 전체를 붙여 넣어 주세요.');
  let r;
  try {
    r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
  } catch {
    throw new Error('시트를 받아 오지 못했어요. 인터넷 연결을 확인해 주세요.');
  }
  const buf = r.ok ? await r.arrayBuffer() : null;
  if (!buf || new Uint8Array(buf.slice(0, 2))[0] !== 0x50) {
    throw new Error('시트를 열 수 없어요. 구글시트 공유 설정을 ‘링크가 있는 모든 사용자 — 뷰어’로 바꾸거나, 파일 → 다운로드 → xlsx로 받아 파일로 올려 주세요.');
  }
  return buf;
}

export function yearOf(name, ws) {
  const t = (name + ' ' + (ws?.A1?.v ?? '')).match(/(20\d\d)/);
  return t ? +t[1] : null;
}

const cell = (ws, r, c) => ws[XLSX.utils.encode_cell({ r, c })];

function dayNum(v) {
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'string') { const m = v.match(/^\s*(\d{1,2})/); if (m) return +m[1]; }
  return null;
}

export function findLayout(ws) {
  if (!ws || !ws['!ref']) return [];
  const out = [];
  for (let r = 0; r < 5; r++) for (let c = 1; c < 40; c++) {
    const v = cell(ws, r, c)?.v;
    if (typeof v === 'string' && v.trim() === '주') out.push({ hdr: r, mcol: c - 1, wcol: c, dcol: c + 1 });
  }
  return out;
}

export function weekGridTabs(wb) {
  return wb.SheetNames.filter((n) => findLayout(wb.Sheets[n]).length);
}

// 기본 탭: ‘안·빈양식·사본’이 아닌 탭 중 가장 최근 연도
export function defaultTab(wb, tabs, exclude = /안\)|빈|사본/) {
  const plain = tabs.filter((n) => !exclude.test(n));
  return (plain.length ? plain : tabs).slice()
    .sort((a, b) => (yearOf(b, wb.Sheets[b]) || 0) - (yearOf(a, wb.Sheets[a]) || 0))[0];
}

/** 주 단위 달력형 시트 → { year, weeks:{'학기-주': 월요일}, events:[{sem,week,wd,sub,text,date}], markers:{date: '♧1'} } */
export function parseWeekGrid(ws, year) {
  if (!year) return { error: '탭 이름이나 제목에서 연도(예: 2026)를 찾지 못했어요.' };
  const range = XLSX.utils.decode_range(ws['!ref']);
  const weeks = {}, events = [], markers = {};
  let bad = '';
  findLayout(ws).forEach((L, i) => {
    const sem = i + 1;
    const hdr = [];
    for (let r = L.hdr + 1; r <= range.e.r; r++) {
      const w = cell(ws, r, L.wcol)?.v;
      if (typeof w === 'number' && dayNum(cell(ws, r, L.dcol)?.v) != null) hdr.push([r, w]);
    }
    if (!hdr.length) return;
    const month = parseInt(String(cell(ws, hdr[0][0], L.mcol)?.v), 10); // '3' 또는 '3월'
    if (!(month >= 1 && month <= 12)) { bad = `${sem}학기 첫 주의 ‘월’ 칸에서 달을 읽지 못했어요.`; return; }
    const yy = sem === 2 && month < 3 ? year + 1 : year;
    let mon = ymd(yy, month, dayNum(cell(ws, hdr[0][0], L.dcol).v));
    hdr.forEach(([r, w], j) => {
      if (j) {
        // 보통 다음 주지만, 방학 등으로 건너뛴 주는 그 줄에 적힌 월요일 날짜를 따른다
        const d0 = dayNum(cell(ws, r, L.dcol)?.v);
        let next = add(mon, 7);
        for (let k = 0; d0 != null && k < 8 && +next.slice(8) !== d0; k++) next = add(next, 7);
        mon = d0 != null && +next.slice(8) === d0 ? next : add(mon, 7);
      }
      const dates = [0, 1, 2, 3, 4, 5].map((k) => add(mon, k));
      weeks[sem + '-' + w] = mon;
      for (let k = 0; k < 6; k++) {
        const raw = cell(ws, r, L.dcol + k)?.v;
        if (typeof raw === 'string') { const rest = raw.replace(/^\s*\d{1,2}/, '').trim(); if (rest) markers[dates[k]] = rest; }
      }
      const end = j + 1 < hdr.length ? hdr[j + 1][0] : Math.min(range.e.r + 1, r + 10);
      for (let rr = r + 1; rr < end; rr++) {
        const isLabel = (c) => { const v = cell(ws, rr, c)?.v; return typeof v === 'string' && v.trim() !== ''; };
        if (isLabel(L.wcol) || isLabel(L.mcol)) break; // 출석일수 등 아래 표
        for (let k = 0; k < 6; k++) {
          const c = cell(ws, rr, L.dcol + k);
          if (!c || c.f || c.t !== 's') continue;
          const t = String(c.v).trim();
          if (!t) continue;
          events.push({ sem, week: w, wd: k, sub: rr - r, text: t, date: dates[k] });
        }
      }
    });
  });
  if (bad) return { error: bad };
  if (!weeks['1-1']) return { error: '1학기 1주를 찾지 못했어요. “월 · 주 · 월~토” 머리글이 있는 탭인지 확인해 주세요.' };
  return { year, weeks, events, markers };
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}
