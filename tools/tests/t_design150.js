// 1.2.150 (Artem 21.11.: „надо улучшить дизайн Spieltag … сделай намного
// красивее все“): the pitch under floodlight on the club's night blue, players
// as tokens (navy, white ring, number in lamp yellow) with the name on a dark
// tag, empty positions as quiet dashed rings with their name in its own case
// ("6er", not "6ER" that read as "GER"), the bench as seats ("8 Leon", empty
// "+"), and in the list a small token for where a player stands instead of
// ⚽ / 🔄 SUB. The Saisonkader shares the pitch.
// node tools/tests/t_design150.js [index.html]
const {chromium}=require('playwright');const {NOW,setupTrainer,HTML}=require('./fx.js');
let fails=0;const ok=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)fails++;};
// a full 4-2-3-1 from the fixture: every slot filled where a player of that
// position is free, one declined player (Ali) on the pitch, two on the bench
const fill=()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots),P=cd().players,i0=cd().sessions.findIndex(s=>s.date==='So 08.11');
  P[1].s[i0]=0;const used=new Set([1]);lpState.slots={};
  sl.forEach(s=>{const pos=s.pos&&s.pos[0];const i=P.findIndex((p,i)=>!used.has(i)&&p.pos===pos&&!(p.s&&(p.s[i0]===0||p.s[i0]===2)));if(i>=0){used.add(i);lpState.slots[s.id]=i;}});
  const free=sl.find(s=>lpState.slots[s.id]===undefined&&s.pos[0]!=='TW');if(free)lpState.slots[free.id]=1;
  const rest=P.map((p,i)=>i).filter(i=>!used.has(i)&&!(P[i].s&&(P[i].s[i0]===0||P[i].s[i0]===2)));lpState.subs=[rest[0],rest[1]];lpRender();
  return {free:free?free.id:null,subs:lpState.subs.map(i=>[String(P[i].nr),lpFullName(P[i],12)])};};
const boxes=()=>[...document.querySelectorAll('#lp-slots .lp-tk-g')].map(g=>{const c=g.querySelector('.lp-tk,.lp-tk-empty').getBoundingClientRect(),t=g.querySelector('.lp-tk-tag');return {id:g.dataset.slot,c:[c.left,c.top,c.right,c.bottom],t:t?(r=>[r.left,r.top,r.right,r.bottom])(t.getBoundingClientRect()):null};});
const hit=(a,b)=>a[0]<b[2]-1&&b[0]<a[2]-1&&a[1]<b[3]-1&&b[1]<a[3]-1;
(async()=>{const b=await chromium.launch();
 for(const [w,h,dk] of [[1536,864,0],[1366,657,0],[390,844,0],[360,640,0],[1536,864,1]]){
  const ph=w<768,tag=w+'×'+h+(dk?' Nacht':'')+': ';
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:ph,hasTouch:ph});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);
  await p.evaluate(`(${setupTrainer.toString()})({})`);
  if(dk)await p.evaluate(()=>document.body.classList.add('hxk-dk'));
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(800);
  // ── the pitch and its stage
  const art=await p.evaluate(()=>{const g=document.querySelector('#lp-pitch .hx-grass');const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
    const col=document.querySelector('#moLineup .lp-pitch-col'),svg=document.getElementById('lp-pitch').getBoundingClientRect(),cr=col.getBoundingClientRect();
    return {stripes:g?g.querySelectorAll('.hx-stripes > rect').length:0,clip:!!g&&!!g.querySelector('clipPath'),dupIds:(m=>m.length-new Set(m).size)(ids.filter(i=>/-(clip|vig|g[1-4])$/.test(i))),
      stage:/gradient/.test(getComputedStyle(col).backgroundImage),inside:svg.left>=cr.left-1&&svg.right<=cr.right+1&&svg.top>=cr.top-1&&svg.bottom<=cr.bottom+1};});
  ok(art.stripes===5&&art.clip,tag+'Feld: zehn Streifen (fünf dunkle), abgerundet');
  ok(art.dupIds===0,tag+'Feld und Saisonkader-Feld: eigene IDs für Licht und Rand');
  ok(art.stage&&art.inside,tag+'Feld auf der Bühne im Vereinsblau');
  const f=await p.evaluate(`(${fill.toString()})()`);
  // ── tokens
  const tk=await p.evaluate(()=>{const P=cd().players;const out=[];
    document.querySelectorAll('#lp-slots .lp-tk-g.filled').forEach(g=>{const pi=lpState.slots[g.dataset.slot];const pl=P[pi];
      out.push({nr:(g.querySelector('.lp-tk-nr')||{}).textContent===String(pl.nr),nm:(g.querySelector('.lp-tk-nm')||{}).textContent===lpFullName(pl,11),
        extra:[...g.querySelectorAll('text')].filter(t=>!t.matches('.lp-tk-nr,.lp-tk-nm')&&t.textContent!=='!').length});});
    const nr=document.querySelector('#lp-slots .lp-tk-nr');const cs=nr?getComputedStyle(nr):null;
    return {n:out.length,nr:out.every(x=>x.nr),nm:out.every(x=>x.nm),extra:out.reduce((a,x)=>a+x.extra,0),font:cs?cs.fontFamily:'',fill:cs?cs.fill:''};});
  ok(tk.n>=9&&tk.nr&&tk.nm,tag+'Marken: Nummer und Namensschild ('+tk.n+')');
  ok(tk.extra===0,tag+'Marken: keine kleine Positionsschrift mehr unter der Nummer');
  ok(/Big Shoulders/.test(tk.font)&&tk.fill==='rgb(242, 194, 48)',tag+'Nummer in Big Shoulders, Lampengelb');
  const bx=await p.evaluate(`(${boxes.toString()})()`);
  const clash=[];bx.forEach(a=>{if(!a.t)return;bx.forEach(o=>{if(o===a)return;if(hit(a.t,o.c)||(o.t&&hit(a.t,o.t)))clash.push(a.id+'/'+o.id);});});
  ok(!clash.length,tag+'Namensschilder überdecken keine andere Marke'+(clash.length?': '+clash.join(' '):''));
  // empty position: dashed ring, its name in its own case
  await p.evaluate(()=>{const sl=fmtSlots(lpState.formation,lpState.customSlots);const s6=sl.find(s=>s.lbl==='6er');if(s6)delete lpState.slots[s6.id];lpRender();});
  const em=await p.evaluate(()=>{const g=[...document.querySelectorAll('#lp-slots .lp-tk-g:not(.filled)')].find(g=>g.querySelector('.lp-tk-pos').textContent==='6er');if(!g)return null;
    const t=g.querySelector('.lp-tk-pos'),cs=getComputedStyle(t),ring=getComputedStyle(g.querySelector('.lp-tk-empty'));
    return {tt:cs.textTransform,font:cs.fontFamily,dash:ring.strokeDasharray,title:(g.querySelector('title')||{}).textContent};});
  ok(em&&em.tt!=='uppercase'&&/Big Shoulders/.test(em.font)&&em.dash&&em.dash!=='none',tag+'leere Position: gestrichelt, „6er“ in eigener Schreibweise');
  ok(em&&em.title==='6er – frei',tag+'leere Position: Titel „6er – frei“');
  // selected
  await p.evaluate(()=>{const g=[...document.querySelectorAll('#lp-slots .lp-tk-g:not(.filled)')][0];lpClickSlot({stopPropagation(){},clientX:0,clientY:0,target:g},g.dataset.slot);});await p.waitForTimeout(250);
  const sel=await p.evaluate(()=>{const g=document.querySelector('#lp-slots .lp-tk-g.selected');return g?getComputedStyle(g.querySelector('.lp-tk,.lp-tk-empty')).stroke:'';});
  ok(sel==='rgb(242, 194, 48)',tag+'gewählte Position: gelber Ring');
  await p.evaluate(()=>{try{lpClosePopup();}catch(e){}});
  // unavailable on the pitch
  const un=await p.evaluate(()=>{const g=document.querySelector('#lp-slots .lp-tk-g.lp-unavail');return g?{ring:!!g.querySelector('.lp-tk-un'),c:getComputedStyle(g.querySelector('.lp-tk-un')).stroke}:null;});
  ok(un&&un.ring&&un.c==='rgb(255, 90, 69)',tag+'abgesagter Spieler auf dem Feld: roter Ring');
  // ── bench
  const bn=await p.evaluate(()=>{const seats=[...document.querySelectorAll('#lp-subs-circles .lp-seat')];const box=document.getElementById('lp-subs-circles');
    const vis=seats.filter(s=>{const r=s.getBoundingClientRect();return r.width>0&&r.height>0;});
    return {n:seats.length,filled:seats.filter(s=>s.classList.contains('filled')).map(s=>[s.querySelector('.lp-seat-nr').textContent,s.querySelector('.lp-seat-nm').textContent]),
      empty:seats.filter(s=>!s.classList.contains('filled')).every(s=>s.textContent.trim()==='+'&&/frei/.test(s.getAttribute('aria-label'))),
      head:document.querySelector('#lp-subs-col .lp-bank-h').textContent.replace(/\s+/g,' ').trim(),
      scroll:box.scrollWidth-box.clientWidth,vis:vis.length,minH:Math.min(...vis.map(s=>Math.round(s.getBoundingClientRect().height))),
      cols:getComputedStyle(box).gridTemplateColumns.split(' ').filter(Boolean).length,legacy:seats.some(s=>/SUB/.test(s.textContent))};});
  ok(bn.n===7&&bn.vis===7,tag+'Bank: sieben Plätze, alle sichtbar');
  ok(JSON.stringify(bn.filled)===JSON.stringify(f.subs),tag+'Bank: „Nummer Name“ '+JSON.stringify(bn.filled));
  ok(bn.empty&&!bn.legacy,tag+'Bank: freie Plätze „+“, kein „SUB n“');
  ok(bn.head==='Bank 2 / 7',tag+'Bank: Kopf „Bank 2 / 7“ ('+bn.head+')');
  ok(bn.scroll<=0,tag+'Bank: nichts versteckt (kein waagrechtes Scrollen)');
  if(ph)ok(bn.cols===3&&bn.minH>=40,tag+'Telefon: Bank in drei Spalten, Plätze '+bn.minH+' px hoch');
  await p.evaluate(()=>lpSetMatchKind('test'));await p.waitForTimeout(200);
  const bt=await p.evaluate(()=>[document.querySelectorAll('#lp-subs-circles .lp-seat').length,document.querySelector('#lp-subs-col .lp-bank-h').textContent.replace(/\s+/g,' ').trim()]);
  ok(bt[0]===10&&bt[1]==='Bank 2 / 10',tag+'Testspiel: zehn Plätze ('+bt.join(', ')+')');
  await p.evaluate(()=>lpSetMatchKind('meisterschaft'));await p.waitForTimeout(200);
  // ── list
  const li=await p.evaluate(()=>{const rows=[...document.querySelectorAll('#lp-kader-list > div')];const P=cd().players;
    const xi=rows.filter(r=>r.querySelector('.lp-st-xi')),sb=rows.filter(r=>r.querySelector('.lp-st-sub'));
    const sameNoPos=xi.every(r=>{const l=r.querySelector('.lp-st-xi').textContent.toLowerCase(),pc=r.querySelector('.lp-card-pos1');return pc?pc.textContent.toLowerCase()!==l:true;});
    const xiStyle=xi[0]?getComputedStyle(xi[0].querySelector('.lp-st-xi')):null;
    return {xi:xi.length,sb:sb.map(r=>r.querySelector('.lp-st-sub').textContent),emoji:/[⚽🔄]/u.test(document.getElementById('lp-kader-list').textContent),sameNoPos,
      bg:xiStyle?xiStyle.backgroundColor:'',fg:xiStyle?xiStyle.color:''};});
  ok(li.xi>=9&&li.sb.length===2&&li.sb.every(t=>t==='Bank'),tag+'Liste: Startelf und Bank markiert ('+li.xi+'/'+li.sb.length+')');
  ok(!li.emoji,tag+'Liste: kein ⚽ / 🔄');
  ok(li.sameNoPos,tag+'Liste: auf eigener Position nur die Marke, kein doppeltes „RV RV“');
  ok(dk?li.bg==='rgb(242, 194, 48)':(li.bg==='rgb(14, 35, 80)'&&li.fg==='rgb(242, 194, 48)'),tag+'Liste: Marke '+(dk?'gelb (Nacht)':'blau mit gelber Schrift'));
  // ── names are text, never markup
  const esc=await p.evaluate(()=>{const P=cd().players;const pi=lpState.subs[0],old=P[pi].shortname;P[pi].shortname='<b>X</b>';
    const sl=Object.keys(lpState.slots)[0],keep=lpState.slots[sl];lpState.slots[sl]=pi;lpState.subs[1]=pi;lpRender();
    const r={pitch:!document.querySelector('#lp-slots b'),bench:!document.querySelector('#lp-subs-circles b:not(.lp-seat-nr)'),txt:[...document.querySelectorAll('#lp-slots .lp-tk-nm')].some(t=>t.textContent==='<b>X</b>')};
    P[pi].shortname=old;lpState.slots[sl]=keep;lpRender();return r;});
  ok(esc.pitch&&esc.bench&&esc.txt,tag+'Namen werden als Text gezeigt, nie als Markup');
  // ── Saisonkader shares the pitch
  if(!dk&&(w===1536||w===390)){
    await p.evaluate(()=>closeLineupPlanner());await p.waitForTimeout(300);
    await p.evaluate(()=>hxGo('team'));await p.waitForTimeout(400);await p.evaluate(()=>kaderGo('saison',1));await p.waitForTimeout(800);
    const sk=await p.evaluate(()=>{const t=[...document.querySelectorAll('#slp-slots text.slp-pos')].map(x=>x.textContent);const col=document.querySelector('#moSeasonLineup .slp-pitch-col');
      return {six:t.includes('6er'),font:t.length?getComputedStyle(document.querySelector('#slp-slots text.slp-pos')).fontFamily:'',stripes:document.querySelectorAll('#slp-pitch .hx-grass .hx-stripes > rect').length,stage:/gradient/.test(getComputedStyle(col).backgroundImage)};});
    ok(sk.six&&/Big Shoulders/.test(sk.font),tag+'Saisonkader: „6er“ in eigener Schreibweise');
    ok(sk.stripes===5&&sk.stage,tag+'Saisonkader: dasselbe Feld auf derselben Bühne');
  }
  ok(!errs.length,tag+'keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 // ── the classic design keeps its own drawing
 {const c=await b.newContext({viewport:{width:1366,height:768}});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install({time:NOW});await p.goto('file://'+HTML);await p.waitForTimeout(600);await p.evaluate(`(${setupTrainer.toString()})({})`);
  await p.evaluate(()=>hxGo('lineup'));await p.waitForTimeout(700);
  const cl=await p.evaluate(`(()=>{document.body.classList.remove('design-heute');(${fill.toString()})();
    return {tk:document.querySelectorAll('#lp-slots .lp-tk').length,old:document.querySelectorAll('#lp-slots .lp-slot-g > circle').length,seat:document.querySelectorAll('#lp-subs-circles .lp-seat').length,sub:/SUB 3/.test(document.getElementById('lp-subs-circles').textContent)};})()`);
  ok(cl.tk===0&&cl.old>=11&&cl.seat===0&&cl.sub,'ohne Heute: die alte Zeichnung bleibt');
  ok(!errs.length,'ohne Heute: keine Fehler'+(errs.length?': '+errs[0]:''));await c.close();}
 await b.close();console.log(fails?fails+' FAILED':'all passed');process.exit(fails?1:0);})();
