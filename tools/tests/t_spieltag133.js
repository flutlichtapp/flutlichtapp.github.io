// 1.2.133: „Spieltag“ statt „Aufstellung“ – Kader (Tafel, nur Spiele) → Aufstellung;
// „Kader“ = Spieler, Saisonkader, Ziele, Videos. Dazu: Neuigkeiten in der Übersicht
// oben neben der Begrüßung (Übersicht ohne Scrollen auf 1536×730), Statistik ohne
// eigenen Mannschafts-/Saisonwechsel, Wochenbericht „Auffällig diese Woche“.
// Artem 18.11.: „со всем согласен“; „опять не влазит Übersicht … маленький скрол“.
// 1.2.138: im Saisonkader-Kopf alle vier (Spieler · Saisonkader · Ziele · Videos), nicht nur zwei.
// node tools/tests/t_spieltag133.js [index.html] [shotdir]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const MI=new Date('2026-11-18T17:55:00+01:00').getTime();
const open=async(b,o)=>{o=o||{};const c=await b.newContext({viewport:o.vp||{width:1536,height:730}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:o.time||NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(o.cu)await p.evaluate(cu=>{CU=Object.assign({loginAt:Date.now()},cu);},o.cu);
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();});await p.waitForTimeout(200);
  return {p,c,errs};};
const st=p=>p.evaluate(()=>{const tm=document.getElementById('moTeamMgr'),vis=e=>!!(e&&e.offsetParent);
  const tabsOf=sel=>[...document.querySelectorAll(sel)].filter(vis).map(x=>x.textContent.trim()+(x.classList.contains('on')?'*':''));
  return {nav:[...document.querySelectorAll('#hxNav .hx-item.on')].map(x=>x.textContent.trim()).join(),
    page:tm.classList.contains('open')?tm.dataset.mode:'',tool:_hxToolOpen(),
    head:tabsOf('#tmgr-h .hx-lptabs button'),pills:tabsOf('#moTeamMgr .tbar .tbtn'),
    lp:tabsOf('#moLineup .hx-lptabs button'),slp:tabsOf('#moSeasonLineup .slp-kpills button'),
    lpSi:document.getElementById('moLineup').classList.contains('open')?lpState.sessIdx:null,kbSi:KB.si,
    days:[...document.querySelectorAll('#kbBoard .kb-day')].map(x=>x.textContent.replace(/\s+/g,' ').trim())};});
const J=JSON.stringify;
(async()=>{const b=await chromium.launch();
 // ── navigation, admin
 {const {p,c,errs}=await open(b);
  const items=await p.evaluate(()=>[...document.querySelectorAll('#hxNav .hx-item')].map(x=>x.textContent.trim()));
  ok(items.includes('Spieltag')&&!items.includes('Aufstellung'),'Navigation: „Spieltag“ statt „Aufstellung“');
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(500);
  let r=await st(p);
  ok(r.page==='spieltag'&&r.nav==='Spieltag'&&J(r.head)===J(['Kader*','Aufstellung'])&&!r.pills.length,'Spieltag öffnet beim ersten Mal „Kader“ (Tafel): Kopf „Kader | Aufstellung“, keine Reiterleiste');
  ok(r.days.length>=2&&r.days.every(d=>/Spiel/.test(d)),'Tafel nur mit Spielen ('+r.days.length+')');
  if(out)await p.screenshot({path:out+'/spieltag133_kader.png'});
  const m2=await p.evaluate(()=>{const D=cd();const i=D.sessions.findIndex(s=>s.date==='So 15.11');kbPick(i);return i;});
  await p.click('#tmgr-h .hx-lptabs button:has-text("Aufstellung")');await p.waitForTimeout(600);
  r=await st(p);
  ok(r.tool==='moLineup'&&r.lpSi===m2&&r.nav==='Spieltag'&&J(r.lp)===J(['Kader','Aufstellung*']),'„Aufstellung“: dasselbe Spiel (So 15.11), Kopf „Kader | Aufstellung“');
  ok(await p.evaluate(()=>localStorage.getItem('fcf_st_tab')==='aufstellung'),'zuletzt benutzter Schritt gemerkt');
  if(out)await p.screenshot({path:out+'/spieltag133_aufstellung.png'});
  await p.click('#moLineup .hx-lptabs button:has-text("Kader")');await p.waitForTimeout(500);
  r=await st(p);
  ok(!r.tool&&r.page==='spieltag'&&r.kbSi===m2&&r.nav==='Spieltag','„Kader“ im Kopf der Aufstellung: zurück zur Tafel, dasselbe Spiel');
  // remembered step: Spieltag opens straight on the lineup
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','aufstellung');hxGo('home');});await p.waitForTimeout(300);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(600);
  r=await st(p);
  ok(r.tool==='moLineup'&&r.nav==='Spieltag','zuletzt „Aufstellung“: Spieltag öffnet die Aufstellung');
  // Kader: Spieler · Saisonkader · Ziele · Videos
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(600);
  r=await st(p);
  ok(!r.tool&&r.page==='kader'&&r.nav==='Kader'&&J(r.pills)===J(['Spieler','Saisonkader','Ziele','Videos'])&&r.head.length===0,'Kader: Spieler, Saisonkader, Ziele, Videos');
  await p.click('#moTeamMgr .tbar .tbtn:has-text("Saisonkader")');await p.waitForTimeout(700);
  r=await st(p);
  ok(r.tool==='moSeasonLineup'&&r.nav==='Kader'&&J(r.slp)===J(['Spieler','Saisonkader*','Ziele','Videos']),'Saisonkader: eigenes Werkzeug, Navigation bleibt „Kader“, Kopf mit allen vier (seit 1.2.138)');
  if(out)await p.screenshot({path:out+'/spieltag133_saisonkader.png'});
  await p.click('#moSeasonLineup .slp-kpills button:has-text("Spieler")');await p.waitForTimeout(700);
  r=await st(p);
  ok(!r.tool&&r.page==='kader'&&r.pills.includes('Spieler')&&await p.evaluate(()=>document.getElementById('tab-spieler').classList.contains('active')),'„Spieler“ im Saisonkader: zurück zur Liste');
  // Statistik and Wochenbericht
  await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(500);
  r=await p.evaluate(()=>({sel:document.querySelectorAll('#moDashboard select.db-sel').length,txt:/Saison bisher/.test(document.getElementById('db-content').textContent)}));
  ok(r.sel===0&&r.txt,'Statistik ohne eigene Auswahl von Mannschaft und Saison, Inhalt da');
  await p.evaluate(()=>hxGo('week'));await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const t=document.getElementById('moWeekReport').textContent;return {a:/Auffällig diese Woche/.test(t),b:/Im Blick behalten/.test(t)};});
  ok(r.a&&!r.b,'Wochenbericht: „Auffällig diese Woche“ statt „Im Blick behalten“');
  // the news entry goes to the Spieltag
  r=await p.evaluate(()=>({id:APP_NEWS[0].id,old:APP_NEWS.some(n=>n.id==='20261117-1'),go:APP_NEWS[0].go&&APP_NEWS[0].go[1]}));
  ok(r.id==='20261118-1'&&!r.old&&r.go==='hxSpieltag()','Neuigkeit „Spieltag …“ ersetzt die vom 17.11.');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── "Nur ansehen": the Tafel, nothing to change
 {const {p,c,errs}=await open(b,{cu:{name:'Gast',role:'viewer',teams:['U19']}});
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','aufstellung');hxGo('lineup');});await p.waitForTimeout(500);
  let r=await st(p);
  ok(r.page==='spieltag'&&J(r.head)===J(['Kader*'])&&!r.tool,'„Nur ansehen“: Spieltag zeigt die Tafel, ohne Reiter „Aufstellung“');
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);
  r=await st(p);
  ok(J(r.pills)===J(['Spieler','Ziele','Videos']),'„Nur ansehen“: Kader ohne „Saisonkader“');
  ok(!errs.length,'„Nur ansehen“: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── no match ahead
 {const {p,c,errs}=await open(b,{time:new Date('2026-11-25T10:00:00+01:00').getTime()});
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','aufstellung');hxGo('lineup');});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>({t:document.getElementById('kbBoard').textContent,tool:_hxToolOpen()}));
  ok(/Gerade ist kein Spiel angesetzt/.test(r.t)&&!r.tool,'kein Spiel mehr angesetzt: Spieltag sagt es (statt leerer Aufstellung)');
  ok(!errs.length,'ohne Spiel: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── Übersicht: the news in the head, no scrolling on computers
 for(const [w,h] of [[1536,730],[1536,864],[1440,900],[1920,950],[1280,800]]){
  const {p,c,errs}=await open(b,{vp:{width:w,height:h},time:MI});
  const r=await p.evaluate(()=>{const sc=document.getElementById('hxHome'),top=document.querySelector('#hxHome .hx-nwtop'),card=document.querySelector('#hxHome .hx-card.hx-nw');
    return {over:sc.scrollHeight-sc.clientHeight,top:!!(top&&top.offsetParent),card:!!(card&&card.offsetParent),t:top?top.textContent.replace(/\s+/g,' ').trim():'',
      inHead:!!(top&&top.closest('.hx-top'))};});
  ok(r.over<=0&&r.top&&!r.card&&r.inHead,`Übersicht ${w}×${h} mit Neuigkeit: ohne Scrollen, Neuigkeit oben neben der Begrüßung (${r.over})`);
  if(w===1536&&h===730){
    ok(/^Neu: Spieltag: erst der Kader, dann die Aufstellung/.test(r.t),'Text: „Neu: Spieltag: erst der Kader, dann die Aufstellung …“');
    if(out)await p.screenshot({path:out+'/spieltag133_uebersicht.png'});
    await p.click('#hxHome .hx-nwtop-go');await p.waitForTimeout(300);
    const o=await p.evaluate(()=>document.getElementById('moNews').classList.contains('open'));
    await p.evaluate(()=>closeM('moNews'));await p.waitForTimeout(200);
    ok(o&&!(await p.evaluate(()=>!!document.querySelector('#hxHome .hx-nwtop'))),'„Ansehen“ öffnet die Neuigkeiten, danach ist die Zeile weg');
  }
  if(w===1536&&h===864){
    await p.click('#hxHome .hx-nwtop-x');await p.waitForTimeout(200);
    ok(!(await p.evaluate(()=>!!document.querySelector('#hxHome .hx-nwtop'))),'✕ blendet die Neuigkeit aus');
  }
  ok(!errs.length,`Übersicht ${w}×${h}: keine Fehler`+(errs.length?': '+errs[0]:''));await c.close();}

 // ── phone
 {const {p,c,errs}=await open(b,{vp:{width:390,height:844},time:MI});
  let r=await p.evaluate(()=>{const top=document.querySelector('#hxHome .hx-nwtop'),card=document.querySelector('#hxHome .hx-card.hx-nw');return {top:!!(top&&top.offsetParent),card:!!(card&&card.offsetParent)};});
  ok(r.card&&!r.top,'Handy: Neuigkeit wie bisher als Karte');
  await p.evaluate(()=>mobNav('more'));await p.waitForTimeout(300);
  r=await p.evaluate(()=>[...document.querySelectorAll('#ms-areas .ms-row')].map(x=>x.textContent.trim()));
  ok(r.includes('Spieltag')&&!r.includes('Aufstellung'),'Handy, „Mehr“: „Spieltag“');
  await p.click('#ms-areas .ms-row:has-text("Spieltag")');await p.waitForTimeout(600);
  r=await p.evaluate(()=>({mode:document.getElementById('moTeamMgr').dataset.mode,more:document.getElementById('mn-more').classList.contains('on'),team:document.getElementById('mn-team').classList.contains('on'),
    fit:[...document.querySelectorAll('#tmgr-h .hx-lptabs button')].every(e=>e.getBoundingClientRect().right<=innerWidth)}));
  ok(r.mode==='spieltag'&&r.more&&!r.team&&r.fit,'Handy: Spieltag über „Mehr“, unten „Mehr“ markiert, Kopf passt');
  if(out)await p.screenshot({path:out+'/spieltag133_phone.png'});
  await p.evaluate(()=>mobNav('team'));await p.waitForTimeout(500);
  r=await p.evaluate(()=>({mode:document.getElementById('moTeamMgr').dataset.mode,team:document.getElementById('mn-team').classList.contains('on'),
    tabs:[...document.querySelectorAll('#moTeamMgr .tbar .tbtn')].filter(e=>e.offsetParent).map(e=>[e.textContent.trim(),e.getBoundingClientRect().right<=innerWidth+0.5])}));
  ok(r.mode==='kader'&&r.team&&r.tabs.length===4&&r.tabs.every(x=>x[1]),'Handy: Kader mit vier Reitern, alle sichtbar');
  ok(!errs.length,'Handy: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 {const {p,c,errs}=await open(b,{vp:{width:360,height:640}});
  await p.evaluate(()=>mobNav('team'));await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const bar=document.querySelector('#moTeamMgr .tbar');return {sw:bar.scrollWidth,cw:bar.clientWidth,page:document.documentElement.scrollWidth<=innerWidth+1};});
  ok(r.page&&r.sw<=r.cw+1,'Handy 360 px: Reiterleiste passt ('+r.sw+'/'+r.cw+')');
  ok(!errs.length,'Handy 360: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
