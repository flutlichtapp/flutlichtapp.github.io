// 1.2.147 (Artem 21.11.: „согласен со всем“): on the phone the game card in
// Aufstellung and on the Tafel is about half as high — match days as one-line
// chips ("So 8", no "Spiel": every day here is a match), smaller title, time
// and counts in one line.
// 1.2.148: the card holds the squad too (state, „Kader festlegen“, Gegner, Matchplan,
// per line on the phone) — for who does not draw on the pitch.
// 1.2.149 (Artem 21.11.: „верх выглядит наляпистым, а само поле маленькое“):
// phone — "Kader festlegen" and "Speichern" in one row, Gegner/Matchplan next to
// the time, no general counts (per line stays); PC from 1280 px — the card in one
// row (days, game, squad state, Kader + Speichern). The Tafel (only "Nur ansehen"
// and without a match since 1.2.148) is opened directly.
// node tools/tests/t_card147.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const R=(p,sel)=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();if(!r.width||!r.height)return null;return {t:Math.round(r.top),b:Math.round(r.bottom),l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height)};},sel);
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[360,640],[412,780],[1536,864],[1366,657]]){
  const ph=w<768,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h},hasTouch:ph,isMobile:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // the Tafel
  await p.evaluate(()=>openSpieltagKader());await p.waitForTimeout(700);
  const t=await p.evaluate(()=>{const top=document.querySelector('#tab-tafel .kb-top');const d=[...top.querySelectorAll('.kb-day')].filter(x=>x.offsetParent);
    return {h:Math.round(top.getBoundingClientRect().height),dh:d.map(x=>Math.round(x.getBoundingClientRect().height)),row:new Set(d.map(x=>Math.round(x.getBoundingClientRect().top))).size,lbl:d.some(x=>{const i=x.querySelector('i');return i&&i.offsetParent;})};});
  if(ph){
    ok(t.h<=230,tag+'Tafel: Spielkarte '+t.h+' px (vorher 280)');
    ok(t.dh.every(x=>x===40)&&t.row===1&&!t.lbl,tag+'Tafel: Spieltage einzeilig, 40 px, ohne „Spiel“');
  } else if(w===1536) ok(t.dh.every(x=>x===64)&&t.lbl,tag+'PC: Tafel-Spieltage unverändert (64 px, mit „Spiel“)');
  // Aufstellung from the navigation (leave the Tafel first — same nav item)
  await p.evaluate(()=>hxGo('home'));await p.waitForTimeout(300);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(900);
  const ft0=(await R(p,'#lp-pitch')).t;
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);lpState.slots[sl[0].id]=0;lpRender();});await p.waitForTimeout(200);
  const g=await R(p,'#lp-gcard'),kb=await R(p,'#lp-gsqbtn .lp-gsq-btn'),sv=await R(p,'#lp-save-btn'),st=await R(p,'#lp-saves-list'),
    meta=await R(p,'#lp-context-info'),lk=await R(p,'#lp-glinks'),ttl=await R(p,'#lp-gtitle'),day=await R(p,'#lp-gdays .kb-day');
  const x=await p.evaluate(()=>({sq:(document.getElementById('lp-gsq')||{}).textContent||'',strip:(()=>{const e=document.getElementById('lp-sq-bar');return !!(e&&e.offsetParent);})(),
    leg:!!(document.getElementById('lp-gleg')||{}).offsetParent,sv:document.getElementById('lp-save-btn').innerText.trim(),svFull:document.getElementById('lp-save-btn').textContent.trim(),
    st:document.getElementById('lp-saves-list').textContent.trim(),sw:document.documentElement.scrollWidth}));
  const mid=r=>(r.t+r.b)/2;
  if(ph){
    ok(g.h<=230,tag+'Aufstellung: Spielkarte '+g.h+' px (1.2.148: ~241)');
    ok(ft0<=380,tag+'Feld beginnt bei '+ft0+' px (1.2.148: ~400)');
    ok(/Kader noch nicht veröffentlicht/.test(x.sq)&&kb&&sv&&Math.abs(mid(kb)-mid(sv))<4&&kb.b<=g.b&&!x.strip,tag+'„Kader festlegen“ und „Speichern“ nebeneinander in der Karte, kein eigener Streifen');
    ok(x.sv==='Speichern'&&/^Aufstellung speichern$|^Meine Variante speichern$/.test(x.svFull),tag+'auf dem Handy kurz „Speichern“ (voller Text bleibt: „'+x.svFull+'“)');
    ok(st&&st.t>=sv.b-2&&/gespeichert/.test(x.st),tag+'Stand unter den Knöpfen („'+x.st+'“)');
    ok(lk&&meta&&Math.abs(lk.t-meta.t)<8&&ttl.b<=meta.t+1,tag+'Gegner und Matchplan neben der Zeit, unter dem Titel');
    ok(!x.leg,tag+'keine allgemeinen Zahlen (je Linie bleibt)');
    ok(x.sw<=w,tag+'nichts ragt heraus');
  } else {
    ok(g.h<=90,tag+'PC: Spielkarte in einer Zeile ('+g.h+' px; 1.2.148: 133–148)');
    ok(day&&day.h===42&&kb&&sv&&Math.abs(mid(kb)-mid(sv))<4&&Math.abs(mid(day)-mid(sv))<14,tag+'PC: Spieltage, „Kader festlegen“ und „Aufstellung speichern“ auf einer Höhe');
    ok(x.sv==='Aufstellung speichern',tag+'PC: voller Text „Aufstellung speichern“');
    ok(!x.strip&&/Kader noch nicht veröffentlicht/.test(x.sq),tag+'PC: Stand des Kaders in der Karte');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
