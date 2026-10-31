#!/usr/bin/env bash
# Spusti v priečinku naklonovaného repozitára "futbal" (v Git Bash alebo termináli).
set -e
mkdir -p scripts .github/workflows data

cat > 'index.html' <<'__EOF__'
<!DOCTYPE html>
<html lang="sk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Futbal – OŠK Chorvátsky Grob</title>
<link rel="icon" href="https://api.sportnet.online/data/ppo/osk-chorvatsky-grob.futbalnet.sk/1ce80f11-7192-455d-8f75-24094029b911.jpeg">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--g:#1faa59;--dg:#0d6b37;--y:#ffd23f;--r:#ff5a5f;--b:#2d7ff9;--w:#fff;--ink:#12361f}
*{box-sizing:border-box}
body{margin:0;font-family:Fredoka,"Trebuchet MS",sans-serif;color:var(--ink);
background:repeating-linear-gradient(90deg,#27b862 0 60px,#2fc46c 60px 120px);min-height:100vh}
header{background:var(--dg);color:var(--w);padding:10px 14px;display:flex;align-items:center;gap:12px;border-bottom:6px solid var(--y)}
header img{width:54px;height:54px;border-radius:50%;border:3px solid var(--y);background:#fff}
header h1{font-size:1.2rem;margin:0;flex:1}
select{font:inherit;font-weight:700;font-size:1rem;padding:8px 10px;border-radius:14px;border:3px solid var(--y);background:#fff;color:var(--ink)}
nav{display:flex;gap:6px;padding:10px;overflow-x:auto}
nav button{flex:1;min-width:92px;font:inherit;font-weight:700;padding:10px 6px;border:0;border-radius:16px;background:#fff;color:var(--dg);cursor:pointer;box-shadow:0 4px 0 #0003}
nav button.on{background:var(--y);transform:translateY(2px)}
main{max-width:760px;margin:0 auto;padding:0 10px 40px}
.card{background:#fff;border-radius:20px;padding:12px 14px;margin:10px 0;box-shadow:0 4px 0 #0003}
.m{display:flex;align-items:center;gap:10px;cursor:pointer}
.m .d{font-size:.8rem;color:#567;min-width:62px}.m .t{flex:1;font-weight:600}
.sc{font-weight:700;font-size:1.2rem;padding:4px 12px;border-radius:12px;background:#eee}
.sc.W{background:#b9f3cf}.sc.D{background:#ffeaa0}.sc.L{background:#ffc9cb}
.tag{font-size:1.1rem}.note{color:#567;font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stat{background:var(--y);border-radius:18px;text-align:center;padding:12px 4px}
.stat b{display:block;font-size:2rem}.stat.b{background:#bfe0ff}.stat.r{background:#ffc9cb}.stat.g{background:#b9f3cf}
dialog{border:0;border-radius:24px;padding:18px;width:min(94vw,440px);box-shadow:0 0 0 9999px #0008}
label{display:block;font-weight:600;margin:10px 0 4px}
input[type=number],input[type=text],input[type=date]{font:inherit;width:100%;padding:9px;border:3px solid #cde;border-radius:12px}
.row{display:flex;gap:8px}.row>*{flex:1}
.moods{display:flex;gap:6px}.moods button{flex:1;font-size:1.8rem;padding:6px;border:3px solid #cde;border-radius:14px;background:#fff;cursor:pointer}
.moods button.on{border-color:var(--g);background:#d9f9e5}
.btn{font:inherit;font-weight:700;border:0;border-radius:16px;padding:11px 16px;background:var(--g);color:#fff;cursor:pointer;box-shadow:0 4px 0 #0003}
.btn.o{background:#e7edf2;color:var(--ink)}
#st{color:#fff;text-align:center;font-size:.85rem;padding:4px}
</style></head><body>
<header><img src="https://api.sportnet.online/data/ppo/osk-chorvatsky-grob.futbalnet.sk/1ce80f11-7192-455d-8f75-24094029b911.jpeg" alt="Logo OŠK Chorvátsky Grob">
<h1>⚽ Futbalový denník</h1><select id="who" aria-label="Hráč"></select></header>
<nav id="nav"></nav><div id="st"></div><main id="v"></main>
<dialog id="dlg"></dialog>
<script src="app.js"></script>
<script>
const F=window.Futbal,$=s=>document.querySelector(s);
const TABS={prog:'📅 Program',res:'🏆 Výsledky',team:'📊 Tím',me:'⭐ Moje štatistiky',tbl:'🥇 Tabuľka'};
let tbl=null,pid=localStorage.getItem('futbal:last')||'tomas',tab='prog',sched=[],resu=[],S;
const load=()=>{try{return JSON.parse(localStorage.getItem('futbal:'+pid))||{}}catch(e){return{}}};
const save=()=>localStorage.setItem('futbal:'+pid,JSON.stringify(S));
async function refresh(){
  $('#st').textContent='⏳ Načítavam údaje…';
  try{
    const r=await fetch('data/'+F.PROFILES[pid].slug+'.json?'+Date.now());
    if(!r.ok)throw 0;
    const d=await r.json();sched=d.program||[];resu=d.vysledky||[];tbl=d.table||null;
    const t=new Date(d.updated);
    $('#st').textContent='✅ Údaje zo Sportnetu z '+t.toLocaleString('sk-SK',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'});
  }catch(e){$('#st').textContent='⚠️ Údaje zo Sportnetu sa nepodarilo načítať – ukazujem len ručné údaje'}
  render();
}
const all=()=>{const seen={},l=[];[...sched,...resu,...(S.manual||[])].forEach(m=>{if(!seen[m.id]){seen[m.id]=1;l.push(m)}});return l.sort((a,b)=>a.date.localeCompare(b.date))};
const E=()=>S.entries=S.entries||{};
const fd=d=>d.slice(8)+'.'+d.slice(5,7)+'.';
function row(m){const e=E()[m.id]||{},v=F.view(m,e),r=v.gf===null?'':v.gf>v.ga?'W':v.gf===v.ga?'D':'L';
  return `<div class="card m" data-id="${m.id}"><div class="d">${fd(m.date)}<br>${m.time||''}</div>
  <div class="t">${v.homeOurs?'🏠':'🚌'} ${v.opp}<div class="note">${e.played?`⚽${e.goals||0} 🎯${e.assists||0} ${e.mood||''}`:'klikni a zapíš'}</div></div>
  <div class="sc ${r}">${v.gf===null?'–':v.gf+':'+v.ga}</div></div>`}
function render(){
  $('#nav').innerHTML=Object.entries(TABS).filter(([k])=>k!=='tbl'||F.PROFILES[pid].tablePart).map(([k,t])=>`<button data-t="${k}" class="${k===tab?'on':''}">${t}</button>`).join('');
  const ms=all(),today=new Date().toISOString().slice(0,10),en=E();let h='';
  if(tab==='prog'){const l=ms.filter(m=>m.date>=today&&F.view(m,en[m.id]).gf===null);
    h=l.map(row).join('')||'<div class="card">Žiadne naplánované zápasy 🎉</div>';
    h+='<button class="btn" id="add">➕ Pridať zápas ručne</button>'}
  if(tab==='res'){const l=ms.filter(m=>F.view(m,en[m.id]).gf!==null).reverse();h=l.map(row).join('')||'<div class="card">Zatiaľ žiadne výsledky</div>'}
  if(tab==='team'){const s=F.teamStats(ms,en);h=`<div class="card"><b>${F.PROFILES[pid].team}</b><div class="note">Výhra 3 body · remíza 1 bod · prehra 0 bodov</div></div><div class="grid">
   <div class="stat"><b>${s.gp}</b>zápasov</div><div class="stat g"><b>${s.pts}</b>bodov</div><div class="stat b"><b>${s.w}-${s.d}-${s.l}</b>V-R-P</div>
   <div class="stat g"><b>${s.gf}</b>strelené góly</div><div class="stat r"><b>${s.ga}</b>inkasované</div><div class="stat"><b>${s.gf-s.ga}</b>skóre rozdiel</div></div>`}
  if(tab==='tbl'){const L=`<div class="card"><a href="${F.BASE}${F.PROFILES[pid].slug}/tabulky/#/?competitionId=6a217228233cdeb1e753a3b2&partId=${F.PROFILES[pid].tablePart}" target="_blank" rel="noopener">Tabuľka MZM B na Sportnete ↗</a></div>`;
   h=tbl&&tbl.length?`<div class="card" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:center"><tr style="background:#ffd23f"><th>#</th><th style="text-align:left">Klub</th><th>Z</th><th>V</th><th>R</th><th>P</th><th>Skóre</th><th>B</th></tr>`+tbl.map(r=>`<tr style="${/Chorvátsky Grob/.test(r.club)?'background:#b9f3cf;font-weight:700':''}"><td>${r.pos}</td><td style="text-align:left">${r.club}</td><td>${r.z}</td><td>${r.v}</td><td>${r.r}</td><td>${r.p}</td><td>${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')+`</table></div>`+L:`<div class="card">Tabuľku sa zatiaľ nepodarilo načítať automaticky.</div>`+L}
  if(tab==='me'){const s=F.playerStats(en);h=`<div class="grid"><div class="stat b"><b>${s.played}</b>odohraných</div><div class="stat g"><b>${s.goals}</b>⚽ góly</div><div class="stat"><b>${s.assists}</b>🎯 asistencie</div></div>
   <div class="card"><a href="${F.PROFILES[pid].url}" target="_blank" rel="noopener">Profil na Sportnete ↗</a></div>`;
   h+=ms.filter(m=>(en[m.id]||{}).played).reverse().map(row).join('')}
  $('#v').innerHTML=h;
}
function edit(id){const m=all().find(x=>x.id===id),e=E()[id]||{},v=F.view(m,e),man=(S.manual||[]).some(x=>x.id===id);
  $('#dlg').innerHTML=`<h2>${v.opp}</h2>${man?`<label>Dátum a čas</label><div class="row"><input type="date" id="md" value="${m.date}"><input type="time" id="mt" value="${m.time||''}"></div><label>Súper</label><input type="text" id="mo2" value="${v.opp.replace(/"/g,'&quot;')}"><label><input type="checkbox" id="mh" ${v.homeOurs?'checked':''}> Doma</label>`:`<div class="note">${fd(m.date)} ${m.time||''}</div>`}
  <label><input type="checkbox" id="p" ${e.played?'checked':''}> ✅ Hral som</label>
  <div class="row"><div><label>⚽ Góly</label><input type="number" min="0" id="g" value="${e.goals||0}"></div><div><label>🎯 Asistencie</label><input type="number" min="0" id="a" value="${e.assists||0}"></div></div>
  <label>Aký dojem z zápasu?</label><div class="moods" id="mo">${['😀','🙂','😐','🙁'].map(x=>`<button type="button" class="${e.mood===x?'on':''}">${x}</button>`).join('')}</div>
  <input type="text" id="n" placeholder="Poznámka (voliteľné)" value="${(e.note||'').replace(/"/g,'&quot;')}" style="margin-top:8px">
  <label>Výsledok (naše : súper)</label><div class="row"><input type="number" min="0" id="gf" value="${v.gf??''}"><input type="number" min="0" id="ga" value="${v.ga??''}"></div>
  <div class="row" style="margin-top:14px"><button class="btn o" id="x">Zrušiť</button><button class="btn" id="del" style="background:var(--r)">🗑 ${man?'Zmazať zápas':'Vymazať záznam'}</button><button class="btn" id="ok">💾 Uložiť</button></div>`;
  let mood=e.mood||'';$('#mo').onclick=ev=>{if(ev.target.tagName!=='BUTTON')return;mood=ev.target.textContent;[...$('#mo').children].forEach(b=>b.classList.toggle('on',b===ev.target))};
  $('#x').onclick=()=>$('#dlg').close();
  $('#del').onclick=()=>{if(!confirm(man?'Naozaj zmazať tento zápas aj so záznamom?':'Vymazať tvoj záznam k tomuto zápasu (góly, asistencie, dojem, ručný výsledok)?'))return;if(man)S.manual=S.manual.filter(x=>x.id!==id);delete E()[id];save();$('#dlg').close();render()};
  $('#ok').onclick=()=>{if(man){const o=$('#mo2').value.trim(),d=$('#md').value;if(!o||!d){alert('Vyplň dátum a súpera');return}const us='OŠK Chorvátsky Grob',hm=$('#mh').checked;Object.assign(m,{date:d,time:$('#mt').value,home:hm?us:o,away:hm?o:us})}E()[id]={played:$('#p').checked,goals:+$('#g').value||0,assists:+$('#a').value||0,mood,note:$('#n').value,gf:$('#gf').value,ga:$('#ga').value};save();$('#dlg').close();render()};
  $('#dlg').showModal()}
function addMatch(){$('#dlg').innerHTML=`<h2>➕ Nový zápas</h2><label>Dátum a čas</label><div class="row"><input type="date" id="d"><input type="time" id="t"></div><label>Súper</label><input type="text" id="o">
  <label><input type="checkbox" id="h" checked> Doma</label><div class="row" style="margin-top:14px"><button class="btn o" id="x">Zrušiť</button><button class="btn" id="ok">Pridať</button></div>`;
  $('#x').onclick=()=>$('#dlg').close();
  $('#ok').onclick=()=>{const d=$('#d').value,o=$('#o').value.trim();if(!d||!o)return;const us='OŠK Chorvátsky Grob',hm=$('#h').checked;
    (S.manual=S.manual||[]).push({id:'m'+Date.now(),date:d,time:$('#t').value,home:hm?us:o,away:hm?o:us,hs:null,as:null});save();$('#dlg').close();render()};
  $('#dlg').showModal()}
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-t]'),c=ev.target.closest('[data-id]');
  if(t){tab=t.dataset.t;render()}else if(c)edit(c.dataset.id);else if(ev.target.id==='add')addMatch()});
$('#who').innerHTML=Object.entries(F.PROFILES).map(([k,p])=>`<option value="${k}">${p.name} (${p.team.split(' ')[0]})</option>`).join('');
function start(){$('#who').value=pid;S=load();sched=[];resu=[];tbl=null;if(tab==='tbl'&&!F.PROFILES[pid].tablePart)tab='prog';render();refresh()}
$('#who').onchange=e=>{pid=e.target.value;localStorage.setItem('futbal:last',pid);start()};
start();
</script></body></html>
__EOF__

cat > 'app.js' <<'__EOF__'
(function (root) {
  const BASE = 'https://sportnet.sme.sk/futbalnet/k/osk-chorvatsky-grob/tim/';
  const CLUB = 'Chorvátsky Grob';
  const PROFILES = {
    tomas: { name: 'Tomáš Mráz', team: 'U13 – Mladší žiaci B', slug: 'u13-m-b', tablePart: '6a38d5270b755716bcd9bea3', url: 'https://sportnet.sme.sk/futbalnet/clen/68d95f7194d10f7e9dd67b25/tomas-mraz/' },
    oliver: { name: 'Oliver Mráz', team: 'U10 – A', slug: 'u10-m-a', url: 'https://sportnet.sme.sk/futbalnet/clen/68dad51f94d10f7e9dd6a3be/oliver-mraz/' }
  };

  function halve(words) {
    for (let k = 1; k * 2 <= words.length; k++)
      if (words.slice(0, k).join(' ') === words.slice(k, 2 * k).join(' ')) return [k, words.slice(0, k).join(' ')];
    return null;
  }
  function parseAnchors(html) {
    const out = [], re = /<a\b[^>]*?href=["']([^"']*\/zapas\/([0-9a-f]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html))) {
      const t = m[3].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      const d = t.match(/^(\d\d)\.(\d\d)\. (\d\d:\d\d)/);
      if (!d) continue;
      const key = d[0];
      let rest = t.slice(key.length).trim();
      if (rest.startsWith(key)) rest = rest.slice(key.length).trim();
      const i = rest.indexOf(key);
      if (i >= 0) rest = rest.slice(0, i).trim();
      rest = rest.replace(/^\d\d\.\d\d\s+Koniec\s*/, '');
      let hs = null, as = null;
      const sc = rest.match(/\s(\d+|-)\s(\d+|-)$/);
      if (sc) { rest = rest.slice(0, sc.index).trim(); if (sc[1] !== '-') { hs = +sc[1]; as = +sc[2]; } }
      const w = rest.split(' '), h = halve(w);
      if (!h) continue;
      const aw = w.slice(h[0] * 2), a = halve(aw);
      if (!a) continue;
      const mo = +d[2], year = mo >= 7 ? 2026 : 2027;
      out.push({ id: m[2], date: `${year}-${d[2]}-${d[1]}`, time: d[3], home: h[1], away: a[1], hs, as, url: m[1] });
    }
    return out;
  }
  // Sportnet vkladá zápasy do stránky ako JSON (Next.js); z neho sa údaje čítajú spoľahlivo
  const TZ = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parseJson(html) {
    const t = html.replace(/\\/g, '');
    const re = /"id":"([0-9a-f]{24})",[^{}]*?"date":"\$D([^"]+)","homeTeam":\{"name":"([^"]+)","score":"([^"]*)"[\s\S]*?"awayTeam":\{"name":"([^"]+)","score":"([^"]*)"/g;
    const seen = {}, out = [];
    let m;
    while ((m = re.exec(t))) {
      if (seen[m[1]]) continue;
      seen[m[1]] = 1;
      const p = {};
      TZ.formatToParts(new Date(m[2])).forEach(x => { p[x.type] = x.value; });
      const hs = /^\d+$/.test(m[4]) ? +m[4] : null, as = /^\d+$/.test(m[6]) ? +m[6] : null;
      out.push({ id: m[1], date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, home: m[3], away: m[5], hs: hs === null || as === null ? null : hs, as: hs === null || as === null ? null : as });
    }
    return out;
  }
  function parseMatches(html) {
    const j = parseJson(html);
    return j.length ? j : parseAnchors(html);
  }
  // Tabuľka: riadky v tvare "1 Klub Klub 13 13 0 0 129:8 39 ..." (názov býva v texte dvakrát – logo + odkaz)
  function parseTable(html) {
    const rows = [], re = /<tr[\s\S]*?<\/tr>/g;
    let m;
    while ((m = re.exec(html))) {
      const t = m[0].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      const r = t.match(/^(\d+) (.+?) (\d+) (\d+) (\d+) (\d+) (\d+):(\d+) (\d+)(?: |$)/);
      if (!r) continue;
      const w = r[2].split(' '), h = halve(w);
      rows.push({ pos: +r[1], club: h && h[0] * 2 === w.length ? h[1] : r[2], z: +r[3], v: +r[4], r: +r[5], p: +r[6], gf: +r[7], ga: +r[8], pts: +r[9] });
    }
    return rows;
  }
  const isOurs = n => n.includes(CLUB);
  // normalise to our perspective; manual entry (e.g. {gf,ga}) wins over website score
  function view(m, e) {
    e = e || {};
    const homeOurs = m.homeOurs !== undefined ? m.homeOurs : isOurs(m.home);
    let gf = null, ga = null;
    if (e.gf !== undefined && e.gf !== '' && e.ga !== undefined && e.ga !== '') { gf = +e.gf; ga = +e.ga; }
    else if (m.hs !== null && m.hs !== undefined) { gf = homeOurs ? m.hs : m.as; ga = homeOurs ? m.as : m.hs; }
    return { gf, ga, opp: homeOurs ? m.away : m.home, homeOurs };
  }
  function teamStats(matches, entries) {
    const s = { gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    matches.forEach(m => {
      const v = view(m, entries[m.id]);
      if (v.gf === null) return;
      s.gp++; s.gf += v.gf; s.ga += v.ga;
      if (v.gf > v.ga) { s.w++; s.pts += 3; } else if (v.gf === v.ga) { s.d++; s.pts += 1; } else s.l++;
    });
    return s;
  }
  function playerStats(entries) {
    const s = { played: 0, goals: 0, assists: 0 };
    Object.values(entries).forEach(e => { if (e.played) { s.played++; s.goals += +e.goals || 0; s.assists += +e.assists || 0; } });
    return s;
  }
  const API = { PROFILES, BASE, parseMatches, parseTable, view, teamStats, playerStats, isOurs };
  if (typeof module !== 'undefined') module.exports = API; else root.Futbal = API;
})(typeof window !== 'undefined' ? window : globalThis);
__EOF__

cat > 'test.js' <<'__EOF__'
const F = require('./app.js'); const assert = require('assert');
const a = (t, id) => `<a href="https://sportnet.sme.sk/futbalnet/z/x/zapas/${id}/">${t}</a>`;
const html = a('21.10. 17:00 21.10 Koniec OŠK Chorvátsky Grob B OŠK Chorvátsky Grob B NŠK 1922 Bratislava B NŠK 1922 Bratislava B 5 3 21.10. 17:00 21.10 Koniec 5 3', 'aa1') +
  a('24.10. 14:30 24.10 Koniec MŠK Senec B MŠK Senec B OŠK Chorvátsky Grob B OŠK Chorvátsky Grob B 1 0 24.10. 14:30 24.10 Koniec 1 0', 'bb2') +
  a('12.09. 09:30 12.09 Koniec OŠK Chorvátsky Grob B OŠK Chorvátsky Grob B FK Inter Bratislava B FK Inter Bratislava B 2 2 12.09. 09:30 12.09 Koniec 2 2', 'cc3') +
  a('08.11. 11:30 08.11. 11:30 FK Slovan Ivanka pri Dunaji FK Slovan Ivanka pri Dunaji OŠK Chorvátsky Grob B OŠK Chorvátsky Grob B - - 08.11. 11:30 08.11. 11:30', 'dd4');
const ms = F.parseMatches(html);
assert.strictEqual(ms.length, 4);
assert.strictEqual(ms[0].home, 'OŠK Chorvátsky Grob B'); assert.strictEqual(ms[0].away, 'NŠK 1922 Bratislava B');
assert.deepStrictEqual([ms[0].hs, ms[0].as], [5, 3]);
assert.strictEqual(ms[3].hs, null); assert.strictEqual(ms[3].home, 'FK Slovan Ivanka pri Dunaji'); assert.strictEqual(ms[3].date, '2026-11-08');
// team stats: W(5:3) + L(away 1:0 loss) + D(2:2) = 4 pts, GF 7, GA 6; manual result on the unplayed match = win 2:0
let t = F.teamStats(ms, {});
assert.deepStrictEqual(t, { gp: 3, w: 1, d: 1, l: 1, gf: 7, ga: 6, pts: 4 });
t = F.teamStats(ms, { dd4: { gf: 2, ga: 0 } });
assert.strictEqual(t.gp, 4); assert.strictEqual(t.pts, 7);
// manual override beats site score
assert.strictEqual(F.teamStats(ms, { aa1: { gf: 0, ga: 1 } }).pts, 1);
// player stats count only played matches
assert.deepStrictEqual(F.playerStats({ a: { played: true, goals: 2, assists: 1 }, b: { played: false, goals: 9 }, c: { played: true, goals: '1' } }), { played: 2, goals: 3, assists: 1 });
// formát JSON zo Sportnetu (Next.js, s escapovanými úvodzovkami)
const J = '{\\"matches\\":[{\\"id\\":\\"6a573504d14e91f303d8cec1\\",\\"detailUrl\\":\\"/z/x/zapas/6a573504d14e91f303d8cec1/\\",\\"appSpace\\":\\"BA\\",\\"key\\":\\"k\\",\\"date\\":\\"$D2026-10-24T12:30:00.000Z\\",\\"homeTeam\\":{\\"name\\":\\"MŠK Senec B\\",\\"score\\":\\"1\\",\\"logo\\":{\\"src\\":\\"u\\"},\\"meta\\":{\\"_id\\":\\"x\\"}},\\"awayTeam\\":{\\"name\\":\\"OŠK Chorvátsky Grob B\\",\\"score\\":\\"0\\",\\"logo\\":{}}},' +
  '{\\"id\\":\\"6a573505d14e91f303d8d153\\",\\"appSpace\\":\\"BA\\",\\"detailUrl\\":\\"/z/x/zapas/6a573505d14e91f303d8d153/\\",\\"key\\":\\"k\\",\\"date\\":\\"$D2026-11-08T10:30:00.000Z\\",\\"homeTeam\\":{\\"name\\":\\"FK Slovan Ivanka pri Dunaji\\",\\"score\\":\\"-\\"},\\"awayTeam\\":{\\"name\\":\\"OŠK Chorvátsky Grob B\\",\\"score\\":\\"-\\"}}]}';
const jm = F.parseMatches(J + J);
assert.strictEqual(jm.length, 2);
assert.deepStrictEqual([jm[0].date, jm[0].time, jm[0].hs, jm[0].as], ['2026-10-24', '14:30', 1, 0]);
assert.deepStrictEqual([jm[1].date, jm[1].time, jm[1].hs], ['2026-11-08', '11:30', null]);
assert.strictEqual(F.view(jm[0], {}).gf, 0);
const tr = c => '<tr>' + c.map(x => '<td>' + x + '</td>').join('') + '</tr>';
const tb = F.parseTable(tr(['2', 'OŠK Chorvátsky Grob B', 'OŠK Chorvátsky Grob B', '13', '10', '1', '2', '61:25', '31', '15', '10', '<a>V</a> <a>R</a>']) +
  tr(['3', '<img alt="x"> Senec Football Academy B', '12', '7', '3', '2', '51:37', '24', '14', '9', 'R']) + tr(['Klub', 'Z']));
assert.strictEqual(tb.length, 2);
assert.deepStrictEqual([tb[0].pos, tb[0].club, tb[0].v, tb[0].gf, tb[0].ga, tb[0].pts], [2, 'OŠK Chorvátsky Grob B', 10, 61, 25, 31]);
assert.strictEqual(tb[1].club, 'Senec Football Academy B');
console.log('✅ Všetky testy prešli');
__EOF__

cat > 'README.md' <<'__EOF__'
# ⚽ Futbal
Webová appka pre OŠK Chorvátsky Grob (Tomáš U13 B, Oliver U10 A). Program a výsledky sa pri každom otvorení načítajú zo Sportnetu, ostatné (góly, asistencie, dojem, ručné výsledky) sa ukladajú v prehliadači.
Test: `node test.js`

## Aktualizácia údajov
GitHub Action (`.github/workflows/update.yml`) každú hodinu stiahne Sportnet (`scripts/fetch.js`) a uloží `data/*.json`. Prvýkrát ju spusti ručne: Actions → „Aktualizácia údajov“ → Run workflow.
__EOF__

cat > 'scripts/fetch.js' <<'__EOF__'
// Stiahne program a výsledky zo Sportnetu a uloží ich do data/<tím>.json
const fs = require('fs');
const F = require('../app.js');
const UA = 'Mozilla/5.0 (compatible; futbal-bot; +https://github.com)';

async function html(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'sk' } });
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  return r.text();
}
function diag(url, h, ms) {
  console.log(url, '| dĺžka', h.length, '| zápasov na 1. strane:', ms.length);
  const t = h.replace(/\\/g, '');
  const keys = [...new Set((t.match(/"(next[A-Za-z]*|cursor|hasMore|hasNext[A-Za-z]*|total[A-Za-z]*|offset|limit|pageParams?|page|pageSize)":[^,}\]]{0,40}/g) || []))];
  console.log('   kľúče na stránkovanie:', keys.slice(0, 15).join(' ; ') || '(žiadne)');
  const i = t.indexOf('"pageParams"');
  if (i >= 0) console.log('   okolie pageParams:', t.slice(Math.max(0, i - 200), i + 200));
}
// 1. strana + pokus o ďalšie strany (Sportnet ich dopĺňa tlačidlom „Načítať ďalšie“)
async function load(url, extra) {
  const h = await html(url);
  let all = F.parseMatches(h);
  if (!ms0(all)) console.log('   ukážka HTML:', h.slice(0, 300));
  if (extra) diag(url, h, all);
  else console.log(url, '| zápasov:', all.length);
  if (!extra || !all.length) return all;
  for (const param of ['page', 'p', 'strana']) {
    let n = 2, added = 0;
    for (; n <= 15; n++) {
      let more = [];
      try { more = F.parseMatches(await html(`${url}?${param}=${n}`)); } catch (e) { break; }
      const seen = new Set(all.map(m => m.id));
      const fresh = more.filter(m => !seen.has(m.id));
      if (!fresh.length) break;
      all = all.concat(fresh); added += fresh.length;
    }
    if (added) { console.log(`   ďalšie strany cez ?${param}= pridali ${added} zápasov`); break; }
  }
  if (all.length) console.log('   spolu zápasov:', all.length);
  return all;
}
async function loadTable(url, part) {
  const h = await html(url);
  const rows = F.parseTable(h);
  console.log(url, '| riadkov tabuľky v HTML:', rows.length);
  if (rows.some(r => /Chorvátsky Grob B/.test(r.club))) return rows;   // len tabuľka MZM B (A-čko má v názve len „Chorvátsky Grob“)
  if (rows.length) console.log('   tabuľka v HTML je pre inú skupinu (nie MZM B) – nepoužitá');
  const t = h.replace(/\\/g, '');
  console.log('   výskytov partId:', t.split(part).length - 1);
  const api = [...new Set(t.match(/https?:\/\/[a-z.]*sportnet\.[a-z]+\/[A-Za-z0-9_\-\/.]*(?:competition|part|table|standing|tabul)[A-Za-z0-9_\-\/.?=&]*/gi) || [])];
  console.log('   adresy súvisiace s tabuľkou:', api.slice(0, 10).join(' ; ') || '(žiadne)');
  const i = t.indexOf(part);
  if (i >= 0) console.log('   okolie partId:', t.slice(Math.max(0, i - 200), i + 400));
  return undefined;
}
const ms0 = a => a.length > 0;

(async () => {
  fs.mkdirSync('data', { recursive: true });
  let failed = 0;
  for (const p of Object.values(F.PROFILES)) {
    try {
      const b = F.BASE + p.slug + '/';
      const [program, vysledky] = await Promise.all([load(b + 'program/', true), load(b + 'vysledky/', true)]);
      const table = p.tablePart ? await loadTable(b + 'tabulky/', p.tablePart) : undefined;
      if (!program.length && !vysledky.length) throw new Error('nenašli sa žiadne zápasy');
      fs.writeFileSync(`data/${p.slug}.json`, JSON.stringify({ updated: new Date().toISOString(), program, vysledky, table }, null, 1));
      console.log(p.slug, 'program', program.length, 'vysledky', vysledky.length);
    } catch (e) { failed++; console.error(p.slug, e.message); }
  }
  if (failed === Object.keys(F.PROFILES).length) process.exit(1);
})();
__EOF__

cat > '.github/workflows/update.yml' <<'__EOF__'
name: Aktualizácia údajov zo Sportnetu
on:
  schedule: [{ cron: '0 * * * *' }]   # každú hodinu
  workflow_dispatch: {}
  push: { branches: [main], paths: ['scripts/**', 'app.js'] }
permissions:
  contents: write
concurrency:
  group: update-data
  cancel-in-progress: false
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node test.js
      - run: node scripts/fetch.js
      - name: Uloženie zmien
        run: |
          git config user.name "futbal-bot"
          git config user.email "futbal-bot@users.noreply.github.com"
          git add data
          git diff --cached --quiet || (git commit -m "Aktualizácia údajov" && git pull --rebase origin main && git push)
__EOF__

touch data/.gitkeep
node test.js
git add -A
git commit -m "Úprava a mazanie záznamov, čas zápasu" || true
git pull --rebase origin main
git push
echo "Hotovo."
