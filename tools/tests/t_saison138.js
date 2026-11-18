// 1.2.138 (Artem 18.11.: „в Kader, когда открываешь Saisonkader, пропадают
// пункты меню“): the Saisonkader head is the Kader head — title „Kader“ and
// Spieler · Saisonkader · Ziele · Videos. Each pill leads to its tab; the head
// stays one row on PC and tablet, on the phone the pills get their own row.
// node tools/tests/t_saison138.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const go=async(b,vp)=>{const c=await b.newContext({viewport:vp});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(500);
  await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  return {p,c,errs};};
const st=p=>p.evaluate(()=>{const vis=e=>!!(e&&e.offsetParent);const tm=document.getElementById('moTeamMgr');
  return {tool:_hxToolOpen(),nav:[...document.querySelectorAll('#hxNav .hx-item.on')].map(x=>x.textContent.trim()).join(),
    pills:[...document.querySelectorAll('#moSeasonLineup .slp-kpills button')].filter(vis).map(x=>x.textContent.trim()+(x.classList.contains('on')?'*':'')),
    title:(()=>{const h=document.querySelector('#moSeasonLineup .slp-kh');return vis(h)?h.textContent.trim():'';})(),
    page:tm.classList.contains('open')?tm.dataset.mode:'',tab:(document.querySelector('#moTeamMgr .tpanel.active')||{}).id||''};});
const geo=p=>p.evaluate(()=>{const tb=document.querySelector('#moSeasonLineup .slp-topbar'),R=tb.getBoundingClientRect();
  const kids=[...tb.children].filter(x=>x.offsetParent&&x.getBoundingClientRect().width>6).map(x=>x.getBoundingClientRect());
  let over=0;for(let i=1;i<kids.length;i++)if(Math.abs(kids[i].top-kids[i-1].top)<20&&kids[i].left<kids[i-1].right-1)over++;
  const out=kids.filter(k=>k.right>R.right+1||k.left<R.left-1).length;
  const pills=[...document.querySelectorAll('#moSeasonLineup .slp-kpills button')].map(x=>x.getBoundingClientRect());
  return {h:Math.round(R.height),rows:kids.every(k=>k.top>=R.top-1&&k.bottom<=R.bottom+1)?1:2,over,out,sw:tb.scrollWidth-tb.clientWidth,
    pillsIn:pills.length===4&&pills.every(q=>q.right<=innerWidth&&q.width>30),pillsTop:pills.length?Math.round(pills[0].top):0,bandBottom:Math.round(R.top)+62};});
(async()=>{const b=await chromium.launch();
 {const {p,c,errs}=await go(b,{width:1536,height:864});
  let r=await st(p);
  ok(r.tool==='moSeasonLineup'&&r.nav==='Kader','Saisonkader offen, Navigation „Kader“');
  ok(r.title==='Kader'&&JSON.stringify(r.pills)===JSON.stringify(['Spieler','Saisonkader*','Ziele','Videos']),'Kopf: „Kader“ und Spieler · Saisonkader · Ziele · Videos ('+r.pills.join(' ')+')');
  for(const [t,id] of [['Ziele','tab-ziele'],['Videos','tab-videos'],['Spieler','tab-spieler']]){
    await p.evaluate(()=>{if(!_hxToolOpen())kaderGo('saison',1);});await p.waitForTimeout(700);
    await p.click(`#moSeasonLineup .slp-kpills button:has-text("${t}")`);await p.waitForTimeout(800);
    r=await st(p);
    ok(!r.tool&&r.page==='kader'&&r.tab===id&&r.nav==='Kader','„'+t+'“ im Saisonkader → Kader, Reiter '+t+' ('+r.tab+')');
  }
  await p.click('#moTeamMgr .tbar .tbtn:has-text("Saisonkader")');await p.waitForTimeout(800);
  r=await st(p);ok(r.tool==='moSeasonLineup','und wieder in den Saisonkader');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 for(const vp of [[1536,864],[1366,657],[1280,720],[1100,700],[1024,768],[1000,700],[820,1180],[768,1024]]){
  const {p,c,errs}=await go(b,{width:vp[0],height:vp[1]});
  const g=await geo(p);
  ok(g.rows===1&&g.h<=80&&!g.over&&!g.out&&g.sw<=0&&g.pillsIn,vp.join('×')+': Kopf in einer Reihe, nichts überlappt '+JSON.stringify({h:g.h,rows:g.rows,over:g.over,out:g.out}));
  if(errs.length)ok(false,vp.join('×')+': '+errs[0]);await c.close();}
 for(const vp of [[390,844],[360,640]]){
  const {p,c,errs}=await go(b,{width:vp[0],height:vp[1]});
  const r=await st(p),g=await geo(p);
  ok(r.title==='Kader'&&r.pills.length===4&&g.pillsIn&&g.pillsTop>=g.bandBottom+6&&g.sw<=0,vp.join('×')+': „Kader“ oben, vier Reiter in eigener Reihe unter dem dunklen Band '+JSON.stringify({top:g.pillsTop,band:g.bandBottom}));
  ok(!errs.length,vp.join('×')+': keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
