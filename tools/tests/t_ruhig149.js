// 1.2.149 (Artem 21.11.: „тебе не кажется, что теперь там верх выглядит
// наляпистым, а само поле маленькое?“): from 1280 px the game card is one row,
// schema / Bearbeiten / Meisterschaft–Testspiel, the counts, Gegner and
// Matchplan stand at the top of the column left of the pitch — no tool row over
// the pitch, so the pitch is higher. One yellow above the pitch: Speichern.
// The Saisonkader the same way. Narrower windows and the phone keep the tool row.
// node tools/tests/t_ruhig149.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const pitchH=(p,id)=>p.evaluate(id=>{const r=document.getElementById(id).getBoundingClientRect();return Math.round(Math.min(r.height,r.width*525/340));},id);
const where=(p,id,col)=>p.evaluate(([id,col])=>{const e=document.getElementById(id);return e?(e.closest('#'+col)?'Spalte':'Karte'):'-';},[id,col]);
const yellows=p=>p.evaluate(()=>{const y=getComputedStyle(document.body).getPropertyValue('--hx-yellow').trim();
  const probe=document.createElement('i');probe.style.color=y;document.body.appendChild(probe);const yc=getComputedStyle(probe).color;probe.remove();
  return [...document.querySelectorAll('#moLineup .lp-gcard button,#moLineup .lp-ntop button,#moLineup .lp-ptools button')].filter(b=>b.offsetParent&&getComputedStyle(b).backgroundColor===yc).map(b=>b.textContent.trim());});
(async()=>{const b=await chromium.launch();
 for(const [w,h,minP] of [[1366,657,430],[1536,864,600],[1920,1000,740],[1180,800,0],[390,844,0]]){
  const wide=w>=1280,ph=w<768,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(900);
  const pl=await where(p,'lp-ptools','lp-notes-top'),gl=await where(p,'lp-gleg','lp-notes-top'),lk=await where(p,'lp-glinks','lp-notes-top');
  if(wide){
    ok(pl==='Spalte'&&gl==='Spalte'&&lk==='Spalte',tag+'Schema/Spielart, Zahlen, Gegner/Matchplan in der Spalte links');
    const ph1=await pitchH(p,'lp-pitch');
    ok(ph1>=minP,tag+'Feld '+ph1+' px hoch (mindestens '+minP+')');
    const gh=await p.evaluate(()=>Math.round(document.getElementById('lp-gcard').getBoundingClientRect().height));
    ok(gh<=90,tag+'Spielkarte '+gh+' px');
  } else ok(pl==='Karte',tag+'schmaler: Schema und Spielart wie bisher über dem Feld');
  const y=await yellows(p);
  ok(y.length===1&&/speichern/i.test(y[0]),tag+'ein Gelb über dem Feld: '+JSON.stringify(y));
  if(w===1536){
    // narrower and back: the bits move along
    await p.setViewportSize({width:1180,height:h});await p.waitForTimeout(400);
    ok(await where(p,'lp-ptools','lp-notes-top')==='Karte',tag+'auf 1180 verkleinert: Schema zurück über dem Feld');
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(400);
    ok(await where(p,'lp-ptools','lp-notes-top')==='Spalte',tag+'wieder breit: in der Spalte');
    // Nacht: still one light button
    const dk=await p.evaluate(()=>{document.body.classList.add('hxk-dk');lpRender();const a=document.querySelector('.lp-kind-wrap .lp-fmt-btn.active');const bg=getComputedStyle(a).backgroundColor;document.body.classList.remove('hxk-dk');lpRender();return bg;});
    ok(!/250|245, 19/.test(dk),tag+'„Nacht“: Spielart nicht gelb ('+dk+')');
  }
  // Saisonkader
  await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const sp=await where(p,'slp-ptools','slp-notes-top');
  if(wide){
    const sh=await p.evaluate(()=>Math.round(document.getElementById('slp-gcard').getBoundingClientRect().height));
    ok(sp==='Spalte'&&sh<=70,tag+'Saisonkader: Schema und Status in der Spalte, Karte '+sh+' px');
    const sph=await pitchH(p,'slp-pitch');
    ok(sph>=minP,tag+'Saisonkader: Feld '+sph+' px hoch');
  } else ok(sp==='Karte',tag+'Saisonkader schmaler: wie bisher');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
