// 1.2.145 (Artem 20.11.: „в моей версии поле не влазит, и не скролится“):
// on the phone Aufstellung and Saisonkader scroll as a whole and the pitch
// takes the full width. Since 1.2.141 the game card sat above a tool with a
// fixed height: pitch cut off, bench and player list out of reach, pitch held
// to half the screen height (names ~6 px). The PC stays as it was.
// node tools/tests/t_mob145.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[360,640],[412,780],[1536,864]]){
  const ph=w<768,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h},hasTouch:ph,isMobile:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // Aufstellung from the navigation, the lineup filled
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);
  await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);sl.forEach((x,i)=>{lpState.slots[x.id]=i;});lpRender();});await p.waitForTimeout(200);
  const a=await p.evaluate(()=>{const m=document.getElementById('moLineup'),svg=document.getElementById('lp-pitch'),card=m.querySelector('.lp-pcard');
    const circ=document.querySelector('#lp-slots g circle').getBoundingClientRect();const nm=[...document.querySelectorAll('#lp-slots g text')].pop().getBoundingClientRect();
    return {ov:getComputedStyle(m).overflowY,sh:m.scrollHeight,ch:m.clientHeight,pw:svg.getBoundingClientRect().width,ph:svg.getBoundingClientRect().height,cw:card.getBoundingClientRect().width,d:Math.round(circ.width),nh:Math.round(nm.height*10)/10};});
  if(ph){
    ok(a.ov==='auto'&&a.sh>a.ch+200,tag+'Aufstellung scrollt als Ganzes ('+a.sh+' > '+a.ch+')');
    ok(a.pw>=a.cw*0.9&&Math.abs(a.ph/a.pw-525/340)<0.03,tag+'Feld über die ganze Breite, Seitenverhältnis bleibt ('+Math.round(a.pw)+' von '+Math.round(a.cw)+')');
    ok(a.d>=40,tag+'Kreise ≥ 40 px ('+a.d+')');
    ok(a.nh>=9,tag+'Namen lesbar (Zeilenhöhe '+a.nh+' px)');
    // scroll to the end: bench and player list are reachable
    await p.evaluate(()=>{const m=document.getElementById('moLineup');m.scrollTop=m.scrollHeight;});await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{const vh=document.getElementById('moLineup').getBoundingClientRect().bottom;const sb=document.querySelector('#moLineup .lp-sidebar').getBoundingClientRect();const rows=[...document.querySelectorAll('#lp-kader-list > div')];const last=rows[rows.length-1].getBoundingClientRect();
      const bench=document.querySelector('#moLineup .lp-subs-circles')||document.getElementById('lp-subs-col');
      return {sbh:Math.round(sb.height),last:[Math.round(last.top),Math.round(last.bottom)],vh:Math.round(vh),bench:!!bench&&bench.getBoundingClientRect().height>20};});
    ok(r.sbh>300&&r.last[1]<=r.vh+1&&r.last[0]>=0,tag+'ganz unten: Spielerliste vollständig erreichbar (letzte Zeile '+r.last.join('–')+', sichtbar bis '+r.vh+')');
    ok(r.bench,tag+'Bank vorhanden');
    // the picker still opens as a sheet at the bottom while scrolled
    await p.evaluate(()=>{const m=document.getElementById('moLineup');m.scrollTop=m.querySelector('.lp-pcard').offsetTop;});await p.waitForTimeout(200);
    await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots)[0];document.querySelector(`#lp-slots [data-slot="${sl.id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));});await p.waitForTimeout(400);
    const pop=await p.evaluate(()=>{const b=document.getElementById('lp-popup').getBoundingClientRect();return {b:Math.round(b.bottom),t:Math.round(b.top),w:Math.round(b.width)};});
    ok(pop.w===w&&pop.b>=h-2&&pop.t>0,tag+'Spielerwahl als Blatt unten ('+pop.t+'–'+pop.b+')');
    await p.evaluate(()=>lpClosePopup());
  } else {
    ok(a.ov==='hidden'&&a.ph>400,tag+'PC unverändert: Fenster scrollt nicht, Feld '+Math.round(a.ph)+' px hoch (mit zwei Hinweisstreifen)');
  }
  await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
  // Saisonkader from the Kader tab
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const s=await p.evaluate(()=>{const m=document.getElementById('moSeasonLineup'),svg=document.getElementById('slp-pitch'),card=m.querySelector('.slp-pcard');return {ov:getComputedStyle(m).overflowY,sh:m.scrollHeight,ch:m.clientHeight,pw:svg.getBoundingClientRect().width,cw:card.getBoundingClientRect().width,ph:svg.getBoundingClientRect().height};});
  if(ph){
    ok(s.ov==='auto'&&s.sh>s.ch+100,tag+'Saisonkader scrollt als Ganzes ('+s.sh+' > '+s.ch+')');
    ok(s.pw>=s.cw*0.9,tag+'Saisonkader: Feld über die ganze Breite ('+Math.round(s.pw)+' von '+Math.round(s.cw)+')');
    await p.evaluate(()=>{const m=document.getElementById('moSeasonLineup');m.scrollTop=m.scrollHeight;});await p.waitForTimeout(200);
    const leg=await p.evaluate(()=>{const l=document.querySelector('#moSeasonLineup .slp-leg2').getBoundingClientRect();const vb=document.getElementById('moSeasonLineup').getBoundingClientRect().bottom;return l.bottom<=vb+1&&l.top>=0;});
    ok(leg,tag+'Saisonkader ganz unten: Legende sichtbar');
  } else ok(s.ov==='hidden',tag+'PC: Saisonkader unverändert');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
