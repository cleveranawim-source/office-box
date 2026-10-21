// 주 단위 달력 모양(월 · 주 · 월~토) 학사일정 시트를 읽는 공용 함수. SheetJS(XLSX) 필요.
const DAYS=['월','화','수','목','금','토'];
const HOLIDAY_RE=/대체\s*(공)?휴일|삼일절|어린이날|노동절|제헌절|현충일|광복절|추석|설날|한글날|개천절|신정|성탄절|부처님오신날|임시공휴일|국회의원선거/;
const DISC_RE=/재량휴업/;

// ---- date helpers (UTC, ISO strings) ----
const D=s=>new Date(s+'T00:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const add=(s,n)=>{const d=D(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const diff=(a,b)=>Math.round((D(a)-D(b))/864e5);
const ymd=(y,m,d)=>iso(new Date(Date.UTC(y,m-1,d)));
const wdIndex=s=>(D(s).getUTCDay()+6)%7;
const wdName=s=>DAYS[wdIndex(s)]||'일';
const norm=t=>t.replace(/\s+/g,'');

async function fetchSheet(url){
 const m=url.match(/\/spreadsheets\/d\/([\w-]+)/);
 if(!m)throw new Error('구글시트 링크 모양이 아니에요.');
 const r=await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=xlsx`);
 if(!r.ok)throw new Error('HTTP '+r.status);
 const buf=await r.arrayBuffer();
 if(new Uint8Array(buf.slice(0,2))[0]!==0x50)throw new Error('xlsx가 아님');
 return buf;
}

function yearOf(name,ws){
 const t=(name+' '+(ws['A1']?.v??'')).match(/(20\d\d)/);return t?+t[1]:null;
}
function cell(ws,r,c){return ws[XLSX.utils.encode_cell({r,c})]}
function dayNum(v){
 if(typeof v==='number')return Math.trunc(v);
 if(typeof v==='string'){const m=v.match(/^\s*(\d{1,2})/);if(m)return +m[1]}
 return null;
}
function findLayout(ws){
 if(!ws['!ref'])return[];
 const out=[];
 for(let r=0;r<5;r++)for(let c=0;c<40;c++){
  const v=cell(ws,r,c)?.v;
  if(typeof v==='string'&&v.trim()==='주'&&c>=1)out.push({hdr:r,mcol:c-1,wcol:c,dcol:c+1});
 }
 return out;
}
// 머리글 "월(6교시)" 같은 표기에서 요일별 교시 수를 읽음 (없으면 null)
function periodsFromHeader(ws){
 const L=findLayout(ws)[0];if(!L)return null;
 const out=[];
 for(let k=0;k<5;k++){const m=String(cell(ws,L.hdr,L.dcol+k)?.v??'').match(/(\d)\s*교시/);out.push(m?+m[1]:null)}
 return out.every(x=>x)?out:null;
}
function parseSheet(ws,year){
 if(!year)return{error:'탭 이름이나 제목에서 연도를 찾지 못했어요.'};
 const merges={};(ws['!merges']||[]).forEach(m=>merges[m.s.r+','+m.s.c]=m.e.c-m.s.c+1);
 const range=XLSX.utils.decode_range(ws['!ref']);
 const weeks={},events=[],markers={};
 findLayout(ws).forEach((L,i)=>{
  const sem=i+1;
  const hdr=[];
  for(let r=L.hdr+1;r<=range.e.r;r++){
   const w=cell(ws,r,L.wcol)?.v;
   if(typeof w==='number'&&dayNum(cell(ws,r,L.dcol)?.v)!=null)hdr.push([r,w]);
  }
  if(!hdr.length)return;
  const month=+cell(ws,hdr[0][0],L.mcol)?.v;
  const yy=sem===2&&month<3?year+1:year;
  let mon=ymd(yy,month,dayNum(cell(ws,hdr[0][0],L.dcol).v));
  hdr.forEach(([r,w],j)=>{
   if(j)mon=add(mon,7);
   const dates=[0,1,2,3,4,5].map(k=>add(mon,k));
   weeks[sem+'-'+w]=mon;
   for(let k=0;k<6;k++){
    const raw=cell(ws,r,L.dcol+k)?.v;
    if(typeof raw==='string'){const rest=raw.replace(/^\s*\d{1,2}/,'').trim();if(rest)markers[dates[k]]=rest}
   }
   const end=j+1<hdr.length?hdr[j+1][0]:Math.min(range.e.r+1,r+10);
   for(let rr=r+1;rr<end;rr++){
    const isLabel=c=>{const v=cell(ws,rr,c)?.v;return typeof v==='string'&&v.trim()!==''};
    if(isLabel(L.wcol)||isLabel(L.mcol))break; // 출석일수 등 아래 표
    for(let k=0;k<6;k++){
     const c=cell(ws,rr,L.dcol+k);
     if(!c||c.f||c.t!=='s')continue;
     const t=String(c.v).trim();if(!t)continue;
     events.push({sem,week:w,wd:k,sub:rr-r,span:merges[rr+','+(L.dcol+k)]||1,text:t,date:dates[k]});
    }
   }
  });
 });
 if(!weeks['1-1'])return{error:'1학기 1주를 찾지 못했어요.'};
 return{year,weeks,events,markers};
}
