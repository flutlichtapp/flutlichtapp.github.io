// 1.2.141 (Artem 18./19.11.: „согласен“, „да, выкладывать“): Aufstellung as
// the Tafel — on top the same game card (match days, what/when, counts),
// save and variants in it; the pitch and the players as cards; players with
// status ("offen"), who cannot play listed at the end instead of missing.
// 1.2.146: from 1280 px wide "Nicht dabei" stands in the column left of the
// pitch, narrower at the end of the player list.
// node tools/tests/t_aufst141.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=()=>{const D=cd(),i=D.sessions.findIndex(s=>s.date==='So 08.11');const P=D.players;
  const pl=n=>P.find(p=>p.name.startsWith(n));
  pl('Max').s[i]=0;pl('Leon').s[i]=2;const b=pl('Ben');b.s[i]=3;b.ay[i]=0;};
const st=p=>p.evaluate(()=>{const lp=document.getElementById('moLineup'),D=cd();const vis=e=>!!(e&&e.offsetParent);
  const top=e=>e?Math.round(e.getBoundingClientRect().top):-1;
  return {open:lp.classList.contains('open'),via:lp.classList.contains('hx-vianav'),si:lpState.sessIdx,date:D.sessions[lpState.sessIdx].date,
    title:(document.getElementById('lp-gtitle')||{}).textContent||'',meta:(document.getElementById('lp-context-info')||{}).textContent||'',
    days:[...document.querySelectorAll('#lp-gdays .kb-day')].filter(vis).map(x=>x.textContent.replace(/\s+/g,'')+(x.classList.contains('on')?'*':'')),
    leg:(document.getElementById('lp-gleg')||{}).textContent||'',
    saveIn:!!document.querySelector('#lp-gcard #lp-save-btn')&&vis(document.getElementById('lp-save-btn')),
    toolsIn:!!document.querySelector('.lp-pcard .lp-ptools #lp-fmt-btns')&&vis(document.getElementById('lp-fmt-btns')),
    plh:(document.querySelector('.lp-pl-h')||{}).textContent||'',
    open1:[...document.querySelectorAll('#lp-kader-list .lp-open-t')].map(x=>x.closest('div').textContent.replace(/\s+/g,' ').trim()),
    out:[...document.querySelectorAll('#lp-kader-list .lp-out,#lp-out-box .lp-out')].map(x=>x.textContent.replace(/\s+/g,' ').trim()),
    outWhere:document.querySelector('#lp-out-box .lp-out')?'Spalte':document.querySelector('#lp-kader-list .lp-out')?'Liste':'',
    outDiv:document.querySelectorAll('#lp-kader-list > div .lp-out-st').length,
    emoji:/[💾🗑🔄🧑🚌🏠]/u.test((document.querySelector('#moLineup .lp-gcard')||{}).textContent+(document.querySelector('#moLineup .lp-sidebar')||{}).textContent+(document.querySelector('#moLineup .lp-pcard')||{}).textContent),
    stats:vis(document.querySelector('#moLineup .lp-statsbar')),
    nav:[...document.querySelectorAll('#hxNav .hx-item.on')].map(x=>x.textContent.trim()).join(),
    cardTop:top(document.getElementById('lp-gcard')),bodyTop:top(document.querySelector('#moLineup .lp-body')),
    pitchH:Math.round((document.querySelector('#moLineup .lp-pitch-col svg')||document.querySelector('#moLineup .lp-pitch-col')).getBoundingClientRect().height)};});
(async()=>{const b=await chromium.launch();
 for(const vp of [[1536,864],[1366,700],[390,844]]){
  const ph=vp[0]<768,tag=vp.join('×')+': ';
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);await p.evaluate(`(${prep.toString()})()`);
  await p.evaluate(()=>{localStorage.setItem('fcf_st_tab','kader');hxGo('lineup');});await p.waitForTimeout(600);
  const tafel=await p.evaluate(()=>({ttl:(document.querySelector('#kbBoard .kb-ttl')||{}).textContent,days:[...document.querySelectorAll('#kbBoard .kb-day')].map(x=>x.textContent.replace(/\s+/g,'')+(x.classList.contains('on')?'*':''))}));
  await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(900);
  let r=await st(p);
  ok(r.open&&r.title==='Spiel gegen SG Heidekamp'&&/^So 8\.11\. · 13:00/.test(r.meta),tag+'Karte des Spiels: „'+r.title+'“, „'+r.meta+'“');
  ok(r.title===tafel.ttl&&JSON.stringify(r.days)===JSON.stringify(tafel.days),tag+'dieselbe Kopfkarte wie auf der Tafel ('+r.days.join(' ')+')');
  ok(/verfügbar/.test(r.leg)&&/abgesagt/.test(r.leg)&&/entschuldigt/.test(r.leg)&&/offen/.test(r.leg),tag+'Zahlen: verfügbar, entschuldigt, abgesagt, offen');
  ok(r.saveIn&&r.toolsIn,tag+'Speichern in der Karte des Spiels, Schema in der Karte des Felds');
  ok(/0 gesetzt · \d+ verfügbar/.test(r.plh.replace(/\s+/g,' '))&&!r.stats,tag+'Spieler: „0 gesetzt · n verfügbar“ statt der Kacheln ('+r.plh.replace(/\s+/g,' ').trim()+')');
  ok(r.open1.length===1&&/Ben/.test(r.open1[0]),tag+'ohne Antwort: „offen“ beim Spieler');
  ok(r.out.length===2&&r.out.some(x=>/Max.*Abgesagt/.test(x))&&r.out.some(x=>/Leon.*Entschuldigt/.test(x))&&!r.outDiv&&r.outWhere===(vp[0]>=1280?'Spalte':'Liste'),tag+'„Nicht dabei“: Abgesagt und Entschuldigt sichtbar, nicht als normale Zeile (in der '+r.outWhere+')');
  ok(!r.emoji,tag+'keine Emojis in den Überschriften und Knöpfen');
  if(!ph)ok(r.pitchH>=(vp[1]<760?380:520),tag+'Feld hoch genug ('+r.pitchH+' px)');
  // another match from the card
  if(!ph){
    await p.click('#lp-gdays .kb-day:nth-child(2)');await p.waitForTimeout(900);
    r=await st(p);
    ok(r.open&&r.via&&r.date==='So 15.11'&&r.days[1]&&r.days[1].endsWith('*')&&r.nav==='Spieltag',tag+'andere Spieltage in der Karte → Aufstellung dieses Spiels, Navigation bleibt „Spieltag“');
    await p.evaluate(()=>{const f=FORMATIONS[lpState.formation];lpState.slots[f[0].id]=0;lpRender();});
    await p.click('#lp-save-btn');await p.waitForTimeout(500);
    const sv=await p.evaluate(()=>({t:document.getElementById('lp-saves-list').textContent,n:document.getElementById('lp-st-placed').textContent,lu:!!(G.matchLineups&&Object.keys(G.matchLineups).length)}));
    ok(/Gespeichert/.test(sv.t)&&sv.n==='1'&&sv.lu,tag+'Speichern wie bisher ('+sv.t.trim()+')');
    await p.evaluate(()=>stGo('kader',1));await p.waitForTimeout(700);
    const t2=await p.evaluate(()=>(document.querySelector('#kbBoard .kb-ttl')||{}).textContent);
    ok(t2==='Spiel gegen RW Seefeld',tag+'zurück zur Tafel: dasselbe Spiel');
    // unsaved change: switching the match asks first (closeLineupPlanner) — "Abbrechen" keeps it
    await p.evaluate(()=>stGo('aufstellung',1));await p.waitForTimeout(800);
    await p.evaluate(()=>{const f=FORMATIONS[lpState.formation];lpState.slots[f[1].id]=1;lpState.dirty=true;if(typeof _lpMarkDirty==='function')_lpMarkDirty();lpRender();window.confirm=()=>false;});
    await p.click('#lp-gdays .kb-day:nth-child(1)').catch(()=>{});await p.waitForTimeout(700);
    r=await st(p);
    ok(r.open,tag+'ungespeichert und „Abbrechen“: Aufstellung bleibt offen');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
