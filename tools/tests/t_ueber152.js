// 1.2.152 (Artem 23.11.: „когда открыто поле, в Spieltag и Saisonkader, не
// открывается модалка администрирования“): windows sit at z-index 500, the
// tools at 800+ — Administration from the user menu (and any window from the
// search) opened under an open Spieltag / Saisonkader. A window opened while
// a tool is open now lies above it and gets its own z-index back when closed.
// 1.2.153: in Heute „Administration“ opens Einstellungen → Verwaltung — that
// page must lie above the tool as well (pages carry z-index 480 !important).
// node tools/tests/t_ueber152.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const onTop=(p,id)=>p.evaluate(id=>{const m=document.querySelector('#'+id+' .mob')||document.getElementById(id);const r=m.getBoundingClientRect();
  const e=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(40,r.height/2));return !!(e&&e.closest('#'+id));},id);
(async()=>{const b=await chromium.launch();
 for(const [tool,w,h] of [['lineup',1536,864],['saison',1536,864],['lineup',1366,657],['saison',1280,720]]){
  const tag=(tool==='lineup'?'Spieltag':'Saisonkader')+' '+w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(tool==='saison'){await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));}else await p.evaluate(()=>hxGo('lineup'));
  await p.waitForTimeout(800);
  // the real way: the user block at the bottom of the navigation → Administration
  await p.click('#hxNav .hx-user-btn').catch(async()=>{await p.locator('.hx-user-btn').first().click();});await p.waitForTimeout(300);
  const adm=await p.$('#ud-admin');const vis=adm&&await adm.isVisible();
  ok(vis,tag+'Menü zeigt „Administration“');
  if(vis){await adm.click();await p.waitForTimeout(400);}
  const tgt=await p.evaluate(()=>document.getElementById('moSettings').classList.contains('open')?'moSettings':'moAdmin');
  ok(await onTop(p,tgt),tag+'Administration ('+tgt+') liegt über dem offenen Werkzeug');
  await p.evaluate(t=>closeM(t),tgt);await p.waitForTimeout(200);
  const z=await p.evaluate(t=>{const m=document.getElementById(t);return {z:m.style.zIndex,flag:m.dataset.zUp!==undefined,tool:document.getElementById('moLineup').classList.contains('open')||document.getElementById('moSeasonLineup').classList.contains('open')};},tgt);
  ok(z.z===''&&!z.flag&&z.tool,tag+'nach dem Schließen: eigene Ebene zurück, Werkzeug noch offen');
  // a window with its own lower z-index (Tastenkürzel 610) as well
  await p.evaluate(()=>openM('moShortcuts'));await p.waitForTimeout(300);
  ok(await onTop(p,'moShortcuts'),tag+'auch „Tastenkürzel“ (eigene Ebene 610) liegt darüber');
  await p.evaluate(()=>closeM('moShortcuts'));await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.getElementById('moShortcuts').style.zIndex==='610'),tag+'„Tastenkürzel“ hat danach wieder 610');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // without a tool nothing changes
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>openM('moAdmin'));await p.waitForTimeout(300);
  const tgt=await p.evaluate(()=>document.getElementById('moSettings').classList.contains('open')?'moSettings':'moAdmin');
  const z=await p.evaluate(t=>{const m=document.getElementById(t);return {z:getComputedStyle(m).zIndex,flag:m.dataset.zUp!==undefined};},tgt);
  ok(!z.flag&&(z.z==='500'||z.z==='480')&&await onTop(p,tgt),'ohne Werkzeug: Administration ('+tgt+') auf ihrer eigenen Ebene '+z.z);await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
