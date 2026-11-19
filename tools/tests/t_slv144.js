// 1.2.144 (Artem 19.11.: „Да“): levels in the Saisonkader instead of a ranking —
// per position Stammposition / kann auch / lernt; "lernt" does not count as
// cover for the gaps. Aufstellung: "Aus dem Saisonkader" fills the empty
// positions from the last saved plan (Stamm, then kann auch; whoever breaks
// the training rule after those who don't; "lernt" never into the Startelf),
// nothing saved. Also: closing right after "Kaderplan speichern" no longer
// asks "Änderungen speichern?". The levels never reach a player.
// node tools/tests/t_slv144.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const openSlp=async p=>{await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(500);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(900);};
const openLp=async p=>{await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);};
const txt=(p,id)=>p.evaluate(id=>(document.getElementById(id)||{}).textContent||'',id);
const fromVisible=p=>p.evaluate(()=>{const b=document.getElementById('lp-fromslp');return !!(b&&!b.hidden&&b.offsetParent);});
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // no plan yet: no button in the Aufstellung
  await openLp(p);
  ok(!(await fromVisible(p)),tag+'ohne gespeicherten Saisonkader kein Knopf „Aus dem Saisonkader“');
  await p.evaluate(()=>closeLineupPlanner&&closeLineupPlanner());await p.waitForTimeout(300);
  await openSlp(p);
  // every position twice, LF = Luca (LF) + Elias (6er)
  const d=await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(slpState.formation,slpState.customSlots);
    sl.forEach((x,k)=>{slpState.slots[x.id]=[k,(k+5)%15];});
    const lf=sl.find(x=>x.lbl==='LF'),tw=sl.find(x=>x.lbl==='TW');slpState.slots[lf.id]=[10,13];slpState.slots[tw.id]=[0,14];slpRender();
    return {lfS:_slpLv(P[10],lf),lfK:_slpLv(P[13],lf),tw:[_slpLv(P[0],tw),_slpLv(P[14],tw)].join(','),lf:lf.id};});
  ok(d.lfS==='s'&&d.lfK==='k'&&d.tw==='s,s',tag+'Vorgabe: eigene Position = Stamm, andere = kann auch ('+d.lfS+'/'+d.lfK+', TW '+d.tw+')');
  ok(/Jede Position mindestens doppelt besetzt/.test(await txt(p,'slp-gaps')),tag+'Stamm und kann auch zählen als besetzt');
  // the popup of LF: a level switch per player instead of the order arrows
  await p.evaluate(id=>{document.querySelector(`#slp-slots [data-slot-id="${id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));},d.lf);
  await p.waitForTimeout(400);
  const pop=await p.evaluate(()=>{const q=document.getElementById('slp-popup');const g=[...q.querySelectorAll('.slp-lv')];
    return {n:g.length,btn:g.map(x=>[...x.querySelectorAll('button')].map(y=>y.textContent+(y.classList.contains('on')?'*':'')).join('/')),arrows:/[▲▼]/.test(q.textContent),vis:q.getBoundingClientRect().width>0&&getComputedStyle(q).display!=='none'};});
  ok(pop.vis&&pop.n===2&&pop.btn[0]==='Stamm*/kann/lernt'&&pop.btn[1]==='Stamm/kann*/lernt'&&!pop.arrows,tag+'Fenster der Position: Stamm/kann/lernt je Spieler, keine Pfeile ('+pop.btn.join(' | ')+')');
  await p.click('#slp-popup .slp-lv >> nth=1 >> text=lernt');await p.waitForTimeout(400);
  const after=await p.evaluate(id=>{const P=cd().players;const t=document.querySelector(`#slp-slots [data-slot-id="${id}"] text[data-pi="13"]`);
    return {slv:P[13].slv&&P[13].slv.LF,it:t&&t.getAttribute('font-style'),on:[...document.querySelectorAll('#slp-popup .slp-lv')][1].querySelector('.on').textContent};},d.lf);
  ok(after.slv==='l'&&after.it==='italic'&&after.on==='lernt',tag+'„lernt“ angetippt: beim Spieler gemerkt, auf dem Feld kursiv');
  const g=await txt(p,'slp-gaps');
  ok(/Nur 1 Spieler: LF/.test(g),tag+'„lernt“ zählt nicht: „'+g.replace(/\s+/g,' ').trim()+'“');
  await p.evaluate(()=>slpClosePopup());await p.waitForTimeout(200);
  // save, then close: no question any more (it was asked before 1.2.144)
  await p.click('#moSeasonLineup .slp-gcard .lp-save-btn');await p.waitForTimeout(400);
  const dlg=await p.evaluate(async()=>{closeSeasonLineup();await new Promise(r=>setTimeout(r,300));return !!document.querySelector('.mcd-list-title');});
  ok(!dlg,tag+'nach „Kaderplan speichern“ schließen: keine Frage „Änderungen speichern?“');
  if(dlg){await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(b=>/Verwerfen|Nicht speichern/.test(b.textContent));x&&x.click();});await p.waitForTimeout(300);}
  // players never see the levels
  const pv=await p.evaluate(()=>{const r=_pvBuildSync('U19','2026/27');return JSON.stringify(r);});
  ok(!/"slv"/.test(pv)&&!/lernt/.test(pv),tag+'Stufen nicht in den Daten der Spieler');
  // no edit rights: the switch does nothing
  const ro=await p.evaluate(id=>{const cu=CU;CU={name:'Gast',role:'trainer',teams:[],loginAt:Date.now()};slpSetLv(id,10,'l');const v=cd().players[10].slv;CU=cu;return v&&v.LF;},d.lf);
  ok(ro!=='l',tag+'ohne Bearbeiten-Recht ändert sich keine Stufe');
  if(!ph){
    // Aufstellung: a realistic plan; Ali (IV) declined for So 08.11.
    await openSlp(p);
    const pre=await p.evaluate(()=>{const D=cd(),P=D.players,sl=fmtSlots(slpState.formation,slpState.customSlots);slpState.slots={};
      const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
      sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
      const iv=sl.filter(x=>x.lbl==='IV'),rv=sl.find(x=>x.lbl==='RV'),lf=sl.find(x=>x.lbl==='LF');
      slpState.slots[iv.find(x=>slpState.slots[x.id].includes(1)).id].push(7); // Jonas kann auch IV
      slpState.slots[rv.id]=[3,6];   // Max (RV) and Leon (8er, kann auch)
      slpState.slots[lf.id]=[13];    // only Elias, who "lernt" LF
      slpRender();slpSave();
      const i=D.sessions.findIndex(s=>s.date==='So 08.11');P[1].s[i]=0;
      return {ml:JSON.stringify(G.matchLineups||{})};});
    await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
    await openLp(p);
    ok(await fromVisible(p),tag+'Knopf „Aus dem Saisonkader“ in der Aufstellung');
    const disc=await p.evaluate(()=>[3,6].map(i=>!!lpDisciplineState(i)));
    await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);lpState.slots[sl.find(x=>x.lbl==='ST').id]=12;lpRender();}); // Mats set by hand
    await p.click('#lp-fromslp');await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(lpState.formation,lpState.customSlots),at=l=>sl.filter(x=>x.lbl===l).map(x=>lpState.slots[x.id]);
      return {iv:at('IV'),rv:at('RV')[0],lf:at('LF')[0],st:at('ST')[0],tw:at('TW')[0],all:[...Object.values(lpState.slots),...lpState.subs],subs:lpState.subs.length,max:lpMaxSubs(),
        flash:(document.getElementById('lp-save-flash')||{}).textContent||'',ml:JSON.stringify(G.matchLineups||{})};});
    ok(!r.all.includes(1)&&r.iv.includes(7)&&r.iv.includes(2),tag+'Ali hat abgesagt: Jonas (kann auch) neben Tom in der IV');
    ok(r.tw===0&&r.st===12,tag+'Stammposition zuerst (TW Jan), von Hand gesetzte Spieler bleiben (ST Mats)');
    ok(r.lf===undefined,tag+'„lernt“ kommt nicht von selbst in die Startelf: LF offen');
    if(disc[0]&&!disc[1])ok(r.rv===6,tag+'Trainingsregel nicht erfüllt (Max): kann auch (Leon) zuerst auf RV');
    else ok(true,tag+'(Trainingsregel-Fall übersprungen: Testdaten '+disc.join('/')+')');
    ok(r.subs>0&&r.subs<=r.max,tag+'Bank aus dem Plan ('+r.subs+' von höchstens '+r.max+')');
    ok(/^Aus dem Saisonkader: \d+ in der Startelf, \d+ auf der Bank · offen: LF · noch nicht gespeichert$/.test(r.flash),tag+'Meldung: „'+r.flash+'“');
    ok(r.ml===pre.ml,tag+'nichts gespeichert, bis „Aufstellung speichern“');
  } else {
    await openSlp(p);await p.evaluate(()=>{const sl=fmtSlots(slpState.formation,slpState.customSlots);slpState.slots[sl[0].id]=[0];slpRender();slpSave();});
    await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
    await openLp(p);
    const w=await p.evaluate(()=>{const b=document.getElementById('lp-fromslp'),t=b&&b.closest('.lp-ptools');return b&&t?{bw:b.getBoundingClientRect().width,tw:t.getBoundingClientRect().width,sw:document.documentElement.scrollWidth}:null;});
    ok(w&&w.bw>w.tw*0.8&&w.sw<=390,tag+'Telefon: Knopf in eigener Zeile über die ganze Breite, nichts ragt heraus');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
