// 1.2.148 (Artem 21.11.: „я за D, с добавкой для тех, кто поле в приложении не
// рисует“): Spieltag is one page around the pitch. The coaches sketch the lineup
// first and pick the squad from it. Game card: squad state, „Kader festlegen“
// (who is on the pitch and the bench, saved or not), Gegner, Matchplan; on the
// phone also per line. Players beside the pitch by line with "x von y" and the
// last five sessions. No second "Kader" — the Tafel stays for "Nur ansehen".
// node tools/tests/t_spieltag148.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=()=>{const D=cd(),P=D.players,i=D.sessions.findIndex(s=>s.date==='So 08.11');const ix=n=>P.findIndex(x=>x.name.startsWith(n));P[ix('Ali')].s[i]=0;P[ix('Luca')].s[i]=2;};
// 1.2.149: the state in #lp-gsq, the button next to "Speichern" (#lp-gsqbtn), Gegner/Matchplan in #lp-glinks
const card=p=>p.evaluate(()=>{const g=document.getElementById('lp-gsq');return {t:g?g.textContent.replace(/\s+/g,' ').trim():'',btns:[...document.querySelectorAll('#lp-gsqbtn button,#lp-glinks button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim())};});
(async()=>{const b=await chromium.launch();
 for(const [w,h] of [[1536,864],[360,640]]){
  const ph=w<768,tag=w+'×'+h+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);await p.evaluate(`(${prep.toString()})()`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(900);
  const o=await p.evaluate(()=>{const m=document.getElementById('moLineup');return {open:m.classList.contains('open'),via:m.classList.contains('hx-vianav'),t:document.getElementById('lp-htitle').innerText.trim(),
    tabs:[...document.querySelectorAll('.hx-lptabs button')].filter(x=>x.offsetParent).length};});
  ok(o.open&&o.via&&o.t==='Spieltag'&&!o.tabs,tag+'Spieltag öffnet das Feld, Titel „Spieltag“, keine Reiter „Kader | Aufstellung“');
  let k=await card(p);
  ok(/Kader noch nicht veröffentlicht/.test(k.t)&&JSON.stringify([...k.btns].sort())===JSON.stringify(['Gegner','Kader festlegen','Matchplan']),tag+'Spielkarte: „Kader noch nicht veröffentlicht“, Kader festlegen, Gegner, Matchplan');
  const fit=await p.evaluate(()=>{const b=document.querySelector('#lp-gsqbtn .lp-gsq-btn').getBoundingClientRect();return Math.round(b.bottom);});
  ok(fit<=h,tag+'„Kader festlegen“ ohne Scrollen sichtbar ('+fit+' px)');
  const gl=await p.evaluate(()=>{const e=document.getElementById('lp-glines');return {vis:!!(e&&e.offsetParent),t:e?[...e.children].map(x=>x.textContent.replace(/\s+/g,' ').trim()):[]};});
  if(ph)ok(gl.vis&&JSON.stringify(gl.t)===JSON.stringify(['Tor 2/2','Abwehr 3/4','Mittelfeld 5/5','Angriff 3/4']),tag+'Telefon: je Linie in der Karte ('+gl.t.join(' · ')+')');
  else ok(!gl.vis,tag+'PC: Linien nicht in der Karte (stehen in der Liste)');
  // the players by line
  const li=await p.evaluate(()=>{const L=[...document.querySelectorAll('#lp-kader-list .lp-line-h')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
    const rows=[...document.querySelectorAll('#lp-kader-list > div')];return {L,dots:rows.slice(0,3).map(r=>r.querySelectorAll('.lp-dots i').length)};});
  ok(JSON.stringify(li.L)===JSON.stringify(['Tor 2 von 2 verfügbar','Abwehr 3 von 4 verfügbar','Mittelfeld 5 von 5 verfügbar','Angriff 3 von 4 verfügbar']),tag+'Spieler nach Linien: '+li.L.join(' | '));
  ok(li.dots.every(n=>n===5),tag+'jeder Spieler mit den letzten fünf Terminen');
  // sketch (not saved): 11 on the pitch, 1 on the bench — one available player left out
  const sk=await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(lpState.formation,lpState.customSlots),si=lpState.sessIdx,used=new Set();
    const ok=i=>{const v=P[i].s&&P[i].s[si];return v===4||v===1;};
    sl.forEach(x=>{const i=P.findIndex((pp,ii)=>!used.has(ii)&&ok(ii)&&pp.pos===x.lbl);if(i>=0){lpState.slots[x.id]=i;used.add(i);}});
    sl.forEach(x=>{if(lpState.slots[x.id]==null){const i=P.findIndex((pp,ii)=>!used.has(ii)&&ok(ii)&&pp.pos!=='TW');if(i>=0){lpState.slots[x.id]=i;used.add(i);}}});
    const rest=P.map((pp,ii)=>ii).filter(ii=>!used.has(ii)&&ok(ii));lpState.subs=[rest[0]];lpRender();
    return {names:[...used,rest[0]].map(i=>P[i].name).sort(),left:P[rest[1]]?P[rest[1]].name:null};});
  // within a line: free players before the placed ones
  const ord=await p.evaluate(()=>{const out=[];let cur='';[...document.querySelectorAll('#lp-kader-list > *')].forEach(e=>{if(e.tagName==='H4'){cur=e.textContent.split(' ')[0];return;}out.push([cur,/⚽|SUB/.test(e.textContent)?1:0]);});
    return out.every((x,i)=>i===0||out[i-1][0]!==x[0]||out[i-1][1]<=x[1]);});
  ok(ord,tag+'in jeder Linie erst die Freien, dann die Aufgestellten');
  await p.click('#lp-gsqbtn .lp-gsq-btn');await p.waitForTimeout(600);
  const sel=await p.evaluate(()=>{const P=cd().players;return [...document.querySelectorAll('#sqList input:checked')].map(x=>P[+x.dataset.pi].name).sort();});
  ok(JSON.stringify(sel)===JSON.stringify(sk.names),tag+'„Kader festlegen“: genau Feld und Bank vorausgewählt, ungespeichert ('+sel.length+')');
  await p.evaluate(()=>{sqPublish();});await p.waitForTimeout(700);await p.evaluate(()=>{try{closeM('moSqWa');}catch(e){}});await p.waitForTimeout(300);
  k=await card(p);
  ok(new RegExp('Kader · '+sk.names.length+' Spieler').test(k.t)&&k.btns.includes('Kader ändern'),tag+'nach dem Veröffentlichen: „'+k.t.slice(0,40)+'…“, „Kader ändern“');
  const nik=await p.evaluate(n=>{const r=[...document.querySelectorAll('#lp-kader-list > div')].find(x=>x.textContent.includes(n.split(' ')[0]));return !!(r&&r.classList.contains('lp-nik'));},sk.left);
  if(sk.left)ok(nik,tag+'wer verfügbar, aber nicht im Kader ist: grau „nicht im Kader“');
  ok(!(await p.evaluate(()=>{const e=document.getElementById('lp-sq-bar');return !!(e&&e.offsetParent&&/noch nicht veröffentlicht/.test(e.textContent));})),tag+'kein zweiter Hinweis „noch nicht veröffentlicht“');
  if(!ph){
    // Gegner and Matchplan open above the pitch
    for(const [lbl,id] of [['Gegner','moGegner'],['Matchplan','moMp']]){
      await p.click(`#lp-glinks button:has-text("${lbl}")`);await p.waitForTimeout(500);
      const top=await p.evaluate(id=>{const m=document.getElementById(id);if(!m||!m.classList.contains('open'))return false;const b=m.querySelector('.mob').getBoundingClientRect();const e=document.elementFromPoint(b.left+b.width/2,b.top+30);return !!(e&&m.contains(e));},id);
      ok(top,tag+`„${lbl}“ öffnet über dem Feld`);
      await p.evaluate(id=>closeM(id),id);await p.waitForTimeout(300);
    }
    // from a match card: the tool "Aufstellung"
    await p.evaluate(()=>{closeLineupPlanner();});await p.waitForTimeout(300);
    await p.evaluate(()=>{openLineupPlanner(findNextMatchIdx());});await p.waitForTimeout(500);
    ok(await p.evaluate(()=>document.getElementById('lp-htitle').innerText.trim()==='Aufstellung'),tag+'aus einer Spielkarte: Titel „Aufstellung“');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // "Nur ansehen": the Tafel, titled Spieltag
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>{CU={name:'Gast',role:'viewer',teams:['U19'],loginAt:Date.now()};hxGo('lineup');});await p.waitForTimeout(800);
  const v=await p.evaluate(()=>({t:document.getElementById('tmgr-h').textContent.trim(),lp:document.getElementById('moLineup').classList.contains('open'),cards:document.querySelectorAll('#kbBoard .kb-card').length,acts:document.querySelectorAll('#kbBoard .kb-acts button').length}));
  ok(v.t==='Spieltag'&&!v.lp&&v.cards>0&&!v.acts,'„Nur ansehen“: Tafel mit Titel „Spieltag“, ohne Knöpfe');
  ok(!errs.length,'„Nur ansehen“: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
