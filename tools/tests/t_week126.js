// 1.2.126: Übersicht der Trainer – „Diese Woche“ zeigt nach dem letzten Termin
// der Woche die nächste Woche, und darüber „Zuletzt“: den letzten vergangenen
// Termin, auch aus der Vorwoche, höchstens 3 Tage lang (Artem 16.11.).
// node tools/tests/t_week126.js [index.html] [shotdir]
// Testdaten (fx.js): Trainings Di/Fr 18:30 bis Fr 20.11., Spiele So 13:00 bis So 22.11.
const {chromium}=require('playwright');const {setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const at=async(b,iso,vp,shot)=>{const c=await b.newContext({viewport:vp||{width:1440,height:900}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:new Date(iso)});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  const r=await p.evaluate(()=>{
    // a score for So 08.11, ratings from two players
    const D=cd();const mi=D.sessions.findIndex(s=>s.date==='So 08.11');D.sessions[mi].res={f:2,a:7};
    D.players[0].rpe=[];D.players[0].rpe[mi]=8;D.players[1].rpe=[];D.players[1].rpe[mi]=9;
    window.__op=null;openSessFromMain=function(i){window.__op=i;};
    document.getElementById('homeOverlay').style.display='';hxRender();
    const w=document.querySelector('#hxHome .hx-a-week');if(!w)return null;
    const z=w.querySelector('.hx-zl');
    const days=[...w.querySelectorAll('.hx-day:not(.hx-zl)')].map(x=>x.querySelector('.hx-day-d b').textContent);
    let opened=null;if(z){z.click();opened=window.__op===null?null:D.sessions[window.__op].date;}
    return {h:w.querySelector('.hx-h2').textContent,aria:w.getAttribute('aria-label'),kw:w.querySelector('.hx-h2row .hx-meta').textContent,
      z:z?{t:z.querySelector('.hx-day-t').textContent,s:z.querySelector('.hx-day-s').textContent,d:z.querySelector('.hx-day-d').textContent,first:w.querySelector('.hx-h2row').nextElementSibling===z}:null,
      days,opened,today:!!w.querySelector('.hx-day.today')};});
  if(shot&&out)await p.screenshot({path:out+'/'+shot+'.png'});
  await c.close();return {r,errs};};
(async()=>{const b=await chromium.launch();let x;
 x=await at(b,'2026-11-07T10:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&x.r.kw==='KW 45'&&!x.r.z,'Sa 07.11 10:00: Diese Woche KW 45, kein „Zuletzt“ (Fr 06.11 steht in der Woche)');
 x=await at(b,'2026-11-08T13:30:00+01:00');
 ok(x.r.h==='Diese Woche'&&!x.r.z,'So 08.11 13:30 (Spiel läuft): noch Diese Woche');
 x=await at(b,'2026-11-08T16:00:00+01:00',null,'week126_so_desktop');
 ok(x.r.h==='Nächste Woche'&&x.r.aria==='Nächste Woche'&&x.r.kw==='KW 46','So 08.11 16:00 (Spiel vorbei): „Nächste Woche“ KW 46');
 ok(x.r.days[0]==='9'&&x.r.days[6]==='15'&&!x.r.today,'zeigt Mo 9. bis So 15., kein „heute“');
 ok(x.r.z&&x.r.z.first&&!!x.r.z.t&&/^Zuletzt · 2:7 · Belastung 2\/\d+$/.test(x.r.z.s),'darüber „Zuletzt“: das Spiel von heute – '+(x.r.z&&x.r.z.t+' / '+x.r.z.s));
 ok(x.r.z&&/So\s*8/.test(x.r.z.d),'„Zuletzt“ mit Tag und Datum ('+(x.r.z&&x.r.z.d)+')');
 ok(x.r.opened==='So 08.11','Tippen auf „Zuletzt“ öffnet den Termin');
 x=await at(b,'2026-11-09T10:00:00+01:00',null,'week126_mo_desktop');
 ok(x.r.h==='Diese Woche'&&x.r.kw==='KW 46','Mo 09.11: Diese Woche KW 46');
 ok(x.r.z&&/^Zuletzt · 2:7/.test(x.r.z.s),'Mo 09.11: „Zuletzt“ = Spiel von Sonntag (Vorwoche)');
 x=await at(b,'2026-11-10T19:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&!x.r.z,'Di 10.11 19:00: Training läuft, kein „Zuletzt“ (der letzte Termin steht in der Woche)');
 x=await at(b,'2026-11-21T10:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&x.r.kw==='KW 47'&&!x.r.z,'Sa 21.11: Diese Woche, Spiel am Sonntag noch offen');
 x=await at(b,'2026-11-22T16:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&!x.r.z,'So 22.11 16:00: nächste Woche ohne Termine – bleibt bei Diese Woche');
 x=await at(b,'2026-11-25T10:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&x.r.z&&/^Zuletzt · Spiel · Belastung/.test(x.r.z.s),'Mi 25.11: „Zuletzt“ = Spiel So 22.11 (3 Tage)');
 x=await at(b,'2026-11-26T10:00:00+01:00');
 ok(!x.r.z,'Do 26.11: nach 4 Tagen kein „Zuletzt“ mehr');
 x=await at(b,'2026-11-08T16:00:00+01:00',{width:390,height:844},'week126_so_phone');
 ok(x.r.h==='Nächste Woche'&&x.r.z,'Handy: Nächste Woche mit „Zuletzt“');
 ok(!x.errs.length,'keine Fehler'+(x.errs.length?': '+x.errs[0]:''));
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
