// 1.2.136: a Probetraining player without an answer is not "offen". The team
// rule gives him no automatic "M" and he gets no reminders, so in Artem's
// "Im Blick behalten" (18.11.) "Noch ohne Antwort" stood there for him alone
// and would not go away. Now: not in "Noch ohne Antwort", not in "x von y",
// his own group in the session window, "Probetraining" on the Tafel.
// A regular player on "?" (set by a trainer) still shows as before.
// node tools/tests/t_probe136.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=(open)=>{
  const D=cd(),S=D.sessions,P=D.players;
  const si=d=>S.findIndex(s=>s.date===d);const pl=n=>P.find(p=>p.name.startsWith(n));
  // Mika: Probetraining since Mon 02.11 — no automatic "M" ahead (as the rule leaves him)
  const mika=pl('Mika');mika.trial='2026-11-02';
  S.forEach((s,i)=>{if(!s||!s.date)return;const k=_dbSortKey(s.date,UI.currentSeason);
    if(k>=isoToSortKey('2026-11-02')&&!sessTookPlace(s,UI.currentSeason)){mika.s[i]=3;mika.ay[i]=null;}});
  mika.s[si('Di 03.11')]=1;
  // Jonas: a trainer put him back on "?" for Di 10.11 (the rule leaves that alone)
  if(open){const jo=pl('Jonas');jo.s[si('Di 10.11')]=3;jo.ay[si('Di 10.11')]=0;}
};
const go=async(b,{open,vp,cu}={})=>{const c=await b.newContext({viewport:vp||{width:1536,height:864}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(`(${prep.toString()})(${!!open})`);
  if(cu)await p.evaluate(cu=>{CU=Object.assign({loginAt:Date.now()},cu);},cu);
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();});await p.waitForTimeout(300);
  return {p,c,errs};};
const flags=p=>p.evaluate(()=>(window._hxFlagsList||[]).filter(f=>f.who==='Noch ohne Antwort').map(f=>f.what));
const counts=(p,d)=>p.evaluate(d=>{const D=cd();const i=D.sessions.findIndex(s=>s.date===d);const c=_hxCounts(D,i,UI.currentSeason);
  return {open:c.open,total:c.total,yes:c.yes,tr:c.tr,names:c.openList.map(x=>x.p.name)};},d);
(async()=>{const b=await chromium.launch();
 // 1. only the Probetraining player has no answer
 {const {p,c,errs}=await go(b);
  ok((await flags(p)).length===0,'Im Blick: keine Zeile „Noch ohne Antwort“, wenn nur der Probetraining-Spieler nicht geantwortet hat');
  let r=await counts(p,'Di 10.11');
  ok(r.open===0&&r.total===14&&r.tr===1,'Di 10.11: 0 offen, 14 erwartet (Probetraining nicht mitgezählt) – '+JSON.stringify({open:r.open,total:r.total,tr:r.tr}));
  r=await p.evaluate(()=>{const t=(document.querySelector('#hxHome .hx-a-focus,#hxHome .hx-focus')||document.getElementById('hxHome')).textContent;const dn=getDisplayName(cd().players.find(q=>q.name.startsWith('Mika')));return {mika:t.includes(dn),noch:/Noch keine Antwort/.test(t)};});
  ok(!r.mika&&!r.noch,'Übersicht, nächster Termin: kein „Noch keine Antwort“ mit dem Probetraining-Spieler');
  // session window Di 10.11
  await p.evaluate(()=>{const D=cd();openSessFromMain(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const el=document.getElementById('ss-hx-att');const g=[...el.querySelectorAll('.ssx-grp')].map(x=>({st:x.dataset.st,t:x.querySelector('.ssx-gh').textContent.trim(),n:x.querySelectorAll('.ssx-chip').length,mika:x.textContent.includes(getDisplayName(cd().players.find(q=>q.name.startsWith('Mika')))),btn:x.querySelector('.ssx-chip:not([disabled])')?1:0}));
    return {g,sum:(el.querySelector('.ssx-sum')||{}).textContent||'',dot:(()=>{const i=el.querySelector('.s-prb');return i?getComputedStyle(i).backgroundColor:'';})()};});
  const prb=r.g.find(x=>x.st==='prb'),off=r.g.find(x=>x.st==='3');
  ok(!off,'Termin: keine Gruppe „Offen“');
  ok(prb&&prb.mika&&prb.n===1&&/^Probetraining – ohne Antwort 1/.test(prb.t),'Termin: eigene Gruppe „Probetraining – ohne Antwort 1“'+(prb?' ('+prb.t+')':''));
  ok(prb&&prb.btn===1,'Termin: Trainer kann ihn dort antippen und eintragen');
  ok(/von 14/.test(r.sum),'Termin: „… von 14“ ('+r.sum.trim()+')');
  ok(r.dot==='rgb(124, 58, 237)','Termin: Punkt in Probetraining-Lila');
  // the trainer marks him: from then on he counts like anyone
  await p.evaluate(()=>{const D=cd(),i=D.sessions.findIndex(s=>s.date==='Di 10.11');const m=D.players.find(x=>x.name.startsWith('Mika'));m.s[i]=4;_ayTouch(m,i);hxRender();});
  r=await counts(p,'Di 10.11');
  ok(r.total===15&&r.yes===15&&r.tr===0,'eingetragen („M“): zählt mit, 15 von 15');
  await p.evaluate(()=>{const D=cd(),i=D.sessions.findIndex(s=>s.date==='Di 10.11');const m=D.players.find(x=>x.name.startsWith('Mika'));m.s[i]=3;hxRender();});
  // Tafel for the next match
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='none';openSpieltagKader();});await p.waitForTimeout(600);
  r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#kbBoard .kb-card')];const dn=getDisplayName(cd().players.find(q=>q.name.startsWith('Mika')));const m=cs.find(x=>(x.querySelector('.kb-nm')||{}).textContent===dn);
    const leg=(document.querySelector('#kbBoard .kb-leg')||{}).textContent||'';
    return {cls:m?m.className:'',st:m?(m.querySelector('.kb-st')||{}).textContent:'',leg,ttl:(document.querySelector('#kbBoard .kb-ttl')||{}).textContent||''};});
  ok(/st-prb/.test(r.cls)&&r.st==='Probetraining','Tafel ('+r.ttl+'): Karte „Probetraining“ statt „Offen“');
  ok(!/offen/.test(r.leg),'Tafel: kein „offen“ in der Zeile oben ('+r.leg.trim()+')');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // 2. a regular player on "?" still shows, the Probetraining player not
 {const {p,c,errs}=await go(b,{open:true});
  const f=await flags(p);
  ok(f.length===1&&f[0]==='Di 10.11: 1','Im Blick: „Noch ohne Antwort · Di 10.11: 1“ für den Stammspieler ('+f.join('|')+')');
  const r=await counts(p,'Di 10.11');
  ok(r.open===1&&r.names.length===1&&/Jonas/.test(r.names[0]),'Di 10.11: offen ist nur der Stammspieler');
  await p.evaluate(()=>{const D=cd();openSessFromMain(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(500);
  const g=await p.evaluate(()=>[...document.querySelectorAll('#ss-hx-att .ssx-grp')].map(x=>({st:x.dataset.st,n:x.querySelectorAll('.ssx-chip').length,er:!!x.querySelector('.ssx-remind')})));
  const o=g.find(x=>x.st==='3'),pr=g.find(x=>x.st==='prb');
  ok(o&&o.n===1&&o.er&&pr&&pr.n===1&&!pr.er,'Termin: „Offen 1“ mit „Erinnern“, „Probetraining“ ohne „Erinnern“');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // 3. phone and "Nur ansehen"
 {const {p,c,errs}=await go(b,{vp:{width:390,height:844},cu:{name:'Gast',role:'viewer',teams:['U19']}});
  await p.evaluate(()=>{const D=cd();openSessFromMain(D.sessions.findIndex(s=>s.date==='Di 10.11'));});await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const x=document.querySelector('#ss-hx-att .ssx-grp[data-st="prb"]');return x?{n:x.querySelectorAll('.ssx-chip').length,dis:x.querySelectorAll('.ssx-chip[disabled]').length,w:x.getBoundingClientRect().width}:null;});
  ok(r&&r.n===1&&r.dis===1&&r.w<=390,'Telefon, „Nur ansehen“: Gruppe da, nicht antippbar, passt in die Breite');
  ok(!errs.length,'Telefon: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
