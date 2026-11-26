// 1.2.159 (Artem 26.11.: the players without a phone number have no birthdate
// either → not in the group link's list, cannot get in): Im Blick says so for
// whoever is in the team, has no birthdate and never opened Flutlicht; the
// profile's Flutlicht section says "Nicht im Gruppen-Link – Geburtsdatum fehlt".
// node tools/tests/t_gebdat159.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const flags=p=>p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';window._hxFlagsAll=true;hxRender();
  return (window._hxFlagsList||[]).map(f=>({who:f.who,what:f.what,lv:f.lv,on:f.on}));});
(async()=>{
  const b=await chromium.launch();
  for(const vp of [{w:1536,h:864},{w:390,h:844,m:true}]){
    const c=await b.newContext({viewport:{width:vp.w,height:vp.h},isMobile:!!vp.m,hasTouch:!!vp.m});
    const p=await c.newPage();await p.clock.install({time:NOW});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file://'+HTML);await p.waitForTimeout(700);
    await p.evaluate(`(${setupTrainer.toString()})({})`);
    const tag=vp.w+': ';
    // baseline: everybody has a birthdate
    let f=await flags(p);
    ok(!f.some(x=>/Geburtsdatum fehlt/.test(x.what)),tag+'alle mit Geburtsdatum: keine Zeile');
    const nm=await p.evaluate(()=>{
      const pl=cd().players,seen={t:Date.now()-2*864e5};
      pl.forEach(q=>{if(q)q.seen=seen;});
      delete pl[2].birthdate;delete pl[2].seen;            // cannot get in
      delete pl[3].birthdate;                               // no birthdate, but opened via his own link
      delete pl[4].birthdate;delete pl[4].seen;pl[4].gone='2026-10-15';         // gone
      delete pl[5].birthdate;delete pl[5].seen;pl[5].pauses=[{f:'2026-11-01',t:''}]; // pause
      delete pl[7].birthdate;delete pl[7].seen;pl[7].trial='2026-11-03';       // Probetraining
      pl[8].birthdate='';delete pl[8].seen;pl[9].birthdate='2008-05-12';delete pl[9].seen; // empty string / with birthdate
      return [2,3,4,5,7,8,9].map(i=>getDisplayName(pl[i]));
    });
    f=await flags(p);
    const rows=f.filter(x=>/Geburtsdatum fehlt/.test(x.what));
    ok(rows.length===2,tag+'zwei Zeilen – '+rows.map(x=>x.who+': '+x.what).join(' | '));
    ok(rows.some(x=>x.who===nm[0]||x.who.startsWith(nm[0]))&&rows.some(x=>x.who===nm[5]||x.who.startsWith(nm[5])),tag+'für '+nm[0]+' und '+nm[5]+' (ohne Geburtsdatum, nie geöffnet)');
    ok(rows.every(x=>/kann sich nicht anmelden – Geburtsdatum fehlt/.test(x.what)),tag+'Text „kann sich nicht anmelden – Geburtsdatum fehlt“');
    ok(!rows.some(x=>[nm[1],nm[2],nm[3],nm[4],nm[6]].some(n=>x.who.startsWith(n))),tag+'nicht für: geöffnet über eigenen Link, nicht mehr dabei, Pause, Probetraining, mit Geburtsdatum');
    ok(rows.every(x=>x.lv===2),tag+'Wichtigkeit 2 (zu entscheiden/tun, ohne Frist)');
    // tap → his profile, edit mode, birthdate field in view
    const r=rows.find(x=>x.who.startsWith(nm[0]));
    const op=await p.evaluate(on=>{eval(on);return new Promise(res=>setTimeout(()=>{
      const i=document.getElementById('pe-birthdate'),ed=document.getElementById('ps-edit');
      const rc=i?i.getBoundingClientRect():null;
      res({ed:!!(ed&&ed.offsetParent),vis:!!(rc&&rc.width&&rc.top>=0&&rc.bottom<=innerHeight),
        note:(document.querySelector('#ps-app .ps-app-nobd')||{}).innerText||''});},400));},r.on);
    ok(op.ed&&op.vis,tag+'Antippen: sein Profil zum Bearbeiten, Feld Geburtsdatum im Bild');
    ok(op.note==='Nicht im Gruppen-Link – Geburtsdatum fehlt. Eintragen oder ihm seinen Link schicken.',tag+'Profil: „'+op.note+'“');
    const other=await p.evaluate(()=>{openPlayerStats(9);return (document.querySelector('#ps-app .ps-app-nobd')||{}).innerText||'';});
    ok(other==='',tag+'Profil mit Geburtsdatum: kein Hinweis');
    // birthdate entered → the row is gone
    f=await p.evaluate(()=>{cd().players[2].birthdate='2008-04-02';cd().players[8].birthdate='2008-06-03';return 0;}).then(()=>flags(p));
    ok(!f.some(x=>/Geburtsdatum fehlt/.test(x.what)),tag+'Geburtsdatum eingetragen: Zeile weg');
    // three or more → one row
    f=await p.evaluate(()=>{const pl=cd().players;[10,11,12].forEach(i=>{delete pl[i].birthdate;delete pl[i].seen;});return 0;}).then(()=>flags(p));
    const one=f.filter(x=>/Geburtsdatum fehlt/.test(x.what));
    ok(one.length===1&&one[0].what==='3 Spieler können sich nicht anmelden – Geburtsdatum fehlt',tag+'drei: eine Zeile – „'+(one[0]||{}).what+'“');
    // the player's own view has nothing of it
    const pv=await p.evaluate(()=>{const r=_pvBuildSync('U19','2026/27');return /Geburtsdatum fehlt|kann sich nicht anmelden/.test(JSON.stringify(r));});
    ok(!pv,tag+'nichts davon in den Daten der Spieler');
    ok(!errs.length,tag+'keine Fehler '+errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
})();
