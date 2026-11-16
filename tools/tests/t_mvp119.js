// 1.2.119: Übersicht der Spieler – Spieler des Spiels nur vom letzten Spiel.
// Nach einem neuen Spiel verschwindet die Karte des vorigen (16.11.: neben dem
// 2:7 stand noch der Spieler des Spiels vom 08.11.). node tools/tests/t_mvp119.js [index.html]
const {chromium}=require('playwright');const {setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const hub=async(b,iso,edit)=>{
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();
  await p.clock.install({time:new Date(iso)});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(`(${edit.toString()})()`);
  await p.evaluate(async()=>{const r=_pvBuildSync('U19','2026/27');const pp=r.people.find(x=>x.pi===2);
    const T=JSON.parse(JSON.stringify(r.shared));const P=JSON.parse(JSON.stringify(Object.assign({},pp.obj,{tk:'t'.repeat(64),lk:'abcdef0123456789abcd'})));
    window._hubMode=true;window._hubAction=null;_pvAdopt({pk:'p'.repeat(64),t:Date.now(),P,T,mvp:{},inbox:{}},pp.tok);_pmEnterSlice(pp.tok);
    fbDb={ref:()=>({set:()=>Promise.resolve(),once:()=>Promise.resolve({val:()=>null}),on:()=>{},off:()=>{}})};
    window._hubAction=null;renderPlayerMode();});
  await p.waitForTimeout(300);
  const t=await p.evaluate(()=>{const w=document.getElementById('playerModeWrap');return w?w.innerText.replace(/\s+/g,' '):'';});
  await c.close();return {t,errs};};
const win=(d,n)=>`()=>{const D=cd();const s=D.sessions.find(x=>x.date==='${d}'&&x.type==='match');s.mvp={c:{'${n}':4}};}`;
(async()=>{const b=await chromium.launch();
 // So 01.11: Finn; So 08.11 played, vote still open (until Mo 24 Uhr)
 let r=await hub(b,'2026-11-09T15:00:00+01:00',eval(win('So 01.11','Finn Wolf')));
 ok(!/Spieler des Spiels/.test(r.t),'Mo 09.11: nach dem Spiel 08.11 keine Karte vom 01.11 mehr');
 r=await hub(b,'2026-11-06T15:00:00+01:00',eval(win('So 01.11','Finn Wolf')));
 ok(/Spieler des Spiels: Finn/.test(r.t),'Fr 06.11 (noch kein neues Spiel): Spieler des Spiels vom 01.11 da');
 r=await hub(b,'2026-11-10T10:00:00+01:00',()=>{const D=cd();D.sessions.find(x=>x.date==='So 01.11'&&x.type==='match').mvp={c:{'Finn Wolf':4}};D.sessions.find(x=>x.date==='So 08.11'&&x.type==='match').mvp={c:{'Ali Kaya':5}};});
 ok(/Spieler des Spiels: Ali/.test(r.t)&&!/Spieler des Spiels: Finn/.test(r.t),'Di 10.11: der vom 08.11 (Ali), nicht der vom 01.11');
 r=await hub(b,'2026-11-10T10:00:00+01:00',eval(win('So 01.11','Finn Wolf')));
 ok(!/Spieler des Spiels/.test(r.t),'Di 10.11, am 08.11 kein Gewinner (zu wenige Stimmen): auch keiner vom 01.11');
 ok(!r.errs.length,'keine Fehler');
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
