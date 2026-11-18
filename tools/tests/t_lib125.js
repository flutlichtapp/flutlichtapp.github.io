// 1.2.125: Trainingsplaner – eine Übung als neue Übung speichern (Artem 17.11.:
// „eine neue Übung auf Grundlage einer alten anlegen“). Ein Block aus der
// Bibliothek fragt bei „Bibliothek“: dort ersetzen oder als neue Übung speichern;
// im Fenster „Übung bearbeiten“ gibt es „Als neue Übung speichern“. Das Original
// bleibt, der Name muss ein anderer sein. Ohne Firebase (lokal gespeichert).
// node tools/tests/t_lib125.js [index.html] [shotdir]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
const out=process.argv[3]||'';
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const open=async(b,vp)=>{const c=await b.newContext({viewport:vp||{width:1280,height:860}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(async()=>{const si=cd().sessions.findIndex(s=>s.date==='Di 10.11'&&s.type==='training');window.__si=si;await tplOpen(si);});
  await p.waitForTimeout(400);return {p,c,errs};};
const L=p=>p.evaluate(()=>_tplLibItems().map(x=>({id:x.id,title:x.title,desc:x.desc||'',coach:x.coach||'',dia:_dgItems(x.dia).length})));
const dlgOpen=p=>p.evaluate(()=>document.getElementById('tplDlg').classList.contains('open'));
(async()=>{const b=await chromium.launch();
 const {p,c,errs}=await open(b);
 // a drill in the library, then into the first section of the plan
 const orig=await p.evaluate(()=>{tplLibEdit();
   document.getElementById('tlTitle').value='Rondo 4 gegen 2';document.getElementById('tlDesc').value='Vier außen, zwei innen.';
   document.getElementById('tlCoach').value='Ball flach';tplLibSave('');
   const id=_tplLibItems()[0].id;TPL.sel=0;tplAddLib(id);tplSelect(0);return id;});
 let r=await p.evaluate(()=>({t:_tplCur().title,l:_tplCur().libId,btn:document.getElementById('tplLibBtn').textContent}));
 ok(r.t==='Rondo 4 gegen 2'&&r.l,'Übung aus der Bibliothek im Ablauf');
 ok(/aktualisieren/.test(r.btn),'Knopf am Block: „In Bibliothek aktualisieren“ ('+r.btn+')');
 // changed in the plan only: the library keeps the old version
 await p.evaluate(()=>{tplSetF('desc','Vier außen, zwei innen. Nur zwei Kontakte.');});
 ok((await L(p))[0].desc==='Vier außen, zwei innen.','im Plan geändert – Bibliothek unverändert');
 // the block from the library asks
 await p.click('#tplLibBtn');await p.waitForTimeout(150);
 r=await p.evaluate(()=>({o:document.getElementById('tplDlg').classList.contains('open'),h:document.querySelector('#tplDlgBox h4').textContent,
   rd:document.getElementById('tlRepl').disabled,nt:document.getElementById('tlNewT').value,tx:document.getElementById('tplDlgBox').textContent}));
 ok(r.o&&r.h==='In die Bibliothek','„Bibliothek“ fragt erst (Fenster „In die Bibliothek“)');
 ok(!r.rd&&/bleiben, wie sie sind/.test(r.tx),'„In der Bibliothek ersetzen“ möglich, mit Hinweis auf bestehende Pläne');
 ok(r.nt==='Rondo 4 gegen 2 – Variante','Name der neuen Übung vorbelegt: „'+r.nt+'“');
 if(out){await p.screenshot({path:out+'/lib125_dlg_desktop.png'});}
 // name already there (case ignored), empty name
 await p.fill('#tlNewT','rondo 4 GEGEN 2');await p.click('#tlNewBtn');await p.waitForTimeout(100);
 r=await p.evaluate(()=>document.getElementById('tlNewErr').textContent);
 ok(/gibt es schon in der Bibliothek/.test(r)&&(await L(p)).length===1&&await dlgOpen(p),'Name schon vergeben (Groß/klein egal): Hinweis, nichts gespeichert');
 await p.fill('#tlNewT','');await p.click('#tlNewBtn');await p.waitForTimeout(100);
 ok(/Bitte einen Namen/.test(await p.evaluate(()=>document.getElementById('tlNewErr').textContent)),'leerer Name: Hinweis');
 await p.fill('#tlNewT','Rondo 4 gegen 2 – zwei Kontakte');
 ok(!(await p.evaluate(()=>document.getElementById('tlNewErr').textContent)),'Hinweis verschwindet beim Tippen');
 await p.click('#tlNewBtn');await p.waitForTimeout(150);
 let lib=await L(p);const nv=lib.find(x=>x.id!==orig);
 r=await p.evaluate(()=>({t:_tplCur().title,l:_tplCur().libId,k:document.getElementById('tplLibBtn').textContent}));
 ok(lib.length===2&&nv&&nv.title==='Rondo 4 gegen 2 – zwei Kontakte'&&/Nur zwei Kontakte/.test(nv.desc),'neue Übung mit dieser Fassung in der Bibliothek');
 ok(lib.find(x=>x.id===orig).desc==='Vier außen, zwei innen.'&&lib.find(x=>x.id===orig).title==='Rondo 4 gegen 2','Original bleibt, wie es war');
 ok(!(await dlgOpen(p))&&r.l===nv.id&&r.t===nv.title,'Block gehört jetzt zur neuen Übung und trägt ihren Namen');
 ok(await p.evaluate(()=>/Neue Übung „Rondo 4 gegen 2 – zwei Kontakte“/.test(document.body.textContent)),'Meldung „Neue Übung … in der Bibliothek“');
 // unchanged: nothing to replace
 await p.click('#tplLibBtn');await p.waitForTimeout(150);
 r=await p.evaluate(()=>({rd:document.getElementById('tlRepl').disabled,tx:document.getElementById('tlRepl').textContent}));
 ok(r.rd&&/Nichts geändert/.test(r.tx),'unverändert: „Ersetzen“ gesperrt („Nichts geändert …“)');
 await p.evaluate(()=>tplDlgClose());
 // replace: only the block's own drill changes
 await p.evaluate(()=>{tplSetF('coach','Ball flach\nKörper offen');});
 await p.click('#tplLibBtn');await p.waitForTimeout(150);await p.click('#tlRepl');await p.waitForTimeout(150);
 lib=await L(p);
 ok(lib.length===2&&lib.find(x=>x.id===nv.id).coach==='Ball flach\nKörper offen'&&lib.find(x=>x.id===orig).coach==='Ball flach','„In der Bibliothek ersetzen“: nur die eigene Übung, Original unberührt');
 // library dialog: "Als neue Übung speichern", with the sketch of the source
 await p.evaluate(o=>{TPL.lib[o].dia={bg:'grass',it:[{t:'z',x:100,y:100,w:120,h:80}]};tplLibEdit(o);},orig);
 ok(await p.evaluate(()=>!!document.getElementById('tlSaveNew')),'„Übung bearbeiten“: Knopf „Als neue Übung speichern“');
 await p.click('#tlSaveNew');await p.waitForTimeout(100);
 ok(/gibt es schon/.test(await p.evaluate(()=>document.getElementById('tlErr').textContent))&&(await L(p)).length===2,'ohne neuen Namen: Hinweis, nichts gespeichert');
 await p.fill('#tlTitle','Rondo 5 gegen 2');await p.fill('#tlDesc','Fünf außen, zwei innen.');
 await p.click('#tlSaveNew');await p.waitForTimeout(150);
 lib=await L(p);const n5=lib.find(x=>x.title==='Rondo 5 gegen 2');const o=lib.find(x=>x.id===orig);
 ok(lib.length===3&&n5&&n5.desc==='Fünf außen, zwei innen.'&&n5.coach==='Ball flach','neue Übung aus dem Fenster gespeichert');
 ok(n5&&n5.dia===1,'Skizze der alten Übung übernommen');
 ok(o.title==='Rondo 4 gegen 2'&&o.desc==='Vier außen, zwei innen.','Original unverändert');
 ok(await p.evaluate(()=>{tplLibEdit();const x=!document.getElementById('tlSaveNew');tplDlgClose();return x;}),'„Neue Übung“: kein „Als neue Übung speichern“');
 // "Speichern" still replaces
 await p.evaluate(o=>tplLibEdit(o),orig);await p.waitForTimeout(150);await p.fill('#tlDesc','Vier außen, zwei innen, 2 Min.');
 await p.click('#tplDlgBox button:text-is("Speichern")');await p.waitForTimeout(400);
 lib=await L(p);ok(lib.length===3&&lib.find(x=>x.id===orig).desc==='Vier außen, zwei innen, 2 Min.','„Speichern“ ersetzt wie bisher');
 // a block not from the library: saved straight away, no question
 await p.evaluate(()=>{const bl=TPL.plan.blocks;let j=bl.findIndex((b,i)=>i>0&&_tplIsSlot(b));tplSelect(j);tplSetF('title','Abschluss 2 gegen 1');});
 await p.click('#tplLibBtn');await p.waitForTimeout(150);
 ok(!(await dlgOpen(p))&&(await L(p)).length===4,'eigener Block: direkt gespeichert, ohne Frage (wie bisher)');
 // kept: reopen the plan
 await p.evaluate(async()=>{tplClose();await tplOpen(window.__si);});await p.waitForTimeout(400);
 r=await p.evaluate(()=>({n:_tplLibItems().length,t:TPL.plan.blocks[0].title,l:TPL.plan.blocks[0].libId}));
 ok(r.n===4&&r.t==='Rondo 4 gegen 2 – zwei Kontakte'&&r.l===nv.id,'nach erneutem Öffnen: Bibliothek und Block wie gespeichert');
 ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));
 await c.close();
 // phone
 {const {p,c,errs}=await open(b,{width:390,height:844});
  await p.evaluate(()=>{tplLibEdit();document.getElementById('tlTitle').value='Rondo 4 gegen 2';tplLibSave('');
    const id=_tplLibItems()[0].id;TPL.sel=0;tplAddLib(id);tplSelect(0);tplSetF('desc','geändert');});
  await p.evaluate(()=>tplToLib());await p.waitForTimeout(200);
  r=await p.evaluate(()=>{const bx=document.getElementById('tplDlgBox').getBoundingClientRect();const k=document.getElementById('tlNewBtn').getBoundingClientRect();
    return {w:Math.round(bx.width),fit:bx.left>=0&&bx.right<=innerWidth,btn:k.bottom<=innerHeight&&k.width>0};});
  ok(r.fit&&r.btn,'Handy: Fenster passt, Knopf sichtbar (Breite '+r.w+')');
  if(out)await p.screenshot({path:out+'/lib125_dlg_phone.png'});
  ok(!errs.length,'Handy: keine Fehler');await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
