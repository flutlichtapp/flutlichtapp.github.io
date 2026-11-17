// Trainingsplaner: Standardablauf (1.2.28), „Aus der Bibliothek wählen“ (1.2.29),
// Standard in leer gespeicherten Plänen (1.2.30). Wiederhergestellt 17.11.2026
// als Ersatz für die verlorenen t_std, t_pick und t_fix (Beschreibung in
// trainingsplaner.md). Ohne Firebase: der Planer speichert lokal (fcf_plans_local).
// node tools/tests/t_std128.js [index.html] [shotdir]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const STD5=['Aktivierung 1','Aktivierung 2','Hauptteil 1','Hauptteil 2','Schlussteil'];
const LIB={
  l1:{title:'Rondo 4 gegen 2',cat:'Rondo',min:12,players:'6',desc:'Vier außen, zwei innen.',upd:1},
  l2:{title:'Passdreieck',cat:'Passspiel',min:15,upd:1},
  l3:{title:'Koordinationsleiter',cat:'Aufwärmen',min:8,upd:1},
  l4:{title:'Spielform 7 gegen 7',cat:'Spielform',min:25,upd:1},
  l5:{title:'Torschuss nach Kombination',cat:'Torschuss',min:20,upd:1}};
const libSeed=()=>Object.fromEntries(Object.entries(LIB).map(([k,v])=>['fcf_plans/U19/lib/'+k,v]));
// seed: {path: value} goes into the local store, as if saved earlier on this device
// pids: {date: true} gives these trainings their plan id (as after a first save)
const open=async(b,o)=>{o=o||{};const c=await b.newContext({viewport:o.vp||{width:1280,height:860}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(o=>{
    const a={};Object.entries(o.seed||{}).forEach(([k,v])=>{a[k]={v,ts:1};});
    localStorage.setItem('fcf_plans_local',JSON.stringify(a));
    const D=cd();(o.pids||[]).forEach(d=>{const s=D.sessions.find(x=>x.date===d&&x.type==='training');s.pid=_tplPidFor(D,s,'2026/27');});
  },o);
  return {p,c,errs};};
const si=(p,d)=>p.evaluate(d=>cd().sessions.findIndex(s=>s.date===d&&s.type==='training'),d);
const tOpen=async(p,d,opt)=>{await p.evaluate(async([d,opt])=>{const i=cd().sessions.findIndex(s=>s.date===d&&s.type==='training');await tplOpen(i,opt);},[d,opt||null]);await p.waitForTimeout(250);};
const st=p=>p.evaluate(()=>({n:TPL.plan.blocks.length,ph:TPL.plan.blocks.map(b=>b.ph),t:TPL.plan.blocks.map(b=>b.title),
  min:TPL.plan.blocks.map(b=>+b.min),cat:TPL.plan.blocks.map(b=>b.cat),lib:TPL.plan.blocks.map(b=>b.libId),
  tot:_tplTotal(),draft:TPL.draft,sel:TPL.sel,pid:TPL.pid,ro:TPL.readFail}));
const LS=p=>p.evaluate(()=>{const a=JSON.parse(localStorage.getItem('fcf_plans_local')||'{}');const o={};Object.keys(a).forEach(k=>o[k]=a[k].v);return o;});
const toast=p=>p.evaluate(()=>{const t=document.getElementById('tplToast');return t&&t.classList.contains('show')?t.querySelector('span').textContent:'';});
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
(async()=>{const b=await chromium.launch();
 // ── 1.2.28 Standardablauf, library still empty
 {const {p,c,errs}=await open(b);
  const s10=await si(p,'Di 10.11');
  await p.evaluate(()=>{const h=document.getElementById('homeOverlay');h.style.display='';hxRender();});
  ok(/Plan erstellen/.test(await p.evaluate(i=>_tplHomeBtn(i),s10)),'Übersicht: „Plan erstellen“ beim nächsten Training');
  await tOpen(p,'Di 10.11');
  let r=await st(p);
  ok(r.n===5&&eq(r.ph,STD5)&&r.tot===90&&r.draft,'neuer Plan: Standardablauf mit 5 Abschnitten, 90 Min., als Entwurf');
  ok(eq(r.cat,['Aufwärmen','Aufwärmen','Sonstiges','Sonstiges','Spielform'])&&r.t.every(t=>!t),'Abschnitte leer, Kategorien aus dem Standard');
  let h=await p.evaluate(()=>{const n=document.querySelector('#tplList .tpl-stdn');return n?n.textContent.replace(/\s+/g,' '):'';});
  ok(/Standardablauf – tippe auf einen Abschnitt und trag die Übung ein\./.test(h)&&!/Bibliothek/.test(h)&&/Leer beginnen/.test(h)&&/Standard ändern/.test(h),
    'Hinweis bei leerer Bibliothek: eintragen, „Leer beginnen“, „Standard ändern“');
  r=await p.evaluate(()=>({k:document.getElementById('tplKick').textContent,ph:document.getElementById('tplTitle').placeholder,
    pick:[...document.querySelectorAll('#tplEd button')].some(x=>/Aus der Bibliothek wählen/.test(x.textContent))}));
  ok(r.k==='Aktivierung 1 · 18:30–18:40 · Aufwärmen'&&r.ph==='Name der Übung eintragen','Editor: „Aktivierung 1 · 18:30–18:40 · Aufwärmen“, Feld „Name der Übung eintragen“');
  ok(!r.pick,'leere Bibliothek: kein „Aus der Bibliothek wählen“');
  // Auf dem Platz is not started for an unsaved standard
  await p.evaluate(()=>tplClose());await tOpen(p,'Di 10.11',{pitch:1});
  ok(!(await p.evaluate(()=>_tplPitchIsOpen())),'„Auf dem Platz“ startet nicht für den ungespeicherten Standard');
  await p.evaluate(()=>tplClose());await p.waitForTimeout(900);
  let ls=await LS(p);
  ok(!Object.keys(ls).some(k=>/\/plans\/|\/idx\//.test(k))&&!(await p.evaluate(i=>cd().sessions[i].pid,s10)),'öffnen und schließen speichert nichts (kein Plan, keine Plan-ID am Training)');
  ok(/Plan erstellen/.test(await p.evaluate(i=>_tplHomeBtn(i),s10)),'Übersicht danach weiter „Plan erstellen“');
  // first change saves
  await tOpen(p,'Di 10.11');
  await p.fill('#tplTitle','Laufschule');await p.waitForTimeout(900);
  ls=await LS(p);r=await st(p);
  const pl=ls['fcf_plans/U19/plans/'+r.pid],ix=ls['fcf_plans/U19/idx/'+r.pid];
  ok(pl&&pl.blocks.length===5&&pl.blocks[0].title==='Laufschule'&&pl.blocks[0].ph==='Aktivierung 1'&&!r.draft,'erste Eingabe speichert den Plan mit allen Abschnitten');
  ok(ix&&ix.n===5&&(await p.evaluate(i=>cd().sessions[i].pid,s10))===r.pid,'Kurzübersicht und Plan-ID am Training gespeichert');
  ok(/Plan · 5 Blöcke · 90′/.test(await p.evaluate(i=>_tplHomeBtn(i),s10)),'Übersicht: „Plan · 5 Blöcke · 90′“');
  // filled section in the list
  ok(/18:30 · Aktivierung 1 · Aufwärmen/.test(await p.evaluate(()=>document.querySelector('#tplList .tpl-blk[data-i="0"] .tpl-bk').textContent)),'Liste: „18:30 · Aktivierung 1 · Aufwärmen“ über dem Namen');
  await p.evaluate(()=>tplClose());await tOpen(p,'Di 10.11',{pitch:1});
  ok(await p.evaluate(()=>_tplPitchIsOpen()),'gespeicherter Plan: „Auf dem Platz“ startet');
  await p.evaluate(()=>tplClose());
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── filling the sections with the library (+, drag), insert after, undo, print, Standard ändern
 {const {p,c,errs}=await open(b,{seed:libSeed()});
  await tOpen(p,'Fr 13.11');
  let h=await p.evaluate(()=>document.querySelector('#tplList .tpl-stdn').textContent.replace(/\s+/g,' '));
  ok(/oder wähle sie aus der Bibliothek/.test(h),'Hinweis mit Bibliothek: „… oder wähle sie aus der Bibliothek“');
  await p.evaluate(()=>{TPL.sel=0;tplAddLib('l3');});
  let r=await st(p);
  ok(r.t[0]==='Koordinationsleiter'&&r.ph[0]==='Aktivierung 1'&&r.min[0]===10&&r.lib[0]==='l3'&&r.n===5,'+ füllt den gewählten Abschnitt: Name bleibt, Minuten des Abschnitts (10 statt 8)');
  ok(r.sel===1,'danach ist der nächste leere Abschnitt gewählt');
  await p.evaluate(()=>tplAddLib('l1'));r=await st(p);
  ok(r.t[1]==='Rondo 4 gegen 2'&&r.cat[1]==='Rondo'&&r.min[1]===10&&r.sel===2,'+ + füllt der Reihe nach, Kategorie aus der Übung');
  await p.evaluate(()=>{tplSelect(0);tplAddLib('l2');});r=await st(p);
  ok(r.n===6&&r.t[1]==='Passdreieck'&&r.ph[1]===''&&r.min[1]===15&&r.t[2]==='Rondo 4 gegen 2','gefüllter Block gewählt: + fügt danach ein (eigene Minuten)');
  await p.evaluate(()=>tplUndo());r=await st(p);
  ok(r.n===5&&r.t[1]==='Rondo 4 gegen 2','Rückgängig nimmt das Einfügen zurück');
  await p.evaluate(()=>{tplSelect(4);tplAddBlock();});r=await st(p);const nb=r.sel;
  await p.evaluate(()=>tplAddLib('l5'));r=await st(p);
  ok(r.n===6&&r.t[nb]==='Torschuss nach Kombination'&&r.min[nb]===20&&r.ph[nb]==='','leerer Block ohne Abschnitt: wird gefüllt und nimmt die Minuten der Übung');
  await p.evaluate(()=>tplUndo());await p.evaluate(()=>tplUndo());
  // drag a drill onto an empty section
  const tgt=(await st(p)).ph.indexOf('Schlussteil');
  const cls=await p.evaluate(i=>{const src=[...document.querySelectorAll('#tplLib .tpl-li-h')].find(x=>/Spielform 7 gegen 7/.test(x.textContent));
    const t=document.querySelector(`#tplList .tpl-blk[data-i="${i}"]`);if(!src||!t)return 'fehlt';
    const dt=new DataTransfer();const rc=t.getBoundingClientRect();
    src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
    t.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientX:rc.left+20,clientY:rc.top+5}));
    const k=t.className;t.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));return k;},tgt);
  r=await st(p);
  ok(/dropin/.test(cls)&&r.n===5&&r.t[tgt]==='Spielform 7 gegen 7'&&r.ph[tgt]==='Schlussteil'&&r.min[tgt]===30,'Übung auf leeren Abschnitt ziehen: gestrichelter Rahmen, Abschnitt gefüllt (30 Min.)');
  // print: an empty section prints under its name
  h=await p.evaluate(()=>_tplPrintHtml(_tplSess()));
  ok(/Hauptteil 2/.test(h)&&/Koordinationsleiter/.test(h)&&/Spielform 7 gegen 7/.test(h),'Drucken: Übungen und leerer Abschnitt mit seinem Namen');
  await p.waitForTimeout(900);
  const pid13=(await st(p)).pid;
  // Standard ändern while this plan has content: new plans only
  await p.evaluate(()=>tplStdDlg());
  r=await p.evaluate(()=>({n:document.querySelectorAll('#tsRows .tpl-std-r').length,s:document.getElementById('tsSum').textContent}));
  ok(r.n===5&&r.s==='Zusammen 90 Min.','Fenster „Standardablauf“: 5 Zeilen, „Zusammen 90 Min.“');
  await p.evaluate(()=>{tplStdDel(1);tplStdAdd();});
  await p.fill('#tsRows .tpl-std-r:last-child .tpl-std-n','Abschluss');
  await p.selectOption('#tsRows .tpl-std-r:last-child select','Torschuss');
  await p.fill('#tsRows .tpl-std-r:last-child input[type=number]','10');
  ok((await p.evaluate(()=>document.getElementById('tsSum').textContent))==='Zusammen 90 Min.','Summe rechnet mit (−10 +10)');
  await p.evaluate(()=>tplStdSave());
  let t=await toast(p);r=await st(p);let ls=await LS(p);
  const sv=ls['fcf_plans/U19/std'];
  ok(sv&&eq(sv.rows.map(x=>x.ph),['Aktivierung 1','Hauptteil 1','Hauptteil 2','Schlussteil','Abschluss'])&&sv.rows[4].cat==='Torschuss'&&sv.by==='Admin','Standard gespeichert (Zeilen, Kategorie, von wem)');
  ok(/gilt für neue Pläne/.test(t)&&r.n===5&&r.t[0]==='Koordinationsleiter','Plan mit Übungen bleibt, wie er ist (Meldung „gilt für neue Pläne …“)');
  await p.evaluate(()=>tplClose());await tOpen(p,'Di 17.11');r=await st(p);
  ok(r.draft&&eq(r.ph,['Aktivierung 1','Hauptteil 1','Hauptteil 2','Schlussteil','Abschluss'])&&r.cat[4]==='Torschuss','neuer Plan beginnt mit dem geänderten Standard');
  // Leer beginnen: this plan only, nothing saved
  await p.click('#tplList .tpl-stdn button:has-text("Leer beginnen")');await p.waitForTimeout(900);
  r=await st(p);ls=await LS(p);
  ok(r.n===0&&!r.draft&&!ls['fcf_plans/U19/plans/'+r.pid],'„Leer beginnen“: dieser Plan leer, nichts gespeichert');
  ok(await p.evaluate(()=>[...document.querySelectorAll('#tplEd .tpl-acts button')].some(x=>x.textContent==='Standardablauf')),'leerer Plan: Knopf „Standardablauf“');
  // saving the standard while the plan on screen is empty: it takes it
  await p.evaluate(()=>{tplStdDlg();tplStdSave();});
  t=await toast(p);r=await st(p);
  ok(/in diesen Plan übernommen/.test(t)&&r.n===5&&r.draft,'Standard speichern bei leerem Plan: „… und in diesen Plan übernommen“ (Entwurf)');
  // empty standard
  await p.evaluate(()=>{tplStdDlg();for(let i=0;i<5;i++)tplStdDel(0);});
  ok(/Ohne Abschnitte beginnt jeder neue Plan leer/.test(await p.evaluate(()=>document.getElementById('tsRows').textContent)),'ohne Zeilen: „Ohne Abschnitte beginnt jeder neue Plan leer.“');
  await p.evaluate(()=>tplStdSave());t=await toast(p);r=await st(p);
  ok(/neue Pläne beginnen leer/.test(t)&&r.n===0,'leerer Standard gespeichert: Entwurf wird leer');
  await p.evaluate(()=>tplClose());await tOpen(p,'Fr 20.11');r=await st(p);
  ok(r.n===0&&!r.draft&&!(await p.evaluate(()=>[...document.querySelectorAll('#tplEd .tpl-acts button')].some(x=>x.textContent==='Standardablauf'))),'danach: neuer Plan leer, ohne Knopf „Standardablauf“');
  await p.evaluate(()=>tplClose());await tOpen(p,'Fr 13.11');r=await st(p);
  ok(r.pid===pid13&&r.n===5&&r.t[0]==='Koordinationsleiter'&&r.t[r.ph.indexOf('Schlussteil')]==='Spielform 7 gegen 7','gespeicherter Plan nach erneutem Öffnen unverändert');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── 1.2.29 „Aus der Bibliothek wählen“
 {const {p,c,errs}=await open(b,{seed:libSeed()});
  await tOpen(p,'Di 10.11');
  await p.click('#tplEd button:has-text("Aus der Bibliothek wählen")');await p.waitForTimeout(150);
  let r=await p.evaluate(()=>({h:document.querySelector('#tplDlgBox h4').textContent,it:[...document.querySelectorAll('#tpkList .tpl-pk b')].map(x=>x.textContent)}));
  ok(r.h==='Übung für Aktivierung 1'&&r.it.length===5,'Fenster „Übung für Aktivierung 1“ mit allen 5 Übungen');
  ok(r.it[0]==='Koordinationsleiter','Übungen der Kategorie des Abschnitts (Aufwärmen) zuerst');
  await p.fill('#tpkQ','pass');
  r=await p.evaluate(()=>[...document.querySelectorAll('#tpkList .tpl-pk b')].map(x=>x.textContent));
  ok(eq(r,['Passdreieck']),'Suche „pass“: nur „Passdreieck“');
  await p.fill('#tpkQ','xyz');
  ok(/Keine Übung gefunden/.test(await p.evaluate(()=>document.getElementById('tpkList').textContent)),'nichts gefunden: „Keine Übung gefunden.“');
  await p.fill('#tpkQ','');
  await p.click('#tpkList .tpl-pk:has-text("Koordinationsleiter")');await p.waitForTimeout(150);
  r=await st(p);
  ok(r.t[0]==='Koordinationsleiter'&&r.min[0]===10&&r.sel===1&&!(await p.evaluate(()=>document.getElementById('tplDlg').classList.contains('open'))),'Klick füllt den Abschnitt, Fenster zu, nächster Abschnitt gewählt');
  await p.evaluate(()=>tplSelect(0));
  ok(!(await p.evaluate(()=>[...document.querySelectorAll('#tplEd button')].some(x=>/Aus der Bibliothek wählen/.test(x.textContent)))),'gefüllter Block: kein „Aus der Bibliothek wählen“');
  // + Neue Übung inside the picker: new drill straight into the section
  await p.evaluate(()=>{tplSelect(2);tplPickLib();});
  await p.click('#tplDlgBox button:has-text("+ Neue Übung")');await p.waitForTimeout(150);
  await p.fill('#tlTitle','Pressing 6 gegen 4');await p.selectOption('#tlCat','Umschalten');await p.fill('#tlMin','18');
  await p.click('#tplDlgBox .tpl-btn.pri');await p.waitForTimeout(150);
  r=await st(p);let n=await p.evaluate(()=>_tplLibItems().length);
  ok(n===6&&r.t[2]==='Pressing 6 gegen 4'&&r.ph[2]==='Hauptteil 1'&&r.min[2]===20&&r.cat[2]==='Umschalten','„+ Neue Übung“ im Fenster: neue Übung in der Bibliothek und gleich im Abschnitt (20 Min. des Abschnitts)');
  // + Neue Übung in the library column fills nothing
  await p.evaluate(()=>tplSelect(3));
  await p.evaluate(()=>tplLibEdit());await p.fill('#tlTitle','Flanken und Abschluss');await p.click('#tplDlgBox .tpl-btn.pri');await p.waitForTimeout(150);
  r=await st(p);n=await p.evaluate(()=>_tplLibItems().length);
  ok(n===7&&!r.t[3]&&r.ph[3]==='Hauptteil 2','„+ Neue Übung“ in der Bibliothek: nur in die Bibliothek, Abschnitt bleibt leer');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── 1.2.30 plans saved empty, a summary without its plan, a failed read, Gruppen, Vorlage laden
 {const STD3={rows:[{ph:'Einlaufen',cat:'Aufwärmen',min:15},{ph:'Hauptteil',cat:'Spielform',min:60},{ph:'Auslaufen',cat:'Auslaufen',min:15}],upd:5,by:'Admin'};
  const seed=Object.assign(libSeed(),{
    'fcf_plans/U19/std':STD3,
    'fcf_plans/U19/plans/p20261110_1830':{v:1,blocks:[],upd:5,season:'2026/27',date:'Di 10.11',time:'18:30'},
    'fcf_plans/U19/idx/p20261110_1830':{n:0,m:0,d:'Di 10.11',s:'2026/27',t:'18:30'},
    'fcf_plans/U19/plans/p20261113_1830':{v:1,upd:5,season:'2026/27',date:'Fr 13.11',time:'18:30',blocks:[
      {id:'b1',cat:'Rondo',title:'Rondo 4 gegen 2',min:20,libId:'l1'},{id:'b2',cat:'Spielform',title:'Spielform 7 gegen 7',min:60,libId:'l4'}]},
    'fcf_plans/U19/idx/p20261113_1830':{n:2,m:80,d:'Fr 13.11',s:'2026/27',t:'18:30'},
    'fcf_plans/U19/idx/p20261117_1830':{n:3,m:90,d:'Di 17.11',s:'2026/27',t:'18:30'}});
  const {p,c,errs}=await open(b,{seed,pids:['Di 10.11','Fr 13.11','Di 17.11']});
  await tOpen(p,'Di 10.11');let r=await st(p);
  ok(r.pid==='p20261110_1830'&&r.draft&&eq(r.ph,['Einlaufen','Hauptteil','Auslaufen'])&&r.tot===90,'leer gespeicherter Plan bekommt den gespeicherten Standard (Entwurf)');
  // the Gruppen tab alone saves nothing while it is a draft
  await p.evaluate(()=>tplTab('g'));await p.waitForTimeout(1000);await p.evaluate(()=>tplTab('a'));
  let ls=await LS(p);
  ok(ls['fcf_plans/U19/plans/p20261110_1830'].blocks.length===0&&ls['fcf_plans/U19/plans/p20261110_1830'].upd===5,'„Gruppen“ nur ansehen speichert den Entwurf nicht');
  await p.evaluate(()=>tplClose());await tOpen(p,'Fr 13.11');r=await st(p);
  ok(!r.draft&&eq(r.t,['Rondo 4 gegen 2','Spielform 7 gegen 7']),'Plan mit Blöcken: unverändert, kein Standard');
  await p.evaluate(()=>tplTab('g'));await p.waitForTimeout(1000);await p.evaluate(()=>tplTab('a'));
  ls=await LS(p);const g13=ls['fcf_plans/U19/plans/p20261113_1830'];
  ok(g13.blocks.length===2&&Array.isArray(g13.grps)&&g13.grps.length===1,'Plan mit Blöcken: „Gruppen“ legt die erste Einteilung an und speichert');
  // Vorlage laden: Standardablauf first, append or replace
  await p.evaluate(()=>tplLoadTplDlg());
  r=await p.evaluate(()=>({f:document.querySelector('#tplDlgBox .tpl-pk b').textContent,m:[...document.querySelectorAll('#tplDlgBox .tpl-seg button')].map(x=>x.textContent)}));
  ok(r.f==='Standardablauf'&&eq(r.m,['Ablauf ersetzen','Hinten anhängen']),'„Vorlage laden“: erste Zeile „Standardablauf“, ersetzen oder anhängen');
  await p.click('#tplDlgBox .tpl-seg button:has-text("Hinten anhängen")');await p.click('#tplDlgBox .tpl-pk:has-text("Standardablauf")');await p.waitForTimeout(150);
  r=await st(p);
  ok(r.n===5&&eq(r.ph.slice(2),['Einlaufen','Hauptteil','Auslaufen'])&&r.t[0]==='Rondo 4 gegen 2'&&/Standardablauf übernommen/.test(await toast(p)),'„Hinten anhängen“: Abschnitte nach den Übungen');
  await p.evaluate(()=>tplUndo());
  await p.evaluate(()=>{TPL.mode='replace';tplApplyStd();});r=await st(p);
  ok(r.n===3&&eq(r.ph,['Einlaufen','Hauptteil','Auslaufen'])&&!r.draft,'„Ablauf ersetzen“: nur die Abschnitte');
  await p.evaluate(()=>tplUndo());r=await st(p);ok(r.n===2,'Rückgängig: wieder die zwei Übungen');
  // the summary says there are blocks, the plan did not load: no standard over it
  await p.evaluate(()=>tplClose());await tOpen(p,'Di 17.11');r=await st(p);
  ok(r.n===0&&!r.draft,'Übersicht kennt 3 Blöcke, Plan nicht geladen: kein Standard darüber');
  // a failed read: no standard either
  await p.evaluate(()=>tplClose());
  await p.evaluate(()=>{const nop=()=>Promise.resolve();
    fbDb={ref:()=>({once:()=>Promise.reject(new Error('offline')),set:nop,update:nop,remove:nop,transaction:nop,on:()=>{},off:()=>{},push:()=>({key:'k',set:nop})})};});
  await tOpen(p,'Fr 20.11');await p.waitForTimeout(200);r=await st(p);
  ok(r.ro&&r.n===0&&!r.draft,'Lesen fehlgeschlagen: kein Standard (nichts überschreiben)');
  await p.evaluate(()=>{tplClose();fbDb=null;});
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}

 // ── phone
 {const {p,c,errs}=await open(b,{vp:{width:390,height:844},seed:libSeed()});
  await tOpen(p,'Di 10.11');
  let r=await p.evaluate(()=>{const n=document.querySelector('#tplList .tpl-stdn').getBoundingClientRect();const s=document.querySelector('#tplList .tpl-blk.slot');
    return {fit:n.left>=0&&n.right<=innerWidth+0.5,slot:!!s&&s.getBoundingClientRect().width>0,ov:document.getElementById('tplOverlay').scrollWidth<=innerWidth+1};});
  ok(r.fit&&r.slot&&r.ov,'Handy: Hinweis und Abschnitte sichtbar, nichts ragt über den Rand');
  if(out)await p.screenshot({path:out+'/std128_phone.png'});
  await p.evaluate(()=>tplPickLib(0));await p.waitForTimeout(150);
  r=await p.evaluate(()=>{const bx=document.getElementById('tplDlgBox').getBoundingClientRect();return bx.left>=0&&bx.right<=innerWidth+0.5&&document.querySelectorAll('#tpkList .tpl-pk').length===5;});
  ok(r,'Handy: Fenster „Übung für …“ passt');
  await p.click('#tpkList .tpl-pk:has-text("Rondo 4 gegen 2")');await p.waitForTimeout(150);
  ok((await st(p)).t[0]==='Rondo 4 gegen 2','Handy: Auswahl füllt den Abschnitt');
  ok(!errs.length,'Handy: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
