"""Spike: render data.json as a week-grid page (A안) with 1안 comparison."""
import json
import sys

TEMPLATE = r'''<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>학사일정 생성기 시험판</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--line:#dcdcd6;--ink:#222;--mute:#888;
 --hol:#fde2e1;--holink:#b42318;--warn:#f79009;--exam:#6941c6;--event:#1d4ed8;
 --period:#0e7c7b;--staff:#555;--class:#15803d}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:13px/1.4 "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
header h1{font-size:16px;margin:0}
.badge{background:#eef;border-radius:12px;padding:3px 10px}
.spike{background:#fff3cd;border-radius:4px;padding:2px 8px;font-size:12px}
header label{cursor:pointer}
button{font:inherit;padding:4px 10px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer}
main{display:flex;gap:12px;padding:12px 16px;align-items:flex-start}
.sems{flex:1;display:flex;gap:12px;flex-wrap:wrap;min-width:0}
.sem{flex:1 1 560px;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:auto}
.sem h2{font-size:14px;margin:0;padding:8px 10px;border-bottom:1px solid var(--line)}
table{border-collapse:collapse;width:100%;table-layout:fixed}
th{background:#f0f0ec;font-weight:600;padding:4px;border:1px solid var(--line)}
td{border:1px solid var(--line);vertical-align:top;padding:3px 4px;height:64px}
td.wk{width:34px;text-align:center;color:var(--mute);vertical-align:middle}
td.sat{background:#fafafa;width:9%}
.d{font-weight:600;font-size:12px;color:#444}
.d .mk{font-weight:400;color:var(--period);margin-left:3px;font-size:11px}
td.hol{background:var(--hol)}
td.hol .d{color:var(--holink)}
.h{color:var(--holink);font-weight:600;display:block}
.ev{display:block;border-left:3px solid var(--event);padding-left:4px;margin:2px 0;outline:none;border-radius:2px;word-break:keep-all}
.ev:focus{background:#eef4ff}
.ev.exam{border-color:var(--exam)} .ev.period{border-color:var(--period)}
.ev.staff{border-color:var(--staff);color:#555} .ev.cls{border-color:var(--class)}
.ev.conflict{background:#fff1e0;border-color:var(--warn)}
.ev.conflict::before{content:"⚠ ";color:var(--warn)}
.ev.range::after{content:" ✎";color:var(--mute)}
body.cmp .ev.diff{outline:2px dashed var(--warn);outline-offset:-1px}
.ghost{display:none;color:var(--mute);font-size:11px;margin:2px 0;text-decoration:line-through dotted}
body.cmp .ghost{display:block}
.ghost::before{content:"1안: "}
aside{width:280px;flex:none;position:sticky;top:60px;max-height:calc(100vh - 72px);overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}
aside h3{margin:0 0 6px;font-size:14px}
.flag{padding:6px;border-radius:6px;margin-bottom:4px;cursor:pointer;border:1px solid #fde4c4;background:#fffaf2}
.flag:hover{background:#ffefd6}
.flag b{display:block;font-size:12px}
.legend span{display:inline-block;margin-right:8px;font-size:11px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:3px;vertical-align:middle}
td.pulse{animation:pulse 1.4s 2}
@keyframes pulse{50%{box-shadow:inset 0 0 0 3px var(--warn)}}
@media (max-width:900px){main{flex-direction:column}aside{width:100%;position:static;max-height:none}}
</style></head>
<body class="cmp">
<header>
 <h1>2027학년도 학사일정 (자동 배치)</h1>
 <span class="spike">시험판</span>
 <span class="badge" id="stat"></span>
 <label><input type="checkbox" id="cmp" checked> 1안과 비교</label>
 <button id="csv">CSV 내려받기</button>
 <span class="legend">
  <span><i style="background:var(--hol)"></i>휴일</span><span><i style="background:var(--exam)"></i>평가</span>
  <span><i style="background:var(--event)"></i>행사</span><span><i style="background:var(--period)"></i>기간</span>
  <span><i style="background:var(--staff)"></i>교직원</span><span><i style="background:var(--class)"></i>자치·동아리</span>
 </span>
</header>
<main><div class="sems" id="sems"></div>
<aside><h3 id="ftitle"></h3><div id="flags"></div>
<p style="color:var(--mute);font-size:12px;margin-top:10px">비교 켜짐: 주황 점선 = 도구가 놓았지만 1안엔 그 날짜에 없음 · 회색 취소선 = 1안엔 있는데 도구는 그 날짜에 안 놓음. 칸의 글자를 눌러 바로 고칠 수 있어요.</p></aside>
</main>
<script>
const DATA = __DATA__;
const DAYS=['월','화','수','목','금','토'];
const iso=d=>d.toISOString().slice(0,10);
const add=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const norm=t=>t.replace(/\s+/g,'');
function cat(t){
 if(/고사|평가|진단|시험/.test(t))return'exam';
 if(/주간|캠페인|~/.test(t))return'period';
 if(/교직원|부장회의|평정회|연수|예배|정담회|총회/.test(t))return'staff';
 if(/학급자치|동아리|임원/.test(t))return'cls';
 return'';
}
const byDate={},refByDate={};
DATA.events.forEach(e=>(byDate[e.date]??=[]).push(e));
DATA.ref_only.forEach(r=>(refByDate[r.date]??=[]).push(r));
const s=DATA.stats;
document.getElementById('stat').textContent=`도구 배치 ${s.total}건 중 ${s.same}건이 1안과 같은 날 (${Math.round(s.same/s.total*100)}%)`;
const sems=document.getElementById('sems');
[1,2].forEach(sem=>{
 const keys=Object.keys(DATA.weeks).filter(k=>k.startsWith(sem+'-')).sort((a,b)=>+a.split('-')[1]-+b.split('-')[1]);
 const box=document.createElement('section');box.className='sem';
 box.innerHTML=`<h2>${sem}학기</h2>`;
 const tb=document.createElement('table');
 tb.innerHTML='<colgroup><col style="width:34px"></colgroup><tr><th>주</th>'+DAYS.map(d=>`<th>${d}</th>`).join('')+'</tr>';
 keys.forEach(k=>{
  const mon=DATA.weeks[k];const tr=document.createElement('tr');
  tr.innerHTML=`<td class="wk">${k.split('-')[1]}</td>`;
  for(let i=0;i<6;i++){
   const ds=add(mon,i);const td=document.createElement('td');td.dataset.date=ds;
   if(i==5)td.classList.add('sat');
   const day=+ds.slice(8),m=+ds.slice(5,7);
   const mk=DATA.markers[ds]?`<span class="mk">${DATA.markers[ds]}</span>`:'';
   td.innerHTML=`<div class="d">${day==1||(i==0&&k.endsWith('-1'))?m+'/':''}${day}${mk}</div>`;
   const hol=DATA.holidays[ds];
   if(hol){td.classList.add('hol');hol.forEach(h=>td.insertAdjacentHTML('beforeend',`<span class="h">${h}</span>`))}
   (byDate[ds]||[]).sort((a,b)=>a.sub-b.sub).forEach(e=>{
    const sp=document.createElement('span');sp.className='ev '+cat(e.text);
    if(e.status!=='ok')sp.classList.add(e.status);
    if(e.cmp!=='same')sp.classList.add('diff');
    sp.contentEditable=true;sp.textContent=e.text;
    sp.title=`작년 ${e.old}`+(e.status==='range'?' · 기간 날짜를 자동으로 바꿈':'')+(e.ref_dates?` · 1안에선 ${e.ref_dates.slice(0,4).join(', ')}${e.ref_dates.length>4?' …':''}`:'');
    td.appendChild(sp);
   });
   (refByDate[ds]||[]).forEach(r=>td.insertAdjacentHTML('beforeend',`<span class="ghost">${r.text}</span>`));
   tr.appendChild(td);
  }
  tb.appendChild(tr);
 });
 box.appendChild(tb);sems.appendChild(box);
});
document.getElementById('ftitle').textContent=`⚠ 확인 필요 ${DATA.flags.length}건`;
const fl=document.getElementById('flags');
DATA.flags.forEach(f=>{
 const d=document.createElement('div');d.className='flag';
 const dt=new Date(f.date+'T00:00:00Z');
 d.innerHTML=`<b>${dt.getUTCMonth()+1}/${dt.getUTCDate()}(${DAYS[(dt.getUTCDay()+6)%7]}) · ${f.kind}</b>${f.msg}`;
 d.onclick=()=>{const td=document.querySelector(`td[data-date="${f.date}"]`);if(!td)return;
  td.scrollIntoView({behavior:'smooth',block:'center'});td.classList.remove('pulse');void td.offsetWidth;td.classList.add('pulse')};
 fl.appendChild(d);
});
document.getElementById('cmp').onchange=e=>document.body.classList.toggle('cmp',e.target.checked);
document.getElementById('csv').onclick=()=>{
 const rows=[['날짜','요일','구분','내용']];
 document.querySelectorAll('td[data-date]').forEach(td=>{
  const ds=td.dataset.date,w=DAYS[(new Date(ds+'T00:00:00Z').getUTCDay()+6)%7];
  td.querySelectorAll('.h').forEach(h=>rows.push([ds,w,'휴일',h.textContent]));
  td.querySelectorAll('.ev').forEach(e=>rows.push([ds,w,'행사',e.textContent]));
 });
 const csv='﻿'+rows.map(r=>r.map(c=>`"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='2027_학사일정.csv';a.click();
};
</script></body></html>'''

data = json.load(open(sys.argv[1]))
open(sys.argv[2], 'w').write(TEMPLATE.replace('__DATA__', json.dumps(data, ensure_ascii=False)))
