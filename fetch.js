// Stiahne program a výsledky zo Sportnetu a uloží ich do data/<tím>.json
const fs = require('fs');
const F = require('../app.js');
const UA = 'Mozilla/5.0 (compatible; futbal-bot; +https://github.com)';
async function page(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'sk' } });
  if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
  const html = await r.text();
  const ms = F.parseMatches(html);
  const i = html.indexOf('/zapas/');
  console.log(url, '| dĺžka', html.length, '| výskytov /zapas/:', html.split('/zapas/').length - 1, '| zápasov:', ms.length);
  if (!ms.length) {
    console.log('--- ukážka HTML okolo prvého /zapas/ ---');
    console.log(i >= 0 ? html.slice(Math.max(0, i - 300), i + 700) : html.slice(0, 1000));
  }
  return ms;
}
(async () => {
  fs.mkdirSync('data', { recursive: true });
  let failed = 0;
  for (const p of Object.values(F.PROFILES)) {
    try {
      const b = F.BASE + p.slug + '/';
      const [program, vysledky] = await Promise.all([page(b + 'program/'), page(b + 'vysledky/')]);
      if (!program.length && !vysledky.length) throw new Error('nenašli sa žiadne zápasy');
      fs.writeFileSync(`data/${p.slug}.json`, JSON.stringify({ updated: new Date().toISOString(), program, vysledky }, null, 1));
      console.log(p.slug, 'program', program.length, 'vysledky', vysledky.length);
    } catch (e) { failed++; console.error(p.slug, e.message); }
  }
  if (failed === Object.keys(F.PROFILES).length) process.exit(1);
})();
