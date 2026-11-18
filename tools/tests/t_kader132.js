// 1.2.132: Kader fürs Spiel auf der Tafel; Trainer unter Einstellungen → Trainerteam.
// Artem 17.11.: „что думаешь по поводу раздела Kader … содержание, местоположение,
// название“ → „давай, как ты предлагаешь“. Kader ist die Spieler: auf der Tafel
// wird der Kader fürs Spiel festgelegt (dann „Aufstellung aus dem Kader“), die
// Trainerliste steht in den Einstellungen; ändern kann sie der Admin.
// Seit 1.2.133 (18.11.) ist die Tafel „Spieltag → Kader“ (nur Spiele) und der
// Saisonkader ein Reiter in Kader – Wege und Erwartungen hier angepasst.
// node tools/tests/t_kader132.js [index.html] [shotdir]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const open=async(b,o)=>{o=o||{};const c=await b.newContext({viewport:o.vp||{width:1536,height:730}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:o.time||NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({night:${!!o.night}})`);
  if(o.cu)await p.evaluate(cu=>{CU=Object.assign({loginAt:Date.now()},cu);},o.cu);
  if(o.tab)await p.evaluate(t=>localStorage.setItem('fcf_kb_tab',t),o.tab);
  return {p,c,errs};};
const kader=async p=>{await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();hxGo('lineup');});await p.waitForTimeout(400);};
const board=p=>p.evaluate(()=>{const h=document.getElementById('kbBoard');
  const btn=[...h.querySelectorAll('.kb-acts button')].map(b=>({t:b.textContent.trim(),alt:b.classList.contains('alt')}));
  const sq=h.querySelector('.kb-sq');
  const cards={};h.querySelectorAll('.kb-card').forEach(c=>{cards[c.querySelector('.kb-nm').textContent]={st:(c.querySelector('.kb-st')||{}).textContent||'',cls:c.className};});
  const cols=[...h.querySelectorAll('.kb-col')].map(c=>({h:c.querySelector('header > span').textContent,n:[...c.querySelectorAll('.kb-nm')].map(x=>x.textContent)}));
  return {btn,sq:sq?sq.textContent.replace(/\s+/g,' ').trim():null,sqNo:!!(sq&&sq.classList.contains('no')),cards,cols,ttl:(h.querySelector('.kb-ttl')||{}).textContent||''};});
const tabs=p=>p.evaluate(()=>[...document.querySelectorAll('#moTeamMgr .tbar .tbtn')].filter(e=>e.offsetParent).map(e=>e.textContent.trim()));
(async()=>{const b=await chromium.launch();
 // ── Tafel, admin, the match tomorrow
 {const {p,c,errs}=await open(b);
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();hxGo('team');});await p.waitForTimeout(400);
  ok(JSON.stringify(await tabs(p))===JSON.stringify(['Spieler','Saisonkader','Ziele','Videos']),'Kader: Spieler, Saisonkader, Ziele, Videos – kein „Trainer“ (seit 1.2.133 ohne Tafel)');
  await kader(p);
  let r=await board(p);
  ok(/Spiel gegen/.test(r.ttl)&&r.sq==='Kader noch nicht veröffentlicht'&&r.sqNo,'Spiel ohne Kader: „Kader noch nicht veröffentlicht“');
  ok(r.btn.length===2&&r.btn[0].t==='Kader festlegen'&&!r.btn[0].alt&&r.btn[1].t==='Aufstellung aus Zusagen'&&r.btn[1].alt,'erst „Kader festlegen“ (gelb), dann „Aufstellung aus Zusagen“');
  if(out)await p.screenshot({path:out+'/kader132_tafel.png'});
  await p.click('#kbBoard .kb-acts button:has-text("Kader festlegen")');await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const m=document.getElementById('moKader');const bx=m.querySelector('.mob').getBoundingClientRect();
    const el=document.elementFromPoint(bx.left+bx.width/2,bx.top+40);return {o:m.classList.contains('open'),top:!!(el&&m.contains(el))};});
  ok(r.o&&r.top,'„Kader festlegen“ öffnet das Kader-Fenster über der Tafel');
  // two not picked
  await p.evaluate(()=>{['Mats Lange','Emil Hartmann'].forEach(n=>{const pi=cd().players.findIndex(x=>x.name===n);const i=document.querySelector(`#moKader input[data-pi="${pi}"]`);i.click();});});
  await p.evaluate(()=>sqPublish());await p.waitForTimeout(300);
  await p.evaluate(()=>closeM('moSqWa'));await p.waitForTimeout(200);
  r=await board(p);
  ok(/^Kader · 13 Spieler · Treffpunkt \d\d:\d\d · /.test(r.sq)&&!r.sqNo,'nach dem Veröffentlichen ohne Neuladen: „Kader · 13 Spieler · Treffpunkt …“ ('+r.sq+')');
  ok(r.btn[0].t==='Aufstellung aus dem Kader'&&!r.btn[0].alt&&r.btn[1].t==='Kader ändern'&&r.btn[1].alt,'dann „Aufstellung aus dem Kader“ (gelb) und „Kader ändern“');
  ok(r.cards.Mats.st==='Nicht im Kader'&&/st-nk/.test(r.cards.Mats.cls)&&r.cards.Emil.st==='Nicht im Kader'&&r.cards.Ben.st==='Im Kader'&&/st-ok/.test(r.cards.Ben.cls),'Karten: „Im Kader“ / „Nicht im Kader“ (grau)');
  const ang=r.cols.find(x=>/Ben/.test(x.n.join()));
  ok(/^3 von 4 im Kader$/.test(ang.h)&&ang.n[ang.n.length-1]==='Mats','Linie: „3 von 4 im Kader“, wer nicht im Kader ist, unten');
  if(out)await p.screenshot({path:out+'/kader132_tafel_kader.png'});
  // lineup from the squad
  await p.click('#kbBoard .kb-acts button:has-text("Aufstellung aus dem Kader")');await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const P=cd().players;const used=[...Object.values(lpState.slots),...lpState.subs].filter(v=>typeof v==='number').map(i=>P[i].name);
    return {n:used.length,mats:used.includes('Mats Lange'),emil:used.includes('Emil Hartmann')};});
  ok(r.n===13&&!r.mats&&!r.emil,'„Aufstellung aus dem Kader“: nur die 13 aus dem Kader ('+r.n+')');
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];closeM('moLineup');});await p.waitForTimeout(300);
  // a training is not on the Tafel any more (1.2.133): it stays on the match
  await p.evaluate(()=>{const si=cd().sessions.findIndex(s=>s.date==='Di 10.11');kbPick(si);});
  r=await board(p);
  ok(/^Spiel/.test(r.ttl)&&await p.evaluate(()=>[...document.querySelectorAll('#kbBoard .kb-day')].every(x=>/Spiel/.test(x.textContent))),'Tafel nur mit Spielen (Training: „Wer kommt?“ im Termin)');
  // withdrawn: back to "not published"
  await p.evaluate(()=>{const si=cd().sessions.findIndex(s=>s.date==='So 08.11');kbPick(si);squadWithdraw(si);});await p.waitForTimeout(200);
  r=await board(p);
  ok(r.sq==='Kader noch nicht veröffentlicht'&&r.btn[0].t==='Kader festlegen'&&r.cards.Mats.st==='Verfügbar','zurückgenommen: wieder „noch nicht veröffentlicht“');
  // remembered tab: a stored "trainer" falls back to the Tafel
  ok(await p.evaluate(()=>{localStorage.setItem('fcf_kb_tab','trainer');const a=_kbDefaultTab();localStorage.setItem('fcf_kb_tab','tafel');return a==='spieler'&&_kbDefaultTab()==='spieler';}),'gemerkter alter Reiter „Trainer“ oder „Tafel“: Kader öffnet mit „Spieler“');
  await p.evaluate(()=>switchTab('videos',1));
  ok(await p.evaluate(()=>_kbDefaultTab()==='videos'),'„Videos“ wird jetzt auch gemerkt');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── after kick-off: attendance, no squad line
 {const {p,c,errs}=await open(b,{time:new Date('2026-11-08T14:00:00+01:00').getTime()});
  await kader(p);
  const r=await board(p);
  ok(/Spiel/.test(r.ttl)&&r.sq===null&&r.btn.length===1&&r.btn[0].t==='Aufstellung aus Zusagen','nach Anpfiff: keine Kader-Zeile, nur „Aufstellung aus Zusagen“');
  ok(!errs.length,'nach Anpfiff: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── "Nur ansehen": sees the squad, no buttons
 {const {p,c,errs}=await open(b);
  await p.evaluate(()=>{const s=cd().sessions.find(x=>x.date==='So 08.11');s.squad={p:cd().players.slice(0,12).map(x=>x.name),out:[],meet:'11:30',where:'Parkplatz',t:Date.now()-3*3600e3,by:'Admin'};});
  await p.evaluate(()=>{CU={name:'Gast',role:'viewer',teams:['U19'],loginAt:Date.now()};});
  await kader(p);
  const r=await board(p);
  ok(/^Kader · 12 Spieler · Treffpunkt 11:30, Parkplatz · veröffentlicht/.test(r.sq)&&!r.btn.length,'„Nur ansehen“: Kader-Zeile mit Treffpunkt, keine Knöpfe');
  ok(!errs.length,'„Nur ansehen“: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── phone
 {const {p,c,errs}=await open(b,{vp:{width:390,height:844}});
  await kader(p);
  const r=await p.evaluate(()=>{const bs=[...document.querySelectorAll('#kbBoard .kb-acts button')].map(x=>x.getBoundingClientRect());
    return {n:bs.length,w:bs.every(x=>x.width>320),fit:document.documentElement.scrollWidth<=innerWidth+1,tabs:[...document.querySelectorAll('#tmgr-h .hx-lptabs button')].filter(e=>e.offsetParent).every(e=>e.getBoundingClientRect().right<=innerWidth)};});
  ok(r.n===2&&r.w&&r.fit,'Handy: beide Knöpfe über die ganze Breite, nichts ragt über den Rand');
  ok(r.tabs,'Handy: „Kader | Aufstellung“ passt');
  if(out)await p.screenshot({path:out+'/kader132_phone.png'});
  ok(!errs.length,'Handy: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── Einstellungen → Trainerteam
 {const {p,c,errs}=await open(b);
  await p.evaluate(()=>openTeamMgr('trainer'));await p.waitForTimeout(400);
  let r=await p.evaluate(()=>({s:document.getElementById('moSettings').classList.contains('open'),on:document.querySelector('#moSettings .set-sec.on')?.dataset.sec,
    nav:!!document.querySelector('#moSettings .set-nav-it[data-sec="trainer"]:not(.set-hide)')}));
  ok(r.s&&r.on==='trainer'&&r.nav,'alter Weg „Kader → Trainer“ öffnet Einstellungen → Trainerteam');
  r=await p.evaluate(()=>{const sec=document.querySelector('#moSettings .set-sec[data-sec="trainer"]');const vis=e=>!!(e&&e.offsetParent);
    return {sub:document.getElementById('trt-sub').textContent,rows:[...sec.querySelectorAll('.tr-nm')].map(x=>x.textContent),del:vis(sec.querySelector('.tr-del')),grip:vis(sec.querySelector('.tr-grip')),
      add:vis(document.getElementById('trt-open')),form:vis(document.getElementById('trt-form'))};});
  ok(/^Trainer von U19\. Tippe auf einen Namen/.test(r.sub)&&r.rows.length===1&&/Ole Test/.test(r.rows[0]),'Admin: Trainer von U19, Hinweis auf das Profil');
  ok(r.del&&r.grip&&r.add&&!r.form,'Admin: ✕, Sortieren und „+ Trainer“; das Formular erst nach dem Tippen');
  await p.click('#trt-open');await p.waitForTimeout(150);
  r=await p.evaluate(()=>({form:!!document.getElementById('trt-form').offsetParent,btn:!!document.getElementById('trt-open').offsetParent,f:document.activeElement.id,
    chips:[...document.querySelectorAll('#tTeamChecks .tcheck')].map(x=>x.textContent+(x.classList.contains('sel')?'*':'')),
    upper:[...document.querySelectorAll('#trt-form .trt-l')].map(x=>getComputedStyle(x).textTransform)}));
  ok(r.form&&!r.btn&&r.f==='tNewName'&&JSON.stringify(r.chips)==='["U19*"]','„+ Trainer“: Name (Fokus) und Mannschaft U19 vorgewählt');
  ok(r.upper.every(x=>x==='none'),'Beschriftungen in normaler Schreibweise (nicht NAME / MANNSCHAFT(EN))');
  await p.fill('#tNewName','Kai Muster');await p.click('#trt-form .btn.bp');await p.waitForTimeout(200);
  r=await p.evaluate(()=>({t:G.trainers.map(x=>x.name),a:JSON.stringify(G.auditLog.slice(-1)),form:!!document.getElementById('trt-form').offsetParent,
    rows:[...document.querySelectorAll('#mgr-tr-list .tr-nm')].map(x=>x.textContent)}));
  ok(r.t.includes('Kai Muster')&&/Trainer hinzugefügt/.test(r.a)&&!r.form&&r.rows.some(x=>/Kai Muster/.test(x)),'hinzugefügt: in der Liste, im Protokoll, Formular wieder zu');
  if(out)await p.screenshot({path:out+'/kader132_trainerteam.png'});
  await p.click('#mgr-tr-list .tr-row:first-child .tr-main');await p.waitForTimeout(400);
  ok(await p.evaluate(()=>document.getElementById('moTrainerProfile').classList.contains('open')),'Tippen auf den Namen öffnet das Trainerprofil');
  await p.evaluate(()=>closeM('moTrainerProfile'));await p.waitForTimeout(200);
  // a trainer without admin rights: reads
  await p.evaluate(()=>{CU={name:'Ole Test',role:'trainer',teams:['U19'],loginAt:Date.now()};openSettings('trainer');});await p.waitForTimeout(300);
  r=await p.evaluate(()=>{const sec=document.querySelector('#moSettings .set-sec[data-sec="trainer"]');const vis=e=>!!(e&&e.offsetParent);
    return {on:document.querySelector('#moSettings .set-sec.on')?.dataset.sec,sub:document.getElementById('trt-sub').textContent,del:vis(sec.querySelector('.tr-del')),add:vis(document.getElementById('mgr-tr-add')),n:sec.querySelectorAll('.tr-row').length};});
  ok(r.on==='trainer'&&/Ändern kann der Admin/.test(r.sub)&&!r.del&&!r.add&&r.n===2,'Trainer: sieht das Trainerteam, ohne ✕ und ohne „+ Trainer“');
  r=await p.evaluate(async()=>{const n=G.trainers.length;document.getElementById('tNewName').value='Zed';await addTrainer();await delTrainer(0);trtAddOpen(true);
    return {n:G.trainers.length===n,form:!!document.getElementById('trt-form').offsetParent};});
  ok(r.n&&!r.form,'Trainer: Hinzufügen und Entfernen gesperrt');
  // "Nur ansehen" and the player are not offered the list for changes
  ok(await p.evaluate(()=>{CU={name:'Gast',role:'viewer',teams:['U19'],loginAt:Date.now()};return _setVisible('trainer');}),'„Nur ansehen“: Trainerteam sichtbar (lesen)');
  ok(await p.evaluate(()=>{CU={name:'x',role:'player',teams:[],loginAt:Date.now()};return !_setVisible('trainer');}),'Spieler: kein Trainerteam');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── phone: Trainerteam
 {const {p,c,errs}=await open(b,{vp:{width:390,height:844}});
  await p.evaluate(()=>{openSettings('trainer');trtAddOpen(true);});await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{const i=document.getElementById('tNewName').getBoundingClientRect();return {fit:document.documentElement.scrollWidth<=innerWidth+1&&i.right<=innerWidth,t:document.getElementById('set-title').textContent};});
  ok(r.fit&&r.t==='Trainerteam','Handy: Seite „Trainerteam“, Formular passt');
  if(out)await p.screenshot({path:out+'/kader132_trainerteam_phone.png'});
  ok(!errs.length,'Handy Trainerteam: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
