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
