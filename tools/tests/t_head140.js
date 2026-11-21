// 1.2.140 (Artem 18.11.: „на экране Spieltag, когда меняешь на Aufstellung,
// меняется шапка, тоже и в Kader, когда выбираем Saisonkader … надо сделать
// шапку органичную для всех меню“): one header for pages and tools.
// Tafel → Aufstellung and Kader → Saisonkader: title/tabs at the same place,
// same size, same height; the tool controls (game line, schema, Bearbeiten,
// Meisterschaft/Testspiel, Status) in a row below the header, not in it.
// Tablets 768–999 px: the tools cover the navigation (as before), not compared.
// 1.2.141/1.2.142: in Aufstellung and Saisonkader the controls moved on into the pitch card (.lp-ptools).
// 1.2.148: Spieltag has no "Kader | Aufstellung" steps any more — its title "Spieltag"
// is compared with the title of the Kader page.
// node tools/tests/t_head140.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const box=(p,sel)=>p.evaluate(sel=>{const el=[...document.querySelectorAll(sel)].find(x=>x.offsetParent);if(!el)return null;const r=el.getBoundingClientRect();
  return {l:Math.round(r.left),t:Math.round(r.top),h:Math.round(r.height),fs:getComputedStyle(el).fontSize};},sel);
const near=(a,b,d)=>a&&b&&Math.abs(a.l-b.l)<=d&&Math.abs(a.t-b.t)<=d&&a.fs===b.fs;
(async()=>{const b=await chromium.launch();
 for(const vp of [[1920,1000],[1536,864],[1366,657],[1280,720],[1024,768],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // Spieltag (1.2.148: opens the pitch, title "Spieltag") — the title where
  // the pages have theirs (Kader), same size, header just as high
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(600);
  const t1=await box(p,'#tmgr-h'),h1=await box(p,'#moTeamMgr .mob > div:first-child');
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  const t2=await box(p,'#moLineup #lp-htitle'),h2=await box(p,'#moLineup .lp-topbar');
  ok(near(t1,t2,3),tag+'Spieltag: Titel an derselben Stelle wie „Kader“, gleich groß '+JSON.stringify([t1,t2]));
  ok(h1&&h2&&Math.abs(h1.h-h2.h)<=2,tag+'Spieltag: Kopf gleich hoch ('+(h1&&h1.h)+'/'+(h2&&h2.h)+')');
  let r=await p.evaluate(()=>{const top=document.querySelector('#moLineup .lp-topbar'),row=document.querySelector('#moLineup .lp-ptools')||document.querySelector('#moLineup .lp-toolrow');const vis=e=>!!(e&&e.offsetParent);
    if(!row)return {inTop:['keine Zeile'],inRow:[],below:false,over:0,arrow:false};
    const inTop=['#lp-fmt-btns','.lp-kind-wrap','#lp-context-info','#lp-hint'].filter(s=>{const e=document.querySelector('#moLineup '+s);return e&&top.contains(e);});
    const inRow=['#lp-fmt-btns','.lp-kind-wrap'].filter(s=>{const e=document.querySelector('#moLineup '+s);return e&&row.contains(e)&&vis(e);});
    const rr=row.getBoundingClientRect(),tr=top.getBoundingClientRect();
    const sel=row.querySelector('select');const arrow=sel?getComputedStyle(sel).backgroundImage:'';
    return {inTop,inRow,below:Math.round(rr.top)>=Math.round(tr.bottom)-1,over:row.scrollWidth-row.clientWidth,arrow:/stroke='%234E5D7C'/.test(arrow)||/stroke=%27%234E5D7C/.test(arrow)};});
  ok(!r.inTop.length&&r.inRow.length===2&&r.below,tag+'Aufstellung: Schema, Bearbeiten, Meisterschaft/Testspiel unter dem Kopf (seit 1.2.141 in der Karte des Felds) '+JSON.stringify(r.inTop));
  ok(r.over<=0,tag+'Aufstellung: Zeile passt in die Breite');
  if(!ph)ok(r.arrow,tag+'Aufstellung: Schema-Auswahl mit dunklem Pfeil auf hellem Grund');
  // Kader (page) → Saisonkader (tool)
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(600);
  const k1=await box(p,'#tmgr-h'),k1p=await box(p,ph?'#moTeamMgr .tbar .tbtn':'#moTeamMgr .tbar');
  await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const k2=await box(p,'#moSeasonLineup .slp-kh'),k2p=await box(p,ph?'#moSeasonLineup .slp-kpills button':'#moSeasonLineup .slp-kpills');
  ok(near(k1,k2,3),tag+'Kader: Titel an derselben Stelle, gleich groß '+JSON.stringify([k1,k2]));
  ok(k1p&&k2p&&Math.abs(k1p.l-k2p.l)<=(ph?16:3)&&Math.abs(k1p.t-k2p.t)<=(ph?16:3),tag+'Kader: Reiter an derselben Stelle '+JSON.stringify([k1p,k2p]));
  r=await p.evaluate(()=>{const top=document.querySelector('#moSeasonLineup .slp-topbar');const vis=e=>!!(e&&e.offsetParent);
    const inTop=['#slp-fmt-btns','#slp-conf-toggle','#slp-status-btn','#slp-context-info'].filter(s=>{const e=document.querySelector(s);return e&&top.contains(e)&&vis(e);});
    const row=document.querySelector('#moSeasonLineup .slp-pcard .lp-ptools')||document.querySelector('#moSeasonLineup .slp-toolrow');if(!row)return {inTop:inTop.concat('keine Zeile'),fmt:false,tog:false,over:0};return {inTop,fmt:row.contains(document.getElementById('slp-fmt-btns'))&&vis(document.getElementById('slp-fmt-btns')),tog:vis(document.getElementById('slp-conf-toggle')),over:row.scrollWidth-row.clientWidth};});
  ok(!r.inTop.length&&r.fmt&&r.tog&&r.over<=0,tag+'Saisonkader: Schema und Status unter dem Kopf (seit 1.2.142 in der Karte des Felds), nichts davon im Kopf '+JSON.stringify(r.inTop));
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
