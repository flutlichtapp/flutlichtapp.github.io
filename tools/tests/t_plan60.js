// Trainingsplaner: wer was darf (1.2.60/1.2.62) und Spieler sehen nichts davon.
// Wiederhergestellt 17.11.2026 als Ersatz für das verlorene t_plan60 (Beschreibung
// in trainingsplaner.md). Admin und Trainer mit Freigabe planen; Trainer ohne
// Freigabe sehen bestehende Pläne nur an; „Nur ansehen“, andere Mannschaft und
// Spieler bekommen den Planer nie. Ohne Firebase (lokal gespeichert).
// node tools/tests/t_plan60.js [index.html] [shotdir]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const PID='p20261110_1830';
const SEED={
  'fcf_plans/U19/lib/l1':{title:'Rondo 4 gegen 2',cat:'Rondo',min:12,upd:1},
  [`fcf_plans/U19/plans/${PID}`]:{v:1,upd:5,season:'2026/27',date:'Di 10.11',time:'18:30',blocks:[
    {id:'b1',cat:'Aufwärmen',title:'Koordinationsleiter',min:15,ph:'Aktivierung 1'},
    {id:'b2',cat:'Rondo',title:'Rondo 4 gegen 2',min:25,libId:'l1',coach:'Ball flach'},
    {id:'b3',cat:'Spielform',title:'Spielform 7 gegen 7',min:50,desc:'Zwei Tore, Abseits ab Mittellinie.'}]},
  [`fcf_plans/U19/idx/${PID}`]:{n:3,m:90,d:'Di 10.11',s:'2026/27',t:'18:30'}};
const open=async(b,vp)=>{const c=await b.newContext({viewport:vp||{width:1280,height:860}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(([seed,pid])=>{
    const a={};Object.entries(seed).forEach(([k,v])=>{a[k]={v,ts:1};});localStorage.setItem('fcf_plans_local',JSON.stringify(a));
    const s=cd().sessions.find(x=>x.date==='Di 10.11'&&x.type==='training');s.pid=pid;
    window.__s10=cd().sessions.indexOf(s);window.__s13=cd().sessions.findIndex(x=>x.date==='Fr 13.11'&&x.type==='training');
  },[SEED,PID]);
  return {p,c,errs};};
const as=(p,cu)=>p.evaluate(cu=>{CU=Object.assign({loginAt:Date.now()},cu);},cu);
const OLE={name:'Ole Test',role:'trainer',teams:['U19']};
const tOpen=async(p,k,opt)=>{await p.evaluate(async([k,opt])=>{tplClose();await tplOpen(window[k],opt);},[k,opt||null]);await p.waitForTimeout(250);};
const ovOpen=p=>p.evaluate(()=>document.getElementById('tplOverlay').classList.contains('open'));
const LS=p=>p.evaluate(()=>{const a=JSON.parse(localStorage.getItem('fcf_plans_local')||'{}');const o={};Object.keys(a).forEach(k=>o[k]=a[k].v);return o;});
const toast=p=>p.evaluate(()=>{const t=document.getElementById('tplToast');return t&&t.classList.contains('show')?t.querySelector('span').textContent:'';});
(async()=>{const b=await chromium.launch();
 {const {p,c,errs}=await open(b);
  // ── trainer without clearance: existing plans read-only
  await as(p,OLE);
  ok(await p.evaluate(()=>_tplAllowed()&&!_tplEditor()),'Trainer ohne Freigabe: Planer offen, ändern nicht');
  await tOpen(p,'__s10');
  let r=await p.evaluate(()=>({ro:document.getElementById('tplOverlay').classList.contains('tpl-ro'),n:TPL.plan.blocks.length,
    add:!!document.querySelector('#tplList .tpl-add'),ed:!!document.getElementById('tplTitle'),txt:document.getElementById('tplEd').textContent}));
  ok(r.ro&&r.n===3&&!r.add&&!r.ed&&/Koordinationsleiter/.test(r.txt),'bestehender Plan: nur ansehen (kein „+ Block“, kein Eingabefeld)');
  const before=JSON.stringify(await LS(p));
  await p.evaluate(()=>tplAddBlock());
  r=await p.evaluate(()=>TPL.plan.blocks.length);
  ok(r===3&&/nur mit Freigabe vom Admin/.test(await toast(p)),'„+ Block“ von außen aufgerufen: nichts passiert, Hinweis „nur mit Freigabe vom Admin“');
  await p.evaluate(()=>{tplStdDlg();tplApplyStd();tplLibEdit();});
  ok(!(await p.evaluate(()=>document.getElementById('tplDlg').classList.contains('open'))),'Standardablauf, Vorlage, neue Übung: gesperrt');
  await p.evaluate(()=>tplTab('g'));await p.waitForTimeout(900);await p.evaluate(()=>tplTab('a'));
  ok(JSON.stringify(await LS(p))===before,'„Gruppen“ ansehen: nichts gespeichert');
  await p.evaluate(()=>tplPitchOpen());
  ok(await p.evaluate(()=>_tplPitchIsOpen()),'„Auf dem Platz“ geht auch ohne Freigabe');
  await p.evaluate(()=>tplPitchClose());
  await tOpen(p,'__s13');
  r=await p.evaluate(()=>({n:TPL.plan.blocks.length,d:TPL.draft,t:document.getElementById('tplList').textContent}));
  ok(r.n===0&&!r.d&&/Für dieses Training gibt es noch keinen Plan/.test(r.t),'Training ohne Plan: kein Standard-Entwurf, „Für dieses Training gibt es noch keinen Plan.“');
  r=await p.evaluate(()=>({a:_tplHomeBtn(window.__s10),b:_tplHomeBtn(window.__s13)}));
  ok(/Plan/.test(r.a)&&r.b==='','Übersicht: Knopf nur beim Training mit Plan, kein „Plan erstellen“');
  ok(await p.evaluate(()=>_tpRightsHtml(0)===''&&_tpPlanChip(G.trainers[0])===''),'Trainer sieht „Rechte“ und „plant mit“ nicht');
  await p.evaluate(()=>tplClose());
  // ── the admin clears him
  await as(p,{name:'Admin',role:'admin',teams:[]});
  r=await p.evaluate(()=>_tpRightsHtml(0).split('Mannschaft verwalten')[0]);
  ok(/Trainingspläne erstellen und ändern/.test(r)&&!/type="checkbox" checked/.test(r)&&/Ohne Freigabe öffnet Ole Pläne nur zum Ansehen/.test(r),'Admin: Abschnitt „Rechte“, Schalter aus, „Ohne Freigabe öffnet Ole Pläne nur zum Ansehen …“');
  await p.evaluate(()=>tpPlanSet(0,true));
  r=await p.evaluate(()=>({f:G.trainers[0].plan,a:JSON.stringify(G.auditLog.slice(-1)),c:_tpPlanChip(G.trainers[0])}));
  ok(r.f===true&&/Trainingspläne/.test(r.a)&&/darf Pläne erstellen und ändern/.test(r.a),'Freigabe gespeichert, im Protokoll „Trainingspläne … darf Pläne erstellen und ändern“');
  ok(/plant mit/.test(r.c),'Kader-Liste (nur Admin): „plant mit“');
  await p.evaluate(()=>undo());ok(await p.evaluate(()=>G.trainers[0].plan!==true),'Rückgängig: Freigabe wieder weg');
  await p.evaluate(()=>redo());ok(await p.evaluate(()=>G.trainers[0].plan===true),'Wiederholen: Freigabe wieder da');
  // ── cleared trainer, name written differently
  await as(p,{name:'ole test',role:'trainer',teams:['U19']});
  ok(await p.evaluate(()=>_tplEditor()),'Trainer mit Freigabe (Name in anderer Schreibweise): darf planen');
  await tOpen(p,'__s13');
  r=await p.evaluate(()=>({n:TPL.plan.blocks.length,d:TPL.draft,ro:document.getElementById('tplOverlay').classList.contains('tpl-ro')}));
  ok(r.n===5&&r.d&&!r.ro,'neuer Plan mit Standardablauf, Editor offen');
  await p.evaluate(()=>{TPL.sel=0;tplAddLib('l1');});await p.waitForTimeout(900);
  let ls=await LS(p);const pid13=await p.evaluate(()=>TPL.pid);
  ok(ls['fcf_plans/U19/plans/'+pid13]&&ls['fcf_plans/U19/plans/'+pid13].blocks[0].title==='Rondo 4 gegen 2'&&ls['fcf_plans/U19/plans/'+pid13].by==='ole test','füllen und speichern (gespeichert von ihm)');
  await p.evaluate(()=>tplClose());
  // ── another team's trainer, "Nur ansehen"
  await as(p,{name:'Ole Test',role:'trainer',teams:['U17']});
  await tOpen(p,'__s10');
  ok(!(await p.evaluate(()=>_tplAllowed()))&&!(await ovOpen(p))&&(await p.evaluate(()=>_tplHomeBtn(window.__s10)))==='','Trainer einer anderen Mannschaft: kein Planer');
  await as(p,{name:'Gast',role:'viewer',teams:['U19']});
  await tOpen(p,'__s10');
  ok(!(await p.evaluate(()=>_tplAllowed()))&&!(await ovOpen(p))&&(await p.evaluate(()=>_tplHomeBtn(window.__s10)))==='','„Nur ansehen“: kein Planer');
  // ── clearance taken back
  await as(p,{name:'Admin',role:'admin',teams:[]});await p.evaluate(()=>tpPlanSet(0,false));
  ok(/Pläne nur ansehen/.test(await p.evaluate(()=>JSON.stringify(G.auditLog.slice(-1))))&&await p.evaluate(()=>G.trainers[0].plan===undefined),'Freigabe entzogen: Protokoll „Pläne nur ansehen“');
  await as(p,OLE);ok(await p.evaluate(()=>_tplAllowed()&&!_tplEditor()),'danach wieder nur ansehen');
  // ── players: nothing of the planner in their part of the data, no way in
  await as(p,{name:'Admin',role:'admin',teams:[]});
  await p.evaluate(()=>{const s=cd().sessions[window.__s10];s.rv={t:Date.now(),by:'Admin',txt:'Rondo zu lang'};});
  r=await p.evaluate(()=>{const x=_pvBuildSync('U19','2026/27');const all=JSON.stringify(x.shared)+JSON.stringify(x.people.map(q=>q.obj));
    return {pid:/p20261110_1830|"pid"/.test(all),plan:/Koordinationsleiter|Rondo 4 gegen 2|Spielform 7 gegen 7|fcf_plans/.test(all),rv:/Rondo zu lang|"rv"/.test(all)};});
  ok(!r.pid&&!r.plan&&!r.rv,'Spielerdaten: keine Plan-ID, keine Übungen, kein Rückblick');
  await p.evaluate(()=>{const x=_pvBuildSync('U19','2026/27');const pp=x.people.find(q=>q.pi===4);
    const P=JSON.parse(JSON.stringify(Object.assign({},pp.obj,{tk:'t'.repeat(64),lk:'abcdef0123456789abcd'})));
    window._hubMode=true;window._hubAction=null;_pvAdopt({pk:'p'.repeat(64),t:Date.now(),P,T:JSON.parse(JSON.stringify(x.shared)),mvp:{},inbox:{}},pp.tok);_pmEnterSlice(pp.tok);
    fbDb={ref:()=>({set:()=>Promise.resolve(),once:()=>Promise.resolve({val:()=>null}),on:()=>{},off:()=>{}})};renderPlayerMode();});
  await p.waitForTimeout(300);
  await p.evaluate(async()=>{await tplOpen(window.__s10);});
  r=await p.evaluate(()=>({a:_tplAllowed(),o:document.getElementById('tplOverlay').classList.contains('open'),
    btn:[...document.querySelectorAll('[onclick*="tplOpen"],[onclick*="tplPitch"]')].filter(e=>e.offsetParent).length,
    t:/Koordinationsleiter|Trainingsplan/.test(document.body.innerText)}));
  ok(!r.a&&!r.o&&!r.btn&&!r.t,'Spieleransicht: Planer nicht erlaubt, öffnet nicht, kein Knopf, keine Übung zu sehen');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── phone, read-only
 {const {p,c,errs}=await open(b,{width:390,height:844});
  await as(p,OLE);await tOpen(p,'__s10');
  await p.evaluate(()=>tplSelect(2));
  const r=await p.evaluate(()=>({o:document.getElementById('tplOverlay').classList.contains('open'),w:document.getElementById('tplOverlay').scrollWidth<=innerWidth+1,
    t:/Spielform 7 gegen 7/.test(document.getElementById('tplEd').textContent)&&/Abseits ab Mittellinie/.test(document.getElementById('tplEd').textContent)}));
  ok(r.o&&r.w&&r.t,'Handy, ohne Freigabe: Plan lesbar, nichts ragt über den Rand');
  if(out)await p.screenshot({path:out+'/plan60_phone_ro.png'});
  ok(!errs.length,'Handy: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
