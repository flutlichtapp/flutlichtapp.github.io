const {chromium}=require('playwright');const {NOW,setupTrainer}=require('./fx.js');const HTML=process.argv[2],tag=process.argv[3];
(async()=>{const b=await chromium.launch();
 for(const [w,h,n] of [[1536,864,'pc'],[390,844,'ph']]){
 const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(800);
 await p.evaluate(`(${setupTrainer.toString()})({})`);
 await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(600);
 await p.screenshot({path:`/home/claude/work/sk_${tag}_${n}_kader.png`});
 await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(900);
 await p.screenshot({path:`/home/claude/work/sk_${tag}_${n}_saison.png`});
 console.log(n,errs.join('|'));await c.close();}
 await b.close();})();
