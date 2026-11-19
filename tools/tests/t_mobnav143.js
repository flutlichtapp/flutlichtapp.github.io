// 1.2.143 (Artem 19.11.: „да“): on the phone, what the navigation opens is a
// page — Aufstellung (Spieltag) and Saisonkader (Kader) keep the bottom bar,
// no ✕, the bar shows where you are, tapping it leaves the tool through its
// own check, "Mehr" lies above it. Opened for one thing (overview card) they
// stay tools: bar hidden, ✕ visible. Planner, Anwesenheit erfassen and
// Spielbericht stay tools.
// node tools/tests/t_mobnav143.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const st=p=>p.evaluate(()=>{const nav=document.getElementById('mobNav');const vis=e=>!!(e&&e.offsetParent)&&getComputedStyle(e).visibility!=='hidden';
  const r=nav.getBoundingClientRect();
  const hit=document.elementFromPoint(innerWidth/2,r.top+r.height/2-30>r.top?r.top+20:r.top+5);
  const lp=document.getElementById('moLineup'),slp=document.getElementById('moSeasonLineup');
  const tool=lp.classList.contains('open')?lp:slp.classList.contains('open')?slp:null;
  return {navVis:getComputedStyle(nav).visibility!=='hidden',navHit:!!(hit&&nav.contains(hit)),
    on:[...document.querySelectorAll('#mobNav .mn-item.on')].map(x=>x.id).join(),
    tool:tool?tool.id:'',close:tool?vis(tool.querySelector('.lp-close-btn,#slp-close-btn')):null,
    toolBottom:tool?Math.round(tool.getBoundingClientRect().bottom):0,navTop:Math.round(r.top)};});
(async()=>{const b=await chromium.launch();
 const c=await b.newContext({viewport:{width:390,height:844}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
 await p.evaluate(`(${setupTrainer.toString()})({})`);
 // Spieltag → Aufstellung
 await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);
 await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);
 let r=await st(p);
 ok(r.tool==='moLineup'&&r.navVis&&r.navHit&&r.close===false,'Spieltag → Aufstellung: untere Navigation sichtbar und antippbar, kein ✕');
 ok(r.toolBottom<=r.navTop+1,'Aufstellung endet über der Navigation ('+r.toolBottom+'/'+r.navTop+')');
 ok(r.on==='mn-more','Navigation zeigt „Mehr“ (dort liegt Spieltag) – '+r.on);
 // "Mehr" above it
 await p.click('#mn-more');await p.waitForTimeout(400);
 const sh=await p.evaluate(()=>{const s=document.querySelector('#mobSheet .ms-panel');if(!s)return false;const q=s.getBoundingClientRect();const h=document.elementFromPoint(q.left+q.width/2,q.top+20);return !!(h&&s.contains(h));});
 ok(sh,'„Mehr“ liegt über der Aufstellung');
 await p.evaluate(()=>mobSheetClose());await p.waitForTimeout(200);
 // bar → Kalender leaves the tool
 await p.click('#mn-cal');await p.waitForTimeout(800);
 r=await st(p);
 ok(!r.tool&&await p.evaluate(()=>document.getElementById('moCalendar').classList.contains('open')),'Navigation → Kalender: Aufstellung zu, Kalender offen');
 // Kader → Saisonkader
 await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(500);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(900);
 r=await st(p);
 ok(r.tool==='moSeasonLineup'&&r.navVis&&r.navHit&&r.close===false&&r.on==='mn-team','Kader → Saisonkader: Navigation sichtbar, „Team“ markiert, kein ✕');
 // unsaved Saisonkader: the bar asks first; "Abbrechen" keeps it
 await p.evaluate(()=>{const sl=fmtSlots(slpState.formation,slpState.customSlots);slpState.slots[sl[0].id]=[0];slpState.dirty=true;if(typeof slpMarkDirty==='function')slpMarkDirty();slpRender();window.confirm=()=>false;window.__dl=[];});
 await p.click('#mn-home');await p.waitForTimeout(700);
 const kept=await p.evaluate(()=>document.getElementById('moSeasonLineup').classList.contains('open'));
 const asked=await p.evaluate(()=>!!document.querySelector('.hx-dlg.open,.cfm.open,#hxConfirm.open,[role="dialog"]:not([hidden])')||(window.__dl||[]).length>0);
 ok(kept||asked,'ungespeichert: Navigation fragt erst bzw. lässt den Saisonkader offen');
 await p.evaluate(()=>{if(document.getElementById('moSeasonLineup').classList.contains('open')){slpState.dirty=false;closeSeasonLineup();}document.querySelectorAll('.hx-dlg.open').forEach(x=>x.classList.remove('open'));});await p.waitForTimeout(300);
 // from the overview card: still a tool
 await p.evaluate(()=>{hxGo('home');});await p.waitForTimeout(400);
 await p.evaluate(()=>openNextMatchLineup());await p.waitForTimeout(800);
 r=await st(p);
 ok(r.tool==='moLineup'&&!r.navVis&&r.close===true,'Aufstellung von der Übersicht: Werkzeug mit ✕, ohne Navigation (wie bisher)');
 await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
 // planner stays a tool
 await p.evaluate(()=>{const D=cd();tplOpen(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(700);
 const tp=await p.evaluate(()=>{const nav=document.getElementById('mobNav');const h=document.elementFromPoint(innerWidth/2,innerHeight-20);return !(h&&nav.contains(h));});
 ok(tp,'Trainingsplaner bleibt Werkzeug (Navigation nicht darüber)');
 ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
