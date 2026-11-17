// 1.2.130: „Im Blick behalten“ nach Wichtigkeit (Artem 17.11.): 1 zu tun (mit
// Frist) – 2 zu entscheiden – 3 im Auge behalten – 4 zur Info; innerhalb einer
// Stufe die frühere Frist zuerst. Vorher die Reihenfolge der Prüfungen im Code.
// node tools/tests/t_flags130.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const vp of [{width:1440,height:900},{width:390,height:844}]){
 const tag=vp.width<500?'Handy: ':'';
 const c=await b.newContext({viewport:vp});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
 await p.evaluate(`(${setupTrainer.toString()})({})`);
 const r=await p.evaluate(()=>{
   const D=cd(),P=D.players,S=D.sessions;const si=d=>S.findIndex(s=>s.date===d);
   // Physio on Tuesday for Jan and Ali; Ali has also reported an absence (Wed–Fri), Tom one later (Fri–Sun)
   [0,1].forEach(i=>{P[i].physio=[];P[i].physio[si('Di 10.11')]=true;});
   P[1].abw={b20261111:{f:20261111,u:20261113,t:Date.now()-36e5,g:'u'}};
   P[2].abw={b20261113:{f:20261113,u:20261115,t:Date.now()-36e5,g:'s'}};
   // a birthday in three days, a trial player ready to decide
   P[3].birthdate='2008-11-10';
   P[14].trial='2026-10-01';P[14].joinDate='2026-10-01';
   window._hxFlagsAll=true;document.getElementById('homeOverlay').style.display='';hxRender();window._hxFlagsAll=false;
   const L=(window._hxFlagsList||[]).map(f=>({lv:f.lv||3,who:f.who,what:f.what,due:f.due}));
   hxRender();const vis=[...document.querySelectorAll('#hxHome .hx-a-flags .hx-flag')].map(x=>x.textContent.replace(/\s+/g,' '));
   return {L,vis};});
 const L=r.L;const lv=L.map(x=>x.lv);
 ok(L.length>=5,tag+'mehrere Einträge ('+L.length+'): '+L.map(x=>x.lv+' '+x.who).join(' | '));
 ok(lv.every((v,i)=>!i||lv[i-1]<=v),tag+'nach Stufen sortiert: '+lv.join(','));
 const ai=L.findIndex(x=>x.who==='Ali'),ti=L.findIndex(x=>x.who==='Tom'),ji=L.findIndex(x=>x.who==='Jan');
 ok(ai>=0&&L[ai].lv===1&&/^nicht da/.test(L[ai].what)&&/Physio/.test(L[ai].what),tag+'Ali: Abwesenheit und Physio in einer Zeile, Stufe 1, Abwesenheit zuerst ('+(ai>=0?L[ai].what:'')+')');
 ok(ai>=0&&ti>=0&&ai<ti,tag+'Stufe 1: frühere Frist zuerst (Ali ab Mi vor Tom ab Fr)');
 ok(ji>=0&&L[ji].lv===4&&ji>ai,tag+'Jan nur Physio: Stufe 4, nach den Abwesenheiten');
 const trial=L.findIndex(x=>/Probetraining/.test(x.what)),bday=L.findIndex(x=>/Geburtstag/.test(x.what));
 ok(trial>=0&&L[trial].lv===2,tag+'Probetraining: Stufe 2');
 ok(bday>=0&&L[bday].lv===4&&bday>trial,tag+'Geburtstag: Stufe 4, nach dem Probetraining');
 ok(r.vis.length>=3&&r.vis.some(t=>/^Ali/.test(t))&&!r.vis.some(t=>/^Jan/.test(t))&&r.vis.every((t,i)=>L[i].lv===1),tag+'oben sichtbar nur Stufe 1, die Abwesenheit dabei, Physio nicht ('+r.vis.map(t=>t.slice(0,24)).join(' | ')+')');
 ok(!r.vis.some(t=>/Geburtstag/.test(t))||r.vis.length===L.length,tag+'Geburtstag nicht vor wichtigeren Einträgen sichtbar');
 ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));
 await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
