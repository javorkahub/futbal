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
