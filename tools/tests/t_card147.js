// 1.2.147 (Artem 21.11.: „согласен со всем“): on the phone the game card in
// Aufstellung and on the Tafel is about half as high — match days as one-line
// chips ("So 8", no "Spiel": every day here is a match), smaller title, time
// and counts in one line; in Aufstellung save button and state in one row.
// The PC stays as it was.
// 1.2.148: the card holds the squad too (state, „Kader festlegen“, Gegner, Matchplan,
// per line on the phone) — for who does not draw on the pitch; ~80 px higher again.
// node tools/tests/t_card147.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[360,640],[412,780],[1536,864]]){
  const ph=w<768,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h},hasTouch:ph,isMobile:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(800);
  const t=await p.evaluate(()=>{const top=document.querySelector('#tab-tafel .kb-top')||document.querySelector('.kb-top');const d=[...top.querySelectorAll('.kb-day')].filter(x=>x.offsetParent);
    return {h:Math.round(top.getBoundingClientRect().height),dh:d.map(x=>Math.round(x.getBoundingClientRect().height)),row:new Set(d.map(x=>Math.round(x.getBoundingClientRect().top))).size,lbl:d.some(x=>{const i=x.querySelector('i');return i&&i.offsetParent;})};});
  if(ph){
    ok(t.h<=230,tag+'Tafel: Spielkarte '+t.h+' px (vorher 280)');
    ok(t.dh.every(x=>x===40)&&t.row===1&&!t.lbl,tag+'Tafel: Spieltage einzeilig, 40 px, ohne „Spiel“');
  } else ok(t.dh.every(x=>x===64)&&t.lbl,tag+'PC: Spieltage unverändert (64 px, mit „Spiel“)');
  await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);
  const ft0=await p.evaluate(()=>Math.round(document.getElementById('lp-pitch').getBoundingClientRect().top));
  // one player placed: the squad note appears (Kader noch nicht veröffentlicht)
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);lpState.slots[sl[0].id]=0;lpRender();});await p.waitForTimeout(200);
  const sq=await p.evaluate(()=>{const g=document.getElementById('lp-gsq'),b=g&&g.querySelector('.lp-gsq-btn'),c=document.getElementById('lp-gcard').getBoundingClientRect();
    return {t:g?g.textContent:'',btn:!!(b&&b.offsetParent),inCard:!!(b&&b.getBoundingClientRect().bottom<=c.bottom),strip:(()=>{const e=document.getElementById('lp-sq-bar');return !!(e&&e.offsetParent);})()};});
  const a=await p.evaluate(()=>{const g=document.querySelector('#moLineup .lp-gcard').getBoundingClientRect(),f=document.getElementById('lp-pitch').getBoundingClientRect();
    const bt=document.getElementById('lp-save-btn').getBoundingClientRect(),st=document.getElementById('lp-saves-list').getBoundingClientRect();
    const ttl=document.getElementById('lp-gtitle').getBoundingClientRect(),meta=document.getElementById('lp-context-info').getBoundingClientRect(),leg=document.getElementById('lp-gleg').getBoundingClientRect();
    return {gh:Math.round(g.height),ft:Math.round(f.top),sameRow:Math.abs((bt.top+bt.bottom)/2-(st.top+st.bottom)/2)<12&&st.left>bt.right,metaLeg:Math.abs(meta.top-leg.top)<8,titleAbove:ttl.bottom<=meta.top+1,
      stTxt:document.getElementById('lp-saves-list').textContent.trim(),sw:document.documentElement.scrollWidth};});
  if(ph){
    ok(a.gh<=250,tag+'Aufstellung: Spielkarte '+a.gh+' px (1.2.147: 161, mit Kader seit 1.2.148)');
    ok(ft0<=410,tag+'Feld beginnt bei '+ft0+' px');
    ok(/Kader noch nicht veröffentlicht/.test(sq.t)&&sq.btn&&sq.inCard&&!sq.strip,tag+'„Kader noch nicht veröffentlicht“ und „Kader festlegen“ in der Spielkarte, kein eigener Streifen');
    ok(a.sameRow&&/gespeichert/.test(a.stTxt),tag+'Speichern und Stand in einer Zeile („'+a.stTxt+'“)');
    ok(a.metaLeg&&a.titleAbove,tag+'Zeit und Zahlen in einer Zeile unter dem Titel');
    ok(a.sw<=w,tag+'nichts ragt heraus');
  } else ok(a.gh>=100&&!a.sameRow,tag+'PC: Spielkarte wie bisher (Speichern rechts, Stand darunter)');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
