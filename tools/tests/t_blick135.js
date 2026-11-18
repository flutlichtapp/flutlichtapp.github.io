// 1.2.135: „Im Blick behalten“ nur noch tun und entscheiden. Artem 18.11. hatte 18 Zeilen,
// 12 davon unentschuldigt / Belastung +x % / Spielzeit → „да“ auf den Vorschlag:
// Hinschauen steht in Statistik → „Wer braucht Aufmerksamkeit?“ (in Im Blick eine Zeile),
// kein Belastungssprung, solange selten bewertet wird, und ein automatisches „M“, das
// zu N wurde, zählt bei der Spielzeit nicht als „war da“ (außer er war in der Woche im Training).
// node tools/tests/t_blick135.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const prep=()=>{
  const D=cd(),S=D.sessions,P=D.players;
  const si=d=>S.findIndex(s=>s.date===d);const pl=n=>P.find(p=>p.name.startsWith(n));
  // Tom: two unexcused trainings in the last four weeks, not in a row
  const tom=pl('Tom');tom.s[si('Di 20.10')]=0;tom.s[si('Fr 30.10')]=0;
  // Ben: rated once the week before, twice this week → "+x %" in the old version
  const ben=pl('Ben');ben.rpe=ben.rpe||[];[['Di 27.10',4],['Di 03.11',7],['Fr 06.11',7]].forEach(([d,v])=>{const i=si(d);ben.s[i]=1;ben.rpe[i]=v;});
  // Spielberichte for the last three matches; Leon and Mats not in the squad (N from the rule's M)
  const all=P.map(p=>p.name),out=['Leon','Mats'].map(n=>pl(n).name);
  const st=all.filter(n=>!out.includes(n)).slice(0,11);
  ['So 18.10','So 25.10','So 01.11'].forEach(d=>{const i=si(d),s=S[i];s.rep={f:2,a:1,st,sub:[],t:Date.now()-864e5,by:'Admin'};
    out.forEach(n=>{const p=pl(n);p.s[i]=5;p.ay=p.ay||[];p.ay[i]=1;});
    st.forEach(n=>{const p=P.find(x=>x.name===n);if(p.s[i]!==1)p.s[i]=1;});});
  // Mats did not train in those weeks (Leon did): his N is no "available"
  const mats=pl('Mats');['Di 13.10','Fr 16.10','Di 20.10','Fr 23.10','Di 27.10','Fr 30.10'].forEach(d=>{mats.s[si(d)]=2;});
};
const open=async(b,cu)=>{const c=await b.newContext({viewport:{width:1536,height:864}});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(`(${prep.toString()})()`);
  if(cu)await p.evaluate(cu=>{CU=Object.assign({loginAt:Date.now()},cu);},cu);
  await p.evaluate(()=>{document.getElementById('homeOverlay').style.display='';hxRender();});await p.waitForTimeout(300);
  return {p,c,errs};};
(async()=>{const b=await chromium.launch();
 {const {p,c,errs}=await open(b);
  let r=await p.evaluate(()=>(window._hxFlagsList||[]).map(f=>({who:f.who,what:f.what,lv:f.lv,on:f.on})));
  ok(!r.some(f=>/unentschuldigt gefehlt|zur Vorwoche|Min\. gespielt/.test(f.what)),'Im Blick: keine Zeilen „unentschuldigt“, „Belastung +x %“, „… Min. gespielt“');
  const sum=r.find(f=>f.who==='Wer braucht Aufmerksamkeit?');
  ok(!!sum&&/^\d+ Spieler · in der Statistik$/.test(sum.what)&&sum.lv===3,'eine Zeile „Wer braucht Aufmerksamkeit? · n Spieler · in der Statistik“'+(sum?' ('+sum.what+')':''));
  const nIm=sum?+sum.what.split(' ')[0]:-1;
  await p.evaluate(on=>{new Function(on)();},sum?sum.on:'');await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const c=document.querySelector('#moDashboard .wba-card');const rows=[...(c?c.querySelectorAll('.wba-list > *'):[])];
    const names=rows.map(x=>(x.querySelector('b')||{}).textContent||'');
    return {open:document.getElementById('moDashboard').classList.contains('open'),n:names.reduce((a,t)=>a+t.split(', ').filter(Boolean).length,0),
      txt:c?c.textContent:'',warn:!!document.querySelector('#moDashboard .load-warn,#moDashboard .load-quiet'),legend:(document.querySelector('#moDashboard .pt-legend')||{}).textContent||''};});
  ok(r.open&&r.n===nIm,'Antippen öffnet die Statistik; dort genauso viele Spieler ('+r.n+'/'+nIm+')');
  ok(/Tom[^]*\d× unentschuldigt gefehlt in den letzten 4 Wochen/.test(r.txt),"Statistik: „n× unentschuldigt gefehlt in den letzten 4 Wochen“ (Tom)");
  ok(/Leon[^]*In den letzten 3 Spielen, für die er da war, zusammen 0 von 270 Min\./.test(r.txt),'Statistik: Leon (im Training, nicht im Kader) – wenig Spielzeit');
  ok(!/Mats[^·]*In den letzten 3 Spielen/.test(r.txt.replace(/Leon[^]*?Min\. gespielt/,'')),'Mats (automatisches M → N, nicht im Training) zählt nicht als „war da“');
  ok(!r.warn,'Statistik → Belastung: kein „Belastungssprung“ und kein „unter dem Median“');
  ok(/obwohl er selbst zugesagt hatte oder in der Woche davor im Training war/.test(r.legend),'Spielzeit-Erklärung sagt, wann „nicht im Kader“ zählt');
  r=await p.evaluate(()=>{const t=computePlayTime(cd(),UI.currentSeason).rows;const f=n=>t.find(x=>x.p.name.startsWith(n));return {leon:f('Leon'),mats:f('Mats')};});
  ok(r.leon&&r.leon.nk===3&&r.leon.mins===0&&!r.mats,'Spielzeit: Leon 3× nicht im Kader gezählt, Mats gar nicht');
  await p.evaluate(()=>hxGo('week'));await p.waitForTimeout(500);
  r=await p.evaluate(()=>{const t=document.getElementById('moWeekReport').textContent;return {pv:/zur Vorwoche/.test(t),pct:[...document.querySelectorAll('#moWeekReport .wr2-lch')].some(x=>x.textContent.trim()),hot:!!document.querySelector('#moWeekReport .wr2-lrow .hot')};});
  ok(!r.pv&&!r.pct&&!r.hot,'Wochenbericht: keine „+x %“ bei der Belastung, nichts rot markiert');
  ok(!errs.length,'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // "Nur ansehen" does not see the Statistik card, so no row that leads there
 {const {p,c,errs}=await open(b,{name:'Gast',role:'viewer',teams:['U19']});
  const r=await p.evaluate(()=>(window._hxFlagsList||[]).some(f=>f.who==='Wer braucht Aufmerksamkeit?'));
  ok(!r,'„Nur ansehen“: keine Zeile „Wer braucht Aufmerksamkeit?“');
  ok(!errs.length,'„Nur ansehen“: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
