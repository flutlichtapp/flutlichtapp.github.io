// 1.2.118: Spiel mit veröffentlichtem Kader – das Bewertungsfenster für die
// Trainer ist am Tag danach noch offen: Knopf „Erinnerung in die WhatsApp-Gruppe“,
// „Noch offen“, echte Frist (16.11.: nach dem Spiel 15.11. fehlte der Knopf).
// node tools/tests/t_rpe118.js [index.html]
const {chromium}=require('playwright');const {setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
const at=async(b,iso,squad)=>{const c=await b.newContext({viewport:{width:1280,height:860}});const p=await c.newPage();
  await p.clock.install({time:new Date(iso)});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  const r=await p.evaluate(sq=>{const D=cd(),si=D.sessions.findIndex(s=>s.date==='So 08.11'&&s.type==='match');const s=D.sessions[si];
    D.players.forEach((p,i)=>{p.s[si]=i<13?1:4;if(Array.isArray(p.rpe))p.rpe[si]=null;});
    if(sq)s.squad={p:D.players.slice(0,14).map(x=>x.name),out:[],meet:'11:45',where:'Platz',t:Date.now()-2*864e5,by:'Admin'};
    rpeAllOpen(si);const body=document.getElementById('rpe-all-body');
    return {si,btn:!!body.querySelector('.rpe-remind'),txt:body.innerText.replace(/\s+/g,' ')};},squad);
  await c.close();return {...r,errs};};
(async()=>{const b=await chromium.launch();
 let r=await at(b,'2026-11-09T15:53:00+01:00',true);
 ok(r.si>=0,'Spiel So 08.11 gefunden');
 ok(r.btn,'Mo 15:53, Kader veröffentlicht: Knopf „Erinnerung in die WhatsApp-Gruppe“ da');
 ok(/Noch offen/.test(r.txt)&&!/Ohne Bewertung/.test(r.txt),'„Noch offen“ statt „Ohne Bewertung“');
 ok(/Spieler können bis 24 Uhr bewerten\./.test(r.txt),'Frist: „bis 24 Uhr“ (Di 18:30 ist der nächste Termin)');
 r=await at(b,'2026-11-09T15:53:00+01:00',false);
 ok(r.btn,'ohne Kader: Knopf auch da');
 r=await at(b,'2026-11-10T09:00:00+01:00',true);
 ok(!r.btn&&/Ohne Bewertung/.test(r.txt),'Di 09:00: Fenster zu (Mo 24 Uhr vorbei) – kein Knopf');
 ok(!r.errs.length,'keine Fehler');
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
