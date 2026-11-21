// 1.2.151 (Artem 21.11.):
//  • „Тебе нормально там все с дизайном панели слева от поля?“ — Claude: no.
//    The column now has three blocks with headings: „Aufstellung“ (schema,
//    Bearbeiten, Meisterschaft | Testspiel as one switch, Gegner, Matchplan),
//    „Zu klären“ (only when needed; plain words and a button that says what it
//    does instead of „Ali F ✕“ / „Max 1×U ✕“), „Nicht dabei“. No counts (they
//    repeat „Nicht dabei“ and the list), the hint only while the pitch is empty.
//    The pitch and the bench mark the Trainingsregel in amber.
//  • „что думаешь … сначала отображать стартовый состав, там где список
//    игроков?“ — „Да“: Startelf (in the order of the schema), Bank, „Noch frei“
//    by line; nothing placed — by line as before.
//  • „разница в цвете так задумано?“ — no: on the phone the pitch frame and
//    the bench had two gradients (a seam). One surface now.
//  • „на телефоне, если открыт Saisonkader, нельзя перейти на Spieltag“ — since
//    1.2.143 the rows of „Mehr“ opened their page under an open tool.
// node tools/tests/t_klar151.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=()=>{const D=cd(),P=D.players,i=D.sessions.findIndex(s=>s.date==='So 08.11');P[1].s[i]=0;P[10].s[i]=2;};
// back four, two 6er, keeper; Ali (declined) on ST; two on the bench
const fill=()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots),P=cd().players,used=new Set([1,10]);lpState.slots={};
  sl.forEach(s=>{const pos=s.pos&&s.pos[0];if(!['TW','IV','LV','RV','6er'].includes(pos))return;const i=P.findIndex((p,i)=>!used.has(i)&&p.pos===pos);if(i>=0){used.add(i);lpState.slots[s.id]=i;}});
  const st=sl.find(s=>s.pos[0]==='ST');lpState.slots[st.id]=1;
  const rest=P.map((p,i)=>i).filter(i=>!used.has(i));lpState.subs=[rest[0],rest[1]];lpRender();
  return {disc:P.map((p,i)=>i).filter(i=>lpDisciplineState(i)).map(i=>P[i].name)};};
const center=p=>p.evaluate(()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);const o=e&&e.closest('[id^=mo]');return o?o.id:'';});
(async()=>{const b=await chromium.launch();
 for(const [w,h,dk] of [[1536,864,0],[1366,657,0],[1536,864,1],[390,844,0],[1180,800,0]]){
  const ph=w<768,wide=w>=1280,tag=w+'×'+h+(dk?' Nacht':'')+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);if(dk)await p.evaluate(()=>document.body.classList.add('hxk-dk'));
  await p.evaluate(`(${prep.toString()})()`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  // ── empty pitch: the hint, no sections in the list
  const e0=await p.evaluate(()=>{const v=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none');
    return {hint:v(document.getElementById('lp-hint')),hintT:document.getElementById('lp-hint').textContent,sec:document.querySelectorAll('#lp-kader-list .lp-sec-h').length,lines:document.querySelectorAll('#lp-kader-list .lp-line-h').length};});
  if(wide)ok(e0.hint&&e0.hintT==='Position antippen, dann Spieler wählen',tag+'leeres Feld: Hinweis „'+e0.hintT+'“');
  ok(e0.sec===0&&e0.lines===4,tag+'leeres Feld: Liste nach Linien wie bisher');
  const f=await p.evaluate(`(${fill.toString()})()`);await p.waitForTimeout(150);
  // ── the column
  if(wide){
    const col=await p.evaluate(()=>{const v=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none');const n=document.getElementById('lp-notes');
      const hs=[...n.querySelectorAll('.lp-nh,.lp-todo-h,.lp-out-h')].filter(v).map(x=>x.textContent.replace(/\s+/g,' ').trim().replace(/ \d+$/,''));
      const sel=n.querySelector('#lp-fmt-btns select'),kw=n.querySelector('.lp-kind-wrap'),bt=[...kw.querySelectorAll('.lp-fmt-btn')].map(x=>x.getBoundingClientRect());
      return {hs,leg:v(document.getElementById('lp-gleg')),hint:v(document.getElementById('lp-hint')),kindTxt:[...kw.querySelectorAll('.lp-fmt-btn')].map(x=>x.innerText.trim()),
        oneRow:bt.length===2&&Math.abs(bt[0].top-bt[1].top)<1,kh:Math.round(kw.getBoundingClientRect().height),sh:sel?Math.round(sel.getBoundingClientRect().height):0,
        emoji:/[⚠️📋]/u.test(n.innerText)};});
    ok(JSON.stringify(col.hs)===JSON.stringify(['Aufstellung','Zu klären','Nicht dabei']),tag+'Spalte: drei Überschriften '+JSON.stringify(col.hs));
    ok(!col.leg,tag+'Spalte: keine Zähler mehr (stehen in „Nicht dabei“ und in der Liste)');
    ok(!col.hint,tag+'Spalte: Hinweis weg, sobald jemand aufgestellt ist');
    ok(JSON.stringify(col.kindTxt)===JSON.stringify(['Meisterschaft','Testspiel'])&&col.oneRow&&col.kh>=col.sh-2,tag+'Meisterschaft | Testspiel ein Schalter ohne „· 7“, so hoch wie das Schema ('+col.kh+'/'+col.sh+')');
    ok(!col.emoji,tag+'Spalte ohne Emoji');
  }
  // ── Zu klären
  const zk=await p.evaluate(()=>{const v=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none');
    const a=document.getElementById('lp-unavail-bar'),d=document.getElementById('lp-disc-bar');
    const rows=[...document.querySelectorAll('#lp-unavail-bar .lp-todo-r,#lp-disc-bar .lp-todo-r')].map(r=>({t:r.querySelector('.lp-todo-t').textContent.replace(/\s+/g,' ').trim(),b:r.querySelector('button').textContent.trim()}));
    const heads=[...document.querySelectorAll('.lp-todo-h')].filter(v).map(x=>x.textContent.replace(/\s+/g,' ').trim());
    const ra=a.getBoundingClientRect(),rd=d.getBoundingClientRect();
    return {rows,heads,joined:a.classList.contains('lp-todo-first')&&d.classList.contains('lp-todo-cont')&&Math.abs(ra.bottom-rd.top)<=1,old:/Nicht verfügbar:|Trainingsregel nicht erfüllt:|1×U ✕/.test(a.textContent+d.textContent)};});
  ok(zk.rows.length>=1&&zk.rows[0].t==='Ali hat abgesagt, steht aber auf dem Feld.'&&zk.rows[0].b==='Vom Feld nehmen',tag+'„Ali hat abgesagt, steht aber auf dem Feld.“ – „Vom Feld nehmen“');
  const ruleRows=zk.rows.slice(1);
  ok(ruleRows.length===f.disc.filter(n=>n!=='Ali').length&&ruleRows.every(r=>/^\S+ 1× unentschuldigt gefehlt – Trainingsregel\.$/.test(r.t)&&r.b==='Vom Feld nehmen'),tag+'Trainingsregel in Worten: '+(ruleRows[0]||{}).t);
  ok(zk.heads.length===1&&zk.heads[0]==='Zu klären '+zk.rows.length,tag+'eine Überschrift „Zu klären '+zk.rows.length+'“ ('+zk.heads.join('|')+')');
  ok(zk.joined,tag+'eine Karte, auch wenn beide Arten da sind');
  ok(!zk.old,tag+'keine Codes „F“ / „1×U ✕“ mehr');
  // ── the pitch and the bench mark the rule
  const mk=await p.evaluate(()=>{const P=cd().players;const tk=[...document.querySelectorAll('#lp-slots .lp-tk-g.filled')];
    const withRule=tk.filter(g=>g.querySelector('.lp-tk-rule')).map(g=>P[lpState.slots[g.dataset.slot]].name);
    const fill=tk.find(g=>g.querySelector('.lp-tk-rule'));return {withRule,c:fill?getComputedStyle(fill.querySelector('.lp-tk-rule')).fill:'',ali:tk.some(g=>g.classList.contains('lp-unavail')&&g.querySelector('.lp-tk-rule'))};});
  ok(JSON.stringify(mk.withRule.sort())===JSON.stringify(f.disc.filter(n=>n!=='Ali').sort())&&mk.c==='rgb(245, 184, 61)'&&!mk.ali,tag+'Feld: gelbe Marke bei der Trainingsregel ('+mk.withRule.join(', ')+'), Absage bleibt rot');
  // ── the list: Startelf in schema order, Bank, Noch frei by line
  const ls=await p.evaluate(()=>{const P=cd().players;const out=[];let sec='',line='';
    [...document.querySelectorAll('#lp-kader-list > *')].forEach(e=>{if(e.matches('.lp-sec-h')){sec=e.textContent.replace(/\s+/g,' ').trim();line='';return;}if(e.matches('.lp-line-h')){line=e.textContent.split(' ')[0];return;}
      if(e.tagName==='DIV'&&!e.querySelector('.lp-out-h'))out.push({sec:sec.split(' ')[0],line,nm:(e.children[1]||{}).textContent,xi:(e.querySelector('.lp-st-xi')||{}).textContent||'',off:(e.querySelector('.lp-out-st')||{}).textContent||''});});
    return {secs:[...document.querySelectorAll('#lp-kader-list .lp-sec-h')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),out};});
  const xi=ls.out.filter(r=>r.sec==='Startelf');
  ok(JSON.stringify(ls.secs)===JSON.stringify(['Startelf 7 von 11','Bank 2 von 7','Noch frei']),tag+'Liste: '+ls.secs.join(' | '));
  ok(JSON.stringify(xi.map(r=>r.xi))===JSON.stringify(['TW','LV','IV','RV','6er','6er','ST']),tag+'Startelf in der Reihenfolge des Schemas: '+xi.map(r=>r.xi).join(' '));
  ok(xi.some(r=>r.nm==='Ali'&&r.off==='Abgesagt'),tag+'Startelf: Ali steht drin, als „Abgesagt“ markiert');
  ok(ls.out.filter(r=>r.sec==='Bank').length===2&&ls.out.filter(r=>r.sec==='Noch').every(r=>r.line&&!r.xi),tag+'Bank 2, dann die Freien nach Linien');
  // ── the button does what it says
  await p.evaluate(()=>{const b=[...document.querySelectorAll('#lp-unavail-bar .lp-todo-b')][0];b&&b.click();});await p.waitForTimeout(200);
  const af=await p.evaluate(()=>({onPitch:Object.values(lpState.slots).includes(1),rows:document.querySelectorAll('#lp-unavail-bar .lp-todo-r').length}));
  ok(!af.onPitch&&af.rows===0,tag+'„Vom Feld nehmen“: Ali ist vom Feld');
  // a rule breaker on the bench: amber dot on the seat
  if(f.disc.length){const bd=await p.evaluate(()=>{const P=cd().players;const i=P.findIndex((x,i)=>lpDisciplineState(i));const k=Object.keys(lpState.slots).find(k=>lpState.slots[k]===i);if(k)delete lpState.slots[k];lpState.subs[2]=i;lpRender();
      const seat=document.querySelector('#lp-subs-circles [data-slot="sub_2"]');const row=[...document.querySelectorAll('#lp-disc-bar .lp-todo-r')].find(r=>r.textContent.includes(P[i].name.split(' ')[0])||r.textContent.includes(getDisplayName(P[i])));
      return {dot:!!(seat&&seat.querySelector('.lp-rule-dot')),btn:row?row.querySelector('button').textContent.trim():''};});
    ok(bd.dot&&bd.btn==='Von der Bank nehmen',tag+'Trainingsregel auf der Bank: gelber Punkt, „Von der Bank nehmen“');}
  // ── phone: one surface under pitch and bench
  if(ph){const sf=await p.evaluate(()=>{const pc=document.querySelector('#moLineup .lp-pitch-col'),sc=document.getElementById('lp-subs-col'),pm=pc.parentElement;
      const bg=e=>getComputedStyle(e).backgroundImage;return {pc:bg(pc),sc:bg(sc),pm:/gradient/.test(bg(pm))};});
    ok(sf.pm&&sf.pc==='none'&&sf.sc==='none',tag+'Telefon: eine Fläche unter Feld und Bank (keine Naht)');}
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── Saisonkader column
 {const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  const v=()=>p.evaluate(()=>{const h=document.querySelector('#moSeasonLineup .slp-dhint');return {hs:[...document.querySelectorAll('#moSeasonLineup .slp-notes :is(.lp-nh,.slp-notes-h)')].map(x=>x.textContent.trim()),
    hint:!!(h&&h.getClientRects().length&&getComputedStyle(h).display!=='none'),emoji:/📋/u.test(document.querySelector('#moSeasonLineup .slp-notes').innerText+document.getElementById('slp-status-btn').innerHTML)};});
  const s0=await v();
  ok(JSON.stringify(s0.hs)===JSON.stringify(['Kaderplan','Besetzung','Legende'])&&s0.hint&&!s0.emoji,'Saisonkader: „Kaderplan“, „Besetzung“, „Legende“; Hinweis bei leerem Plan; kein 📋');
  await p.evaluate(()=>{const s=fmtSlots(slpState.formation,slpState.customSlots)[0];slpState.slots[s.id]=[0];slpRender();});
  const s1=await v();ok(!s1.hint,'Saisonkader: Hinweis weg, sobald jemand eingeteilt ist');
  ok(!errs.length,'Saisonkader: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── phone: „Mehr“ leaves Saisonkader and Aufstellung
 for(const [from,to,want] of [['saison','Spieltag','moLineup'],['saison','Statistik','moDashboard'],['saison','Einstellungen','moSettings'],['lineup','Statistik','moDashboard'],['lineup','Wochenbericht','moWeekReport'],['lineup','Spieltag','moLineup']]){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(from==='saison'){await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));}else await p.evaluate(()=>hxGo('lineup'));
  await p.waitForTimeout(700);
  await p.click('#mn-more');await p.waitForTimeout(400);await p.locator('#ms-areas .ms-row',{hasText:to}).click();await p.waitForTimeout(900);
  const top=await center(p);const still=await p.evaluate(f=>{const id=f==='saison'?'moSeasonLineup':'moLineup';return document.getElementById(id).classList.contains('open');},from);
  ok(top===want&&(want===(from==='saison'?'moSeasonLineup':'moLineup')||!still),'Telefon: '+(from==='saison'?'Saisonkader':'Spieltag')+' → „Mehr“ → '+to+': oben '+top);
  ok(!errs.length,'Telefon '+from+' → '+to+': keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
