// 1.2.126: kurze Adresse FlutlichtApp.de/demo mit eigener Linkvorschau und neue
// Vorschau ohne Vereinsnamen (flutlicht-vorschau.jpg?v=2).
// node tools/tests/t_demo126.js [index.html]
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const {HTML}=require('./fx.js');
const ROOT=path.resolve(__dirname,'..','..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.css':'text/css'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);
  if(u==='/demo'){r.writeHead(301,{Location:'/demo/'});return r.end();}            // like GitHub Pages
  if(u.endsWith('/'))u+='index.html';
  const f=(u==='/index.html')?HTML:path.join(ROOT,u);
  if(!f.startsWith(ROOT)&&f!==HTML){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(b);});});
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const meta=(html,p)=>{const m=html.match(new RegExp('<meta (?:property|name)="'+p+'" content="([^"]*)"'));return m?m[1]:null;};
srv.listen(0,async()=>{const B='http://localhost:'+srv.address().port;
 const demo=fs.readFileSync(path.join(ROOT,'demo','index.html'),'utf8'),idx=fs.readFileSync(HTML,'utf8');
 ok(meta(demo,'og:title')==='Flutlicht – Demo','/demo: Vorschau-Titel „Flutlicht – Demo“');
 ok(/vorschau\.jpg\?v=2$/.test(meta(demo,'og:image')||'')&&/vorschau\.jpg\?v=2$/.test(meta(idx,'og:image')||''),'neue Vorschau ?v=2 auf beiden Seiten');
 ok(meta(demo,'robots')==='noindex','/demo: nicht für Suchmaschinen');
 ok(!/Frohlinde/i.test(demo)&&!/Frohlinde/i.test((idx.match(/<head>[\s\S]*?<\/head>/)||[''])[0].replace(/<script[\s\S]*?<\/script>/g,'')),'kein Vereinsname in den Vorschau-Angaben');
 {const b=fs.readFileSync(path.join(ROOT,'icons','flutlicht-vorschau.jpg'));let i=2,w=0,h=0;
  while(i<b.length){if(b[i]!==0xFF){i++;continue;}const m=b[i+1];if(m>=0xC0&&m<=0xC2){h=b.readUInt16BE(i+5);w=b.readUInt16BE(i+7);break;}i+=2+b.readUInt16BE(i+2);}
  ok(w===1200&&h===630&&b.length<80000,'Bild 1200×630, '+Math.round(b.length/1024)+' KB');}
 ok(/t:'Neue Adresse: FlutlichtApp\.de'/.test(idx),'Neuigkeit: „Neue Adresse: FlutlichtApp.de“');
 const br=await chromium.launch();
 for(const start of ['/demo','/demo/']){
  const c=await br.newContext({viewport:{width:1280,height:800}});await c.route(/gstatic\.com|googleapis|firebase/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(B+start);await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>({path:location.pathname,q:location.search,demo:!!window.FL_DEMO,badge:!!document.getElementById('demoBadge')}));
  ok(r.path==='/'&&r.q==='?demo'&&r.demo&&r.badge,start+' öffnet die Demo ('+r.path+r.q+')');
  ok(!errs.length,start+': keine Fehler'+(errs.length?': '+errs[0]:''));
  await c.close();}
 await br.close();srv.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);});
