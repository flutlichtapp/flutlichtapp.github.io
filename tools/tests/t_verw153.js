// 1.2.153 (Artem 23.11.: „в модалке админа тренеры не дублируют уже другое
// окно с тренерами в настройках Trainerteam?“ — Claude: yes, and „Daten“
// repeats Einstellungen → Daten; proposal → „да, согласен“). In design Heute
// the Administration window is gone: its own parts — Mannschaften, Wartung,
// Online-Sync, „Leerer Stand“ — are in Einstellungen → Verwaltung (admin
// only, the same elements, so the functions are unchanged). Trainer →
// Trainerteam, Backups → Daten. The way in stays: menu, search, key.
// 1.2.154 (Artem 24.11.: „когда мы в Einstellungen через меню
// администрирования, не подсвечивается слева в панели желтым“): with Spieltag
// or Saisonkader open, the tool now closes first (like every change of page)
// and the navigation marks „Einstellungen“.
// node tools/tests/t_verw153.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const state=p=>p.evaluate(()=>{const on=document.querySelector('#moSettings .set-sec.on');const vis=e=>!!(e&&e.getClientRects().length);
  return {admin:document.getElementById('moAdmin').classList.contains('open'),settings:document.getElementById('moSettings').classList.contains('open'),sec:on&&on.dataset.sec,
    nav:[...document.querySelectorAll('#moSettings .set-nav-it')].filter(e=>!e.classList.contains('set-hide')).map(e=>e.dataset.sec),
    blocks:['vw-teams','vw-wartung','vw-sync','vw-reset'].filter(i=>vis(document.getElementById(i))),
    fb:!!document.querySelector('#vw-host-sync #fb-dbUrl'),reset:!!document.querySelector('#vw-host-reset [onclick="hardReset()"]'),backupsHere:!!document.querySelector('#moSettings .set-sec[data-sec="verwaltung"] [onclick*="openBackupModal"]'),
    trainersHere:!!document.querySelector('#moSettings .set-sec[data-sec="verwaltung"] #all-tr-list'),teamTr:[...document.querySelectorAll('#admin-teams-list .vw-tr')].map(x=>x.textContent)};});
(async()=>{const b=await chromium.launch();
 for(const [w,h,how] of [[1536,864,'menu'],[1536,864,'tool'],[1366,657,'saison'],[1366,657,'search'],[390,844,'phone']]){
  const ph=w<768,tag=w+'×'+h+' '+how+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(how==='tool'){await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(700);}
  if(how==='saison'){await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(300);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(700);}
  if(how==='menu'||how==='tool'||how==='saison'){await p.click('.hx-user-btn');await p.waitForTimeout(300);await p.click('#ud-admin');}
  else if(how==='search'){await p.evaluate(()=>openM('moAdmin'));}
  else{await p.evaluate(()=>openM('moAdmin'));}
  await p.waitForTimeout(500);
  const s=await state(p);
  ok(!s.admin&&s.settings&&s.sec==='verwaltung',tag+'„Administration“ öffnet Einstellungen → Verwaltung (kein eigenes Fenster)');
  ok(s.nav.includes('verwaltung')&&s.nav.indexOf('verwaltung')===s.nav.indexOf('daten')-1,tag+'„Verwaltung“ in der Liste, vor „Daten“');
  ok(s.blocks.length===4&&s.fb&&s.reset,tag+'Mannschaften, Wartung, Online-Sync, Leerer Stand');
  ok(!s.backupsHere&&!s.trainersHere,tag+'keine Doppel: Trainer (→ Trainerteam) und Backups (→ Daten) nicht hier');
  ok(s.teamTr.length===1&&/^Trainer: /.test(s.teamTr[0]),tag+'Mannschaft mit ihren Trainern ('+s.teamTr[0]+')');
  if(how==='tool'||how==='saison'){const top=await p.evaluate(()=>{const r=document.querySelector('#moSettings .set-sec.on').getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+20);
      return {top:!!(e&&e.closest('#moSettings')),tool:document.getElementById('moLineup').classList.contains('open')||document.getElementById('moSeasonLineup').classList.contains('open')};});
    ok(top.top&&!top.tool,tag+'das Werkzeug ist zu, Einstellungen sichtbar');}
  if(!ph){const on=await p.evaluate(()=>[...document.querySelectorAll('#hxNav .hx-item.on')].map(e=>e.dataset.hx));
    ok(on.length===1&&on[0]==='settings',tag+'Navigation links: „Einstellungen“ markiert ('+on.join(',')+')');}
  if(how==='menu'){
    // the moved form still works: a new team
    await p.fill('#adminNewTeam','U17');await p.evaluate(()=>document.querySelector('#vw-host-teams [onclick="addTeamAdmin()"]').click());await p.waitForTimeout(300);
    const t=await p.evaluate(()=>({list:G.teamList.slice(),rows:[...document.querySelectorAll('#admin-teams-list input')].map(i=>i.value)}));
    ok(t.list.includes('U17')&&t.rows.includes('U17'),tag+'„Anlegen“ funktioniert hier (U17)');
    // the old tab names lead to their place
    await p.evaluate(()=>switchAdminTab('wartung'));await p.waitForTimeout(300);
    const wt=await p.evaluate(()=>{const r=document.getElementById('vw-wartung').getBoundingClientRect();return r.top>=0&&r.top<innerHeight;});
    ok(wt,tag+'„Wartung“ (Suche) zeigt den Abschnitt Wartung');
    await p.evaluate(()=>switchAdminTab('trainers'));await p.waitForTimeout(200);
    ok((await state(p)).sec==='verwaltung',tag+'„Trainer“-Tab: bleibt in Verwaltung (Trainer stehen unter Trainerteam)');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // „Konto“ from the user menu with Spieltag open: the same — tool closes, Einstellungen marked
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(700);
  await p.click('.hx-user-btn');await p.waitForTimeout(300);await p.evaluate(()=>{const x=[...document.querySelectorAll('#userDropdown .ud-item')].find(e=>/openSettings\('konto'\)/.test(e.getAttribute('onclick')||''));x&&x.click();});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>({sec:(document.querySelector('#moSettings .set-sec.on')||{}).dataset?.sec,on:[...document.querySelectorAll('#hxNav .hx-item.on')].map(e=>e.dataset.hx),tool:document.getElementById('moLineup').classList.contains('open')}));
  ok(r.sec==='konto'&&r.on.join()==='settings'&&!r.tool,'„Konto“ aus dem Menü bei offenem Spieltag: Einstellungen markiert, Spieltag zu ('+JSON.stringify(r)+')');await c.close();}
 // a trainer (not admin): no Verwaltung
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>{CU={...CU,role:'trainer',name:'Ole Test'};openSettings();});await p.waitForTimeout(400);
  const nav=await p.evaluate(()=>[...document.querySelectorAll('#moSettings .set-nav-it')].filter(e=>!e.classList.contains('set-hide')).map(e=>e.dataset.sec));
  ok(!nav.includes('verwaltung'),'Trainer ohne Admin: keine „Verwaltung“ ('+nav.join(',')+')');await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
