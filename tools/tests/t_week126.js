// 1.2.126: Übersicht der Trainer – „Diese Woche“ zeigt nach dem letzten Termin
// der Woche die nächste Woche; „Zuletzt“: der letzte vergangene Termin, auch aus
// der Vorwoche, höchstens 3 Tage lang (Artem 16.11.). Seit 1.2.127 unten in der
// Karte des nächsten Termins (im freien Platz) statt als Zeile in der Woche –
// die Übersicht passt wieder auf einen Bildschirm (Artem 17.11.).
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
    const z=document.querySelector('#hxHome .hx-zl');const hero=document.querySelector('#hxHome .hx-a-hero');
    const sc=document.getElementById('hxHome');
    const days=[...w.querySelectorAll('.hx-day:not(.hx-zl)')].map(x=>x.querySelector('.hx-day-d b').textContent);
    let opened=null;if(z){z.click();opened=window.__op===null?null:D.sessions[window.__op].date;}
    return {h:w.querySelector('.hx-h2').textContent,aria:w.getAttribute('aria-label'),kw:w.querySelector('.hx-h2row .hx-meta').textContent,
      z:z?{t:z.querySelector('.hx-zl-t').textContent,n:z.querySelector('.hx-zl-n').textContent,inHero:!!hero&&hero.contains(z),last:!!hero&&hero.lastElementChild===z}:null,
      inWeek:!!w.querySelector('.hx-zl'),days,opened,today:!!w.querySelector('.hx-day.today'),fits:sc.scrollHeight<=sc.clientHeight,sh:sc.scrollHeight,ch:sc.clientHeight};});
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
 ok(!x.r.z,'So 16:00: kein „Zuletzt“ – die große Karte zeigt das Spiel von heute noch');
 x=await at(b,'2026-11-09T10:00:00+01:00',null,'week126_mo_desktop');
 ok(x.r.h==='Diese Woche'&&x.r.kw==='KW 46','Mo 09.11: Diese Woche KW 46');
 ok(x.r.z&&/^So 08\.11 · .+ · 2:7 · Belastung 2\/\d+$/.test(x.r.z.t),'Mo 09.11: „Zuletzt“ = Spiel von Sonntag (Vorwoche): '+(x.r.z&&x.r.z.t));
 ok(x.r.z&&x.r.z.inHero&&x.r.z.last&&!x.r.inWeek,'„Zuletzt“ unten in der Karte des nächsten Termins, nicht in der Woche');
 ok(x.r.z&&/14\/15|\d+\/15/.test(x.r.z.n),'„Zuletzt“ mit Anwesenheit ('+(x.r.z&&x.r.z.n)+')');
 ok(x.r.opened==='So 08.11','Tippen auf „Zuletzt“ öffnet den Termin');
 ok(x.r.fits,'1440×900: Übersicht ohne Scrollen ('+x.r.sh+' ≤ '+x.r.ch+')');
 x=await at(b,'2026-11-10T19:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&!x.r.z,'Di 10.11 19:00: Training läuft, kein „Zuletzt“ (der letzte Termin steht in der Woche)');
 x=await at(b,'2026-11-21T10:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&x.r.kw==='KW 47'&&!x.r.z,'Sa 21.11: Diese Woche, Spiel am Sonntag noch offen');
 x=await at(b,'2026-11-22T16:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&!x.r.z,'So 22.11 16:00: nächste Woche ohne Termine – bleibt bei Diese Woche');
 x=await at(b,'2026-11-25T10:00:00+01:00');
 ok(x.r.h==='Diese Woche'&&x.r.z&&/^So 22\.11 · .+ · Belastung/.test(x.r.z.t),'Mi 25.11 (keine Termine mehr): „Zuletzt“ = Spiel So 22.11 (3 Tage) – '+(x.r.z&&x.r.z.t));
 x=await at(b,'2026-11-26T10:00:00+01:00');
 ok(!x.r.z,'Do 26.11: nach 4 Tagen kein „Zuletzt“ mehr');
 x=await at(b,'2026-11-08T16:00:00+01:00',{width:390,height:844},'week126_so_phone');
 ok(x.r.h==='Nächste Woche','Handy: Nächste Woche');
 x=await at(b,'2026-11-17T16:00:00+01:00',{width:1536,height:864},'week127_di_1536');
 ok(x.r.z&&x.r.fits,'Di 17.11, 1536×864: „Zuletzt“ (So 15.11) und Übersicht ohne Scrollen ('+x.r.sh+' ≤ '+x.r.ch+')');
 x=await at(b,'2026-11-17T16:00:00+01:00',{width:390,height:844},'week127_di_phone');
 ok(x.r.z&&x.r.z.inHero,'Handy: „Zuletzt“ in der Karte des nächsten Termins');
 ok(!x.errs.length,'keine Fehler'+(x.errs.length?': '+x.errs[0]:''));
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
