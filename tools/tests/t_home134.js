// 1.2.134: Übersicht auf dem Computer ohne Scrollen, auch bei niedrigen Fenstern und
// langen Zeilen in „Im Blick behalten“. Artem 18.11.: „Neu in Flutlicht тут не причем,
// без него не помещается“. Erst weniger Luft (.hx-tight), dann weniger Zeilen
// („Alle n anzeigen“), mindestens eine. Telefon unverändert.
// node tools/tests/t_home134.js [index.html] [shotdir]
const {chromium}=require('playwright');const {setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const MI=new Date('2026-11-18T18:30:00+01:00').getTime();
// three long rows like real ones (a player with two reasons, a trial player, goals)
const LONG=[
  {lv:1,dot:'#d33',who:'Max Neumann',what:'3× unentschuldigt gefehlt · seit 4 Wochen bei keinem Termin – Pause oder nicht mehr dabei?',on:''},
  {lv:2,dot:'#e80',who:'Leo Krüger',what:'Probetraining: 5 Termine, 4× dabei – aufnehmen? · 2 Eindrücke',on:''},
  {lv:2,dot:'#e80',who:'Ziele',what:'3 Spieler seit 4 Wochen ohne Rückmeldung',on:''}];
const open=async(b,w,h,o)=>{o=o||{};const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:MI});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(([long,news])=>{
    if(!news)try{G.newsSeen=G.newsSeen||{};G.newsSeen[(CU.name||'').toLowerCase()]=APP_NEWS[0].id;localStorage.setItem('fcf_news_'+CU.name,APP_NEWS[0].id);}catch(e){}
    if(long){const g=_hxGroupFlags;_hxGroupFlags=function(a,D){return g(a,D).concat(long);};}
    document.getElementById('homeOverlay').style.display='';hxRender();},[o.long?LONG:null,!!o.news]);
  await p.waitForTimeout(400);
  return {p,c,errs};};
const m=p=>p.evaluate(()=>{const sc=document.getElementById('hxHome'),c=sc.querySelector('.hx-a-flags');
  return {over:sc.scrollHeight-sc.clientHeight,tight:!!sc.querySelector('.hx-wrap.hx-tight'),rows:c.querySelectorAll(':scope > .hx-flag').length,
    all:(window._hxFlagsList||[]).length,link:(c.querySelector(':scope > .hx-link')||{}).textContent||''};});
(async()=>{const b=await chromium.launch();
 // long rows, low windows
 for(const [w,h] of [[1536,730],[1536,700],[1536,680],[1536,660],[1366,657],[1280,720],[1440,760]]){
  const {p,c,errs}=await open(b,w,h,{long:1});
  const r=await m(p);
  ok(r.over<=0&&r.rows>=1&&(r.rows===r.all||r.link===`Alle ${r.all} anzeigen`),`${w}×${h}, lange Zeilen: ohne Scrollen, ${r.rows} von ${r.all} Zeilen, sonst „Alle ${r.all} anzeigen“${r.tight?' (enger)':''} (${r.over})`);
  if(out&&w===1366)await p.screenshot({path:out+'/home134_1366x657.png'});
  ok(!errs.length,`${w}×${h}: keine Fehler`+(errs.length?': '+errs[0]:''));await c.close();}
 // with the news in the head as well
 {const {p,c,errs}=await open(b,1536,680,{long:1,news:1});
  const r=await m(p);
  ok(r.over<=0&&!!(await p.evaluate(()=>document.querySelector('#hxHome .hx-nwtop')?.offsetParent)),`1536×680 mit Neuigkeit und langen Zeilen: ohne Scrollen (${r.over})`);
  ok(!errs.length,'mit Neuigkeit: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // a big window: nothing changes
 {const {p,c,errs}=await open(b,1920,950,{long:1});
  const r=await m(p);
  ok(r.over<=0&&!r.tight&&r.rows===4,'1920×950: normaler Abstand, 4 Zeilen wie bisher');
  // getting smaller, then bigger again: measured again
  await p.setViewportSize({width:1536,height:660});await p.waitForTimeout(700);
  let s=await m(p);
  ok(s.over<=0&&s.tight&&s.rows<4,`Fenster kleiner gezogen: wieder ohne Scrollen (${s.rows} Zeilen, enger)`);
  await p.setViewportSize({width:1920,height:950});await p.waitForTimeout(700);
  s=await m(p);
  ok(s.over<=0&&!s.tight&&s.rows===4,'wieder groß: alle 4 Zeilen, normaler Abstand');
  ok(!errs.length,'Fenstergröße: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // the "Alle n anzeigen" window still lists everything
 {const {p,c,errs}=await open(b,1366,657,{long:1});
  await p.click('#hxHome .hx-a-flags .hx-link');await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({o:document.getElementById('moFlags').classList.contains('open'),n:document.querySelectorAll('#moFlags .hx-flag, #moFlags .flg-it, #moFlags button.hx-flag').length,all:(window._hxFlagsList||[]).length}));
  ok(r.o&&r.n>=r.all,'„Alle n anzeigen“ öffnet alle Zeilen ('+r.n+'/'+r.all+')');
  ok(!errs.length,'Fenster: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // phone: scrolls as before, nothing taken away
 {const {p,c,errs}=await open(b,390,844,{long:1});
  const r=await m(p);
  ok(!r.tight&&r.rows===Math.min(4,r.all),'Handy: unverändert (scrollt, '+r.rows+' Zeilen)');
  ok(!errs.length,'Handy: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
