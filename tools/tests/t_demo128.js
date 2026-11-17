// 1.2.128: Demo, zweite Runde – was ein Trainer sonst leer vorfände:
// Trainingsplaner (Bibliothek, Pläne, Vorlage, Plan und Platz), Rückblick mit
// Übungen, Aufstellung, Links, Notizen zum Gegner, Probetraining, gemeldete
// Abwesenheit, Physio. Alles bleibt in der Demo (nichts im echten Speicher).
// node tools/tests/t_demo128.js [index.html] [shotdir]
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {HTML}=require('./fx.js');const out=process.argv[3]||'';
const ROOT=path.resolve(__dirname,'..','..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=(u==='/'||u==='/index.html')?HTML:path.join(ROOT,u);
  if(!f.startsWith(ROOT)&&f!==HTML){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;
 const b=await chromium.launch();
 for(const vp of [{width:1440,height:900},{width:390,height:844}]){
 const ph=vp.width<500;const tag=ph?'Handy: ':'';
 const c=await b.newContext({viewport:vp});
 const fb=[];c.on('request',r=>{if(/firebaseio|firebasedatabase|identitytoolkit|securetoken/.test(r.url()))fb.push(r.url());});
 await c.route(/gstatic\.com/,r=>r.abort());
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message);});
 await p.goto(B+'/sw.js');await p.evaluate(()=>localStorage.setItem('fcf_v14','ECHTE-DATEN'));
 const before=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()));
 await p.goto(B+'/?demo');await p.waitForTimeout(2500);
 const S=await p.evaluate(()=>{const D=cd(),n=Date.now();const st=s=>_rpeStartMs(s);
   const tr=D.sessions.map((s,i)=>i).filter(i=>D.sessions[i].type==='training');
   const past=tr.filter(i=>st(D.sessions[i])+90*6e4<n),next=tr.filter(i=>st(D.sessions[i])+90*6e4>=n);
   const nm=D.sessions.findIndex(s=>s.type==='match'&&st(s)>n);
   return {lp:past[past.length-1],lp2:past[past.length-2],nt:next[0],nt2:next[1],nm};});
 // Trainingsplaner
 if(!ph){
  const home=await p.evaluate(()=>[...document.querySelectorAll('#hxHome .hx-plan-on')].map(x=>x.textContent).join(' | '));
  const nextIsHero=await p.evaluate(nt=>{const fi=findNext();return fi===nt;},S.nt);
  ok(!nextIsHero||/Plan · 5 Blöcke · 90′/.test(home),'Übersicht: nächstes Training „Plan · 5 Blöcke · 90′“'+(nextIsHero?'':' (heute ist ein Spiel vorn – übersprungen)'));
 }
 let r=await p.evaluate(async nt=>{await tplOpen(nt);return {n:TPL.plan.blocks.length,t:TPL.plan.blocks.map(b=>b.title),ph:TPL.plan.blocks.map(b=>b.ph),lib:_tplLibItems().length,tpl:Object.keys(TPL.tpls).length,draft:TPL.draft,
   dia:!!document.querySelector('#tplEd svg, #tplEd canvas'),list:document.getElementById('tplList').textContent};},S.nt);
 ok(r.n===5&&!r.draft&&r.ph[0]==='Aktivierung 1'&&r.t.includes('Pressing 6 gegen 4 + 2'),tag+'nächstes Training: fertiger Plan, 5 Blöcke nach dem Standardablauf ('+r.t.join(', ')+')');
 ok(r.lib===8&&r.tpl===1,tag+'Bibliothek mit 8 Übungen, 1 Vorlage');
 if(out&&!ph)await p.screenshot({path:out+'/demo128_plan.png'});
 r=await p.evaluate(()=>{tplTab('s');const t=document.getElementById('tplOverlay').textContent;return {t,ok:/Häufigste Übungen/.test(t)};});
 ok(r.ok&&/Rondo 5 gegen 2/.test(r.t),tag+'Statistik des Planers mit Übungen');
 r=await p.evaluate(async lp=>{tplClose();await tplOpen(lp);const d=TPL.plan.done;tplClose();return {n:TPL.plan.blocks.length,done:!!(d&&d.tot>0)};},S.lp);
 ok(r.n===6&&r.done,tag+'letztes Training: Plan mit „Plan und Platz“');
 r=await p.evaluate(async nt2=>{await tplOpen(nt2);const x={draft:TPL.draft,n:TPL.plan.blocks.length};tplClose();return x;},S.nt2);
 ok(r.draft,tag+'übernächstes Training: noch kein Plan (Standardablauf als Entwurf)');
 // Rückblick with the exercises of the plan
 r=await p.evaluate(async lp=>{await rvOpen(lp);await new Promise(z=>setTimeout(z,300));const bd=document.getElementById('rv-body');const t=bd.textContent+' '+[...bd.querySelectorAll('input,textarea')].map(i=>i.value).join(' ');closeM('moRv');return t;},S.lp);
 ok(/Rondo 5 gegen 2/.test(r)&&/Feld war zu klein/.test(r)&&/Feld größer/.test(r),tag+'Rückblick: mit den Übungen des Plans und den Notizen');
 r=await p.evaluate(()=>{const x=_rvLibIdx();return Object.keys(x).length;});
 ok(r>=3,tag+'Bibliothek zeigt den Rückblick zu Übungen ('+r+')');
 // Links
 r=await p.evaluate(()=>({n:getLinks().length,vis:(()=>{const li=document.getElementById('hxLinksItem');return !!li&&li.style.display!=='none';})()}));
 ok(r.n===3&&(ph||r.vis),tag+'Links: 3 Einträge'+(ph?'':', Menüpunkt sichtbar'));
 // Aufstellung for the next match
 r=await p.evaluate(nm=>{const k=_mlKey(UI.currentTeam,UI.currentSeason,nm),lu=G.matchLineups[k];return lu?Object.keys(lu.slots).length+'/'+lu.subs.length:'';},S.nm);
 ok(r==='11/3',tag+'Aufstellung für das nächste Spiel ('+r+')');
 if(!ph){await p.evaluate(nm=>openLineupPlanner(nm),S.nm);await p.waitForTimeout(500);
  r=await p.evaluate(()=>Object.values(lpState.slots||{}).filter(v=>v!=null&&v!=='').length);
  ok(r===11,'Aufstellung öffnet mit 11 auf dem Platz');
  if(out)await p.screenshot({path:out+'/demo128_lineup.png'});
  await p.evaluate(()=>{try{closeLineupPlanner&&closeLineupPlanner();}catch(e){}try{hxGo('home');}catch(e){}});await p.waitForTimeout(300);}
 // Gegner, Probetraining, Abwesenheit, Physio
 r=await p.evaluate(nm=>{const o=_oppGet(cd().sessions[nm].label);return o&&o.wie||'';},S.nm);
 ok(/presst hoch/.test(r),tag+'Notizen zum nächsten Gegner');
 r=await p.evaluate(()=>{const p=cd().players.find(x=>x.trial);const s=_prbSum(p);return s?s.n+' '+Object.keys(s.votes).length:'';});
 ok(r==='2 2',tag+'Probetraining: Eindrücke von beiden Trainern');
 r=await p.evaluate(()=>{window._hxFlagsAll=true;hxRender();window._hxFlagsAll=false;return [...document.querySelectorAll('#hxHome .hx-a-flags .hx-flag')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' | ');});
 ok(/nicht da .*Urlaub/.test(r),tag+'Im Blick: gemeldete Abwesenheit zum Bestätigen');
 r=await p.evaluate(nt=>{const D=cd(),s=D.sessions[nt];return sessPhysioOn(s)+' '+D.players.filter(p=>Array.isArray(p.physio)&&p.physio[nt]).length;},S.nt);
 ok(r==='true 2',tag+'Physio beim nächsten Training (2 gebucht)');
 // nothing reached real storage or Firebase
 await p.goto(B+'/sw.js');
 const after=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort()));
 ok(after===before,tag+'echter Speicher unverändert (kein Trainingsplan, nichts aus der Demo)'+(after===before?'':' '+after));
 ok(!fb.length,tag+'keine Verbindung zu Firebase');
 ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));
 await c.close();}
 await b.close();srv.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);});
