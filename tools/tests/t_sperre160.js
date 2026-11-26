// 1.2.160 (Artem 26.11.: „в Spieltag когда выбираешь Aus dem Saisonkader –
// попадают и дисквалифицированные игроки в состав, хотя отмечены все как
// положено“): a suspension from the Spielbericht makes the player unavailable
// in the Spieltag — not filled in by "Aus dem Saisonkader" / "Aufstellung aus
// Zusagen", not offered in the picker, "Nicht dabei · Gesperrt bis …",
// "Zu klären" when he stands, Ersatz laut Saisonkader for him. A lifted ban
// (date in the Spielbericht) makes him available again; a longer one keeps him out.
// node tools/tests/t_sperre160.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // Ali (IV) saw red at the match before So 08.11
  const info=await p.evaluate(()=>{const D=cd(),P=D.players,ix=n=>P.findIndex(x=>x.name.startsWith(n));
    const si=D.sessions.findIndex(s=>s.date==='So 08.11');const M=_sbMatches(D,UI.currentSeason);const prev=M.filter(x=>x.k<_dbSortKey('So 08.11',UI.currentSeason)).pop().i;
    const ali=ix('Ali');P[ali].cards=[];P[ali].cards[prev]='r';
    const b=sbBanAt(P[ali],si,D,UI.currentSeason);
    return {si,prev,ali,prevDate:D.sessions[prev].date,ban:b?sbBanText(b,D):'',name:getDisplayName(P[ali])};});
  ok(/^gesperrt bis 15\.11\. \(Rot am 01\.11\.\)$/.test(info.ban),tag+'Sperre laut Spielbericht: „'+info.ban+'“');
  // the plan: everyone on his profile position; IV with Ali + Tom, Jonas (8er) "kann auch" IV
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(slpState.formation,slpState.customSlots),ix=n=>P.findIndex(x=>x.name.startsWith(n));slpState.slots={};
    const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
    sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
    const iv=sl.filter(x=>x.lbl==='IV');slpState.slots[iv.find(x=>slpState.slots[x.id].includes(ix('Ali'))).id].push(ix('Jonas'));
    slpRender();slpSave();});
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  await p.evaluate(si=>{openLineupPlanner(si);},info.si);await p.waitForTimeout(900);
  const state=()=>p.evaluate(ali=>{const P=cd().players,sl=fmtSlots(lpState.formation,lpState.customSlots);
    const placed=Object.values(lpState.slots).includes(ali)||lpState.subs.includes(ali);
    const ivs=sl.filter(x=>x.lbl==='IV').map(x=>{const r=lpState.slots[x.id];return r==null?'-':P[r].name.split(' ')[0];});
    const txt=document.getElementById('moLineup').innerText.replace(/\s+/g,' ');
    const todo=[...document.querySelectorAll('#lp-unavail-bar .lp-todo-r')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
    const ers=(document.getElementById('lp-ers-bar')||{}).innerText||'';
    return {placed,ivs,txt,todo,ers:ers.replace(/\s+/g,' '),avail:+(document.getElementById('lp-st-total')||{}).textContent};},info.ali);
  // empty lineup: Ersatz laut Saisonkader names him (he is "not there")
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();});await p.waitForTimeout(300);
  let r=await state();
  ok(/IV Ali nicht dabei → .*Jonas/.test(r.ers),tag+'Ersatz laut Saisonkader: „IV Ali nicht dabei → Jonas …“ ['+r.ers.slice(0,60)+']');
  // Aus dem Saisonkader
  await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();});await p.waitForTimeout(300);
  r=await state();
  ok(!r.placed,tag+'„Aus dem Saisonkader“: '+info.name+' nicht in der Startelf und nicht auf der Bank');
  ok(r.ivs.length===2&&!r.ivs.includes('-')&&!r.ivs.includes('Ali'),tag+'IV trotzdem besetzt: '+r.ivs.join(' / '));
  ok(/Nicht dabei .*Ali.*Gesperrt bis 15\.11\./.test(r.txt),tag+'„Nicht dabei“: Ali · Gesperrt bis 15.11.');
  ok(!r.todo.length,tag+'nichts zu klären');
  // picker on an IV slot: Ali is not offered
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV')[0];lpState.slots[sl.id]=undefined;delete lpState.slots[sl.id];lpRender();
    document.querySelector(`#lp-slots [data-slot="${sl.id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await p.waitForTimeout(400);
  const pk=await p.evaluate(()=>[...document.querySelectorAll('#lp-popup-picker .slp-pick-item .name')].map(x=>x.textContent.trim()));
  ok(pk.length>0&&!pk.some(x=>/^Ali\b/.test(x)),tag+'Spielerwahl IV ohne Ali ('+pk.slice(0,4).join(', ')+' …)');
  await p.evaluate(()=>lpClosePopup());
  r=await state();
  // he already stands (placed before the ban was entered) → Zu klären, red, "Gesperrt" in the Startelf
  const before=r.avail;
  await p.evaluate(ali=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV')[0];lpState.slots[sl.id]=ali;lpRender();},info.ali);await p.waitForTimeout(300);
  r=await state();
  ok(r.todo.some(t=>/^Ali ist gesperrt bis 15\.11\. \(Rot am 01\.11\.\), steht aber auf dem Feld\. Vom Feld nehmen$/.test(t)),tag+'Zu klären: „'+(r.todo[0]||'')+'“');
  const tk=await p.evaluate(ali=>{const g=[...document.querySelectorAll('#lp-slots .lp-tk-g.lp-unavail')];return {n:g.length,st:g[0]?getComputedStyle(g[0].querySelector('.lp-tk-un')||g[0].querySelector('circle')).stroke:''};},info.ali);
  ok(tk.n===1&&/255, 90, 69/.test(tk.st),tag+'auf dem Feld rot markiert ('+tk.st+')');
  ok(/Startelf.*Ali.*Gesperrt/.test(r.txt),tag+'Liste: in der Startelf mit „Gesperrt“');
  await p.evaluate(()=>{const b=document.querySelector('#lp-unavail-bar .lp-todo-b');b&&b.click();});await p.waitForTimeout(300);
  r=await state();
  ok(!r.placed&&!r.todo.length,tag+'„Vom Feld nehmen“: Ali weg, nichts mehr zu klären');
  // the ban lifted by decision (date before the match) → available again
  await p.evaluate(([prev,ali])=>{const s=cd().sessions[prev];s.rep=s.rep||{};s.rep.ban={[cd().players[ali].name]:'2026-11-07'};lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();},[info.prev,info.ali]);await p.waitForTimeout(300);
  r=await state();
  ok(r.placed&&!/Gesperrt/.test(r.txt),tag+'Sperre aufgehoben (bis 07.11.): Ali wieder dabei');
  ok(r.avail===before+1,tag+'„verfügbar“ zählt ihn wieder ('+before+' → '+r.avail+')');
  // extended by decision → out again
  await p.evaluate(([prev,ali])=>{const s=cd().sessions[prev];s.rep.ban={[cd().players[ali].name]:'2026-12-06'};lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();},[info.prev,info.ali]);await p.waitForTimeout(300);
  r=await state();
  ok(!r.placed&&/Ali.*Gesperrt bis 06\.12\./.test(r.txt),tag+'Sperre verlängert (bis 06.12.): Ali nicht dabei, „Gesperrt bis 06.12.“');
  // Aufstellung aus Zusagen (Tafel) leaves him out too
  const kb=await p.evaluate(([si,ali])=>{closeLineupPlanner();KB.si=si;kbLineup();return Object.values(lpState.slots).includes(ali)||lpState.subs.includes(ali);},[info.si,info.ali]);
  ok(!kb,tag+'„Aufstellung aus Zusagen“: Ali nicht gesetzt');
  ok(!errs.length,tag+'keine Fehler '+errs.join(' | '));
  await c.close();
 }
 await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
