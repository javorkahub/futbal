# ⚽ Futbal
Webová appka pre OŠK Chorvátsky Grob (Tomáš U13 B, Oliver U10 A). Program a výsledky sa pri každom otvorení načítajú zo Sportnetu, ostatné (góly, asistencie, dojem, ručné výsledky) sa ukladajú v prehliadači.
Test: `node test.js`

## Aktualizácia údajov
GitHub Action (`.github/workflows/update.yml`) každú hodinu stiahne Sportnet (`scripts/fetch.js`) a uloží `data/*.json`. Prvýkrát ju spusti ručne: Actions → „Aktualizácia údajov“ → Run workflow.
