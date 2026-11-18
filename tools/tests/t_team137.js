// 1.2.137 (Artem 18.11.): the team count says what it counts.
//  - Anwesenheit: "11 Spieler · 2 Pause · 1 Probetraining" instead of "13 Spieler"
//    (the parts add up to the rows; "Nicht mehr dabei" has its own folded group)
//  - Statistik: "Ø im Training … von 11 Spielern" = who can come now
//  - Wochenbericht: only who belonged to the team that week (like the player
//    report since 1.2.57) — not a whole week of pause, not after he left,
//    not a Probetraining; a pause from mid-week keeps him in
// node tools/tests/t_team137.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=()=>{
  const D=cd(),S=D.sessions,P=D.players;const pl=n=>P.find(p=>p.name.startsWith(n));
  pl('Mats').pauses=[{f:'2026-10-15',t:''}];          // pause, the whole week
  pl('Elias').pauses=[{f:'2026-11-05',t:''}];         // pause from Thursday: Di 03.11 still counts
  pl('Paul').gone='2026-10-20';                        // nicht mehr dabei
  const m=pl('Mika');m.trial='2026-11-02';             // Probetraining
  S.forEach((s,i)=>{if(!sessTookPlace(s,UI.currentSeason)&&_dbSortKey(s.date,UI.currentSeason)>=isoToSortKey('2026-11-02')){m.s[i]=3;m.ay[i]=null;}});
  render();
};
const go=async(b,{vp,status}={})=>{const c=await b.newContext({viewport:vp||{width:1536,height:864}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(status!==false)await p.evaluate(`(${prep.toString()})()`);
  await p.waitForTimeout(300);return {p,c,errs};};
const foot=p=>p.evaluate(()=>{const c=document.querySelector('#tFoot .c1');return c?{t:c.textContent.replace(/\s+/g,' ').trim(),sw:c.scrollWidth,cw:c.clientWidth,r:c.getBoundingClientRect().right}:null;});
(async()=>{const b=await chromium.launch();
 // 1. PC
 {const {p,c,errs}=await go(b);
  const f=await foot(p);
  ok(f&&f.t==='11 Spieler · 2 Pause · 1 Probetraining','Anwesenheit: „11 Spieler · 2 Pause · 1 Probetraining“ ('+(f&&f.t)+')');
  const rows=await p.evaluate(()=>{const tb=document.querySelector('#tBody')||document.querySelector('tbody');return [...document.querySelectorAll('tbody tr')].filter(r=>!r.classList.contains('mx-former')&&!r.classList.contains('mx-former-h')&&r.querySelector('.c1')).length;});
  ok(rows===14,'Anwesenheit: 14 Zeilen = 11 + 2 + 1 ('+rows+')');
  ok(f&&f.sw<=f.cw+1,'Anwesenheit: Zeile passt (über „Spieler“ und „Pos.“)');
  // Statistik
  await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(700);
  const st=await p.evaluate(()=>{const x=document.querySelector('.sbi-sum');return x?x.textContent.replace(/\s+/g,' '):'';});
  ok(/Ø im Training[^v]*von 11 Spielern/.test(st),'Statistik: „Ø im Training … von 11 Spielern“');
  ok(/Ø im Spiel[^v]*von 11 Spielern/.test(st),'Statistik: „Ø im Spiel … von 11 Spielern“');
  // Wochenbericht, KW 45 (Di 03.11, Fr 06.11 gehalten)
  await p.evaluate(()=>{_dbState.weekReportOffset=0;renderWeekReportModal();openM('moWeekReport');});await p.waitForTimeout(600);
  const wr=await p.evaluate(()=>{const nm=n=>getDisplayName(cd().players.find(q=>q.name.startsWith(n)));
    const names=[...document.querySelectorAll('#wr-content .wr2s-att tbody tr .wr2-nm')].map(x=>x.textContent.replace(/^\d+/,'').trim());
    const wk=(document.querySelector('#wr-nav-slot .db-wr-wk')||{}).textContent||'';
    return {n:names.length,wk,mats:names.includes(nm('Mats')),paul:names.includes(nm('Paul')),mika:names.includes(nm('Mika')),elias:names.includes(nm('Elias')),
      dashOnly:[...document.querySelectorAll('#wr-content .wr2s-att tbody tr')].filter(r=>[...r.querySelectorAll('.wr2-st')].every(s=>s.textContent==='–')).length};});
  ok(wr.n===12,'Wochenbericht ('+wr.wk+'): 12 Spieler in „Anwesenheit der Woche“ ('+wr.n+')');
  ok(!wr.mats&&!wr.paul&&!wr.mika,'Wochenbericht: ohne Pause der ganzen Woche, „Nicht mehr dabei“ und Probetraining');
  ok(wr.elias,'Wochenbericht: Pause ab Donnerstag – bleibt drin (Di zählt)');
  ok(wr.dashOnly===0,'Wochenbericht: keine Zeile nur mit „–“');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // 2. nobody on pause or Probetraining: as before
 {const {p,c,errs}=await go(b,{status:false});
  const f=await foot(p);
  ok(f&&f.t==='15 Spieler','ohne Pause/Probetraining: „15 Spieler“ wie bisher ('+(f&&f.t)+')');
  await p.evaluate(()=>{_dbState.weekReportOffset=0;renderWeekReportModal();openM('moWeekReport');});await p.waitForTimeout(500);
  const n=await p.evaluate(()=>document.querySelectorAll('#wr-content .wr2s-att tbody tr').length);
  ok(n===15,'Wochenbericht: alle 15 wie bisher');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // 3. phone (Anwesenheit there has no footer row): Wochenbericht
 {const {p,c,errs}=await go(b,{vp:{width:390,height:844}});
  await p.evaluate(()=>{_dbState.weekReportOffset=0;renderWeekReportModal();openM('moWeekReport');});await p.waitForTimeout(500);
  const n=await p.evaluate(()=>document.querySelectorAll('#wr-content .wr2s-att tbody tr').length);
  ok(n===12,'Telefon: Wochenbericht mit 12 Spielern ('+n+')');
  ok(!errs.length,'Telefon: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
