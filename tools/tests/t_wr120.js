// 1.2.120: Wochenbericht der Trainer mit „Thema der Woche“ – auf breiten
// Bildschirmen (ab 1200 px, zwei Spalten) steht die Zeile über allem, links
// „Mannschaft“ und Anwesenheit, rechts die Seitenspalte (16.11.: verrutscht).
// node tools/tests/t_wr120.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[1536,730],[1920,1000],[1024,768]]){
  const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();await p.clock.install({time:NOW});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>{window.wtOf=()=>'Tiefe';hxGo('week');});await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{const q=s=>{const e=document.querySelector('#wr-content '+s);return e?e.getBoundingClientRect():null;};
    return {wt:q('.wr2-wt'),team:q('.wr2s-team'),att:q('.wr2s-att'),side:q('.wr2-side'),wrap:q('.wr2')};});
  ok(r.wt&&r.team&&r.att,w+': Thema, Mannschaft, Anwesenheit da');
  ok(r.wt&&r.team&&r.wt.bottom<=r.team.top+1,w+': „Thema der Woche“ über „Mannschaft“');
  ok(r.team&&r.att&&r.team.bottom<=r.att.top+1,w+': Anwesenheit unter „Mannschaft“');
  if(w>=1200){
    ok(r.side&&r.att&&Math.abs(r.side.top-r.att.top)<2&&r.side.left>r.att.right,w+': Seitenspalte rechts neben der Anwesenheit, gleiche Höhe');
    ok(r.team&&r.wrap&&r.team.width>r.wrap.width*0.95,w+': „Mannschaft“ über die ganze Breite');
  }
  ok(!errs.length,w+': keine Fehler');
  await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
