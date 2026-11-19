// 1.2.142 (Artem 19.11.: „да“): Saisonkader as Aufstellung — plan card on
// top (eingeteilt, gaps, save), the pitch as a card, the players on the right
// as one-line rows; drag and drop and saving as before. Also: the new cards of
// Aufstellung (1.2.141) and Saisonkader are dark in "Nacht".
// node tools/tests/t_saison142.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const open=async p=>{await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(500);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(900);};
const txt=(p,id)=>p.evaluate(id=>(document.getElementById(id)||{}).textContent||'',id);
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[1366,700],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);await open(p);
  ok(/^0 von 15 Spielern eingeteilt/.test(await txt(p,'slp-kader-stats')),tag+'Karte des Plans: „0 von 15 Spielern eingeteilt“');
  ok(/Noch niemand eingeteilt/.test(await txt(p,'slp-gaps')),tag+'leerer Plan: „Noch niemand eingeteilt …“');
  // a plan with gaps
  await p.evaluate(()=>{const sl=fmtSlots(slpState.formation,slpState.customSlots);sl.forEach((x,k)=>{if(x.lbl==='LF')return;slpState.slots[x.id]=x.lbl==='TW'?[0]:[k,(k+5)%15];});slpRender();});
  let g=await txt(p,'slp-gaps');
  ok(/Leer: LF/.test(g)&&/Nur 1 Spieler: TW/.test(g),tag+'Lücken: „'+g.replace(/\s+/g,' ').trim()+'“');
  await p.evaluate(()=>{const sl=fmtSlots(slpState.formation,slpState.customSlots);sl.forEach((x,k)=>{slpState.slots[x.id]=[k,(k+5)%15];});slpRender();});
  ok(/Jede Position mindestens doppelt besetzt/.test(await txt(p,'slp-gaps')),tag+'alles doppelt: „Jede Position mindestens doppelt besetzt“');
  const r=await p.evaluate(()=>{const vis=e=>!!(e&&e.offsetParent);const q=s=>document.querySelector('#moSeasonLineup '+s);
    return {save:vis(q('.slp-gcard .lp-save-btn')),tools:vis(q('.slp-pcard .lp-ptools #slp-fmt-btns')),side:!!q('.slp-sidebar'),
      rosterRight:vis(q('.slp-roster-col'))?q('.slp-roster-col').getBoundingClientRect().left>q('.slp-pcard').getBoundingClientRect().left:null,
      rowH:vis(q('.slp-roster-col-card'))?Math.round(q('.slp-roster-col-card').getBoundingClientRect().height):0,
      avatar:vis(q('.slp-roster-col-avatar')),leg:vis(q('.slp-leg2')),
      emoji:/[💾🎽🖱✋]/u.test((q('.slp-gcard')||{}).textContent+(q('.slp-roster-col')||{}).textContent+(q('.slp-pcard')||{}).textContent),
      free:(document.getElementById('slp-free')||{}).textContent||''};});
  ok(r.save&&r.tools&&!r.side&&r.leg,tag+'Speichern in der Karte des Plans, Schema in der Karte des Felds, Legende unter dem Feld, keine alte Seitenleiste');
  ok(!r.emoji,tag+'keine Emojis in Überschriften und Knöpfen');
  if(!ph){
    ok(r.rosterRight===true&&r.rowH>0&&r.rowH<=40&&!r.avatar&&/\d+ frei/.test(r.free),tag+'Spieler rechts, einzeilig ('+r.rowH+' px), ohne Kreise, „'+r.free+'“');
    // drag a player from the list onto an empty position
    await p.evaluate(()=>{slpState.slots={};slpRender();});
    const row=await p.$('#slp-roster-list .slp-roster-col-card:nth-child(3)');const rb=await row.boundingBox();
    const slot=await p.$('#slp-slots .slp-slot-group circle');const sb=await slot.boundingBox();
    await p.mouse.move(rb.x+40,rb.y+rb.height/2);await p.mouse.down();await p.mouse.move(rb.x+20,rb.y+rb.height/2+10,{steps:4});
    await p.mouse.move(sb.x+sb.width/2,sb.y+sb.height/2,{steps:12});await p.mouse.up();await p.waitForTimeout(400);
    const n=await p.evaluate(()=>Object.values(slpState.slots).flat().length);
    ok(n===1&&/^1 von 15/.test(await txt(p,'slp-kader-stats')),tag+'Spieler aus der Liste aufs Feld gezogen: eingeteilt');
    await p.click('#moSeasonLineup .slp-gcard .lp-save-btn');await p.waitForTimeout(500);
    ok(/^Gespeichert /.test(await txt(p,'slp-saves-list'))&&await p.evaluate(()=>(G.seasonLineups||[]).length===1),tag+'„Kaderplan speichern“ wie bisher („'+(await txt(p,'slp-saves-list'))+'“)');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // Nacht: the new cards are dark (Aufstellung and Saisonkader)
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);await p.evaluate(()=>document.body.classList.add('hxk-dk'));
  const dark=sel=>p.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const bg=getComputedStyle(e).backgroundColor;const f=bg.startsWith('color(')?bg.match(/[\d.]+/g).slice(0,3).map(x=>+x*255):bg.match(/\d+/g).slice(0,3).map(Number);return (f[0]+f[1]+f[2])/3<110;},sel);
  await open(p);
  ok(await dark('#moSeasonLineup .slp-gcard')&&await dark('#moSeasonLineup .slp-pcard'),'Nacht: Karten im Saisonkader dunkel');
  await p.evaluate(()=>closeSeasonLineup&&closeSeasonLineup());await p.waitForTimeout(300);
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);
  await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);
  ok(await dark('#moLineup .lp-gcard')&&await dark('#moLineup .lp-pcard'),'Nacht: Karten in der Aufstellung dunkel');
  await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
