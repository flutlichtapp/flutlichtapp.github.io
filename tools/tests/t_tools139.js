// 1.2.139 (Artem 18.11.: in der Demo bei offenem Trainingsplaner „Info“ →
// anderer Bildschirm – „он не открывается… как будто экран открывается под
// планировщиком“; „такая же проблема может всплыть и в обычной версии“).
// The Trainingsplaner (and Anwesenheit erfassen, Spielbericht — they cover the
// navigation too) now count as tools like Aufstellung and Saisonkader:
// search, navigation and the demo's "Probier mal" close it first (it saves on
// close), so what they open is on top. Checked by what is really on top
// (elementFromPoint in the middle of the new screen), not by "open" classes.
// node tools/tests/t_tools139.js [index.html]
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {NOW,setupTrainer,HTML}=require('./fx.js');
const ROOT=path.resolve(__dirname,'..','..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.json':'application/json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=(u==='/'||u==='/index.html')?HTML:path.join(ROOT,u);
  if(!f.startsWith(ROOT)&&f!==HTML){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
// is the element with this id really on top in the middle of its own box?
const onTop=(p,id)=>p.evaluate(id=>{const el=document.getElementById(id);if(!el)return false;const r=el.getBoundingClientRect();
  if(r.width<20||r.height<20)return false;const x=Math.min(innerWidth-2,Math.max(1,r.left+r.width/2)),y=Math.min(innerHeight-2,Math.max(1,r.top+Math.min(r.height/2,innerHeight/2)));
  const hit=document.elementFromPoint(x,y);return !!(hit&&el.contains(hit));},id);
const tplOpenNow=p=>p.evaluate(()=>_tplIsOpen());
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;const b=await chromium.launch();
 // ── 1. normal app (fixture)
 for(const vp of [{width:1536,height:864},{width:390,height:844}]){
  const ph=vp.width<500,tag=ph?'Telefon: ':'';
  const c=await b.newContext({viewport:vp});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();});await p.waitForTimeout(200);
  const plan=async()=>{await p.evaluate(()=>{const D=cd();tplOpen(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(800);};
  await plan();
  ok(await tplOpenNow(p)&&await onTop(p,'tplOverlay'),tag+'Planer offen und oben');
  if(!ph){
    const nav=await p.evaluate(()=>[...document.querySelectorAll('#hxNav .hx-item.on')].map(x=>x.textContent.trim()).join());
    ok(nav==='Übersicht','Navigation bleibt bei der Seite darunter („'+nav+'“), nicht „Spieltag“');
    // search (Strg K) over the planner, a player
    await p.keyboard.press('Control+k');await p.waitForTimeout(300);
    ok(await onTop(p,'moSearch'),'Strg K: Suche liegt über dem Planer');
    await p.keyboard.type('Tom Berg');await p.waitForTimeout(300);await p.keyboard.press('Enter');await p.waitForTimeout(900);
    const pid=await p.evaluate(()=>[...document.querySelectorAll('.mo.open')].map(x=>x.id).find(id=>/moPlayer|moPlayerStats|moPs/.test(id))||'');
    ok(!(await tplOpenNow(p))&&pid&&await onTop(p,pid),'Suche → Spieler: Planer zu, Spieler oben ('+pid+')');
    await plan();
  }
  // navigation
  await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(800);
  ok(!(await tplOpenNow(p))&&await onTop(p,'moDashboard'),tag+'Navigation → Statistik: Planer zu, Statistik oben');
  await plan();
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(800);
  ok(!(await tplOpenNow(p))&&await onTop(p,'moTeamMgr'),tag+'Navigation → Kader: Planer zu, Kader oben');
  // from the session window: planner over it, closing it shows the session window again (as before)
  await p.evaluate(()=>{const D=cd();openSessFromMain(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(600);
  await plan();
  await p.evaluate(()=>tplClose());await p.waitForTimeout(400);
  ok(await onTop(p,'moSession2'),tag+'Planer aus dem Termin und ✕: Termin wieder da (wie bisher)');
  // Anwesenheit erfassen and Spielbericht cover the navigation as well
  await p.evaluate(()=>{const D=cd();rcOpen(D.sessions.findIndex(s=>s.date==='Fr 06.11'));});await p.waitForTimeout(600);
  ok(await onTop(p,'rcOverlay'),tag+'„Anwesenheit erfassen“ offen und oben');
  await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(800);
  ok(await p.evaluate(()=>!document.getElementById('rcOverlay').classList.contains('open'))&&await onTop(p,'moDashboard'),tag+'Anwesenheit erfassen → Navigation → Statistik oben');
  await p.evaluate(()=>{const D=cd();sbOpen(D.sessions.findIndex(s=>s.date==='So 01.11'));});await p.waitForTimeout(600);
  ok(await onTop(p,'sbOverlay'),tag+'Spielbericht offen und oben');
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(800);
  ok(await p.evaluate(()=>!document.getElementById('sbOverlay').classList.contains('open'))&&await onTop(p,'moTeamMgr'),tag+'Spielbericht → Navigation → Kader oben');
  if(!ph){
    await p.evaluate(()=>{const D=cd();rcOpen(D.sessions.findIndex(s=>s.date==='Fr 06.11'));});await p.waitForTimeout(600);
    await p.keyboard.press('Control+k');await p.waitForTimeout(300);await p.keyboard.type('Tom Berg');await p.waitForTimeout(300);await p.keyboard.press('Enter');await p.waitForTimeout(900);
    ok(await p.evaluate(()=>!document.getElementById('rcOverlay').classList.contains('open'))&&await onTop(p,'moPlayer'),'Anwesenheit erfassen → Suche → Spieler oben');
  }
  // Aufstellung still closes through its own path (1.2.50)
  if(!ph){
    await p.evaluate(()=>{hxGo('home');});await p.waitForTimeout(400);
    await p.evaluate(()=>openNextMatchLineup());await p.waitForTimeout(800);
    await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(800);
    ok(await p.evaluate(()=>!document.getElementById('moLineup').classList.contains('open'))&&await onTop(p,'moDashboard'),'Aufstellung → Statistik wie bisher');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── 2. demo: planner, "Demo · Info", each "Probier mal"
 for(const vp of [{width:1440,height:900},{width:390,height:844}]){
  const ph=vp.width<500,tag='Demo'+(ph?', Telefon':'')+': ';
  const c=await b.newContext({viewport:vp});await c.route(/gstatic\.com/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+'/?demo');await p.waitForTimeout(2500);
  await p.click('#demoWelcome .dw-go');await p.waitForTimeout(150);
  const viaInfo=async k=>{await p.click('#demoBadge');await p.waitForTimeout(150);await p.click(`#demoWelcome [data-dw="${k}"]`);await p.waitForTimeout(1000);};
  await viaInfo('plan');
  ok(await tplOpenNow(p)&&await onTop(p,'tplOverlay'),tag+'„Trainingsplan ansehen“ öffnet den Planer');
  await viaInfo('stats');
  ok(!(await tplOpenNow(p))&&await onTop(p,'moDashboard'),tag+'Planer offen → Info → „Statistik“: Statistik oben');
  await viaInfo('plan');await viaInfo('sess');
  ok(!(await tplOpenNow(p))&&await onTop(p,'moSession2'),tag+'Planer offen → Info → „Wer kommt“: Termin oben');
  // the player view opens in its own tab (window.open, caught as in t_demo131) — the planner may stay
  await viaInfo('plan');
  await p.evaluate(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(String(u));return null;};});
  await viaInfo('pv');
  const op=await p.evaluate(()=>window.__opened);
  ok(op.length===1&&/preview=1/.test(op[0]),tag+'Planer offen → Info → „So sehen es die Spieler“: Spieleransicht im eigenen Tab');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();srv.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);});
