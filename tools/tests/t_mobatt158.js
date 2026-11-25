// 1.2.158 (Artem 25.11.: „на моб версии отображаются игроки в посещаемости,
// которых уже нет“): the phone's Anwesenheit lists, per session, only who
// belongs to the team on that day — like the count above it and the PC table.
// Not after "nicht mehr dabei", not in a pause, not before he joined;
// earlier sessions keep him, with the "ehemalig" label.
// node tools/tests/t_mobatt158.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage();await p.clock.install({time:NOW});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML);await p.waitForTimeout(700);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  // NOW: Sa 07.11.2026. Player 3 left on 15.10., player 4 pauses 01.11.–30.11.,
  // player 6 joined on 01.10.
  const info=await p.evaluate(()=>{
    const D=cd(),pl=D.players,se=UI.currentSeason;
    pl[3].gone='2026-10-15';
    pl[4].pauses=[{f:'2026-11-01',t:'2026-11-30'}];
    pl[6].joinDate='2026-10-01';
    const sk=s=>_dbSortKey(s.date,se);
    const idx=f=>D.sessions.findIndex(f);
    const after=idx(s=>s&&s.date&&sk(s)>=20261102&&sk(s)<=20261106);       // after he left, in the pause
    const before=idx(s=>s&&s.date&&sk(s)>=20261005&&sk(s)<20261015);       // before he left, after the join
    const early=idx(s=>s&&s.date&&sk(s)<20261001);                          // before player 6 joined
    hxGo('table');render();
    return {after,before,early,names:[3,4,6].map(i=>getDisplayName(pl[i])),total:pl.filter(Boolean).length};
  });
  ok(info.after>=0&&info.before>=0&&info.early>=0,'Termine gefunden: '+[info.after,info.before,info.early].join(', '));
  const look=async si=>p.evaluate(si=>{
    maSelectSession(si);
    const cards=[...document.querySelectorAll('#maList .ma-card')];
    const names=cards.map(c=>c.querySelector('.ma-card-name').innerText.replace(/\s+/g,' ').trim());
    const texts=cards.map(c=>c.querySelector('.ma-card-info').innerText.replace(/\s+/g,' ').trim());
    const c=_hxCounts(cd(),si,UI.currentSeason);
    const vis=!!document.getElementById('maList').offsetParent;
    return {n:cards.length,names,texts,cnt:c.total+c.nk+c.tr,vis,head:(document.querySelector('#maSessHead .hxl-att')||{}).innerText||''};
  },si);
  const has=(r,nm)=>r.names.some(x=>x===nm||x.startsWith(nm+' ')||x.startsWith(nm+'('));
  // after he left, during the pause
  let r=await look(info.after);
  ok(r.vis,'Liste auf dem Handy sichtbar');
  ok(!has(r,info.names[0]),'nach „nicht mehr dabei“: '+info.names[0]+' nicht in der Liste');
  ok(!has(r,info.names[1]),'in der Pause: '+info.names[1]+' nicht in der Liste');
  ok(has(r,info.names[2]),'nach seinem Beginn: '+info.names[2]+' in der Liste');
  ok(r.n===r.cnt&&r.n===info.total-2,'Liste = Zählung darüber („von …“): '+r.n+' / '+r.cnt+' – '+r.head.replace(/\s+/g,' ').slice(0,40));
  // before he left
  r=await look(info.before);
  const tx=(r,nm)=>{const i=r.names.findIndex(x=>x.startsWith(nm));return i<0?'':r.texts[i];};
  const g=tx(r,info.names[0]);
  ok(!!g,'vor seinem Abschied: '+info.names[0]+' in der Liste (seine Geschichte bleibt)');
  ok(/ehemalig/.test(g),'… mit „ehemalig“ – '+g);
  const fit=await p.evaluate(()=>{const c=[...document.querySelectorAll('#maList .ma-card')].find(c=>/ehemalig/.test(c.innerText));
    const ch=c&&c.querySelector('.pst-chip'),nm=c&&c.querySelector('.ma-card-name');
    return ch&&nm?{chipIn:ch.closest('.ma-card-meta')!==null,cut:nm.scrollWidth>nm.clientWidth+1}:null;});
  ok(fit&&fit.chipIn&&!fit.cut,'„ehemalig“ in der Zeile mit Nummer und Position – der Name wird nicht abgeschnitten');
  ok(has(r,info.names[1])&&/Pause/.test(tx(r,info.names[1])),'vor der Pause: '+info.names[1]+' in der Liste, Hinweis „Pause“ (heute)');
  ok(r.n===r.cnt,'Liste = Zählung: '+r.n+' / '+r.cnt);
  // before player 6 joined
  r=await look(info.early);
  ok(!has(r,info.names[2]),'vor seinem Beginn: '+info.names[2]+' nicht in der Liste');
  ok(r.n===r.cnt,'Liste = Zählung: '+r.n+' / '+r.cnt);
  // the status buttons still work on a listed player
  const set=await p.evaluate(si=>{
    const D=cd();const pi=D.players.findIndex((q,i)=>q&&i===6);
    const card=[...document.querySelectorAll('#maList .ma-card')].find(c=>c.querySelector('.ma-card-info').getAttribute('onclick').includes('('+pi+','));
    return !!card;
  },info.early);
  ok(!set,'Karte von Spieler 6 fehlt auch im Klick-Ziel');
  r=await look(info.after);
  const tap=await p.evaluate(si=>{
    const card=document.querySelector('#maList .ma-card');const btn=card&&[...card.querySelectorAll('.ma-btn')].find(x=>!x.disabled);
    if(!btn)return null;btn.click();return true;
  },info.after);
  ok(tap===true&&!errs.length,'Status setzen funktioniert, keine Fehler '+errs.join(' | '));
  await c.close();
  // PC: the table is unchanged (former players folded below)
  const c2=await b.newContext({viewport:{width:1536,height:864}});const p2=await c2.newPage();await p2.clock.install({time:NOW});
  await p2.goto('file://'+HTML);await p2.waitForTimeout(700);await p2.evaluate(`(${setupTrainer.toString()})({})`);
  const pc=await p2.evaluate(()=>{const pl=cd().players;pl[3].gone='2026-10-15';hxGo('table');render();
    const rows=[...document.querySelectorAll('#tBody tr.mx-former')].length;
    const h=!!document.querySelector('#tBody .mx-former-h');return {rows,h,mob:!!document.getElementById('maList').offsetParent};});
  ok(pc.h&&pc.rows===0&&!pc.mob,'PC: Tabelle wie bisher – „Nicht mehr dabei“ zugeklappt unten, keine Handy-Liste');
  await c2.close();
  await b.close();
  console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
