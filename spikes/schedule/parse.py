"""Spike: parse the school's week-grid 학사일정 sheet into flat events."""
import re
import datetime as dt
import openpyxl

DAYS = ['월', '화', '수', '목', '금', '토']
# (month col, week col, first day col) for 1학기 / 2학기 halves
HALVES = {1: (1, 2, 3), 2: (9, 10, 11)}


def day_num(v):
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        m = re.match(r'\s*(\d{1,2})', v)
        if m:
            return int(m.group(1))
    return None


def parse_sheet(ws, year):
    """Return (weeks, events).

    weeks: {(sem, week): monday_date}
    events: list of dict(sem, week, wd, sub, span, text, date, marker)
    """
    merged = {}
    for m in ws.merged_cells.ranges:
        merged[(m.min_row, m.min_col)] = m.max_col - m.min_col + 1
    weeks, events, markers = {}, [], {}
    for sem, (mcol, wcol, dcol) in HALVES.items():
        hdr_rows = []
        for r in range(3, ws.max_row + 1):
            w = ws.cell(r, wcol).value
            if isinstance(w, (int, float)) and day_num(ws.cell(r, dcol).value) is not None:
                hdr_rows.append((r, int(w)))
        if not hdr_rows:
            continue
        # anchor on first row's month + Monday day, then step a week at a time
        month = int(ws.cell(hdr_rows[0][0], mcol).value)
        monday = dt.date(year, month, day_num(ws.cell(hdr_rows[0][0], dcol).value))
        for i, (r, w) in enumerate(hdr_rows):
            if i:
                monday += dt.timedelta(days=7)
                d0 = day_num(ws.cell(r, dcol).value)
                if d0 != monday.day:
                    print(f'WARN {ws.title} sem{sem} week{w}: sheet says {d0}, computed {monday}')
            dates = [monday + dt.timedelta(days=k) for k in range(6)]
            for k in range(6):
                raw = ws.cell(r, dcol + k).value
                if isinstance(raw, str) and re.sub(r'^\s*\d{1,2}', '', raw).strip():
                    markers[dates[k]] = re.sub(r'^\s*\d{1,2}', '', raw).strip()
            weeks[(sem, w)] = dates[0]
            end = hdr_rows[i + 1][0] if i + 1 < len(hdr_rows) else r + 4
            for rr in range(r + 1, end):
                if ws.cell(rr, wcol).value is not None and isinstance(ws.cell(rr, wcol).value, str):
                    break  # footer (출석일수 등)
                for k in range(6):
                    v = ws.cell(rr, dcol + k).value
                    if v is None or (isinstance(v, str) and not v.strip()):
                        continue
                    if isinstance(v, (int, float, dt.datetime)) or str(v).startswith('='):
                        continue  # stray number = date row of the other half
                    events.append(dict(sem=sem, week=w, wd=k, sub=rr - r,
                                       span=merged.get((rr, dcol + k), 1),
                                       text=str(v).strip(), date=dates[k]))
    return weeks, events, markers
