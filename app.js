(()=>{
const E=Engine,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TYPE={shore:'Shore',camp:'Near camp',party:'Party boat',charter:'Charter'};
const pad=n=>String(n).padStart(2,'0');
const now=new Date(),TODAY=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
const addDays=(ds,n)=>{const d=new Date(E.dmin(ds)*60000+n*86400000);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());};
const label=ds=>{const m=ds.split('-');return DAYS[E.dow(ds)]+' '+MON[+m[1]-1]+' '+(+m[2]);};
const NO_GO=55;

let store={reports:[],spots:[],wx:{},reviewed:[]};
try{const s=JSON.parse(localStorage.getItem('bfp-v1')||'null');if(s&&s.reports)store=Object.assign(store,s);}catch(e){}
const save=()=>{try{localStorage.setItem('bfp-v1',JSON.stringify(store));}catch(e){}};
const live={at:null,wx:{},errors:[],loaded:false};
let extraReports=[],inbox=[];
const REG=E.REGION;

function options(){
  return E.BASE.concat(store.spots.map(s=>({id:s.id,name:s.name,type:s.type,region:s.region,lat:s.lat,lng:s.lng,speed:REG[s.region].speed,station:REG[s.region].station,aff:REG[s.region].aff,note:'Your spot. Odds come from the area you chose, not a local report.'})));
}
function dates(){
  const a=E.dmin($('d1').value||TODAY),b=E.dmin($('d2').value||addDays(TODAY,9)),out=[];
  for(let t=a;t<=b&&out.length<14;t+=1440){const d=new Date(t*60000);out.push(d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()));}
  return out;
}
const tm=v=>{const p=(v||'0:0').split(':').map(Number);return p[0]*60+p[1];};
function wxFor(o,ds){
  const m=store.wx[ds];
  if(m&&(m.wind!==''&&m.wind!=null||m.seas!==''&&m.seas!=null))return{wind:m.wind,seas:m.seas,src:'you'};
  const l=live.wx[o.region]&&live.wx[o.region][ds];
  return l?{wind:l.wind,seas:l.seas,src:'live'}:null;
}
function cfg(){
  const orig=$('orig').value==='custom'?{lat:+$('olat').value,lng:+$('olng').value}:{lat:40.9445,lng:-73.9963};
  const targets=[];if($('t_blue').checked)targets.push('blue');if($('t_albie').checked)targets.push('albie');
  return{origin:orig,maxDrive:+$('maxd').value,rush:$('rush').checked,early:tm($('early').value),late:tm($('late').value)+($('after').checked?1440:0),session:+$('sess').value,night:$('night').checked,
    targets:targets.length?targets:['blue','albie'],kids:$('kids').checked,maxLen:+$('maxlen').value,
    weights:{fish:30,recent:25,tide:20,wx:10,drive:15},
    reports:E.REPORTS.concat(extraReports,store.reports),wxFor,today:TODAY};
}
function mapLink(o,c){return 'https://www.google.com/maps/dir/?api=1&origin='+c.origin.lat+','+c.origin.lng+'&destination='+o.lat+','+o.lng;}
function bar(l,v){return '<div class="bar"><span>'+l+'</span><i><b style="width:'+Math.round(v)+'%"></b></i><span>'+Math.round(v)+'</span></div>';}
function why(r,c){
  const o=r.o,out=[],boat=o.type==='party'||o.type==='charter';
  const off=(E.dmin(r.ds)-E.dmin('2026-10-01'))/1440;
  const ia=(p,x)=>{if(x<=p[0][0])return p[0][1];for(let i=1;i<p.length;i++)if(x<=p[i][0]){const a=p[i-1],b=p[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return p[p.length-1][1];};
  if(c.targets.includes('albie')){const v=ia(E.SEASON.albie[o.region],off);out.push({t:v>=.75?'Albie season is at or near its peak here.':(v>=.45?'Albies are still around but past their peak here.':'Albies are fading out of this area by then.'),f:v<.45});}
  if(c.targets.includes('blue')){const v=ia(E.SEASON.blue[o.region],off);out.push({t:v>=.75?'Bluefish are in season with no closure.':'Bluefish are tapering off here.',f:v<.5});}
  if(c.kids&&boat)out.push({t:'A party boat can switch to bottom fishing when blues go quiet, which keeps kids busy.',f:false});
  if(r.rec.newest){const n=r.rec.newest,m=n.date.split('-');out.push({t:'Latest report ('+MON[+m[1]-1]+' '+(+m[2])+', rated '+n.rating+' of 5): '+n.note,f:r.rec.conf<.4});if(r.rec.conf<.4)out.push({t:'That report is old, so it counts for little.',f:true});}
  else out.push({t:'No recent report for this one. Add one below to sharpen the ranking.',f:true});
  if(r.win.note)out.push({t:r.win.note+'.',f:false});
  else out.push({t:'Tide predictions do not cover this window, so tide is scored neutral.',f:true});
  if(!r.wx.known)out.push({t:'No forecast for this day yet.',f:true});
  else{
    const w=r.wx.wind,s=r.wx.seas,src=(wxFor(o,r.ds)||{}).src==='you'?'your entry':'live forecast';
    out.push({t:'Forecast ('+src+'): wind '+(w!==''&&w!=null?Math.round(w)+' mph':'unknown')+', seas '+(s!==''&&s!=null?(+s).toFixed(1)+' ft':'unknown')+'.',f:r.wx.risk});
    if(r.wx.risk)out.push({t:'Conditions look rough. Expect a cancelled boat or unsafe rocks.',f:true});
  }
  if(o.verify)out.push({t:o.verify,f:true});
  if(o.note&&o.type!=='party')out.push({t:o.note,f:false});
  return out;
}
function card(r,i,c){
  const o=r.o,boat=o.type==='party'||o.type==='charter';
  const times=boat?
    [['Leave home',E.fmt(r.leave)],['Board by',E.fmt(r.arrive)],['Fishing',E.fmt(r.win.st)+' to '+E.fmt(r.win.en)],['Home about',E.fmt(r.home)]]:
    [['Leave home',E.fmt(r.leave)],['Lines in',E.fmt(r.win.st)],['Lines out',E.fmt(r.win.en)],['Home about',E.fmt(r.home)]];
  return '<li class="card"><div class="rk">'+(i+1)+'</div><div><h3>'+esc(o.name)+'</h3><div class="meta"><span class="chip'+(o.type==='charter'?' charter':'')+'">'+TYPE[o.type]+'</span>'+label(r.ds)+' · drive '+E.dur(r.drive)+' each way</div>'
   +'<dl class="times">'+times.map(x=>'<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>').join('')+'</dl>'
   +'<ul class="why">'+why(r,c).map(x=>'<li'+(x.f?' class="flag"':'')+'>'+esc(x.t)+'</li>').join('')+'</ul>'
   +'<div class="links"><a href="'+mapLink(o,c)+'" target="_blank" rel="noopener">Directions</a>'+(o.phone?'<span>Phone '+esc(o.phone)+'</span>':'')+'</div></div>'
   +'<div class="sc"><div class="big">'+Math.round(r.total)+'</div><div class="lbl">Score</div>'+bar('Fish',r.fish)+bar('Reports',r.rec.score)+bar('Tide',r.tide)+bar('Weather',r.wx.score)+bar('Drive',r.driveScore)+'</div></li>';
}
function mini(r,k,c){
  const o=r.o,boat=o.type==='party'||o.type==='charter';
  return '<div class="mini"><div class="mrk">'+k+'</div><div><b>'+esc(o.name)+'</b> <span class="chip'+(o.type==='charter'?' charter':'')+'">'+TYPE[o.type]+'</span>'
   +'<div class="small">Leave '+E.fmt(r.leave)+' · '+(boat?'board by '+E.fmt(r.arrive)+' · ':'lines in '+E.fmt(r.win.st)+' · ')+'home about '+E.fmt(r.home)+' · drive '+E.dur(r.drive)+'</div></div>'
   +'<div class="mscore">'+Math.round(r.total)+'</div></div>';
}
function topPerSpot(rs){const seen={},out=[];rs.slice().sort((a,b)=>b.total-a.total).forEach(r=>{if(!seen[r.o.id]){seen[r.o.id]=1;out.push(r);}});return out;}
function reportAge(c,spots){
  let newest=null;c.reports.forEach(r=>{if(!spots||spots.includes(r.spot))if(!newest||r.date>newest)newest=r.date;});
  return newest==null?null:Math.round((E.dmin(TODAY)-E.dmin(newest))/1440);
}
function verdict(best,all,ds,c){
  const box=$('verdict');
  const age=reportAge(c),liveOk=Object.keys(live.wx).length>0,tideOk=Object.keys(E.TIDES).length>0;
  const basis='<p class="small" style="margin:8px 0 0">Based on: '
    +(liveOk?'live forecast':'<b>no live forecast</b>')+' · '+(tideOk?'tide predictions':'<b>no tides</b>')+' · '
    +(age==null?'<b>no reports</b>':(age>5?'<b>newest report is '+age+' days old</b>':'newest report '+age+(age===1?' day':' days')+' old'))+'.</p>';
  if(!best){box.className='panel verdict nogo';box.innerHTML='<h2>No trip fits</h2><p style="margin:0">Try a later home time, a longer drive limit or a longer boat trip, or turn on another way to fish.</p>'+basis;return;}
  const why=[];
  if(best.wx.risk)why.push('the forecast for '+label(best.ds)+' looks rough');
  if(best.total<NO_GO)why.push('the best score is only '+Math.round(best.total)+' out of 100');
  if(age!=null&&age>7)why.push('the newest report is '+age+' days old, so fish locations are a guess');
  const nogo=best.wx.risk||best.total<NO_GO;
  if(nogo){
    box.className='panel verdict nogo';
    box.innerHTML='<h2>No-go for these dates</h2><p style="margin:0">Staying home is the right call: '+esc(why.join(', and '))+'. Check again after the next weekly reports and a fresh forecast.</p>'+basis;
  }else{
    box.className='panel verdict go';
    box.innerHTML='<h2>Go: '+label(best.ds)+'</h2><p style="margin:0"><b>'+esc(best.o.name)+'</b> scores '+Math.round(best.total)+'. Leave home at '+E.fmt(best.leave)+' and be back about '+E.fmt(best.home)+'.'+(why.length?' Watch out: '+esc(why.join(', and '))+'.':'')+'</p>'+basis;
  }
}
function weekend(all,ds,c){
  const box=$('weekend');
  const sat=ds.find(d=>E.dow(d)===6),sun=ds.find(d=>E.dow(d)===0&&(!sat||d>sat));
  const days=[sat,sun].filter(Boolean);
  $('wkhint').textContent=days.length?days.map(label).join(' and '):'';
  if(!days.length){box.innerHTML='<div class="empty">Your date range has no Saturday or Sunday. Widen it to see a weekend plan.</div>';return;}
  const cols=days.map(d=>({d,top:topPerSpot(all.filter(r=>r.ds===d)).slice(0,3)}));
  const real=cols.filter(x=>x.top.length);
  if(!real.length){box.innerHTML='<div class="empty">Nothing fits your schedule on those days.</div>';return;}
  const pick=real.slice().sort((a,b)=>b.top[0].total-a.top[0].total)[0];
  const ok=!(pick.top[0].wx.risk||pick.top[0].total<NO_GO);
  box.innerHTML='<div class="panel wk"><p style="margin:0 0 10px">'+(ok?'<b>Best day: '+label(pick.d)+'.</b> Other day is the backup.':'<b>No good weekend day yet.</b> The scores below are the least bad options.')+'</p><div class="wkgrid">'
   +cols.map(x=>'<div><h3>'+label(x.d)+(x.d===pick.d&&ok?' <span class="chip">Best</span>':'')+'</h3>'+(x.top.length?x.top.map((r,i)=>mini(r,i+1,c)).join(''):'<p class="small">'+(x.d===TODAY?'Too late to leave today.':'Nothing fits.')+'</p>')+'</div>').join('')+'</div></div>';
}
function run(){
  const c=cfg(),ds=dates(),modes=['shore','party','camp','charter'].filter(m=>$('m_'+m).checked);
  $('customrow').hidden=$('orig').value!=='custom';
  const opts=options().filter(o=>modes.includes(o.type)),all=[],grid={},drop={};
  const t0=new Date(),nowMin=t0.getHours()*60+t0.getMinutes();
  opts.forEach(o=>ds.forEach(d=>{
    const r=E.evaluate(o,d,c);
    if(r.ok&&d===TODAY&&r.leave<nowMin+30){drop.past=(drop.past||0)+1;return;}
    if(r.ok){all.push(r);grid[o.id+d]=r.total;}else drop[r.reason]=(drop[r.reason]||0)+1;
  }));
  let list=all.slice().sort((a,b)=>b.total-a.total);
  verdict(list[0],all,ds,c);
  weekend(all,ds,c);
  if($('best').checked){const seen={};list=list.filter(r=>seen[r.o.id]?false:(seen[r.o.id]=1));}
  list=list.slice(0,+$('topn').value);
  $('summary').textContent=all.length+' workable trips across '+ds.length+' days';
  $('cards').innerHTML=list.length?list.map((r,i)=>card(r,i,c)).join(''):'<li class="empty">Nothing fits. Try a later "be home by" time, a longer drive limit, or turn on another way to fish. '+(drop.drive?drop.drive+' spot-days were over your drive limit. ':'')+(drop.schedule?drop.schedule+' did not fit your hours. ':'')+(drop.length?drop.length+' boat trips were longer than your limit.':'')+'</li>';
  const rows=opts.filter(o=>ds.some(d=>grid[o.id+d]!=null));
  $('matrix').innerHTML=rows.length?'<thead><tr><th class="n">Spot or boat</th>'+ds.map(d=>'<th>'+label(d).replace(' ','<br>')+'</th>').join('')+'</tr></thead><tbody>'
   +rows.map(o=>'<tr><td class="n">'+esc(o.name)+'</td>'+ds.map(d=>{const v=grid[o.id+d];return v==null?'<td class="v" style="color:var(--muted)">–</td>':'<td class="v" style="background:color-mix(in srgb,var(--sea) '+Math.round(Math.max(0,v-30)*.85)+'%,var(--card))">'+Math.round(v)+'</td>';}).join('')+'</tr>').join('')+'</tbody>'
   :'<tbody><tr><td class="empty">No spot fits these settings.</td></tr></tbody>';
  wxRows(ds);
}
function wxRows(ds){
  const box=$('wxrows');if(box.dataset.k===ds.join(','))return;box.dataset.k=ds.join(',');
  box.innerHTML='<div class="wxrow small"><span></span><span>Wind mph</span><span>Seas ft</span></div>'+ds.map(d=>{
    const w=store.wx[d]||{},l=live.wx.nj&&live.wx.nj[d];
    return '<div class="wxrow"><span>'+label(d)+'</span><input type="number" min="0" max="80" id="ww_'+d+'" value="'+(w.wind??'')+'" placeholder="'+(l&&l.wind!=null?Math.round(l.wind):'')+'" aria-label="Wind mph '+label(d)+'"><input type="number" min="0" max="30" step="0.5" id="ws_'+d+'" value="'+(w.seas??'')+'" placeholder="'+(l&&l.seas!=null?(+l.seas).toFixed(1):'')+'" aria-label="Seas ft '+label(d)+'"></div>';}).join('');
  ds.forEach(d=>{const f=()=>{store.wx[d]={wind:$('ww_'+d).value,seas:$('ws_'+d).value};save();run();};$('ww_'+d).addEventListener('input',f);$('ws_'+d).addEventListener('input',f);});
}
function fillSpots(){
  const cur=$('rspot').value;
  $('rspot').innerHTML=options().map(o=>'<option value="'+o.id+'">'+esc(o.name)+'</option>').join('');
  if(cur)$('rspot').value=cur;
}
function rlist(){
  const nm={};options().forEach(o=>nm[o.id]=o.name);
  const mine=store.reports.map((r,i)=>({r,i}));
  $('rlist').innerHTML=mine.length?'<div class="small" style="margin-bottom:4px">Your reports</div>'+mine.map(x=>'<div class="small" style="display:flex;gap:8px;justify-content:space-between;align-items:center;padding:3px 0;border-top:1px solid var(--line)"><span>'+esc(nm[x.r.spot]||x.r.spot)+' · '+x.r.date+' · '+x.r.rating+'/5 '+esc(x.r.note||'')+'</span><button class="ghost" data-del="'+x.i+'" type="button">Remove</button></div>').join(''):'';
  $('rlist').querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{store.reports.splice(+b.dataset.del,1);save();rlist();run();}));
}
function renderInbox(){
  const seen=new Set(store.reviewed.concat(extraReports.map(r=>r.source).filter(Boolean)));
  const fresh=inbox.filter(i=>!seen.has(i.url));
  $('inboxpanel').hidden=!fresh.length;
  $('inbox').innerHTML=fresh.map((i,k)=>'<div class="small" style="display:flex;gap:8px;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid var(--line)"><span><a href="'+esc(i.url)+'" target="_blank" rel="noopener">'+esc(i.title)+'</a> · '+esc(i.region)+(i.date?' · '+i.date:'')+'</span><button class="ghost" data-read="'+k+'" type="button">Mark as read</button></div>').join('');
  $('inbox').querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>{store.reviewed.push(fresh[+b.dataset.read].url);save();renderInbox();}));
}
function status(){
  const el=$('status');
  if(!live.loaded){el.innerHTML='<b>Live data is not available.</b> The planner is using built-in tides for Oct 1 to Oct 14 and neutral weather. Enter the forecast by hand below, or reload when you are online.';return;}
  const age=live.at?Math.round((Date.now()-new Date(live.at))/36e5):null;
  const stale=age==null||age>12;
  let t=live.at?'<b>Live data updated '+(age<1?'less than an hour':age+(age===1?' hour':' hours'))+' ago.</b> ':'<b>Live data has not refreshed yet.</b> ';
  t+='Tides for '+Object.keys(E.TIDES).length+' station'+(Object.keys(E.TIDES).length===1?'':'s')+', forecast for '+Object.keys(live.wx).length+' area'+(Object.keys(live.wx).length===1?'':'s')+'.';
  if(live.errors&&live.errors.length&&live.at)t+=' Some lookups failed: '+esc(live.errors.slice(0,3).join('; '))+'.';
  el.innerHTML=t;el.classList.toggle('stale',stale);
}
async function getJSON(u){const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();}
async function load(){
  try{
    const d=await getJSON('data/live.json');
    Object.entries(d.tides||{}).forEach(([st,ev])=>E.setTides(st,ev));
    live.wx=d.wx||{};live.at=d.generatedAt;live.errors=d.errors||[];live.loaded=true;
  }catch(e){live.loaded=false;}
  try{const r=await getJSON('data/reports.json');if(Array.isArray(r))extraReports=r;}catch(e){}
  try{const r=await getJSON('data/inbox.json');if(Array.isArray(r))inbox=r;}catch(e){}
  status();renderInbox();$('wxnote').innerHTML=Object.keys(live.wx).length?'Forecasts below fill in automatically from the live marine forecast. Type a wind or seas value to override it for a day. Greyed numbers are the live values.':'No live forecast is loaded. Look up the <a href="https://www.weather.gov/marine/" target="_blank" rel="noopener">marine forecast</a> and enter wind in mph and seas in feet. Days left blank get a neutral weather score.';
  $('wxrows').dataset.k='';run();
}
$('radd').addEventListener('click',()=>{
  const d=$('rdate').value||TODAY;
  store.reports.push({spot:$('rspot').value,date:d,rating:+$('rrate').value,note:$('rnote').value.trim()});
  save();$('rnote').value='';$('rmsg').textContent=' Added.';rlist();run();
});
$('sadd').addEventListener('click',()=>{
  const n=$('sname').value.trim(),la=parseFloat($('slat').value),ln=parseFloat($('slng').value);
  if(!n||isNaN(la)||isNaN(ln)){$('smsg').textContent=' Enter a name, latitude and longitude.';return;}
  store.spots.push({id:'c'+Date.now(),name:n,type:$('stype').value,region:$('sreg').value,lat:la,lng:ln});
  save();$('sname').value='';$('slat').value='';$('slng').value='';$('smsg').textContent=' Added.';fillSpots();run();
});
document.querySelectorAll('.controls input,.controls select').forEach(el=>el.addEventListener('input',run));
$('d1').value=TODAY;$('d2').value=addDays(TODAY,9);$('rdate').value=TODAY;
fillSpots();rlist();status();run();load();
})();
