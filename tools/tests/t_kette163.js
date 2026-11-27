// The whole chain of a match day, one after the other (rehearsal before the
// first real match with the new Spieltag, 27.11.2026) — and 1.2.163:
// the Kader window does not tick or list as "Verfügbar" who may not play.
//   Sa 10:00  lineup from the Saisonkader (one suspended, one not yet
//             spielberechtigt, one declined) → "Kader festlegen" → publish →
//             text for WhatsApp → what the players see
//   So 15:10  after kick-off: "nicht im Kader" is neutral, Im Blick asks for
//             roll call and Spielbericht → Spielbericht from the lineup, a
//             substitution, a red card with its minute → minutes, attendance,
//             the ban for the next match, Statistik → what the players see
// Replaces parts of the lost t_sq93, t_off97, t_red100.
// node tools/tests/t_kette163.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const SI=29;                       // So 08.11 gegen SG Heidekamp, 13:00, auswärts
const ALI=1,TOM=2,FINN=4,LEON=6,JONAS=7,PAUL=11,MATS=12,MIKA=14,JAN=0,BEN=9,EMIL=8,NOAH=5;
async function player(b,slices,who,when){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const q=await c.newPage();const errs=[];q.on('pageerror',e=>errs.push(e.message));
  await q.clock.install({time:when});await q.goto('file://'+HTML);await q.waitForTimeout(600);await q.evaluate(`(${setupTrainer.toString()})({})`);
  const t=await q.evaluate(([S,who])=>{const x=S[who];window._hubMode=true;window._hubAction=null;_pvAdopt({pk:'p'.repeat(64),t:Date.now(),P:x.P,T:S.T,mvp:{},inbox:{}},x.tok);_pmEnterSlice(x.tok);
    fbDb={ref:()=>({set:()=>Promise.resolve(),once:()=>Promise.resolve({val:()=>null}),on:()=>{},off:()=>{}})};window._hubAction=null;renderPlayerMode();
    return document.getElementById('playerModeWrap').innerText.replace(/\s+/g,' ');},[slices,who]);
  await c.close();return {t,errs};
}
const slicesOf=p=>p.evaluate(ids=>{const r=_pvBuildSync('U19','2026/27');const o={T:JSON.parse(JSON.stringify(r.shared))};
  for(const [k,pi] of Object.entries(ids)){const pp=r.people.find(x=>x.pi===pi);o[k]={tok:pp.tok,P:JSON.parse(JSON.stringify(Object.assign({},pp.obj,{tk:'t'.repeat(64),lk:'abcdef0123456789abcd'})))};}
  o.leak=/"cards"|"noSb"|"sbAb"|"note":|"perf"|"phone"|"birthdate"/.test(JSON.stringify(r.people.map(x=>x.obj)));
  return o;},{tom:TOM,ali:ALI,paul:PAUL,finn:FINN,mats:MATS});
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // Ali: red on 01.11.; Paul: spielberechtigt from 01.12.; Finn: declined
  await p.evaluate(([si,A,P_,F])=>{const D=cd(),P=D.players,se=UI.currentSeason;
    const prev=_sbMatches(D,se).filter(x=>x.k<_dbSortKey('So 08.11',se)).pop().i;
    P[A].cards=[];P[A].cards[prev]='r';P[P_].noSb=true;P[P_].sbAb='2026-12-01';P[F].s[si]=0;if(P[F].ay)P[F].ay[si]=0;
    window._fl=[];const o=window.showSaveFlash;window.showSaveFlash=(t,...a)=>{window._fl.push(t);return o&&o(t,...a);};},[SI,ALI,PAUL,FINN]);
  // the Saisonkader: everyone on his profile position
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(slpState.formation,slpState.customSlots);slpState.slots={};
    const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
    sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
    slpRender();slpSave();});
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  await p.evaluate(()=>{CU={name:'Ole Test',role:'trainer',teams:['U19'],loginAt:Date.now()};});   // a trainer, not the admin
  const flags=()=>p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';window._hxFlagsAll=true;hxRender();return (window._hxFlagsList||[]).map(f=>f.who+' · '+f.what);});
  const kw=()=>p.evaluate(()=>{const P=cd().players,g=[...document.querySelectorAll('#sqList .sqd-g')].map(x=>({h:x.querySelector('.sqd-gh').innerText.replace(/\s+/g,' ').trim(),n:[...x.querySelectorAll('.sqd-nm')].map(y=>y.innerText.replace(/\s+/g,' ').trim())}));
    const w=document.getElementById('sqWarn');return {sel:[..._SQ.sel].sort((a,b)=>a-b),groups:g,warn:w.hidden?'':w.innerText.replace(/\s+/g,' ').trim(),no:(document.querySelector('#sqList .sqd-no')||{}).innerText||'',count:document.getElementById('sqCount').innerText};});
  // ── A. Kader window without a lineup (1.2.163) ──
  let f=await flags();
  ok(f.some(x=>/Kader und Treffpunkt noch nicht veröffentlicht/.test(x)),tag+'A: Im Blick erinnert an den Kader für morgen');
  await p.evaluate(si=>squadOpen(si),SI);await p.waitForTimeout(300);
  let k=await kw();
  ok(!k.sel.includes(ALI)&&!k.sel.includes(PAUL)&&!k.sel.includes(FINN)&&k.sel.length===12,tag+'A: ohne Aufstellung vorausgewählt: 12 – nicht der Gesperrte, nicht der ohne Spielberechtigung, nicht der Absager ('+k.count+')');
  const gV=k.groups.find(g=>/^Verfügbar/.test(g.h)),gB=k.groups.find(g=>/^Dürfen nicht spielen/.test(g.h));
  ok(gV&&/^Verfügbar 12/.test(gV.h)&&!gV.n.some(n=>/^(Ali|Paul)/.test(n)),tag+'A: „Verfügbar 12“ ohne Ali und Paul');
  ok(gB&&/Dürfen nicht spielen 2 gesperrt oder nicht spielberechtigt/.test(gB.h)&&gB.n.some(n=>/^Ali ⛔ gesperrt bis 15\.11\. \(Rot am 01\.11\.\)$/.test(n))&&gB.n.some(n=>/^Paul ⚠ spielberechtigt ab 01\.12\.$/.test(n)),tag+'A: eigene Gruppe „Dürfen nicht spielen 2“ – '+(gB?gB.n.join(' | '):'fehlt'));
  ok(/Abgesagt oder entschuldigt: Finn/.test(k.no)&&!k.warn,tag+'A: Finn unter „Abgesagt“, keine Warnung');
  const sum=()=>p.evaluate(()=>[...document.querySelectorAll('#sqPrev .rs-gh')].map(x=>x.innerText.replace(/\s+/g,' ').trim()));
  let sm=await sum();
  ok(sm.includes('12 im Kader')&&sm.includes('2 dürfen nicht spielen')&&!sm.some(x=>/verfügbar, nicht im Kader/.test(x)),tag+'A: Zusammenfassung – „12 im Kader“, „2 dürfen nicht spielen“ (nicht „verfügbar, nicht im Kader“): '+sm.join(' | '));
  await p.evaluate(l=>{const cb=document.querySelector(`#sqList input[data-pi="${l}"]`);cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}));},LEON);
  sm=await sum();ok(sm.includes('1 verfügbar, nicht im Kader · 2 dürfen nicht spielen'),tag+'A: einer abgewählt – „1 verfügbar, nicht im Kader · 2 dürfen nicht spielen“');
  await p.evaluate(l=>{const cb=document.querySelector(`#sqList input[data-pi="${l}"]`);cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));},LEON);
  await p.evaluate(a=>{const cb=document.querySelector(`#sqList input[data-pi="${a}"]`);cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}));},ALI);
  k=await kw();ok(/Ali ist gesperrt bis 15\.11\. \(Rot am 01\.11\.\) – trotzdem im Kader\?/.test(k.warn),tag+'A: mit Absicht angehakt → „… trotzdem im Kader?“');
  await p.evaluate(()=>closeM('moKader'));
  // a Testspiel: the one without Spielberechtigung may play
  const key=await p.evaluate(si=>_mlKey(UI.currentTeam,UI.currentSeason,si),SI);
  await p.evaluate(([key,si])=>{G.matchLineups=G.matchLineups||{};G.matchLineups[key]={matchKind:'test',slots:{},subs:[]};squadOpen(si);},[key,SI]);await p.waitForTimeout(300);
  k=await kw();
  ok(k.sel.includes(PAUL)&&!k.sel.includes(ALI)&&(k.groups.find(g=>/^Dürfen nicht spielen/.test(g.h))||{n:[]}).n.length===1,tag+'A: Testspiel – Paul verfügbar und vorausgewählt, Ali nicht');
  await p.evaluate(key=>{closeM('moKader');delete G.matchLineups[key];},key);
  // ── B. Sa 10:00: lineup → Kader → publish ──
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(900);
  const lu=()=>p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);return {open:document.getElementById('moLineup').classList.contains('open'),si:lpState.sessIdx,
    feld:sl.map(x=>lpState.slots[x.id]).filter(v=>v!=null),bank:lpState.subs.slice(),free:sl.filter(x=>lpState.slots[x.id]==null).map(x=>x.lbl),
    card:(document.querySelector('#moLineup .lp-gcard')||{}).innerText||'',out:[...document.querySelectorAll('#moLineup .lp-out')].map(r=>r.innerText.replace(/\s+/g,' ').trim())};});
  await p.evaluate(()=>lpFromSeason());await p.waitForTimeout(300);
  let s=await lu();
  ok(s.open&&s.si===SI,tag+'B: „Spieltag“ öffnet das Spiel von morgen');
  ok(s.feld.length===9&&s.free.join()==='IV,LV'&&![ALI,PAUL,FINN].some(i=>s.feld.includes(i)||s.bank.includes(i)),tag+'B: „Aus dem Saisonkader“: 9 gesetzt, IV und LV offen – ohne Ali, Paul, Finn');
  ok(['Ali Gesperrt bis 15.11.','Finn Abgesagt','Paul Spielberechtigt ab 01.12.'].every(t=>s.out.some(o=>o.endsWith(t))),tag+'B: „Nicht dabei“: '+s.out.join(' | '));
  await p.evaluate(([L,J])=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).filter(x=>lpState.slots[x.id]==null);lpState.slots[sl[0].id]=L;lpState.slots[sl[1].id]=J;lpRender();lpSave();},[LEON,JONAS]);await p.waitForTimeout(300);
  ok((await p.evaluate(()=>window._fl.slice(-1)[0]))==='✓ Aufstellung gespeichert',tag+'B: von Hand ergänzt, gespeichert');
  const btn=await p.evaluate(()=>{const b=document.querySelector('#moLineup .lp-gsq-btn');if(!b||!b.getBoundingClientRect().width)return null;const t=b.innerText.trim();b.click();return t;});
  await p.waitForTimeout(400);k=await kw();
  ok(btn==='Kader festlegen'&&k.sel.length===12&&[LEON,JONAS,MIKA].every(i=>k.sel.includes(i))&&!k.warn,tag+'B: „Kader festlegen“ – Feld und Bank ausgewählt (12), keine Warnung');
  const top=await p.evaluate(()=>{const m=document.querySelector('#moKader .mob').getBoundingClientRect();const e=document.elementFromPoint(m.left+m.width/2,m.top+40);return !!(e&&e.closest('#moKader'));});
  ok(top,tag+'B: Kader-Fenster liegt über dem Spieltag');
  await p.evaluate(()=>sqPublish());await p.waitForTimeout(400);
  const pub=await p.evaluate(si=>{const q=cd().sessions[si].squad,w=document.getElementById('moSqWa');const m=w&&w.querySelector('.mob').getBoundingClientRect();const e=m&&document.elementFromPoint(m.left+m.width/2,m.top+40);
    return {n:q.p.length,out:q.out.map(x=>x.split(' ')[0]).sort().join(','),meet:q.meet,by:q.by,wa:w&&w.classList.contains('open')?document.getElementById('sqWaText').value:'',waTop:!!(e&&e.closest('#moSqWa')),fl:window._fl.slice(-1)[0]};},SI);
  ok(pub.n===12&&pub.out==='Ali,Paul'&&pub.meet==='11:30'&&pub.by==='Ole Test'&&pub.fl==='✓ Kader veröffentlicht',tag+'B: veröffentlicht – 12 Spieler, Treffpunkt 11:30, nicht dabei: '+pub.out);
  const wl=pub.wa.split('\n');
  ok(pub.waTop&&wl[0]==='⚽ Kader für Sonntag, 08.11. gegen SG Heidekamp (auswärts)'&&wl[1]==='Treffpunkt 11:30'&&wl[2]==='Anstoß 13:00'&&wl.slice(4).length===12&&!/Ali|Paul|Finn/.test(pub.wa),tag+'B: Text für WhatsApp – Kopf, Treffpunkt, Anstoß, 12 Namen, ohne die drei');
  await p.evaluate(()=>closeM('moSqWa'));await p.waitForTimeout(200);
  s=await lu();ok(/Kader · 12 Spieler · Treffpunkt 11:30/.test(s.card.replace(/\s+/g,' '))&&/Kader ändern/.test(s.card),tag+'B: Karte im Spieltag: „Kader · 12 Spieler · Treffpunkt 11:30“, „Kader ändern“');
  await p.evaluate(()=>{_lpOpenSnap=_lpSnapshot();closeLineupPlanner();hxGo('home');});await p.waitForTimeout(300);
  f=await flags();
  ok(!f.some(x=>/noch nicht veröffentlicht/.test(x))&&f.some(x=>/^Ali · gesperrt bis 15\.11\./.test(x)),tag+'B: Im Blick – Kader erledigt, Sperre von Ali steht da');
  if(!ph){
    const S=await slicesOf(p);
    ok(!S.leak,tag+'B: in den Daten der Spieler keine Karten, keine Spielberechtigung, keine Notizen');
    let r=await player(b,S,'tom',NOW);ok(/gegen SG Heidekamp Treffpunkt 11:30 im Kader/.test(r.t)&&!r.errs.length,'Spieler im Kader: „Treffpunkt 11:30 · im Kader“');
    r=await player(b,S,'ali',NOW);ok(/gegen SG Heidekamp Diesmal bist du nicht dabei nicht im Kader/.test(r.t)&&!/gesperrt|Sperre|Rot/.test(r.t),'gesperrter Spieler: „Diesmal bist du nicht dabei“ – kein Wort zur Sperre');
    r=await player(b,S,'paul',NOW);ok(/Diesmal bist du nicht dabei nicht im Kader/.test(r.t)&&!/spielberechtigt/i.test(r.t),'ohne Spielberechtigung: „Diesmal bist du nicht dabei“');
    r=await player(b,S,'finn',NOW);ok(/gegen SG Heidekamp Auswärts abgesagt/.test(r.t),'Absager: „abgesagt“');
  }
  // ── C. So 15:10: after the match ──
  await p.clock.setSystemTime(new Date('2026-11-08T14:10:00Z'));
  await p.evaluate(()=>{render();});
  f=await flags();
  const st=()=>p.evaluate(si=>cd().players.map(q=>q.s[si]),SI);
  let v=await st();
  ok(v[ALI]===5&&v[PAUL]===5&&v[FINN]===0&&v[TOM]===4,tag+'C: nach dem Anpfiff – nicht Nominierte „nicht im Kader“ (neutral), Absage bleibt');
  ok(f.some(x=>/Spielbericht fehlt/.test(x))&&f.some(x=>/Anwesenheit fehlt/.test(x)),tag+'C: Im Blick – Spielbericht und Anwesenheit fehlen');
  await p.evaluate(si=>sbOpen(si),SI);await p.waitForTimeout(300);
  const sb0=await p.evaluate(()=>({lu:(document.querySelector('#sb-body .sb-lu')||{}).innerText||'',chips:document.querySelectorAll('#sb-body .rc-sub-c .rc-sc').length}));
  ok(sb0.lu==='Aus der Aufstellung übernehmen (11)'&&sb0.chips===12,tag+'C: Spielbericht – „Aus der Aufstellung übernehmen (11)“, zur Wahl der Kader (12)');
  await p.evaluate(()=>{sbStartersFromLineup();sbScore('f',1);sbScore('f',1);sbScore('a',1);sbSubStart();sbSubSet('m','60');});await p.waitForTimeout(200);
  const sub=await p.evaluate(()=>({i:[...document.querySelectorAll('#sb-sub-i option')].map(o=>o.textContent).filter(x=>!/wählen/.test(x)),o:[...document.querySelectorAll('#sb-sub-o option')].length-1}));
  ok(sub.i.join()==='12 Mika'&&sub.o===11,tag+'C: Wechsel – rein kann die Bank (Mika), raus die elf auf dem Platz');
  await p.evaluate(([MI,JA,MA,BE,EM,NO,TO])=>{const P=cd().players;sbSubSet('i',P[MI].name);sbSubSet('o',P[JA].name);sbSubAdd();sbStat(MA,'goals',1);sbStat(BE,'goals',1);sbStat(EM,'assists',1);sbCard(NO,'y');sbCard(TO,'r');sbOffSet(TO,'75');},[MIKA,JAN,MATS,BEN,EMIL,NOAH,TOM]);
  await p.waitForTimeout(200);
  const rep=await p.evaluate(([si,ids])=>{const D=cd(),s=D.sessions[si],P=D.players,m=sbMinutes(s),mn=i=>{const x=m[P[i].name];return x&&typeof x==='object'?x.min:x;};
    const n=D.sessions.findIndex(x=>x.date==='So 15.11'),bt=sbBanAt(P[ids.TOM],n,D,UI.currentSeason),ba=sbBanAt(P[ids.ALI],n,D,UI.currentSeason);
    return {res:sbResult(s).word+' '+sbResult(s).txt,jan:mn(ids.JAN),mika:mn(ids.MIKA),tom:mn(ids.TOM),mats:mn(ids.MATS),st:P.map(q=>q.s[si]),
      body:document.getElementById('sb-body').innerText.replace(/\s+/g,' '),bt:bt?sbBanText(bt,D):'',ba:ba?sbBanText(ba,D):'',next:n};},[SI,{TOM,ALI,JAN,MIKA,MATS}]);
  ok(rep.res==='Sieg 2:1'&&/Tore 2 von 2 zugeordnet/.test(rep.body),tag+'C: Ergebnis „Sieg 2:1“, Tore zugeordnet');
  ok(rep.jan===60&&rep.mika===30&&rep.tom===75&&rep.mats===90,tag+'C: Minuten – ausgewechselt 60, eingewechselt 30, Platzverweis in der 75. → 75, sonst 90');
  ok(rep.st.filter(x=>x===1).length===12&&rep.st[ALI]===5&&rep.st[FINN]===0,tag+'C: wer im Bericht steht, ist anwesend (12)');
  ok(/Sperren Tom vorläufig 2 Wochen, höchstens 2 Spiele/.test(rep.body),tag+'C: „Sperren · Tom · vorläufig 2 Wochen, höchstens 2 Spiele …“');
  ok(rep.bt==='gesperrt bis 22.11. (Rot am 08.11.)'&&rep.ba==='gesperrt bis 15.11. (Rot am 01.11.)',tag+'C: fürs nächste Spiel (15.11.) gesperrt: Tom ('+rep.bt+') und Ali');
  await p.evaluate(()=>sbClose());await p.waitForTimeout(200);
  await p.evaluate(si=>rcOpen(si),SI);await p.waitForTimeout(200);
  const rc=await p.evaluate(()=>document.getElementById('rcOverlay').innerText.replace(/\s+/g,' '));
  ok(/15 von 15 erfasst/.test(rc)&&/Ali nicht im Kader/.test(rc)&&/Paul nicht im Kader/.test(rc),tag+'C: Anwesenheit erfassen – alle erfasst, „nicht im Kader“ bei Ali und Paul');
  await p.evaluate(()=>rcClose());
  f=await flags();ok(!f.some(x=>/Spielbericht fehlt|Anwesenheit fehlt/.test(x)),tag+'C: Im Blick – beides erledigt');
  const pt=await p.evaluate(ids=>{const r=computePlayTime(cd(),UI.currentSeason,UI.currentTeam).rows;const g=i=>{const x=r.find(y=>y.pi===i);return x?x.mins+'/'+x.poss:null;};return {mika:g(ids.MIKA),tom:g(ids.TOM),ali:g(ids.ALI),paul:g(ids.PAUL)};},{MIKA,TOM,ALI,PAUL});
  ok(pt.mika==='30/90'&&pt.tom==='75/90'&&pt.ali===null&&pt.paul===null,tag+'C: Statistik/Spielzeit – Mika 30 von 90, Tom 75 von 90; Ali und Paul (durften nicht) ohne Zeile');
  // the next match: both suspended players stay out
  await p.evaluate(n=>openLineupPlanner(n),rep.next);await p.waitForTimeout(700);
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();});await p.waitForTimeout(300);
  s=await lu();
  ok(s.si===rep.next&&![ALI,TOM,PAUL].some(i=>s.feld.includes(i)||s.bank.includes(i))&&s.out.some(o=>/Tom Gesperrt bis 22\.11\./.test(o)),tag+'C: Spieltag 15.11. – „Aus dem Saisonkader“ ohne Tom, Ali, Paul; „Tom · Gesperrt bis 22.11.“');
  await p.evaluate(()=>{_lpOpenSnap=_lpSnapshot();closeLineupPlanner();});
  await p.evaluate(n=>squadOpen(n),rep.next);await p.waitForTimeout(300);
  k=await kw();
  ok(![ALI,TOM,PAUL].some(i=>k.sel.includes(i))&&!/zum 2\. Mal in Folge/.test(k.warn),tag+'C: Kader 15.11. – die Gesperrten nicht vorausgewählt, kein „zum 2. Mal in Folge nicht im Kader, obwohl er dabei sein konnte“ für sie ['+k.warn.slice(0,80)+']');
  await p.evaluate(()=>closeM('moKader'));
  if(!ph){
    const S=await slicesOf(p);
    ok(!S.leak,tag+'C: auch nach dem Spiel keine Karten in den Daten der Spieler');
    let r=await player(b,S,'mats',new Date('2026-11-08T14:30:00Z'));
    ok(/Jetzt dran Belastung bewerten Spiel So 08\.11 gegen SG Heidekamp/.test(r.t)&&/Letztes Spiel 2:1 Sieg gegen SG Heidekamp/.test(r.t)&&/Du: 1 Tor/.test(r.t)&&!r.errs.length,'Spieler nach dem Spiel: „Belastung bewerten“, „Letztes Spiel 2:1 Sieg“, „Du: 1 Tor“');
    r=await player(b,S,'ali',new Date('2026-11-09T07:30:00Z'));
    ok(!/Belastung bewerten Spiel So 08\.11/.test(r.t)&&/Letztes Spiel 2:1 Sieg/.test(r.t),'nicht im Kader: nicht nach der Belastung des Spiels gefragt, sieht das Ergebnis');
    r=await player(b,S,'tom',new Date('2026-11-09T07:30:00Z'));
    ok(/Belastung bewerten Spiel So 08\.11/.test(r.t)&&!/gesperrt|Sperre|Rote|Platzverweis/.test(r.t),'Spieler mit Rot: wird gefragt, liest in der App nichts von Karte und Sperre');
  }
  ok(!errs.length,tag+'keine Fehler '+errs.join(' | '));
  await c.close();
 }
 await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
