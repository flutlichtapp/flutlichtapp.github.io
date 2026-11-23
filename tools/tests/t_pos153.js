// 1.2.153 (Artem 23.11.: „что думаешь по кнопке bearbeiten? очевидно ли ее
// назначение? можно ли … без этой кнопки, но чтобы не испортить то что есть“
// → „да, согласен“). No "Bearbeiten" mode any more; what it did still works:
//  • drag an empty position (Aufstellung) / any position (Saisonkader) with the
//    mouse (after 5 px); a finger never drags a circle (the page must scroll);
//  • a filled position in the Aufstellung still moves the PLAYER when dragged;
//  • the position window: "Position ändern" (chips) and "Position verschieben"
//    (then tap the new place — or drag — the player stays in it);
//  • right click still renames (no mode); "4-2-3-1 (angepasst)" + "Zurücksetzen";
//  • "Nur ansehen" moves and renames nothing.
// node tools/tests/t_pos153.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const ctr=(p,sel)=>p.evaluate(sel=>{const g=document.querySelector(sel);if(!g)return null;const c=g.querySelector('circle.lp-tk-empty,circle.lp-tk')||g.querySelector('circle:not([cy])')||g.querySelector('circle');const r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},sel);
const drag=async(p,a,dx,dy)=>{await p.mouse.move(a.x,a.y);await p.mouse.down();for(let i=1;i<=10;i++){await p.mouse.move(a.x+dx*i/10,a.y+dy*i/10);await p.waitForTimeout(16);}await p.mouse.up();await p.waitForTimeout(500);};
(async()=>{const b=await chromium.launch();
 // ── Aufstellung, mouse
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  const id=lbl=>p.evaluate(l=>fmtSlots(lpState.formation,lpState.customSlots).find(s=>s.lbl===l).id,lbl);
  const btn0=await p.evaluate(()=>document.getElementById('lp-fmt-btns').innerText);
  ok(!/Bearbeiten|Fertig/.test(btn0)&&!/angepasst|zurücksetzen/i.test(btn0),'Aufstellung: kein „Bearbeiten“, Schema unverändert');
  const st=await id('ST');let a=await ctr(p,`#lp-slots [data-slot="${st}"]`);
  await drag(p,a,40,24);let b2=await ctr(p,`#lp-slots [data-slot="${st}"]`);
  const after=await p.evaluate(s=>({cs:!!(lpState.customSlots&&lpState.customSlots[s]),pop:document.getElementById('lp-popup').style.display,txt:document.getElementById('lp-fmt-btns').innerText,
    fit:(r=>r.scrollWidth<=r.clientWidth)(document.querySelector('#moLineup .lp-ptools'))}),st);
  ok(Math.round(b2.x-a.x)===40&&Math.round(b2.y-a.y)===24&&after.cs,'leere Position mit der Maus gezogen: 40/24 px verschoben');
  ok(after.pop==='none','ziehen öffnet kein Fenster');
  ok(/Positionen angepasst · zurücksetzen/.test(after.txt)&&after.fit,'„Positionen angepasst · zurücksetzen“ unter dem Schema, passt in die Spalte');
  // a short press (no move) opens the window with the new foot
  await p.mouse.click(b2.x,b2.y);await p.waitForTimeout(300);
  const pop=await p.evaluate(()=>({d:document.getElementById('lp-popup').style.display,chips:[...document.querySelectorAll('#lp-popup-fmt .fmt-chip')].map(x=>x.textContent),on:(document.querySelector('#lp-popup-fmt .fmt-chip.on')||{}).textContent,mv:!!document.querySelector('#lp-popup-fmt .fmt-mv')}));
  ok(pop.d==='block'&&pop.chips.length===10&&pop.on==='ST'&&pop.mv,'Antippen: Fenster mit „Position ändern“ (10, ST markiert) und „Position verschieben“');
  await p.evaluate(()=>[...document.querySelectorAll('#lp-popup-fmt .fmt-chip')].find(x=>x.textContent==='LF').click());await p.waitForTimeout(200);
  const rn=await p.evaluate(s=>({t:document.getElementById('lp-popup-title').textContent,l:document.querySelector(`#lp-slots [data-slot="${s}"] .lp-tk-pos`).textContent,on:(document.querySelector('#lp-popup-fmt .fmt-chip.on')||{}).textContent}),st);
  ok(rn.t==='LF – Spieler wählen'&&rn.l==='LF'&&rn.on==='LF','umbenannt: Feld „LF“, Titel „LF – Spieler wählen“');
  await p.evaluate(()=>lpClosePopup());await p.waitForTimeout(500);
  // a filled position: dragging moves the player, not the circle
  const tw=await id('TW'),iv=await id('IV');
  await p.evaluate(s=>{lpState.slots[s]=0;lpRender();},tw);await p.waitForTimeout(100);
  a=await ctr(p,`#lp-slots [data-slot="${tw}"]`);const t=await ctr(p,`#lp-slots [data-slot="${iv}"]`);
  await p.mouse.move(a.x,a.y);await p.mouse.down();await p.waitForTimeout(260);for(let i=1;i<=10;i++){await p.mouse.move(a.x+(t.x-a.x)*i/10,a.y+(t.y-a.y)*i/10);await p.waitForTimeout(16);}await p.mouse.up();await p.waitForTimeout(500);
  const pm=await p.evaluate(([tw,iv])=>({tw:lpState.slots[tw],iv:lpState.slots[iv],cs:!!(lpState.customSlots&&lpState.customSlots[tw])}),[tw,iv]);
  ok(pm.iv===0&&pm.tw==null&&!pm.cs,'besetzte Position ziehen: der Spieler wechselt, der Kreis bleibt');
  // "Position verschieben": the next drag moves the circle with the player
  a=await ctr(p,`#lp-slots [data-slot="${iv}"]`);await p.mouse.click(a.x,a.y);await p.waitForTimeout(300);
  await p.evaluate(()=>document.querySelector('#lp-popup-fmt .fmt-mv').click());await p.waitForTimeout(250);
  const mk=await p.evaluate(s=>({once:!!document.querySelector(`#lp-slots [data-slot="${s}"][data-once]`),pop:document.getElementById('lp-popup').style.display}),iv);
  ok(mk.once&&mk.pop==='none','„Position verschieben“: Fenster zu, Kreis markiert');
  a=await ctr(p,`#lp-slots [data-slot="${iv}"]`);await drag(p,a,-30,-20);b2=await ctr(p,`#lp-slots [data-slot="${iv}"]`);
  const mv=await p.evaluate(s=>({pl:lpState.slots[s],once:!!document.querySelector(`#lp-slots [data-slot="${s}"][data-once]`)}),iv);
  ok(Math.round(b2.x-a.x)===-30&&Math.round(b2.y-a.y)===-20&&mv.pl===0&&!mv.once,'danach: Kreis mit Spieler verschoben, Markierung weg');
  // right click without a mode
  a=await ctr(p,`#lp-slots [data-slot="${await id('LV')}"]`);await p.mouse.click(a.x,a.y,{button:'right'});await p.waitForTimeout(200);
  const cm=await p.evaluate(()=>{const m=document.getElementById('fmt-pos-menu');return m?{n:m.querySelectorAll('[onclick^="fmtSetPos"]').length,caps:getComputedStyle(m.firstElementChild).textTransform}:null;});
  ok(cm&&cm.n===10&&cm.caps!=='uppercase','Rechtsklick: Positionen ohne Modus, Überschrift ohne Versalien');
  await p.mouse.click(5,5);await p.waitForTimeout(150);
  // reset
  await p.evaluate(()=>document.querySelector('#lp-fmt-btns .fmt-reset').click());await p.waitForTimeout(200);
  const rs=await p.evaluate(s=>({cs:lpState.customSlots,txt:document.getElementById('lp-fmt-btns').innerText,l:document.querySelector(`#lp-slots [data-slot="${s}"] .lp-tk-pos`).textContent,pl:Object.values(lpState.slots).filter(v=>v!=null).length}),st);
  ok(rs.cs==null&&!/angepasst|zurücksetzen/i.test(rs.txt)&&rs.l==='ST'&&rs.pl===1,'„Zurücksetzen“: Schema wie vorher, Spieler bleibt aufgestellt');
  // a dragged circle is saved with the lineup
  a=await ctr(p,`#lp-slots [data-slot="${st}"]`);await drag(p,a,20,0);
  const sv=await p.evaluate(s=>{const before=lpState.customSlots&&lpState.customSlots[s];return !!before;},st);
  ok(sv,'verschobene Position steht in der Aufstellung (customSlots), gespeichert wird mit „Speichern“');
  ok(!errs.length,'Aufstellung: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── Saisonkader, mouse: every circle moves, tapping opens
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const s10=await p.evaluate(()=>{const s=fmtSlots(slpState.formation,slpState.customSlots).find(s=>s.lbl==='10er');slpState.slots[s.id]=[9];slpRender();return s.id;});
  ok(!/Bearbeiten|Fertig/.test(await p.evaluate(()=>document.getElementById('slp-fmt-btns').innerText)),'Saisonkader: kein „Bearbeiten“');
  let a=await ctr(p,`#slp-slots [data-slot-id="${s10}"]`);await drag(p,a,0,30);const b2=await ctr(p,`#slp-slots [data-slot-id="${s10}"]`);
  const r=await p.evaluate(s=>({cs:!!(slpState.customSlots&&slpState.customSlots[s]),pop:document.getElementById('slp-popup').style.display,pl:(slpState.slots[s]||[]).length,txt:document.getElementById('slp-fmt-btns').innerText}),s10);
  ok(Math.round(b2.y-a.y)===30&&r.cs&&r.pl===1&&r.pop==='none','besetzte Position im Saisonkader gezogen, Spieler bleibt, kein Fenster');
  ok(/Positionen angepasst · zurücksetzen/.test(r.txt),'Saisonkader: „Positionen angepasst · zurücksetzen“');
  await p.mouse.click(b2.x,b2.y);await p.waitForTimeout(300);
  await p.evaluate(()=>[...document.querySelectorAll('#slp-popup-fmt .fmt-chip')].find(x=>x.textContent==='8er').click());await p.waitForTimeout(200);
  const rn=await p.evaluate(()=>({t:document.getElementById('slp-popup-title').textContent,on:(document.querySelector('#slp-popup-fmt .fmt-chip.on')||{}).textContent}));
  ok(rn.t==='8er – Spieler zuweisen'&&rn.on==='8er','Saisonkader: Position im Fenster umbenannt');
  ok(!errs.length,'Saisonkader: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── phone: a finger moves nothing by swiping; „Position verschieben“ + tap
 {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  const cdp=await c.newCDPSession(p);
  const touch=async(a,dx,dy,hold)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});await p.waitForTimeout(hold);
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+dx*i/8,y:a.y+dy*i/8}]});await p.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);};
  const st=await p.evaluate(()=>fmtSlots(lpState.formation,lpState.customSlots).find(s=>s.lbl==='ST').id);
  let a=await ctr(p,`#lp-slots [data-slot="${st}"]`);
  await touch(a,30,30,40);
  const sw=await p.evaluate(s=>!!(lpState.customSlots&&lpState.customSlots[s]),st);
  ok(!sw,'Telefon: schnelles Wischen über eine Position verschiebt nichts');
  a=await ctr(p,`#lp-slots [data-slot="${st}"]`);await touch(a,30,20,600);
  ok(!(await p.evaluate(s=>!!(lpState.customSlots&&lpState.customSlots[s]),st))&&!(await p.$('#fmt-pos-menu')),'Telefon: auch halten und wischen verschiebt nichts, kein Rechtsklick-Menü');
  // a finger: tap the circle → „Position verschieben“ → tap the new place
  await p.waitForTimeout(400);a=await ctr(p,`#lp-slots [data-slot="${st}"]`);await p.touchscreen.tap(a.x,a.y);await p.waitForTimeout(350);
  const hasMv=await p.evaluate(()=>{const b=document.querySelector('#lp-popup-fmt .fmt-mv');if(b)b.click();return !!b;});await p.waitForTimeout(300);
  // the free middle of the pitch (a tap right beside another circle is pulled to it by the browser)
  const mid=await p.evaluate(()=>{const r=document.getElementById('lp-pitch').getBoundingClientRect();return {x:r.x+r.width/2+20,y:r.y+r.height/2,top:r.y};});
  await p.touchscreen.tap(mid.x,mid.y);await p.waitForTimeout(400);const b2=await ctr(p,`#lp-slots [data-slot="${st}"]`);
  const top2=await p.evaluate(()=>document.getElementById('lp-pitch').getBoundingClientRect().y);
  ok(hasMv&&Math.abs(b2.x-mid.x)<=2&&Math.abs(b2.y-mid.y)<=2,'Telefon: „Position verschieben“, dann neue Stelle antippen – der Kreis steht dort ('+Math.round(b2.x-mid.x)+'/'+Math.round(b2.y-mid.y)+')');
  ok(Math.abs(top2-mid.top)<1,'Telefon: das Feld springt dabei nicht (Zeile darüber bricht nicht um)');
  ok(await p.evaluate(()=>!_fmtOnce&&document.getElementById('lp-popup').style.display==='none'),'Telefon: danach kein Warten mehr, kein Fenster offen');
  ok(!errs.length,'Telefon: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── "Nur ansehen": nothing moves, no renaming
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  await p.evaluate(()=>{CU={...CU,role:'viewer'};});
  const s10=await p.evaluate(()=>fmtSlots(slpState.formation,slpState.customSlots).find(s=>s.lbl==='10er').id);
  const a=await ctr(p,`#slp-slots [data-slot-id="${s10}"]`);await drag(p,a,0,30);
  await p.evaluate(()=>{fmtSetPos('slp',fmtSlots(slpState.formation,slpState.customSlots).find(s=>s.lbl==='10er').id,'ST');});
  const r=await p.evaluate(()=>({cs:slpState.customSlots,foot:(document.getElementById('slp-popup-fmt')||{}).innerHTML||''}));
  ok(!r.cs||!Object.keys(r.cs).length,'„Nur ansehen“: weder verschoben noch umbenannt');await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
