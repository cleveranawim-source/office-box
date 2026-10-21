"""Spike: move 2026 events onto the 2027 calendar, compare with the hand-made 1안."""
import re
import json
import sys
import datetime as dt
import openpyxl
import parse

HOLIDAY = re.compile(r'대체\s*(공)?휴일|삼일절|어린이날|노동절|제헌절|현충일|광복절|추석|설날|한글날|'
                     r'개천절|신정|성탄절|부처님오신날|임시공휴일')
DISCRETION = re.compile(r'재량휴업')
RANGE = re.compile(r'\((\d{1,2})?\s*~\s*(\d{1,2})\)')


def norm(t):
    return re.sub(r'\s+', '', t)


def shift_ranges(text, old_date, offset):
    """'(14~21)' / '(~13)' are day numbers relative to the event's month; shift them."""
    def to_date(n):
        d = old_date.replace(day=1)
        cand = dt.date(d.year, d.month, n) if n <= 31 else None
        if cand < old_date.replace(day=1) or (n < old_date.day and cand < old_date - dt.timedelta(days=7)):
            m = d.month % 12 + 1
            cand = dt.date(d.year + (d.month == 12), m, n)
        return cand

    def rep(m):
        a, b = m.group(1), m.group(2)
        nb = (to_date(int(b)) + offset).day
        if a:
            na = (to_date(int(a)) + offset).day
            return f'({na}~{nb})'
        return f'(~{nb})'
    new = RANGE.sub(rep, text)
    return new, new != text


def main(src, out_json):
    wb = openpyxl.load_workbook(src)
    old_w, old_e, old_m = parse.parse_sheet(wb['2026 학사일정'], 2026)
    new_w, blank_e, _ = parse.parse_sheet(wb['2027 학사일정(빈양식)'], 2027)
    ref_w, ref_e, ref_m = parse.parse_sheet(wb['2027 학사일정(1안)'], 2027)

    holidays = {}
    for e in blank_e:
        holidays.setdefault(e['date'], []).append(e['text'])

    placed, flags = [], []
    for e in old_e:
        key = (e['sem'], e['week'])
        if HOLIDAY.search(e['text']):
            continue  # 작년 공휴일은 버리고 새해 공휴일(빈양식)로 대체
        if DISCRETION.search(e['text']):
            nd = new_w[key] + dt.timedelta(days=e['wd'])
            if not any(DISCRETION.search(h) for h in holidays.get(nd, [])):
                flags.append(dict(date=nd.isoformat(), kind='재량',
                                  msg=f"작년 {e['date']:%m/%d} '{e['text']}' — 올해 재량휴업일로 정할지 확인"))
            continue
        if key not in new_w:
            flags.append(dict(date=e['date'].isoformat(), kind='주없음',
                              msg=f"'{e['text']}' — 새해에 {e['sem']}학기 {e['week']}주가 없음"))
            continue
        nd = new_w[key] + dt.timedelta(days=e['wd'])
        offset = nd - e['date']
        text, changed = shift_ranges(e['text'], e['date'], offset)
        item = dict(date=nd.isoformat(), old=e['date'].isoformat(), text=text,
                    sub=e['sub'], span=e['span'], status='ok')
        if changed:
            item['status'] = 'range'
        if nd in holidays:
            item['status'] = 'conflict'
            flags.append(dict(date=nd.isoformat(), kind='겹침',
                              msg=f"'{text}' — {'/'.join(holidays[nd])}과(와) 겹침"))
        placed.append(item)

    # 비교: 1안(사람이 만든 것) vs 도구
    ref = [dict(date=e['date'].isoformat(), text=e['text']) for e in ref_e
           if not HOLIDAY.search(e['text']) and not DISCRETION.search(e['text'])]
    ref_by = {}
    for r in ref:
        ref_by.setdefault(norm(r['text']), []).append(r['date'])
    tool_by = {}
    for p in placed:
        tool_by.setdefault(norm(p['text']), []).append(p['date'])
    for p in placed:
        dates = ref_by.get(norm(p['text']), [])
        if p['date'] in dates:
            p['cmp'] = 'same'
        elif dates:
            p['cmp'] = 'moved'
            p['ref_dates'] = sorted(set(dates))
        else:
            p['cmp'] = 'tool_only'
    ref_only = [r for r in ref if r['date'] not in tool_by.get(norm(r['text']), [])]

    markers = {}
    for d, m in old_m.items():
        for (s, w), mon in old_w.items():
            if mon <= d < mon + dt.timedelta(days=7) and (s, w) in new_w:
                markers[(new_w[(s, w)] + (d - mon)).isoformat()] = m

    weeks = {f'{s}-{w}': mon.isoformat() for (s, w), mon in new_w.items()}
    data = dict(weeks=weeks, holidays={d.isoformat(): v for d, v in holidays.items()},
                events=placed, flags=sorted(flags, key=lambda f: f['date']),
                ref_only=ref_only, markers=markers,
                stats=dict(total=len(placed),
                           same=sum(p['cmp'] == 'same' for p in placed),
                           moved=sum(p['cmp'] == 'moved' for p in placed),
                           tool_only=sum(p['cmp'] == 'tool_only' for p in placed),
                           ref_only=len(ref_only)))
    json.dump(data, open(out_json, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(data['stats'], ensure_ascii=False))
    print('flags:')
    for f in data['flags']:
        print(' ', f['date'], f['kind'], f['msg'])
    print('moved:')
    for p in placed:
        if p['cmp'] == 'moved':
            print(' ', p['date'], '→ 1안', p['ref_dates'], p['text'])
    print('tool_only:')
    for p in placed:
        if p['cmp'] == 'tool_only':
            print(' ', p['date'], p['text'])
    print('ref_only:')
    for r in ref_only:
        print(' ', r['date'], r['text'])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
