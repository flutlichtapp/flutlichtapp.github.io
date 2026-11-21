// 1.2.146 (Artem 20.11.: „давай“): Aufstellung — "Ersatz laut Saisonkader".
// A Stammspieler of the last saved plan is not there for the match and his
// position has fewer Stammspieler left than open places → the strip names
// him and who the plan has instead ("kann auch" first, then "lernt"; who
// breaks the training rule after those who don't); one tap puts the player
// there. Gone when the places are filled, for who may not edit and without a
// plan. The player picker shows the plan's players for the position first,
// with Stamm / kann / lernt.
// node tools/tests/t_ers146.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const openLp=async p=>{await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(500);await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);};
const bar=p=>p.evaluate(()=>{const e=document.getElementById('lp-ers-bar');return {on:!!(e&&e.offsetParent&&e.style.display!=='none'),t:e?[...e.querySelectorAll('.lp-ers-g')].map(g=>[...g.children].map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(' ')).join(' | '):'',h:e&&e.querySelector('.lp-ers-h')?e.querySelector('.lp-ers-h').textContent:'',picks:e?[...e.querySelectorAll('.lp-ers-pick')].map(b=>b.textContent.replace(/\s+/g,' ').trim()):[]};});
const ivs=p=>p.evaluate(()=>{const P=cd().players;return fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV').map(x=>{const r=lpState.slots[x.id];return r==null?'-':P[r].name.split(' ')[0];});});
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // Ali (Stamm IV) declined, Luca (Stamm LF) excused for So 08.11.
  await p.evaluate(()=>{const D=cd(),P=D.players,ix=n=>P.findIndex(x=>x.name.startsWith(n)),si=D.sessions.findIndex(s=>s.date==='So 08.11');P[ix('Ali')].s[si]=0;P[ix('Luca')].s[si]=2;});
  await openLp(p);
  ok(!(await bar(p)).on,tag+'ohne gespeicherten Saisonkader kein Hinweis');
  await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
  // the plan: everyone on his profile position; IV with Ali + Jonas (8er), LF Luca + Elias (lernt)
  await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
  await p.evaluate(()=>{const P=cd().players,sl=fmtSlots(slpState.formation,slpState.customSlots),ix=n=>P.findIndex(x=>x.name.startsWith(n));slpState.slots={};
    const by=l=>P.map((x,i)=>({x,i})).filter(o=>o.x.pos===l).map(o=>o.i);const seen={};
    sl.forEach(x=>{const all=by(x.lbl),n=sl.filter(y=>y.lbl===x.lbl).length,j=seen[x.lbl]=(seen[x.lbl]??-1)+1;slpState.slots[x.id]=n>1?all.filter((_,q)=>q%n===j):all.slice();});
    const iv=sl.filter(x=>x.lbl==='IV'),lf=sl.find(x=>x.lbl==='LF');
    slpState.slots[iv.find(x=>slpState.slots[x.id].includes(ix('Ali'))).id].push(ix('Jonas'));
    slpState.slots[lf.id]=[ix('Luca'),ix('Elias')];slpRender();slpSetLv(lf.id,ix('Elias'),'l');slpSave();});
  await p.evaluate(()=>closeSeasonLineup());await p.waitForTimeout(300);
  await openLp(p);
  let r=await bar(p);
  ok(r.on&&r.h==='Ersatz laut Saisonkader',tag+'Hinweis „Ersatz laut Saisonkader“ sichtbar');
  ok(/IV Ali nicht dabei →/.test(r.t)&&r.picks[0]==='Jonas kann auch',tag+'IV: Ali nicht dabei → Jonas (kann auch) ('+r.picks.join(' | ')+')');
  ok(/LF Luca nicht dabei →/.test(r.t)&&r.picks.includes('Elias lernt'),tag+'LF: Luca nicht dabei → Elias (lernt)');
  ok(!r.picks.some(x=>/^Tom/.test(x)),tag+'der zweite Stamm-IV (Tom) ist kein „Ersatz“');
  if(ph){
    const w=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,h:Math.min(...[...document.querySelectorAll('#lp-ers-bar .lp-ers-pick')].map(b=>b.getBoundingClientRect().height))}));
    ok(w.sw<=390&&w.h>=30,tag+'Telefon: nichts ragt heraus, Knöpfe ≥30 px hoch ('+w.h+')');
  }
  // picker on an IV slot: Tom (Stamm), Jonas (kann) first, with the level; Ali not there
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV')[0];document.querySelector(`#lp-slots [data-slot="${sl.id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await p.waitForTimeout(400);
  const pk=await p.evaluate(()=>{const it=[...document.querySelectorAll('#lp-popup-picker .slp-pick-item')];return {top:it.slice(0,2).map(x=>x.querySelector('.name').textContent.trim()+'/'+((x.querySelector('.lp-lvt')||{}).textContent||'')),star:/★/.test(document.getElementById('lp-popup-picker').textContent),ali:it.some(x=>/^Ali/.test(x.querySelector('.name').textContent.trim()))};});
  ok(pk.top.join(',')==='Tom/Stamm,Jonas/kann'&&!pk.star&&!pk.ali,tag+'Spielerwahl IV: '+pk.top.join(', ')+', ohne ★, ohne Ali');
  await p.evaluate(()=>lpClosePopup());await p.waitForTimeout(200);
  // one tap: Jonas into IV, the IV line goes, LF stays
  await p.click('#lp-ers-bar .lp-ers-pick >> text=Jonas');await p.waitForTimeout(300);
  r=await bar(p);
  ok((await ivs(p)).includes('Jonas')&&!/IV /.test(r.t)&&/LF Luca/.test(r.t),tag+'Tipp auf Jonas: steht in der IV, Hinweis nur noch LF ('+(await ivs(p)).join('/')+')');
  if(!ph){
    // "Aus dem Saisonkader" fills IV; LF stays open ("lernt" never by itself) → the hint stays for LF;
    // Elias is already on 6er, so he is named with where he plays
    await p.evaluate(()=>{lpState.slots={};lpState.subs=[];lpRender();lpFromSeason();});await p.waitForTimeout(300);
    r=await bar(p);
    ok(r.on&&!/IV /.test(r.t)&&/LF Luca nicht dabei → Elias lernt · spielt 6er/.test(r.t),tag+'nach „Aus dem Saisonkader“: nur noch LF → Elias (lernt · spielt 6er) ['+r.t+']');
    // a place held by someone who is not there: the pick takes exactly that place
    const held=await p.evaluate(()=>{const P=cd().players,ix=n=>P.findIndex(x=>x.name.startsWith(n)),iv=fmtSlots(lpState.formation,lpState.customSlots).filter(x=>x.lbl==='IV');
      lpState.slots={};lpState.subs=[];lpState.slots[iv[0].id]=ix('Ali');lpState.slots[iv[1].id]=ix('Tom');lpRender();return iv[0].id;});
    r=await bar(p);
    ok(/IV Ali nicht dabei/.test(r.t),tag+'Ali steht abgesagt in der IV: Hinweis da');
    await p.click('#lp-ers-bar .lp-ers-pick >> text=Jonas');await p.waitForTimeout(300);
    const at=await p.evaluate(id=>{const P=cd().players;return P[lpState.slots[id]].name.split(' ')[0];},held);
    ok(at==='Jonas'&&(await ivs(p)).join('/')==='Jonas/Tom',tag+'Jonas nimmt genau Alis Platz ('+(await ivs(p)).join('/')+')');
    // enough Stammspieler left: no IV line
    await p.evaluate(()=>{const P=cd().players,ix=n=>P.findIndex(x=>x.name.startsWith(n));lpState.slots={};lpState.subs=[];P[ix('Jonas')].slv={IV:'s'};lpRender();});
    r=await bar(p);
    ok(!/IV /.test(r.t),tag+'Jonas auch Stamm IV: genug Stammspieler, keine IV-Zeile');
    await p.evaluate(()=>{const P=cd().players,ix=n=>P.findIndex(x=>x.name.startsWith(n));delete P[ix('Jonas')].slv;lpRender();});
    // nobody in the plan for LF
    await p.evaluate(()=>{const D=cd(),P=D.players,ix=n=>P.findIndex(x=>x.name.startsWith(n)),si=D.sessions.findIndex(s=>s.date==='So 08.11');P[ix('Elias')].s[si]=0;lpRender();});
    r=await bar(p);
    ok(/LF Luca nicht dabei – im Plan kein Ersatz/.test(r.t),tag+'LF ohne Ersatz im Plan: „im Plan kein Ersatz“');
    // the training rule: who breaks it comes after a "kann auch" who keeps it
    const order=await p.evaluate(()=>{const D=cd(),P=D.players,ix=n=>P.findIndex(x=>x.name.startsWith(n));const plan=_slpLatestPlan();
      const psl=fmtSlots(plan.formation,plan.customSlots);const iv=psl.find(x=>x.lbl==='IV'&&(plan.slots[x.id]||[]).includes(ix('Ali')));
      plan.slots[iv.id]=[ix('Max'),...plan.slots[iv.id]];lpRender();
      return {disc:!!lpDisciplineState(ix('Max')),picks:[...document.querySelectorAll('#lp-ers-bar .lp-ers-pick')].map(b=>b.textContent.trim().split(' ')[0])};});
    if(order.disc)ok(order.picks.slice(0,2).join(',')==='Jonas,Max',tag+'Trainingsregel: Jonas vor Max ('+order.picks.join(', ')+')');
    else ok(true,tag+'(Trainingsregel-Fall übersprungen: Testdaten)');
    // who may not edit sees nothing; another trainer's variant neither
    const ro=await p.evaluate(()=>{const cu=CU;CU={name:'Gast',role:'viewer',teams:['U19'],loginAt:Date.now()};lpRender();const e=document.getElementById('lp-ers-bar');const v=e.style.display;CU=cu;lpRender();return v;});
    ok(ro==='none',tag+'„Nur ansehen“: kein Hinweis');
    // Nacht: the buttons are dark too
    const dk=await p.evaluate(()=>{document.body.classList.add('hxk-dk');lpRender();const b=document.querySelector('#lp-ers-bar .lp-ers-pick');window.__bg=getComputedStyle(b).backgroundColor;const bg=getComputedStyle(b).backgroundColor;document.body.classList.remove('hxk-dk');lpRender();const m=(bg.match(/srgb ([\d.]+) ([\d.]+) ([\d.]+)/)||[]).slice(1).map(x=>+x*255);const n=m.length?m:(bg.match(/[\d.]+/g)||[]).map(Number);return n[0]*.299+n[1]*.587+n[2]*.114;});
    ok(dk<110,tag+'„Nacht“: Knöpfe dunkel ('+Math.round(dk)+', '+(await p.evaluate(()=>window.__bg))+')');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
