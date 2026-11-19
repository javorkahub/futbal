// Stiahne program, výsledky a tabuľku zo Sportnetu a uloží ich do data/<tím>.json
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
async function loadTable(profile) {
  const url = `https://sutaze.api.sportnet.online/api/v2/public/competitions/${profile.tableCompetition}/parts/${profile.tablePart}/results?view=all`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const { results } = await response.json();
  if (!Array.isArray(results) || !results.some(row => row?.team?._id === profile.tableTeam)) {
    throw new Error('odpoveď neobsahuje tabuľku očakávanej skupiny');
  }

  // Sportnet už určil poradie vrátane tímov s rovnakým počtom bodov.
  return results.map(({ team, stats }, index) => {
    const { played, won, draw, lost } = stats?.matches ?? {};
    const { given, received } = stats?.goals ?? {};
    const points = stats?.points;
    if (typeof team?.name !== 'string' || !team.name.trim() ||
        ![played, won, draw, lost, given, received, points].every(Number.isInteger)) {
      throw new Error(`neúplný riadok tabuľky na pozícii ${index + 1}`);
    }
    return {
      pos: index + 1, club: team.name,
      z: played, v: won, r: draw, p: lost, gf: given, ga: received, pts: points
    };
  });
}

function readSavedTable(file) {
  try {
    const { table } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(table) && table.length) return table;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Uloženú tabuľku sa nepodarilo načítať z ${file}: ${error.message}`);
    }
  }
}
const ms0 = a => a.length > 0;

(async () => {
  fs.mkdirSync('data', { recursive: true });
  let failed = 0;
  for (const p of Object.values(F.PROFILES)) {
    try {
      const b = F.BASE + p.slug + '/';
      const [program, vysledky] = await Promise.all([load(b + 'program/', true), load(b + 'vysledky/', true)]);
      if (!program.length && !vysledky.length) throw new Error('nenašli sa žiadne zápasy');
      const file = `data/${p.slug}.json`;
      let table;
      if (p.tablePart) {
        try {
          table = await loadTable(p);
          console.log(p.slug, 'riadkov tabuľky:', table.length);
        } catch (error) {
          table = readSavedTable(file);
          console.warn(p.slug, `tabuľku sa nepodarilo aktualizovať: ${error.message}.`,
            table ? 'Používam uloženú tabuľku.' : 'Uložená tabuľka nie je k dispozícii.');
        }
      }
      fs.writeFileSync(file, JSON.stringify({ updated: new Date().toISOString(), program, vysledky, table }, null, 1));
      console.log(p.slug, 'program', program.length, 'vysledky', vysledky.length);
    } catch (e) { failed++; console.error(p.slug, e.message); }
  }
  if (failed === Object.keys(F.PROFILES).length) process.exit(1);
})();
