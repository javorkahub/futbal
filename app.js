(function (root) {
  const BASE = 'https://sportnet.sme.sk/futbalnet/k/osk-chorvatsky-grob/tim/';
  const CLUB = 'Chorvátsky Grob';
  const PROFILES = {
    tomas: { name: 'Tomáš Mráz', team: 'U13 – Mladší žiaci B', slug: 'u13-m-b', url: 'https://sportnet.sme.sk/futbalnet/clen/68d95f7194d10f7e9dd67b25/tomas-mraz/' },
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
  const API = { PROFILES, BASE, parseMatches, view, teamStats, playerStats, isOurs };
  if (typeof module !== 'undefined') module.exports = API; else root.Futbal = API;
})(typeof window !== 'undefined' ? window : globalThis);
