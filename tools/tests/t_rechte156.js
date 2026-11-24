// 1.2.156 (Artem 24.11.: „я могу тоже выбрать состав, хоть у меня написано:
// Mannschaft verwalten — Artem sieht die Einstellungen der Mannschaft nur an“):
// the switch only covers the team settings. Its line now says what such a
// trainer still does (Aufstellung, Kader, Anwesenheit) and what he only reads.
// Also checks that this is how the app behaves: without „Mannschaft verwalten“
// a trainer edits the lineup, but not a team setting.
// node tools/tests/t_rechte156.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{
  const b=await chromium.launch();
  for(const vp of [{width:1536,height:864},{width:390,height:844,mobile:true}]){
    const ctx=await b.newContext({viewport:{width:vp.width,height:vp.height},hasTouch:!!vp.mobile,isMobile:!!vp.mobile});
    const p=await ctx.newPage();await p.clock.install({time:NOW});
    await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);const tag=vp.width+': ';
    // admin opens the trainer profile → Rechte
    const t=await p.evaluate(()=>{
      const gi=G.trainers.findIndex(x=>x.name==='Ole Test');delete G.trainers[gi].mgr;
      openTrainerProfile(gi);
      const r=document.querySelector('#moTrainerProfile .tp-rights');
      const rows=r?[...r.querySelectorAll('.tpr-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim()):[];
      return {rows,vis:!!(r&&r.offsetParent)};
    });
    const mg=t.rows.find(x=>/Mannschaft verwalten/.test(x))||'';
    ok(t.vis&&/Ole macht Aufstellung, Kader und Anwesenheit wie jeder Trainer\./.test(mg),tag+'aus: „Ole macht Aufstellung, Kader und Anwesenheit wie jeder Trainer.“ – '+mg.slice(0,90));
    ok(/Die Einstellungen der Mannschaft \(Zu- und Absagen, Spielerstatus, Ziele, Treffpunkt, Karten, Titelbild, Schwerpunkte\) sieht er nur an\./.test(mg),tag+'aus: was er nur ansieht, steht dabei');
    const on=await p.evaluate(()=>{
      const gi=G.trainers.findIndex(x=>x.name==='Ole Test');tpMgrSet(gi,true);
      const r=document.querySelector('#moTrainerProfile .tp-rights');
      return [...r.querySelectorAll('.tpr-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim()).find(x=>/Mannschaft verwalten/.test(x))||'';
    });
    ok(/Ole ändert die Einstellungen der Mannschaft: Zu- und Absagen/.test(on)&&!/wie jeder Trainer/.test(on),tag+'an: wie bisher – „Ole ändert die Einstellungen der Mannschaft …“');
    if(!vp.mobile){
      // the app does what the line says: trainer without the right
      const r=await p.evaluate(()=>{
        const gi=G.trainers.findIndex(x=>x.name==='Ole Test');delete G.trainers[gi].mgr;
        closeM('moTrainerProfile');
        CU={name:'Ole Test',role:'trainer',teams:['U19'],loginAt:Date.now()};
        return {edit:canEdit(),team:canTeamSet()};
      });
      ok(r.edit&&!r.team,tag+'Trainer ohne „Mannschaft verwalten“: Aufstellung ja (canEdit), Einstellungen der Mannschaft nein (canTeamSet)');
      const lu=await p.evaluate(()=>{
        const mi=findNextMatchIdx();openLineupPlanner(mi);
        const m=document.getElementById('moLineup');
        return {open:!!(m&&m.classList.contains('open')),viewer:!!(m&&m.classList.contains('lp-viewer')),save:!!document.querySelector('#moLineup .lp-gsave')};
      });
      ok(lu.open&&!lu.viewer&&lu.save,tag+'Spieltag: zum Bearbeiten (nicht „Nur ansehen“), „Speichern“ da');
    }
    await ctx.close();
  }
  await b.close();
  console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
