// 1.2.161 (Artem 26.11.: „ставит на официальные игры игроков, которые еще не
// Spielberechtigt“, „и в Statistik тоже пишет, что он мог играть“):
// not yet spielberechtigt on the day of an official match → unavailable in the
// Spieltag like a suspension (in a Testspiel available); Statistik/Spielzeit
// does not count a match he was not allowed to play (not spielberechtigt in
// an official match, suspended) as "could have played" — unless he played.
// node tools/tests/t_spielr161.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  const info=await p.evaluate(()=>{const D=cd(),P=D.players,ix=n=>P.findIndex(x=>x.name.startsWith(n));
    const si=D.sessions.findIndex(s=>s.date==='So 08.11');const paul=ix('Paul');P[paul].noSb=true;P[paul].sbAb='2026-12-01';
    return {si,paul};});
  // the plan: everyone on his profile position
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(slpState.formation,slpState.customSlots);slpState.slots={};
    const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
    sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
    slpRender();slpSave();});
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  await p.evaluate(si=>{openLineupPlanner(si);},info.si);await p.waitForTimeout(900);
  const state=()=>p.evaluate(pi=>{const P=cd().players;
    const placed=Object.values(lpState.slots).includes(pi)||lpState.subs.includes(pi);
    const txt=document.getElementById('moLineup').innerText.replace(/\s+/g,' ');
    const todo=[...document.querySelectorAll('#lp-unavail-bar .lp-todo-r')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
    return {placed,txt,todo,kind:lpState.matchKind,avail:+(document.getElementById('lp-st-total')||{}).textContent};},info.paul);
  // Meisterschaft: Aus dem Saisonkader leaves him out
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();});await p.waitForTimeout(300);
  let r=await state();
  ok(r.kind!=='test'&&!r.placed,tag+'Meisterschaft, „Aus dem Saisonkader“: Paul (erst ab 01.12. spielberechtigt) nicht gesetzt');
  ok(/Nicht dabei .*Paul.*Spielberechtigt ab 01\.12\./.test(r.txt),tag+'„Nicht dabei“: Paul · Spielberechtigt ab 01.12.');
  // picker on ST: no Paul
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).find(x=>x.lbl==='ST');delete lpState.slots[sl.id];lpRender();
    document.querySelector(`#lp-slots [data-slot="${sl.id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await p.waitForTimeout(400);
  const pk=await p.evaluate(()=>[...document.querySelectorAll('#lp-popup-picker .slp-pick-item .name')].map(x=>x.textContent.trim()));
  ok(pk.length>0&&!pk.some(x=>/^Paul\b/.test(x)),tag+'Spielerwahl ST ohne Paul');
  await p.evaluate(()=>lpClosePopup());
  // he already stands → Zu klären
  const before=(await state()).avail;
  await p.evaluate(pi=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).find(x=>x.lbl==='ST');lpState.slots[sl.id]=pi;lpRender();},info.paul);await p.waitForTimeout(300);
  r=await state();
  ok(r.todo.some(t=>/^Paul ist erst ab 01\.12\. spielberechtigt, steht aber auf dem Feld\. Vom Feld nehmen$/.test(t)),tag+'Zu klären: „'+(r.todo.find(t=>/Paul/.test(t))||'')+'“');
  ok(/Startelf.*Paul.*Nicht spielberechtigt/.test(r.txt),tag+'Liste: in der Startelf „Nicht spielberechtigt“');
  const red=await p.evaluate(()=>[...document.querySelectorAll('#lp-slots .lp-tk-g.lp-unavail')].some(g=>/255, 90, 69/.test(getComputedStyle(g.querySelector('.lp-tk-un')).stroke)));
  ok(red,tag+'auf dem Feld rot markiert');
  // Testspiel: available, nothing to clarify
  await p.evaluate(()=>lpSetMatchKind('test'));await p.waitForTimeout(300);
  r=await state();
  ok(r.kind==='test'&&!r.todo.some(t=>/Paul/.test(t))&&!/Spielberechtigt ab 01\.12\./.test(r.txt),tag+'Testspiel: Paul verfügbar, nichts zu klären');
  ok(r.avail===before+1,tag+'Testspiel: „verfügbar“ zählt ihn ('+before+' → '+r.avail+')');
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();});await p.waitForTimeout(300);
  r=await state();
  ok(r.placed,tag+'Testspiel, „Aus dem Saisonkader“: Paul gesetzt');
  // Meisterschaft, without a date
  await p.evaluate(pi=>{lpSetMatchKind('meisterschaft');delete cd().players[pi].sbAb;lpRender();},info.paul);await p.waitForTimeout(300);
  r=await state();
  ok(r.todo.some(t=>/^Paul ist noch nicht spielberechtigt, steht aber auf (dem Feld|der Bank)\./.test(t)),tag+'ohne Datum: „Paul ist noch nicht spielberechtigt …“ '+JSON.stringify([r.placed,r.kind,r.todo]));
  // spielberechtigt since 01.11.: available
  await p.evaluate(pi=>{cd().players[pi].sbAb='2026-11-01';lpRender();},info.paul);await p.waitForTimeout(300);
  r=await state();
  ok(r.placed&&!r.todo.some(t=>/Paul/.test(t)),tag+'spielberechtigt seit 01.11.: nichts zu klären');
  await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
  // ── Statistik / Spielzeit ──
  const st=await p.evaluate(()=>{
    const D=cd(),P=D.players,se=UI.currentSeason,ix=n=>P.findIndex(x=>x.name.startsWith(n));
    const k8=_dbSortKey('So 08.11',se);
    const M=_sbMatches(D,se).filter(x=>x.k<k8&&sessTookPlace(x.s,se)).slice(-3);
    const paul=ix('Paul'),ali=ix('Ali'),pos=['TW','LV','IV','RV','6er','10er','LF','RF','8er'];
    const eleven=P.map((q,i)=>({q,i})).filter(o=>o.i!==paul&&o.i!==ali).slice(0,11).map(o=>o.q.name);
    M.forEach((x,j)=>{const st=j===0?[...eleven.slice(0,10),P[ali].name]:eleven.slice();x.s.rep={f:1,a:1,st,sub:[],t:Date.now(),by:'t'};
      P[paul].s[x.i]=1;P[ali].s[x.i]=1;});
    P[ali].cards=[];P[ali].cards[M[0].i]='r';
    const row=(pi,team)=>{const r=computePlayTime(D,se,team).rows.find(y=>y.pi===pi);return r?{poss:r.poss,low:r.low}:null;};
    const out={};
    delete P[paul].noSb;delete P[paul].sbAb;out.ok=row(paul);
    P[paul].noSb=true;P[paul].sbAb='2026-12-01';out.no=row(paul);
    G.matchLineups=G.matchLineups||{};G.matchLineups[_mlKey(UI.currentTeam,se,M[1].i)]={matchKind:'test',slots:{},subs:[]};out.test=row(paul);
    delete G.matchLineups[_mlKey(UI.currentTeam,se,M[1].i)];
    out.ali=row(ali);
    // Wer braucht Aufmerksamkeit?
    const has=n=>_attCompute(D,se).rows.some(r=>(r.group&&r.group.length?r.group:[r]).some(g=>g.pi===n&&(g.why||[]).some(w=>w.k==='play')));
    out.attPaul=has(paul);
    delete P[paul].noSb;delete P[paul].sbAb;out.attPaulOk=has(paul);
    return out;});
  ok(st.ok&&st.ok.poss===270&&st.ok.low,tag+'spielberechtigt, 3× da, 0 Min.: Spielzeit „0 von 270“ – wenig ('+JSON.stringify(st.ok)+')');
  ok(st.no===null,tag+'erst ab 01.12. spielberechtigt: die drei Spiele zählen nicht als „hätte spielen können“ ('+JSON.stringify(st.no)+')');
  ok(st.test&&st.test.poss===90&&!st.test.low,tag+'eines davon Testspiel: nur das zählt ('+JSON.stringify(st.test)+')');
  ok(st.ali&&st.ali.poss===90,tag+'Rot im ersten Spiel, danach gesperrt: nur das erste zählt ('+JSON.stringify(st.ali)+')');
  ok(!st.attPaul&&st.attPaulOk,tag+'„Wer braucht Aufmerksamkeit?“: nicht spielberechtigt – keine Spielzeit-Zeile; spielberechtigt – schon ('+st.attPaul+'/'+st.attPaulOk+')');
  ok(!errs.length,tag+'keine Fehler '+errs.join(' | '));
  await c.close();
 }
 await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
