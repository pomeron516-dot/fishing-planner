const Engine=(()=>{
const TIDE_RAW=[["2026-10-01 05:24",0.365],["2026-10-01 11:44",5.66],["2026-10-01 18:24",0.602],["2026-10-02 00:27",4.528],["2026-10-02 06:17",0.637],["2026-10-02 12:48",5.482],["2026-10-02 19:32",0.809],["2026-10-03 01:32",4.431],["2026-10-03 07:26",0.887],["2026-10-03 13:54",5.342],["2026-10-03 20:46",0.851],["2026-10-04 02:37",4.45],["2026-10-04 08:46",0.976],["2026-10-04 14:59",5.255],["2026-10-04 21:55",0.706],["2026-10-05 03:42",4.582],["2026-10-05 10:00",0.86],["2026-10-05 16:05",5.234],["2026-10-05 22:54",0.461],["2026-10-06 04:48",4.834],["2026-10-06 11:04",0.634],["2026-10-06 17:09",5.295],["2026-10-06 23:46",0.21],["2026-10-07 05:48",5.175],["2026-10-07 12:00",0.399],["2026-10-07 18:07",5.399],["2026-10-08 00:32",0.021],["2026-10-08 06:40",5.514],["2026-10-08 12:51",0.214],["2026-10-08 18:56",5.47],["2026-10-09 01:16",-0.075],["2026-10-09 07:25",5.77],["2026-10-09 13:39",0.1],["2026-10-09 19:41",5.457],["2026-10-10 01:59",-0.068],["2026-10-10 08:06",5.901],["2026-10-10 14:26",0.062],["2026-10-10 20:22",5.344],["2026-10-11 02:39",0.031],["2026-10-11 08:46",5.897],["2026-10-11 15:10",0.099],["2026-10-11 21:03",5.143],["2026-10-12 03:18",0.206],["2026-10-12 09:25",5.772],["2026-10-12 15:52",0.213],["2026-10-12 21:44",4.878],["2026-10-13 03:55",0.437],["2026-10-13 10:03",5.556],["2026-10-13 16:31",0.401],["2026-10-13 22:26",4.584],["2026-10-14 04:30",0.703],["2026-10-14 10:44",5.286],["2026-10-14 17:11",0.645],["2026-10-14 23:11",4.298]];
const tmin=s=>{const m=s.match(/(\d+)-(\d+)-(\d+)[ T](\d+):(\d+)/);return Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5])/60000;};
const dmin=ds=>{const m=ds.split('-');return Date.UTC(+m[0],m[1]-1,+m[2])/60000;};
const TIDES={};
function setTides(st,raw){
  const ev=raw.map(([s,h])=>({t:tmin(s),h:+h})).filter(e=>isFinite(e.t)&&isFinite(e.h)).sort((a,b)=>a.t-b.t);
  ev.forEach((e,i)=>{const p=ev[i-1],n=ev[i+1];e.hi=(!p||e.h>p.h)&&(!n||e.h>n.h);});
  if(ev.length>=4)TIDES[st]=ev;
}
setTides('8531680',TIDE_RAW);
const dayOff=ds=>(dmin(ds)-dmin('2026-10-01'))/1440;
const dow=ds=>new Date(dmin(ds)*60000).getUTCDay();

function tideAt(st,t){
  const EV=TIDES[st];
  if(!EV||t<EV[0].t||t>=EV[EV.length-1].t)return null;
  let lo=0,hi=EV.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(EV[mid].t<=t)lo=mid;else hi=mid;}
  const a=EV[lo],b=EV[lo+1],u=(t-a.t)/(b.t-a.t),dh=b.h-a.h,hrs=(b.t-a.t)/60;
  return{h:a.h+dh*(1-Math.cos(Math.PI*u))/2,flow:Math.abs(dh)*Math.PI/2*Math.sin(Math.PI*u)/hrs,rising:dh>0,next:b};
}
function interp(p,x){
  if(x<=p[0][0])return p[0][1];
  for(let i=1;i<p.length;i++)if(x<=p[i][0]){const a=p[i-1],b=p[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
  return p[p.length-1][1];
}
/* Season curves by area: [days from Oct 1, activity 0-1]. Heuristics built from the Sept 2026 reports. */
const SEASON={
  blue:{nj:[[-15,.85],[40,.85],[60,.45]],lisouth:[[-15,.85],[40,.85],[60,.45]],ct:[[-15,.8],[25,.8],[50,.3]],montauk:[[-15,.75],[35,.75],[55,.3]]},
  albie:{nj:[[-11,.75],[-1,.85],[19,.85],[38,.15]],lisouth:[[-10,.6],[0,.8],[31,.8],[45,.2]],ct:[[-10,.85],[0,.95],[35,.95],[55,.3]],montauk:[[-10,.85],[0,.95],[40,.95],[60,.3]]}
};
const REGION={nj:{speed:46,station:'8531680',aff:{blue:.65,albie:.55}},lisouth:{speed:38,station:'8531680',aff:{blue:.65,albie:.5}},ct:{speed:44,station:'8461490',aff:{blue:.5,albie:.85}},montauk:{speed:46,station:'8510560',aff:{blue:.65,albie:.85}}};
const mk=(o)=>Object.assign({speed:REGION[o.region].speed,station:REGION[o.region].station},o);
const BASE=[
 mk({id:'sandyhook',name:'Sandy Hook (Gateway NRA)',type:'shore',region:'nj',lat:40.4600,lng:-74.0050,aff:{blue:.9,albie:.55},note:'Bay and ocean beaches at the northern tip. Fish move fast, so cover water.'}),
 mk({id:'monmouth',name:'Long Branch to Asbury Park beaches',type:'shore',region:'nj',lat:40.2600,lng:-74.0050,aff:{blue:.8,albie:.7},note:'Surf and jetties. Bait is being flushed out of the inlets.'}),
 mk({id:'sharkriver',name:'Shark River Inlet, Belmar',type:'shore',region:'nj',lat:40.1795,lng:-74.0116,aff:{blue:.6,albie:.6},note:'Jetty fishing. Stay off the rocks when seas are up.'}),
 mk({id:'manasquan',name:'Manasquan Inlet',type:'shore',region:'nj',lat:40.1007,lng:-74.0329,aff:{blue:.6,albie:.55}}),
 mk({id:'ppcanal',name:'Point Pleasant Canal',type:'shore',region:'nj',lat:40.0898,lng:-74.0489,aff:{blue:.7,albie:.3},note:'Best at dawn and after dark. Live eels are the striper bait, blues take metal.'}),
 mk({id:'ibsp',name:'Island Beach State Park (north end)',type:'shore',region:'nj',lat:39.8240,lng:-74.0930,aff:{blue:.7,albie:.65}}),
 mk({id:'barnegat',name:'Barnegat Inlet and Light',type:'shore',region:'nj',lat:39.7626,lng:-74.1073,aff:{blue:.6,albie:.6}}),
 mk({id:'jones',name:'Jones Inlet, Point Lookout (LI)',type:'shore',region:'lisouth',lat:40.5926,lng:-73.5787,aff:{blue:.75,albie:.6},note:'Tide timing at the inlet runs up to an hour off Sandy Hook.'}),
 mk({id:'oldsaybrook',name:'Old Saybrook to Old Lyme, CT',type:'shore',region:'ct',lat:41.2834,lng:-72.3762,aff:{blue:.55,albie:.95},note:'Reported as the albie hotspot, from boats and beaches.'}),
 mk({id:'montauk',name:'Montauk Point',type:'shore',region:'montauk',lat:41.0710,lng:-71.8570,aff:{blue:.7,albie:.9},note:'Albies run on both tides where there is current. This is a very long day, so consider staying overnight.'}),
 mk({id:'goldeneagle',name:'Golden Eagle, Belmar',type:'party',region:'nj',lat:40.1728,lng:-74.0245,aff:{blue:.85,albie:.55},sail:450,dur:450,phone:'732-681-6144',note:'905 NJ-35, Belmar. 100-foot boat with a galley.',verify:'Sailing time comes from an older listing. Call to confirm and to ask whether it is running bluefish trips.'}),
 mk({id:'normak',name:'Norma K III, Point Pleasant Beach',type:'party',region:'nj',lat:40.0866,lng:-74.0645,aff:{blue:.9,albie:.3},sail:1140,dur:300,days:[5,6],note:'Runs bluefish trips Friday and Saturday nights.',verify:'Departure time and length are guesses. Call to confirm the night and time.'}),
 mk({id:'queenmary',name:'Queen Mary, Point Pleasant Beach',type:'party',region:'nj',lat:40.0870,lng:-74.0660,aff:{blue:.85,albie:.5},sail:390,dur:420,note:'Open-boat trips for bluefish, stripers and bonito. Listed at $240 weekdays and $280 weekends per adult.',verify:'Departure and length come from a booking listing, and the listings show two street addresses. Call to confirm the trip and the price.'}),
 mk({id:'missbelmar',name:'Miss Belmar Princess, Belmar',type:'party',region:'nj',lat:40.1728,lng:-74.0245,aff:{blue:.8,albie:.5},sail:450,dur:420,note:'Has run mixed trips for blues, bonito and albies.',verify:'Schedule comes from an older listing. Call to confirm.'}),
 mk({id:'debraann',name:'Debra Ann Charter, Belmar',type:'charter',region:'nj',lat:40.1728,lng:-74.0245,aff:{blue:.7,albie:.4},sail:450,dur:450,note:'$1,200 for up to 10 people, 7:30 to 3, bait included. J Dock, slip 16.',verify:'Book the whole boat and ask the captain to target blues and albies.'})
];
/* Seed reports. Date is the report's publication date. */
const REPORTS=[
 {spot:'sandyhook',date:'2026-09-24',rating:4,note:'Bluff Lures: bluefish to 12 lb in tight packs, occasional albie blitz (before the storm).'},
 {spot:'sandyhook',date:'2026-09-17',rating:5,note:'Tackle Box: bluefish blitzes on rainfish up and down the beaches all week, albies and bonito mixed in.'},
 {spot:'monmouth',date:'2026-09-24',rating:4,note:'Tak Waterman: albie and bluefish game was strong before the blow.'},
 {spot:'sharkriver',date:'2026-09-24',rating:3,note:'Fisherman\'s Den: mackerel on the jetty, micro sea bass and short tog.'},
 {spot:'sharkriver',date:'2026-09-03',rating:4,note:'Bonito, albies and Spanish mackerel moving in and out of the inlet.'},
 {spot:'ppcanal',date:'2026-09-24',rating:4,note:'Gabriel Tackle: plenty of stripers and blues at night on live eels.'},
 {spot:'ppcanal',date:'2026-09-10',rating:4,note:'Bass and blues first thing in the morning.'},
 {spot:'ibsp',date:'2026-09-17',rating:3,note:'Hook House: decent surf, some blues near the inlet, blue runners on epoxy jigs.'},
 {spot:'jones',date:'2026-09-17',rating:4,note:'Blues from Jones Inlet to the Wantagh bridge with topwater blitzes; bonito and albies outside.'},
 {spot:'oldsaybrook',date:'2026-09-24',rating:5,note:'Albies in big numbers from boats and beaches, Old Lyme east (before the storm).'},
 {spot:'montauk',date:'2026-09-10',rating:4,note:'Windward Outfitters: albies showed on both tides with current.'},
 {spot:'normak',date:'2026-09-10',rating:5,note:'Weekend bluefish trips very successful, fish to 10 lb mostly on bait.'},
 {spot:'goldeneagle',date:'2026-07-23',rating:4,note:'Steady blues from 1 to 4 lb all day, a Spanish mackerel.'},
 {spot:'goldeneagle',date:'2026-07-02',rating:4,note:'Good bluefishing, blues getting bigger, a bonito in the mix.'}
];
function sun(ds,lat,lng){
  const d=new Date(dmin(ds)*60000),n=Math.round((dmin(ds)-Date.UTC(d.getUTCFullYear(),0,0)/60000)/1440),g=2*Math.PI/365*(n-1);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const la=lat*Math.PI/180,c=Math.cos(90.833*Math.PI/180)/(Math.cos(la)*Math.cos(dec))-Math.tan(la)*Math.tan(dec);
  const ha=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
  return{rise:720-4*(lng+ha)-eq-240,set:720-4*(lng-ha)-eq-240};
}
function hav(a,b,c,d){const p=Math.PI/180,x=Math.sin((c-a)*p/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin((d-b)*p/2)**2;return 2*3958.8*Math.asin(Math.sqrt(x));}
const driveMin=(o,orig,rush)=>Math.round(hav(orig.lat,orig.lng,o.lat,o.lng)*1.32/o.speed*60*(rush?1.2:1)/5)*5;
function fishScore(o,ds,targets){
  const off=dayOff(ds),v=targets.map(k=>100*Math.min(1,interp(SEASON[k][o.region],off)*o.aff[k]/0.85));
  return v.reduce((a,b)=>a+b,0)/v.length;
}
function recentScore(o,reports,today){
  const rs=reports.filter(r=>r.spot===o.id);
  if(!rs.length)return{score:50,n:0,conf:0,newest:null};
  let sw=0,sv=0,newest=rs[0];
  rs.forEach(r=>{const age=Math.max(0,(dmin(today)-dmin(r.date))/1440),w=Math.exp(-age/10);sw+=w;sv+=w*(r.rating-1)/4*100;if(r.date>newest.date)newest=r;});
  const conf=Math.min(1,sw/0.6);
  return{score:50+(sv/sw-50)*conf,n:rs.length,conf,newest};
}
function weatherScore(o,wx){
  const w=wx&&wx.wind!==''&&wx.wind!=null?+wx.wind:null,s=wx&&wx.seas!==''&&wx.seas!=null?+wx.seas:null;
  if(w==null&&s==null)return{score:60,known:false,risk:false};
  const ww=w||0,ss=s||0,boat=o.type==='party'||o.type==='charter';
  const pen=boat?Math.min(80,Math.max(0,(ww-12)*4))+Math.min(60,Math.max(0,(ss-3)*12)):Math.min(80,Math.max(0,(ww-8)*4.5))+Math.min(40,Math.max(0,(ss-3)*10));
  return{score:Math.max(0,100-pen),known:true,wind:w,seas:s,risk:boat?(ww>=22||ss>=6):(ss>=6||ww>=25)};
}
function tideLight(o,ds,st,en,sr){
  const base=dmin(ds);let sum=0,n=0,unk=false;
  for(let t=st;t<=en;t+=10){const x=tideAt(o.station,base+t);if(!x){unk=true;break;}sum+=x.flow;n++;}
  const known=!!TIDES[o.station]&&!unk,flow=known?100*Math.min(1,(sum/n)/0.95):50;
  let ov=0,tot=0;
  for(let t=st;t<en;t+=10){tot++;if((t>=sr.rise-45&&t<=sr.rise+90)||(t>=sr.set-90&&t<=sr.set+45))ov++;}
  const light=25+75*Math.min(1,(ov/tot)/0.45);
  let note=null;
  if(known){const x=tideAt(o.station,base+(st+en)/2);note=(x.rising?'Incoming':'Outgoing')+' tide through the middle of the window, '+(x.next.hi?'high':'low')+' at '+fmt(x.next.t-base);}
  return{score:0.65*flow+0.35*light,known,light,note};
}
function fmt(m){const day=m>=1440,mm=((Math.round(m)%1440)+1440)%1440,h=Math.floor(mm/60),mi=mm%60;return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')+(day?' +1':'');}
function dur(m){const h=Math.floor(m/60),mi=m%60;return h+'h'+(mi?' '+String(mi).padStart(2,'0')+'m':'');}
const MODEMULT={shore:1,camp:1,party:1,charter:.85};
const STEADY={shore:.45,camp:.45,party:.75,charter:.8};
const STEADY_OV={goldeneagle:.8,normak:.8,queenmary:.8,missbelmar:.75,ppcanal:.6,sandyhook:.55,oldsaybrook:.5,montauk:.5};

function evaluate(o,ds,cfg){
  const drive=driveMin(o,cfg.origin,cfg.rush);
  if(drive>cfg.maxDrive)return{ok:false,reason:'drive'};
  if(o.days&&!o.days.includes(dow(ds)))return{ok:false,reason:'day'};
  if(cfg.maxLen&&(o.type==='party'||o.type==='charter')&&o.dur>cfg.maxLen)return{ok:false,reason:'length'};
  const boat=o.type==='party'||o.type==='charter',sr=sun(ds,o.lat,o.lng);
  let win,leave,home,arrive;
  if(boat){
    const board=o.type==='charter'?20:30,st=o.sail,en=o.sail+o.dur;
    leave=st-board-drive;home=en+20+drive;arrive=st-board;
    if(leave<cfg.early||home>cfg.late)return{ok:false,reason:'schedule'};
    win={st,en,...tideLight(o,ds,st,en,sr)};
  }else{
    let best=null;
    for(let st=Math.ceil((cfg.early+drive)/15)*15;st+cfg.session+drive<=cfg.late;st+=15){
      const en=st+cfg.session;
      if(!cfg.night&&(st<sr.rise-60||en>sr.set+45))continue;
      const tl=tideLight(o,ds,st,en,sr);
      if(!best||tl.score>best.score+0.01)best={st,en,...tl};
    }
    if(!best)return{ok:false,reason:'schedule'};
    win=best;leave=win.st-drive;arrive=win.st;home=win.en+drive;
  }
  const fish=fishScore(o,ds,cfg.targets),rec=recentScore(o,cfg.reports,cfg.today),wx=weatherScore(o,cfg.wxFor(o,ds));
  const steady=100*(STEADY_OV[o.id]!=null?STEADY_OV[o.id]:STEADY[o.type]),fishBlend=cfg.kids?0.65*fish+0.35*steady:fish;
  const driveScore=Math.max(0,100-70*drive/cfg.maxDrive);
  const W=cfg.weights,sum=W.fish+W.recent+W.tide+W.wx+W.drive||1;
  const total=(W.fish*fishBlend+W.recent*rec.score+W.tide*win.score+W.wx*wx.score+W.drive*driveScore)/sum*MODEMULT[o.type];
  return{ok:true,o,ds,drive,leave,arrive,win,home,fish:fishBlend,steady,rec,wx,driveScore,total,tide:win.score};
}
return{setTides,TIDES,evaluate,fmt,dur,dmin,dow,BASE,REPORTS,REGION,SEASON,sun,tideAt,driveMin,recentScore,fishScore};
})();
