// 1.2.157 (Artem 24.11.: «да»): on his birthday the player sees „Alles Gute
// zum Geburtstag, <Name>! – dein Trainerteam“ at the top of his own overview.
// His slice carries only day and month of his own birthday (me.bdm "MM-DD"),
// no year, no birthdate, nothing of the others; the team's part nothing.
// node tools/tests/t_geb157.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
// NOW is Sa 07.11.2026
async function hub(b,bd,vp){
  const c=await b.newContext({viewport:{width:vp,height:800},deviceScaleFactor:1,isMobile:vp<500,hasTouch:vp<500});
  const p=await c.newPage();await p.clock.install({time:NOW});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML);await p.waitForTimeout(700);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(async(bd)=>{
    if(bd===null)delete cd().players[2].birthdate;else cd().players[2].birthdate=bd;
    const r=_pvBuildSync('U19','2026/27');const pp=r.people.find(x=>x.pi===2);
    const P=JSON.parse(JSON.stringify(Object.assign({},pp.obj,{tk:'t'.repeat(64),lk:'abcdef0123456789abcd'})));
    window._hubMode=true;window._hubAction=null;_pvAdopt({pk:'p'.repeat(64),t:Date.now(),P,T:JSON.parse(JSON.stringify(r.shared)),mvp:{},inbox:{}},pp.tok);_pmEnterSlice(pp.tok);
    fbDb={ref:()=>({set:()=>Promise.resolve(),once:()=>Promise.resolve({val:()=>null}),on:()=>{},off:()=>{}})};
    window._hubAction=null;renderPlayerMode();
  },bd);
  await p.waitForTimeout(250);
  const r=await p.evaluate(()=>{
    const c=document.querySelector('#playerModeWrap .fl-bday');
    const who=document.querySelector('#playerModeWrap .fl-who');
    return {card:c?c.innerText.replace(/\s+/g,' ').trim():'',afterWho:!!(c&&who&&who.nextElementSibling===c),
      fits:c?c.scrollWidth<=c.clientWidth+1:null,w:c?Math.round(c.getBoundingClientRect().width):0,
      me:cd().players[_pmValidateIdx()]?Object.keys(cd().players[_pmValidateIdx()]):[] ,bdm:(cd().players[_pmValidateIdx()]||{}).bdm};
  });
  r.errs=errs;await c.close();return r;
}
(async()=>{
  const b=await chromium.launch();
  // ── the slices ──
  {
    const c=await b.newContext();const p=await c.newPage();await p.clock.install({time:NOW});
    await p.goto('file://'+HTML);await p.waitForTimeout(700);await p.evaluate(`(${setupTrainer.toString()})({})`);
    const s=await p.evaluate(()=>{
      const pl=cd().players;pl[4].birthdate='09.03.2008';delete pl[5].birthdate;
      const r=_pvBuildSync('U19','2026/27');
      const pad=n=>String(n).padStart(2,'0');
      const own=r.people.map(x=>{const b=_pvBd(pl[x.pi].birthdate);return {pi:x.pi,want:b?b.slice(5):undefined,got:x.obj.me.bdm,
        nBdm:(JSON.stringify(x.obj).match(/"bdm"/g)||[]).length,hasBirth:/birthdate/.test(JSON.stringify(x.obj)),
        year:b?JSON.stringify(x.obj.me).includes(b.slice(0,4)+'-'):false};});
      const sh=JSON.stringify(r.shared);
      return {own,shared:/"bdm"|birthdate/.test(sh)||pl.some(q=>q.birthdate&&sh.includes(_pvBd(q.birthdate))),
        p4:r.people.find(x=>x.pi===4).obj.me.bdm,p5:'bdm' in r.people.find(x=>x.pi===5).obj.me};
    });
    ok(s.own.filter(x=>x.want).every(x=>x.got===x.want),'jeder Spieler: in seinem Ausschnitt Tag und Monat seines Geburtstags (me.bdm) – '+s.own.filter(x=>x.want).length+' Spieler');
    ok(s.own.every(x=>x.nBdm===(x.want?1:0)),'nur sein eigener – kein anderer Geburtstag in seinem Ausschnitt');
    ok(s.own.every(x=>!x.hasBirth&&!x.year),'kein Geburtsdatum, kein Jahr im Ausschnitt');
    ok(!s.shared,'Teil der Mannschaft: keine Geburtstage');
    ok(s.p4==='03-09','Format „09.03.2008“ → „03-09“');
    ok(!s.p5,'ohne Geburtsdatum: nichts');
    // 29 February
    const f=await p.evaluate(()=>[_bdIsToday({bdm:'02-29'},new Date(2027,1,28,12)),_bdIsToday({bdm:'02-29'},new Date(2027,2,1,12)),
      _bdIsToday({bdm:'02-29'},new Date(2028,1,28,12)),_bdIsToday({bdm:'02-29'},new Date(2028,1,29,12))]);
    ok(f.join()==='true,false,false,true','29. Februar: sonst am 28.02., im Schaltjahr am 29.02.');
    // trainers' preview reads the full record
    ok(await p.evaluate(()=>{cd().players[2].birthdate='2008-11-07';return _bdIsToday(cd().players[2])&&!_bdIsToday({birthdate:'2008-11-08'});}),'Vorschau der Trainer: aus dem Geburtsdatum');
    await c.close();
  }
  // ── his overview ──
  for(const vp of [390,360,1366]){
    const r=await hub(b,'2008-11-07',vp);
    ok(r.card==='Alles Gute zum Geburtstag, Tom! – dein Trainerteam',vp+': an seinem Geburtstag – „'+r.card+'“');
    ok(r.afterWho,vp+': gleich unter seinem Namen');
    ok(r.fits===true,vp+': passt in die Breite ('+r.w+' px)');
    ok(r.bdm==='11-07'&&!r.me.includes('birthdate'),vp+': auf seinem Handy nur „11-07“, kein Geburtsdatum');
    ok(!r.errs.length,vp+': keine Fehler '+r.errs.join(' | '));
  }
  for(const [bd,what] of [['2008-11-08','morgen'],['2008-11-06','gestern'],['07.11.2008','als „07.11.2008“ eingetragen'],[null,'ohne Geburtsdatum']]){
    const r=await hub(b,bd,390);
    const want=bd==='07.11.2008';
    ok(want?r.card==='Alles Gute zum Geburtstag, Tom! – dein Trainerteam':r.card==='',what+': '+(want?'Glückwunsch':'kein Glückwunsch'));
  }
  await b.close();
  console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
