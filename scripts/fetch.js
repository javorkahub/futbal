// Stiahne program, výsledky a tabuľku zo Sportnetu a uloží ich do data/<tím>.json
const fs = require('fs');
const F = require('../app.js');
const UA = 'Mozilla/5.0 (compatible; futbal-bot; +https://github.com)';

const API = 'https://sutaze.api.sportnet.online/api/v2';
const SEASON = '2026/2027';

async function getJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} (${new URL(url).pathname})`);
  return response.json();
}

function toMatch(match, teamId, closed) {
  const { _id: id, startDate, homeTeam, awayTeam, season } = match;
  if (!/^[0-9a-f]{24}$/.test(id) || season?.name !== SEASON ||
      (homeTeam?._id !== teamId && awayTeam?._id !== teamId)) {
    throw new Error('odpoveď obsahuje zápas mimo očakávaného tímu alebo sezóny');
  }
  const kickoff = startDate ? F.formatKickoff(startDate) : { date: '', time: '' };
  const scored = closed && Number.isInteger(homeTeam?.score) && Number.isInteger(awayTeam?.score);
  return {
    id, ...kickoff,
    home: homeTeam?.name || 'Súper neurčený',
    away: awayTeam?.name || 'Súper neurčený',
    homeOurs: homeTeam?._id === teamId,
    closed,
    hs: scored ? homeTeam.score : null,
    as: scored ? awayTeam.score : null
  };
}

async function loadMatches(teamId, closed) {
  const url = new URL(API + '/futbalnet/matches');
  url.search = new URLSearchParams({
    teamId, seasonName: SEASON, closed: String(closed), limit: '100', sorter: 'dateFromAsc'
  });
  const all = new Map();
  let offset = 0;
  for (;;) {
    url.searchParams.set('offset', String(offset));
    const { matches, nextOffset, total } = await getJson(url);
    if (!Array.isArray(matches)) throw new Error('odpoveď neobsahuje zoznam zápasov');
    for (const item of matches) {
      const match = toMatch(item, teamId, closed);
      all.set(match.id, match);
    }
    if (nextOffset === null) {
      if (all.size !== total) throw new Error('nepodarilo sa načítať všetky zápasy sezóny');
      return [...all.values()];
    }
    if (!matches.length || !Number.isInteger(nextOffset) || nextOffset <= offset) {
      throw new Error('neplatné stránkovanie zápasov');
    }
    offset = nextOffset;
  }
}

async function loadTable(profile) {
  const url = `${API}/public/competitions/${profile.tableCompetition}/parts/${profile.tablePart}/results?view=all`;
  const { results } = await getJson(url);
  if (!Array.isArray(results) || !results.some(row => row?.team?._id === profile.teamId)) {
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

(async () => {
  fs.mkdirSync('data', { recursive: true });
  let failed = 0;
  for (const p of Object.values(F.PROFILES)) {
    try {
      const [program, vysledky] = await Promise.all([
        loadMatches(p.teamId, false),
        loadMatches(p.teamId, true)
      ]);
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
