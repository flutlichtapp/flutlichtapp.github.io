// 1.2.162 (Artem 26.11.):
//  • „у другого тренера пишет состав, будто он сохранен у меня, даже если он
//    пустой“ — an empty lineup is no variant: saving it removes one's own, it
//    never counts, older empty variants are not shown to the others;
//  • „рядом с 4-2-3-1 пустое место“ — in the column the schema takes the width;
//  • „в онлайн-активности … некоторые разделы не отображаются“ — every page
//    names itself for "Online"; tools and dialogs keep their own name while open.
// node tools/tests/t_var162.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  const si=await p.evaluate(()=>{const D=cd();window._fl=[];const o=window.showSaveFlash;window.showSaveFlash=(t,...a)=>{window._fl.push(t);return o&&o(t,...a);};return D.sessions.findIndex(s=>s.date==='So 08.11');});
  const key=await p.evaluate(si=>_mlKey(UI.currentTeam,UI.currentSeason,si),si);
  const asOle=()=>p.evaluate(()=>{CU={name:'Ole Test',role:'trainer',teams:['U19'],loginAt:Date.now()};});
  const asAdmin=()=>p.evaluate(()=>{CU={name:'Admin',role:'admin',teams:['U19'],loginAt:Date.now()};});
  const open=()=>p.evaluate(si=>{if(document.getElementById('moLineup').classList.contains('open')){_lpOpenSnap=_lpSnapshot();closeLineupPlanner();}openLineupPlanner(si);},si).then(()=>p.waitForTimeout(500));
  const view=()=>p.evaluate(k=>{const bar=document.getElementById('lp-var-bar'),side=document.getElementById('lp-saves-list');
    return {bar:!!(bar&&bar.style.display!=='none'&&bar.innerHTML),pills:bar?[...bar.querySelectorAll('.lv-pill .lv-n')].map(x=>x.textContent):[],side:side?side.innerText.replace(/\s+/g,' ').trim():'',
      ml:G.matchLineups&&G.matchLineups[k]?JSON.parse(JSON.stringify(G.matchLineups[k])):null,fl:window._fl.slice(-1)[0]||''};},key);
  // A. admin saves an empty lineup → nothing stored
  await asAdmin();await open();
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpSave();});
  let v=await view();
  ok(v.ml===null&&v.fl==='Noch niemand gesetzt – nichts gespeichert','A: leer gespeichert → nichts gespeichert („'+v.fl+'“)');
  await asOle();await open();v=await view();
  ok(!v.bar&&!/Start:/.test(v.side),'A: beim anderen Trainer keine Variante, kein „Start: …“ ('+v.side+')');
  // B. old data: an empty variant of the admin that "counts"
  await p.evaluate(k=>{G.matchLineups=G.matchLineups||{};G.matchLineups[k]={vars:{admin:{formation:'4-2-3-1',slots:{},subs:[],by:'Admin',savedAt:Date.now()-3600e3}},src:'admin',formation:'4-2-3-1',slots:{},subs:[],savedAt:Date.now()-3600e3};},key);
  await open();v=await view();
  ok(!v.bar&&!/Start:/.test(v.side)&&!/gilt/.test(v.side),'B: alte leere Variante: nicht gezeigt, gilt nicht ('+v.side+')');
  // C. admin full, Ole full, admin clears → Ole's counts
  await p.evaluate(k=>{delete G.matchLineups[k];},key);
  await asAdmin();await open();
  await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(lpState.formation,lpState.customSlots);lpState.slots={};sl.forEach((x,i)=>{lpState.slots[x.id]=i;});lpRender();lpSave();});
  v=await view();ok(v.ml&&v.ml.src==='admin'&&Object.keys(v.ml.slots).length===11,'C: Admin speichert 11 – gilt');
  await asOle();await open();
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);lpState.slots={};sl.forEach((x,i)=>{lpState.slots[x.id]=i+2;});lpRender();lpSave();});
  v=await view();const oleK=Object.keys(v.ml.vars).find(k=>k!=='admin');
  ok(v.ml.src==='admin'&&oleK,'C: Ole speichert seine Variante – Admins gilt weiter');
  await asAdmin();await open();v=await view();
  ok(v.bar&&v.pills.includes('Ole'),'C: Admin sieht Oles Variante ('+v.pills.join(', ')+')');
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpSave();});
  v=await view();
  ok(v.fl==='✓ Aufstellung geleert'&&v.ml&&!v.ml.vars.admin&&v.ml.src===oleK&&Object.values(v.ml.slots).includes(2),'C: Admin leert → seine Variante weg, Oles gilt jetzt („'+v.fl+'“)');
  await asOle();await open();v=await view();
  ok(!v.bar&&/gilt fürs Spiel/.test(v.side),'C: Ole: keine fremde Variante mehr, seine gilt ('+v.side+')');
  // D. the schema takes the column's width
  await asAdmin();await open();
  const w=await p.evaluate(()=>{const s=document.querySelector('#lp-fmt-btns select'),col=s&&s.closest('.lp-ntop');const r=s.getBoundingClientRect(),k=document.querySelector('.lp-kind-wrap').getBoundingClientRect();return {s:Math.round(r.width),k:Math.round(k.width),inCol:!!col};});
  ok(w.inCol&&Math.abs(w.s-w.k)<=4,'D: 4-2-3-1 so breit wie „Meisterschaft | Testspiel“ ('+w.s+' / '+w.k+' px)');
  await p.evaluate(()=>{_lpOpenSnap=_lpSnapshot();closeLineupPlanner();});await p.waitForTimeout(300);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const w2=await p.evaluate(()=>{const s=document.querySelector('#slp-fmt-btns select');const col=s&&s.closest('.lp-ntop');return col?{s:Math.round(s.getBoundingClientRect().width),c:Math.round(col.getBoundingClientRect().width)}:null;});
  ok(!w2||w2.s>=w2.c*0.85,'D: Saisonkader – Schema in der Spalte breit ('+JSON.stringify(w2)+')');
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  // E. Online: every page names itself
  const pres=async(fn,ms=350)=>{await p.evaluate(fn);await p.waitForTimeout(ms);return p.evaluate(()=>_presenceContext);};
  const want={home:'🏠 Übersicht',table:'📋 Anwesenheit',cal:'📅 Kalender',team:'👥 Kader',stats:'📊 Statistik',week:'📰 Wochenbericht',settings:'⚙️ Einstellungen'};
  for(const [k,t] of Object.entries(want)){const got=await pres(`hxGo('${k}')`,500);ok(got===t,'E: '+k+' → „'+got+'“');}
  let got=await pres(()=>hxGo('lineup'),900);ok(/^⚽ Aufstellung So 08\.11/.test(got),'E: Spieltag (Werkzeug) → „'+got+'“');
  got=await pres(()=>{_lpOpenSnap=_lpSnapshot();closeLineupPlanner();},500);ok(Object.values(want).includes(got),'E: Spieltag zu → Seite darunter „'+got+'“');
  await p.evaluate(()=>hxGo('stats'));await p.waitForTimeout(400);
  got=await p.evaluate(si=>{rcOpen(si);return _presenceContext;},si);ok(/^✅ Anwesenheit erfassen So 08\.11/.test(got),'E: Anwesenheit erfassen → „'+got+'“');
  got=await pres(()=>rcClose());ok(got==='📊 Statistik','E: zu → „'+got+'“');
  got=await p.evaluate(si=>{sbOpen(si);return _presenceContext;},si);ok(/^📝 Spielbericht So 08\.11/.test(got),'E: Spielbericht → „'+got+'“');
  got=await pres(()=>sbClose());ok(got==='📊 Statistik','E: zu → „'+got+'“');
  got=await pres(()=>{openPlayerStats(2);hxSyncNav();});ok(/^👤 /.test(got),'E: Spielerprofil behält seinen Namen („'+got+'“)');
  got=await pres(()=>closeM('moPlayer'));ok(got==='📊 Statistik','E: Profil zu → „'+got+'“');
  ok(!errs.length,'keine Fehler '+errs.join(' | '));
  await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
