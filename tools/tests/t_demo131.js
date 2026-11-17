// 1.2.131: Begrüßung in der Demo – was Flutlicht ist, dass nichts gespeichert
// wird, und vier Stellen zum Ausprobieren (je ein Knopf). Beim Einstieg über
// ?demo, nicht bei den eigenen Links der Demo (demo=1); „Demo“ unten öffnet sie wieder.
// node tools/tests/t_demo131.js [index.html] [shotdir]
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {HTML}=require('./fx.js');const out=process.argv[3]||'';
const ROOT=path.resolve(__dirname,'..','..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=(u==='/'||u==='/index.html')?HTML:path.join(ROOT,u);
  if(!f.startsWith(ROOT)&&f!==HTML){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;const b=await chromium.launch();
 for(const vp of [{width:1440,height:900},{width:390,height:844}]){
  const ph=vp.width<500,tag=ph?'Handy: ':'';
  const c=await b.newContext({viewport:vp});await c.route(/gstatic\.com/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  const open=()=>p.evaluate(()=>{const w=document.getElementById('demoWelcome');return !!w&&w.classList.contains('open');});
  await p.goto(B+'/?demo');await p.waitForTimeout(2500);
  ok(await open(),tag+'Einstieg ?demo: Begrüßung offen');
  let r=await p.evaluate(()=>{const w=document.getElementById('demoWelcome');const c=w.querySelector('.dw-card').getBoundingClientRect();const g=w.querySelector('.dw-go').getBoundingClientRect();
    return {t:w.textContent.replace(/\s+/g,' '),n:w.querySelectorAll('[data-dw]').length,fit:c.left>=0&&c.right<=innerWidth,go:g.bottom<=innerHeight&&g.top>=0,focus:document.activeElement&&document.activeElement.className};});
  ok(/Willkommen bei Flutlicht/.test(r.t)&&/kein Konto/.test(r.t)&&/nichts wird gespeichert/.test(r.t)&&r.n===4,tag+'Text und vier „Probier mal“');
  ok(r.fit&&r.go,tag+'Karte passt, „Los geht\'s“ sichtbar');
  ok(r.focus==='dw-go',tag+'Fokus auf „Los geht\'s“');
  if(out)await p.screenshot({path:out+'/demo131_welcome'+(ph?'_phone':'')+'.png'});
  await p.keyboard.press('Escape');await p.waitForTimeout(100);
  ok(!(await open()),tag+'Esc schließt');
  await p.click('#demoBadge');await p.waitForTimeout(100);
  ok(await open(),tag+'„Demo“ unten öffnet sie wieder');
  await p.click('#demoWelcome .dw-go');await p.waitForTimeout(100);
  ok(!(await open()),tag+'„Los geht\'s“ schließt');
  // each "Probier mal"
  const tryIt=async k=>{await p.evaluate(()=>_demoWelcome());await p.waitForTimeout(80);await p.click(`#demoWelcome [data-dw="${k}"]`);await p.waitForTimeout(600);};
  await tryIt('sess');
  r=await p.evaluate(()=>({o:!(document.getElementById('demoWelcome').classList.contains('open')),i:typeof _currentSessIdx!=='undefined'?_currentSessIdx:null,nt:_demoNextTraining()}));
  ok(r.o&&r.i===r.nt&&r.nt>=0,tag+'„Wer kommt“ öffnet das nächste Training');
  await p.evaluate(()=>{try{closeM('moSession');}catch(e){}try{closeSessModal&&closeSessModal();}catch(e){}});await p.waitForTimeout(200);
  await tryIt('plan');
  r=await p.evaluate(()=>({o:document.getElementById('tplOverlay').classList.contains('open'),n:TPL.plan&&TPL.plan.blocks.length,si:TPL.si,nt:_demoNextTraining()}));
  ok(r.o&&r.n===5&&r.si===r.nt,tag+'„Trainingsplan“ öffnet den fertigen Plan');
  await p.evaluate(()=>tplClose());await p.waitForTimeout(200);
  await p.evaluate(()=>{window.__opened=[];window.open=(u)=>{window.__opened.push(String(u));return null;};});
  await tryIt('pv');
  r=await p.evaluate(()=>window.__opened);
  ok(r.length===1&&/[?&]p=/.test(r[0])&&/preview=1/.test(r[0])&&/demo=1/.test(r[0]),tag+'„So sehen es die Spieler“ öffnet die Spieleransicht in der Demo');
  await tryIt('stats');
  r=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
  ok(/Alle Spieler/.test(r),tag+'„Statistik“ öffnet die Statistik');
  // the demo's own links (demo=1) and the player view: no welcome
  await p.goto(B+'/?demo=1');await p.waitForTimeout(2200);
  ok(!(await open()),tag+'?demo=1 (Links in der Demo): keine Begrüßung');
  const pv=await p.evaluate(()=>{const D=cd();return D.players[4].confirmToken;});
  await p.goto(B+'/?p='+pv+'&preview=1&demo=1');await p.waitForTimeout(2200);
  ok(!(await open())&&await p.evaluate(()=>!!window._hubMode),tag+'Spieleransicht: keine Begrüßung');
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));
  await c.close();}
 await b.close();srv.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);});
