// 1.2.146 (Artem 20.11.: „давай, как ты предложил“): beside the vertical
// pitch there was empty space and every strip above took the pitch height.
// From 1280 px wide (Heute) the notes stand in a column left of the pitch —
// Aufstellung: Ersatz laut Saisonkader, Nicht verfügbar, Trainingsregel,
// Kader, Nicht dabei; Saisonkader: Besetzung (gaps) and Legende. Narrower
// windows and the phone keep them where they were; resizing moves them.
// node tools/tests/t_notes146.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const openLp=async p=>{await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);};
const openSlp=async p=>{await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);};
const where=p=>p.evaluate(()=>{const par=id=>{const e=document.getElementById(id);return e?(e.closest('#lp-notes,#slp-notes-gaps,#slp-notes-leg')?'Spalte':'oben'):'-';};
  const n=document.getElementById('lp-notes');const nb=n?n.getBoundingClientRect():{width:0};
  return {ers:par('lp-ers-bar'),disc:par('lp-disc-bar'),sq:par('lp-sq-bar'),un:par('lp-unavail-bar'),notesW:Math.round(nb.width),
    out:document.querySelector('#lp-out-box .lp-out')?'Spalte':document.querySelector('#lp-kader-list .lp-out')?'Liste':'-',
    pitchH:Math.round(document.getElementById('lp-pitch').getBoundingClientRect().height),empty:!!(n&&n.classList.contains('is-empty'))};});
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[1536,864],[1280,720],[1180,800],[390,844]]){
  const wide=w>=1280,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // nobody missing yet
  await openLp(p);
  let r=await where(p);
  if(wide)ok(r.notesW===228&&r.empty,tag+'Spalte da, leer: „Niemand fehlt – keine Hinweise.“');
  else ok(r.notesW===0,tag+'schmal: keine Spalte');
  const h0=r.pitchH;
  await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
  // a plan, Ali (Stamm IV) declined, Luca (LF) excused; the training rule on Max/Noah
  await openSlp(p);
  await p.evaluate(()=>{const D=cd(),P=D.players,sl=fmtSlots(slpState.formation,slpState.customSlots),ix=n=>P.findIndex(x=>x.name.startsWith(n));slpState.slots={};
    const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
    sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
    const iv=sl.filter(x=>x.lbl==='IV');slpState.slots[iv.find(x=>slpState.slots[x.id].includes(ix('Ali'))).id].push(ix('Jonas'));slpRender();slpSave();
    const si=D.sessions.findIndex(s=>s.date==='So 08.11');P[ix('Ali')].s[si]=0;P[ix('Luca')].s[si]=2;});
  const sg=await p.evaluate(()=>{const g=document.getElementById('slp-gaps'),l=document.getElementById('slp-leg2');return {g:g.closest('#slp-notes-gaps')?'Spalte':'oben',l:l.closest('#slp-notes-leg')?'Spalte':'unter dem Feld',gt:g.textContent.trim().slice(0,40)};});
  ok(wide?(sg.g==='Spalte'&&sg.l==='Spalte'):(sg.g==='oben'&&sg.l==='unter dem Feld'),tag+'Saisonkader: Besetzung '+sg.g+', Legende '+sg.l+' („'+sg.gt+'…“)');
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  await openLp(p);
  if(wide){
    // one tap from the column: Jonas into the IV
    await p.click('#lp-notes .lp-ers-pick >> text=Jonas');await p.waitForTimeout(300);
    const iv=await p.evaluate(()=>{const P=cd().players;return fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV').map(x=>lpState.slots[x.id]).filter(v=>v!=null).map(v=>P[v].name.split(' ')[0]);});
    ok(iv.includes('Jonas'),tag+'Tipp in der Spalte: Jonas steht in der IV');
  }
  await p.evaluate(()=>lpFromSeason());await p.waitForTimeout(400);
  r=await where(p);
  const exp=wide?'Spalte':'oben';
  // 1.2.148: „Kader noch nicht veröffentlicht“ stands in the game card, not as a note
  ok(r.ers===exp&&r.disc===exp&&r.sq===exp&&r.un===exp,tag+'Hinweise '+exp+' (Ersatz '+r.ers+', Trainingsregel '+r.disc+')');
  ok(/Kader noch nicht veröffentlicht/.test(await p.evaluate(()=>document.getElementById('lp-gsq').textContent)),tag+'„Kader noch nicht veröffentlicht“ in der Spielkarte');
  ok(r.out===(wide?'Spalte':'Liste'),tag+'„Nicht dabei“ in der '+r.out);
  const vis=await p.evaluate(()=>['lp-ers-bar','lp-disc-bar'].map(id=>{const e=document.getElementById(id);return id+':'+(e.offsetParent&&e.getBoundingClientRect().height>10?1:0);}).join(','));
  ok(!/:0/.test(vis),tag+'Ersatz und Trainingsregel sichtbar ('+vis+')');
  if(wide){
    ok(!r.empty&&r.pitchH>=h0-15,tag+'Feld behält seine Höhe trotz drei Hinweisen ('+r.pitchH+' / ohne Hinweise '+h0+'; früher mit Streifen oben ~430)');
    // the column does not run under the pitch: left of it, inside the card
    const g=await p.evaluate(()=>{const n=document.getElementById('lp-notes').getBoundingClientRect(),f=document.getElementById('lp-pitch').getBoundingClientRect(),c=document.querySelector('#moLineup .lp-pcard').getBoundingClientRect();
      // the pitch is drawn centred in its box (viewBox 340×525, meet)
      const fw=Math.min(f.width,f.height*340/525),fl=f.left+(f.width-fw)/2;return {gap:Math.round(fl-n.right),in:n.left>=c.left&&n.bottom<=c.bottom+1};});
    ok(g.gap>=8&&g.in,tag+'Spalte links neben dem Feld, in der Karte (Abstand '+g.gap+' px)');
    // narrower window: everything moves back up; wider again: into the column
    await p.setViewportSize({width:1180,height:h});await p.waitForTimeout(400);
    let q=await where(p);
    ok(q.disc==='oben'&&q.sq==='oben'&&q.out==='Liste'&&q.notesW===0,tag+'Fenster auf 1180 verkleinert: Hinweise wieder oben, „Nicht dabei“ in der Liste');
    await p.setViewportSize({width:w,height:h});await p.waitForTimeout(400);
    q=await where(p);
    ok(q.disc==='Spalte'&&q.out==='Spalte'&&q.notesW===228,tag+'wieder breit: zurück in der Spalte');
    // Nacht: the blocks are dark
    const dk=await p.evaluate(()=>{document.body.classList.add('hxk-dk');lpRender();const bg=getComputedStyle(document.getElementById('lp-disc-bar')).backgroundColor;document.body.classList.remove('hxk-dk');lpRender();
      const m=(bg.match(/srgb ([\d.]+) ([\d.]+) ([\d.]+)/)||[]).slice(1).map(x=>+x*255);const n=m.length?m:(bg.match(/[\d.]+/g)||[]).map(Number);return Math.round(n[0]*.299+n[1]*.587+n[2]*.114);});
    ok(dk<110,tag+'„Nacht“: Hinweise dunkel ('+dk+')');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
