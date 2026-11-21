// 1.2.122/1.2.123: Demo (?demo). node tools/tests/t_demo122.js [index.html] [shotdir]
// Eigener kleiner Webserver (Demo braucht http: report.html, neue Tabs).
// Geprüft: echte Daten auf dem Gerät bleiben unberührt, keine Verbindung zu
// Firebase, Übersicht/Statistik/Profil, Spieleransicht in der Demo, „Meine
// Statistik“ (report.html), Termine um das heutige Datum, nichts aus den Neuigkeiten.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {HTML}=require('./fx.js');const out=process.argv[3]||'';
const ROOT=path.resolve(__dirname,'..','..');
const REPORT=fs.existsSync(path.join(path.dirname(HTML),'report.html'))?path.join(path.dirname(HTML),'report.html'):path.join(ROOT,'report.html');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=(u==='/'||u==='/index.html')?HTML:(u==='/report.html'?REPORT:path.join(ROOT,u));
  if(!f.startsWith(ROOT)&&f!==HTML&&f!==REPORT){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:1366,height:800}});
 const fb=[];c.on('request',r=>{const u=r.url();if(/firebaseio|firebasedatabase|identitytoolkit|securetoken/.test(u))fb.push(u);});
 await c.route(/gstatic\.com/,r=>r.abort());
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message);});
 await p.goto(B+'/sw.js');
 await p.evaluate(()=>{localStorage.setItem('fcf_v14','ECHTE-DATEN');localStorage.setItem('fcf_session','ECHTE-SITZUNG');localStorage.setItem('fcf_currentTeam','U17');});
 const before=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
 await p.goto(B+'/?demo');await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>window.FL_DEMO===true),'Demo an');
 ok(await p.evaluate(()=>/Demo/.test((document.getElementById('demoBadge')||{}).innerText||'')),'Hinweis „Demo · Beispieldaten, nichts wird gespeichert“');
 let t=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
 ok(/Diese Woche/.test(t)&&/Pressing|Spielaufbau|Umschalten|Torabschluss|Standards/.test(t),'Übersicht der Trainer mit Terminen');
 ok(!/ECHTE/.test(t),'nichts von den echten Daten');
 ok(!/Neu in Flutlicht/.test(t),'keine Neuigkeiten-Karte (die handeln von unseren Änderungen)');
 ok(await p.evaluate(()=>{const D=cd(),n=Date.now();const k=s=>{const x=_rpeStartMs(s);return x;};return D.sessions.some(s=>k(s)<n)&&D.sessions.some(s=>k(s)>n&&k(s)-n<8*864e5);}),'Termine um das heutige Datum (vorbei und in den nächsten Tagen)');
 if(out)await p.screenshot({path:out+'/demo_trainer.png'});
 ok(await p.evaluate(()=>!isAdmin()&&canEdit()&&canTeamSet()),'1.2.123: Trainer mit allen Rechten der Mannschaft, nicht Admin');
 await p.evaluate(()=>{hxGo('settings');});await p.waitForTimeout(800);
 const leak=await p.evaluate(()=>{const t=document.body.innerText+' '+[...document.querySelectorAll('input,textarea')].map(i=>i.value).join(' ');
   return ['firebasedatabase','firebaseio','fc-frohlinde-ea23f','AIza','Verantwortlich für die Daten'].filter(x=>t.includes(x));});
 ok(!leak.length,'1.2.123: Einstellungen ohne Verbindungsdaten und ohne Admin-Bereiche'+(leak.length?' ('+leak.join(', ')+')':''));
 ok(await p.evaluate(()=>{const u=document.getElementById('ud-admin');return !u||u.style.display==='none';}),'1.2.123: kein Menüpunkt „Administration“');
 const fbForm=await p.evaluate(()=>{openM('moAdmin');switchAdminTab('firebase');const v=['fb-dbUrl','fb-apiKey','fb-projectId'].map(i=>(document.getElementById(i)||{}).value||'').join('');closeM('moAdmin');return v;});
 ok(fbForm==='','1.2.123: Verbindungsformular bleibt leer, selbst wenn man es öffnet'+(fbForm?' ('+fbForm.slice(0,30)+'…)':''));
 await p.evaluate(()=>{hxGo('home');});await p.waitForTimeout(400);
 await p.evaluate(()=>{hxGo('stats');});await p.waitForTimeout(700);
 ok(/Saison bisher/.test(await p.evaluate(()=>document.body.innerText)),'Statistik');
 await p.evaluate(()=>{openPlayerStats(4);});await p.waitForTimeout(500);
 ok(/Finn Wolf/.test(await p.evaluate(()=>document.body.innerText)),'Spielerprofil');
 await p.evaluate(()=>{saveG();});await p.waitForTimeout(600);
 const [np]=await Promise.all([c.waitForEvent('page'),p.evaluate(()=>psPreviewPlayer())]);
 np.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message);});
 await np.waitForLoadState();await np.waitForTimeout(2500);
 ok(/demo=1/.test(np.url())&&/preview=1/.test(np.url()),'Spieleransicht bleibt in der Demo');
 const ht=await np.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
 // 21.11. (Sa): the demo runs on the real date — on some days the player sees
 // "Dein nächster Termin" instead of the week; both are right
 ok(/Finn/.test(ht)&&/Diese Woche|Dein nächster Termin/.test(ht)&&/Letztes Spiel/.test(ht),'Übersicht des Spielers mit letztem Spiel');
 await np.setViewportSize({width:390,height:844});await np.waitForTimeout(300);
 if(out)await np.screenshot({path:out+'/demo_spieler.png'});
 const clicked=await np.evaluate(()=>{const a=[...document.querySelectorAll('#playerModeWrap a,#playerModeWrap button')].find(x=>/Meine Statistik/.test(x.innerText));if(!a)return false;a.click();return true;});
 await np.waitForTimeout(2500);
 const rt=await np.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
 ok(clicked&&/report\.html/.test(np.url())&&/Meine Statistik/.test(rt)&&!/Nicht verfügbar/.test(rt),'„Meine Statistik“ (report.html) in der Demo');
 await p.goto(B+'/sw.js');
 const after=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>!/^fldemo:/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));
 ok(after===before,'echte Daten auf dem Gerät unverändert');
 ok(fb.length===0,'keine Verbindung zu Firebase');
 // ohne ?demo: die normale App (Anmeldung), Demo aus
 await p.goto(B+'/');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>!window.FL_DEMO&&!document.getElementById('demoBadge')),'ohne ?demo: keine Demo');
 ok(!errs.length,'keine Fehler');
 await b.close();srv.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);});
