// 1.2.155 (Artem 24.11.: „Nur ansehen“ — only his own test account has it
// now; the role is meant for Betreuer, Physio, Teammanager later. Claude's
// proposal B, „Да“): Spieltag is the same page as for the trainers, only to
// look at — game card, pitch, bench, list, Nicht dabei, Gegner, Matchplan; no
// saving, no Kader festlegen, no schema change, no dragging, no „Zu klären“.
// The lineup that counts (saved / festgelegt, never a trainer's draft
// variant), and only once the Kader is published or the match has begun.
// A tap on a player opens his profile. No match ahead: the page with its note.
// node tools/tests/t_ansehen155.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
// the head coach saves a lineup (and Jimmy keeps a different draft variant)
const prep=()=>{hxGo('lineup');};
const save=()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);const P=cd().players;const used=new Set([1,10]);lpState.slots={};
  sl.forEach(s=>{const i=P.findIndex((p,i)=>!used.has(i)&&p.pos===s.pos[0]);if(i>=0){used.add(i);lpState.slots[s.id]=i;}});
  lpState.subs=[P.findIndex((p,i)=>!used.has(i))];lpRender();lpSave();
  const key=_mlKey(UI.currentTeam,UI.currentSeason,lpState.sessIdx);const ml=G.matchLineups[key];
  ml.vars=ml.vars||{};ml.vars['t_jimmy']={...JSON.parse(JSON.stringify(ml)),slots:{},subs:[],by:'Jimmy',savedAt:Date.now()};delete ml.vars['t_jimmy'].vars;
  closeLineupPlanner();return {n:Object.keys(ml.slots).length};};
const asViewer=pub=>{const D=cd(),si=findNextMatchIdx();
  if(pub)D.sessions[si].squad={p:D.players.filter((x,i)=>i!==1&&i!==10).map(x=>x.name),t:Date.now()-3600e3,meet:'12:00',where:'',by:'Admin'};
  CU={...CU,role:'viewer'};};
const look=()=>{const el=document.getElementById('moLineup');const vis=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden');
  const pc=document.querySelector('#moLineup .lp-pitch-col');const after=pc?getComputedStyle(pc,'::after').content:'';
  return {open:el.classList.contains('open'),viewer:el.classList.contains('lp-viewer'),wait:el.classList.contains('lp-wait'),filled:document.querySelectorAll('#lp-slots .lp-tk-g.filled').length,
    seats:document.querySelectorAll('#lp-subs-circles .lp-seat.filled').length,after,
    hidden:['.lp-gsave','#lp-gsqbtn','#lp-fromslp','.lp-kind-wrap','#lp-unavail-bar','#lp-disc-bar','#lp-var-bar','[onclick="lpClearAll()"]'].filter(q=>vis(document.querySelector('#moLineup '+q))),
    links:vis(document.querySelector('#lp-glinks')),sel:(document.querySelector('#lp-fmt-btns select')||{}).disabled===true,
    nav:[...document.querySelectorAll('#hxNav .hx-item.on')].map(e=>e.dataset.hx).join(),tafel:document.getElementById('moTeamMgr').classList.contains('open'),
    sq:(document.getElementById('lp-gsq')||{}).textContent||''};};
(async()=>{const b=await chromium.launch();
 for(const [w,h,pub] of [[1536,864,0],[1536,864,1],[1366,657,1],[390,844,0],[390,844,1]]){
  const ph=w<768,tag=w+'×'+h+(pub?' Kader veröffentlicht':' Kader offen')+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(`(${prep.toString()})()`);await p.waitForTimeout(700);
  const sv=await p.evaluate(`(${save.toString()})()`);await p.waitForTimeout(300);
  await p.evaluate(`(${asViewer.toString()})(${pub})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  const r=await p.evaluate(`(${look.toString()})()`);
  ok(r.open&&r.viewer&&!r.tafel,tag+'Spieltag öffnet das Feld (nicht die alte Tafel)');
  if(!ph)ok(r.nav==='lineup',tag+'Navigation: Spieltag markiert');
  ok(r.hidden.length===0,tag+'keine Knöpfe zum Ändern'+(r.hidden.length?': '+r.hidden.join(' '):''));
  ok(r.links&&r.sel,tag+'Gegner/Matchplan da, Schema nur lesbar');
  if(pub){
    ok(!r.wait&&r.filled===sv.n&&r.seats===1,tag+'die geltende Aufstellung ('+r.filled+' auf dem Feld, 1 Bank) – nicht Jimmys leerer Entwurf');
    ok(/Kader · 13 Spieler/.test(r.sq),tag+'Karte: „Kader · 13 Spieler …“');
  }else{
    ok(r.wait&&r.filled===0&&r.seats===0,tag+'Kader noch offen: keine Aufstellung zu sehen');
    ok(/Aufstellung folgt, sobald der Kader veröffentlicht ist/.test(r.after),tag+'auf dem Feld: „Aufstellung folgt, sobald der Kader veröffentlicht ist“');
    ok(/nicht veröffentlicht/.test(r.sq),tag+'Karte: „Kader noch nicht veröffentlicht“');
  }
  // nothing can be changed — not even by calling the functions
  const ch=await p.evaluate(()=>{const before=JSON.stringify([lpState.slots,lpState.subs,lpState.formation,lpState.matchKind,lpState.customSlots]);
    const ml0=JSON.stringify(G.matchLineups);
    try{lpSetFormation('4-4-2');}catch(e){}try{lpSetMatchKind('test');}catch(e){}try{lpClearAll();}catch(e){}try{_lpSetSlotPlayer(Object.keys(lpState.slots)[0]||'st',3);}catch(e){}
    try{lpAssignToSub(3,4);}catch(e){}try{lpSave();}catch(e){}try{fmtSetPos('lp','st','LF');}catch(e){}try{fmtReset('lp');}catch(e){}
    return {same:before===JSON.stringify([lpState.slots,lpState.subs,lpState.formation,lpState.matchKind,lpState.customSlots]),saved:ml0===JSON.stringify(G.matchLineups)};});
  ok(ch.same&&ch.saved,tag+'Schema, Spielart, Leeren, Setzen, Speichern, Positionen: nichts ändert sich');
  if(pub&&!ph){
    // a mouse drag on a token moves nothing; a tap opens the profile
    const g=await p.$('#lp-slots .lp-tk-g.filled');const bb=await g.boundingBox();const pid=await p.evaluate(e=>lpState.slots[e.dataset.slot],g);
    await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();await p.waitForTimeout(250);for(let i=1;i<=8;i++){await p.mouse.move(bb.x+bb.width/2+i*8,bb.y+bb.height/2+i*6);await p.waitForTimeout(16);}await p.mouse.up();await p.waitForTimeout(400);
    ok(await p.evaluate(pid=>Object.values(lpState.slots).includes(pid),pid),tag+'ziehen verschiebt nichts');
    await p.evaluate(()=>{[...document.querySelectorAll('.mo.open')].forEach(m=>{if(m.id!=='moLineup')closeM(m.id);});});await p.waitForTimeout(500);
    await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(500);
    ok(await p.evaluate(()=>document.getElementById('moPlayer').classList.contains('open')&&document.getElementById('lp-popup').style.display!=='block'),tag+'Antippen: Profil des Spielers, kein Auswahlfenster');
  }
  // closing asks nothing
  await p.evaluate(()=>{[...document.querySelectorAll('.mo.open')].forEach(m=>{if(m.id!=='moLineup')closeM(m.id);});window.__dl=[];closeLineupPlanner();});await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!document.getElementById('moLineup').classList.contains('open')&&!(window.__dl||[]).length),tag+'schließen ohne Rückfrage');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // the Kader is published while the viewer looks: the lineup appears
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(`(${prep.toString()})()`);await p.waitForTimeout(700);const sv=await p.evaluate(`(${save.toString()})()`);
  await p.evaluate(`(${asViewer.toString()})(0)`);await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(700);
  const before=await p.evaluate(()=>document.querySelectorAll('#lp-slots .lp-tk-g.filled').length);
  await p.evaluate(()=>{const D=cd(),si=findNextMatchIdx();D.sessions[si].squad={p:D.players.map(x=>x.name),t:Date.now(),meet:'12:00',where:'',by:'Admin'};_lvRemote();});await p.waitForTimeout(400);
  const after=await p.evaluate(()=>({n:document.querySelectorAll('#lp-slots .lp-tk-g.filled').length,wait:document.getElementById('moLineup').classList.contains('lp-wait')}));
  ok(before===0&&after.n===sv.n&&!after.wait,'Kader wird veröffentlicht, während er schaut: Aufstellung erscheint ('+before+' → '+after.n+')');
  // a sync without changes does not rebuild the page (no reopen)
  await p.evaluate(()=>{window.__reopen=0;const o=openLineupPlanner;window.openLineupPlanner=function(){window.__reopen++;return o.apply(this,arguments);};_lvRemote();_lvRemote();});
  ok(await p.evaluate(()=>window.__reopen===0),'Abgleich ohne Änderung: Seite bleibt, wie sie ist');await c.close();}
 // trainers: unchanged — the pitch to edit
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(700);
  const r=await p.evaluate(()=>({viewer:document.getElementById('moLineup').classList.contains('lp-viewer'),save:!!document.querySelector('#moLineup .lp-gsave').getClientRects().length}));
  ok(!r.viewer&&r.save,'Trainer: Spieltag wie bisher zum Bearbeiten');await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
