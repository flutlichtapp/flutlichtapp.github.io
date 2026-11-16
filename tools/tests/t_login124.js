// 1.2.124: Anmeldeseite auf dem Handy. node tools/tests/t_login124.js [index.html] [shotdir]
// Mit offenem E-Mail-Formular ist die Seite höher als ein Handybildschirm. Mit
// justify-content:center lag das Logo dann über dem Anfang des Scrollbereichs
// und war nicht erreichbar (Artem 16.11.). Geprüft: Logo und unterster Knopf
// erreichbar, sonst weiter mittig (Handy, Desktop, Fenster mit nur einer Karte).
// Firebase wird durch einen Platzhalter ersetzt (kein Netz), niemand ist angemeldet.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {HTML}=require('./fx.js');const out=process.argv[3]||'';
const ROOT=path.resolve(__dirname,'..','..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const STUB=`(function(){
 const deep=()=>{const f=function(){return deep();};return new Proxy(f,{get(t,k){if(k==='then')return undefined;if(k===Symbol.toPrimitive)return()=>'';
   if(k==='onAuthStateChanged')return cb=>{setTimeout(()=>cb(null),50);return()=>{};};if(k==='currentUser')return null;
   if(['once','set','update','remove','transaction','setPersistence','signOut','get'].includes(k))return()=>new Promise(()=>{});
   return deep();},apply(){return deep();}});};
 window.firebase=deep();})();`;
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=(u==='/'||u==='/index.html')?HTML:path.join(ROOT,u);
  if(!f.startsWith(ROOT)&&f!==HTML){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const gaps=()=>{const o=document.getElementById('authOverlay');o.scrollTop=0;const k=[...o.children].filter(e=>getComputedStyle(e).display!=='none');
  const a=k[0].getBoundingClientRect(),z=k[k.length-1].getBoundingClientRect(),cs=getComputedStyle(o);
  return {top:Math.round(a.top-parseFloat(cs.paddingTop)),bottom:Math.round(o.clientHeight-parseFloat(cs.paddingBottom)-z.bottom),sh:o.scrollHeight,ch:o.clientHeight};};
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;const b=await chromium.launch();
 const page=async(w,h,mob)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:!!mob,hasTouch:!!mob});
   await c.route(/gstatic\.com/,r=>r.fulfill({contentType:'text/javascript',body:/firebase-app-compat/.test(r.request().url())?STUB:'/*stub*/'}));
   await c.route(/googleapis|firebaseio|firebasedatabase/,r=>r.abort());
   const p=await c.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message));
   await p.goto(B+'/');await p.waitForTimeout(1500);return p;};
 for(const [w,h,n] of [[375,667,'iPhone SE'],[390,700,'iPhone 14 in Safari mit Leisten'],[360,640,'kleines Android'],[390,844,'iPhone 14']]){
  const p=await page(w,h,true);
  ok(await p.evaluate(()=>document.getElementById('authOverlay').classList.contains('open')&&!!document.getElementById('acctMailBtn')),n+': Anmeldeseite offen');
  await p.click('#acctMailBtn');await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const o=document.getElementById('authOverlay');o.scrollTop=0;
    const ic=o.querySelector('.auth-brand-ic').getBoundingClientRect().top;
    o.scrollTop=o.scrollHeight;const pv=o.querySelector('.auth-priv').getBoundingClientRect().bottom;
    return {ic:Math.round(ic),pv:Math.round(pv),ch:o.clientHeight,sh:o.scrollHeight};});
  ok(r.ic>=0,n+': mit E-Mail-Formular ist das Logo ganz zu sehen (oben '+r.ic+' px)');
  ok(r.pv<=r.ch,n+': nach unten scrollen erreicht den letzten Knopf ('+r.pv+' ≤ '+r.ch+')');
  if(out)await p.screenshot({path:out+'/login_'+w+'x'+h+'.png'});
  await p.context().close();}
 {const p=await page(390,844,true);const g=await p.evaluate(gaps);
  ok(g.sh<=g.ch&&Math.abs(g.top-g.bottom)<=2,'iPhone 14 ohne Formular: weiter mittig (oben '+g.top+', unten '+g.bottom+')');await p.context().close();}
 {const p=await page(1366,800);const g=await p.evaluate(gaps);
  ok(g.sh<=g.ch&&Math.abs(g.top-g.bottom)<=2,'Desktop: weiter mittig (oben '+g.top+', unten '+g.bottom+')');
  await p.evaluate(()=>{document.getElementById('authOverlay').innerHTML='<div class="auth-box"><div style="padding:34px 16px">Lade Mannschaft...</div></div>';});
  const g1=await p.evaluate(gaps);
  ok(Math.abs(g1.top-g1.bottom)<=2,'Fenster mit nur einer Karte („Lade Mannschaft …“): mittig (oben '+g1.top+', unten '+g1.bottom+')');
  await p.context().close();}
 await b.close();srv.close();process.exit(fails?1:0);});
