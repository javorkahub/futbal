(function (root) {
  const F = root.Futbal;
  const storageKey = 'futbal:training-plan';
  const weekdays = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
  const weekFormat = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const players = Object.keys(F.TRAINING);
  const playerName = player => F.PROFILES[player].name.split(' ')[0];
  const jerseyNames = { blue: 'Modrý dres', red: 'Červený dres' };
  const venueNames = { Klokan: 'OŠK', 'ZŠ Javorka': 'ZŠ' };
  const dateLabel = date => date.slice(8) + '.' + date.slice(5, 7) + '.';
  const dateMarkup = date => `<time datetime="${date}">${dateLabel(date)}</time>`;
  const escape = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const minuteOfDay = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const clockLabel = minute => String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0');
  const isTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

  const defaults = Object.fromEntries(players.flatMap(player =>
    F.TRAINING[player].map(session => [session.id, { ...session, player }])
  ));

  function loadChanges() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return { recurring: saved?.recurring || {}, weeks: saved?.weeks || {} };
    } catch {
      return { recurring: {}, weeks: {} };
    }
  }

  function readPlan(monday) {
    const { recurring, weeks } = loadChanges();
    return Object.entries({ ...defaults, ...recurring, ...weeks[monday] })
      .filter(([, session]) => session && players.includes(session.player)
        && Number.isInteger(session.day) && session.day >= 0 && session.day < weekdays.length
        && isTime(session.start) && isTime(session.end) && session.start < session.end
        && typeof session.type === 'string' && typeof session.venue === 'string')
      .map(([id, session]) => ({ ...session, id, from: minuteOfDay(session.start), to: minuteOfDay(session.end) }))
      .sort((a, b) => a.day - b.day || a.from - b.from || a.to - b.to);
  }

  function jersey(color) {
    if (!Object.hasOwn(jerseyNames, color)) return '';
    return `<span class="training-jersey ${color}" role="img" aria-label="${jerseyNames[color]}" title="${jerseyNames[color]}"></span>`;
  }

  function activityIcon(type) {
    const label = type.toLocaleLowerCase('sk');
    if (label.startsWith('futbal')) return '<span class="training-icon" aria-hidden="true">⚽</span>';
    if (label.startsWith('kondič') || label.startsWith('atlet')) return '<span class="training-dumbbell" aria-hidden="true"></span>';
    if (label.startsWith('anglič')) return '<span class="training-icon" aria-hidden="true">📖</span>';
    return '';
  }

  function renderTimeline(dates, sessions) {
    const start = Math.min(16 * 60, ...sessions.map(session => Math.floor(session.from / 60) * 60));
    const end = Math.max(20 * 60, ...sessions.map(session => Math.ceil(session.to / 60) * 60));
    const step = Math.ceil((end - start) / (8 * 60)) * 60;
    const scale = minute => (minute - start) / (end - start) * 100;
    const position = (from, to) => `--start:${scale(from)}%;--duration:${scale(to) - scale(from)}%`;
    const ticks = [];
    for (let minute = start; minute < end; minute += step) ticks.push(minute);
    ticks.push(end);
    const grid = ticks.slice(1, -1).map(minute =>
      `<span class="training-grid-line" style="left:${scale(minute)}%"></span>`
    ).join('');

    const days = dates.map((date, day) => {
      const entries = sessions.filter(session => session.day === day);
      const overlaps = F.trainingOverlaps(entries.map(({ from, to }) => ({ start: from, end: to })));
      const conflict = overlaps.map(({ start, end }) =>
        `<span class="training-overlap" style="${position(start, end)}" aria-hidden="true"></span>`
      ).join('');
      const overlapText = overlaps.map(({ start, end }) => `${clockLabel(start)}–${clockLabel(end)}`).join(', ');
      const tracks = players.flatMap(player => {
        // A separate lane keeps appointments for the same player clickable when they overlap.
        const lanes = [];
        for (const session of entries.filter(session => session.player === player)) {
          const available = lanes.find(lane => lane.at(-1).to <= session.from);
          if (available) available.push(session);
          else lanes.push([session]);
        }
        return lanes.map(lane => `<div class="training-track">${lane.map(session => {
          const time = `${session.start}–${session.end}`;
          const place = Object.hasOwn(venueNames, session.venue) ? venueNames[session.venue] : session.venue;
          const shirt = Object.hasOwn(jerseyNames, session.jersey) ? ' · ' + jerseyNames[session.jersey] : '';
          const description = escape(`${playerName(player)} · ${time} · ${session.type}${session.venue ? ' · ' + session.venue : ''}`);
          return `<button class="training-block ${player}" type="button" data-training-id="${escape(session.id)}"
            style="${position(session.from, session.to)}" title="${description}${shirt}" aria-label="Upraviť ${description}${shirt}">
            <span class="training-block-time">${time}</span>
            <span class="training-meta">${activityIcon(session.type)}${place ? `<span title="${escape(session.venue)}">${escape(place)}</span>` : ''}
              ${jersey(session.jersey)}<span class="training-block-type">${escape(session.type)}</span></span>
          </button>`;
        }).join('')}</div>`);
      }).join('');
      return `<li class="training-day">
        <div class="training-day-heading"><strong>${weekdays[day]}</strong>${dateMarkup(date)}
          ${overlapText ? `<span class="training-overlap-label">Prekrytie<br>${overlapText}</span>` : ''}</div>
        <div class="training-day-track">${grid}${conflict}${tracks || '<span class="training-empty">–</span>'}</div>
      </li>`;
    }).join('');

    return `<div class="training-scroll" tabindex="0" role="region" aria-label="Časová os týždňa">
      <div class="training-timeline">
        <div class="training-axis"><div class="training-ticks">${ticks.map(minute =>
          `<span style="left:${scale(minute)}%">${clockLabel(minute)}</span>`
        ).join('')}</div></div>
        <ol class="training-week" aria-label="Týždenný prehľad termínov">${days}</ol>
      </div></div>`;
  }

  function renderLists(dates, sessions) {
    return players.map(player => {
      const rows = sessions.filter(session => session.player === player).map(session => `<tr>
        <th scope="row" class="text">${weekdays[session.day]}${dateMarkup(dates[session.day])}</th>
        <td class="training-time">${session.start}–${session.end}</td>
        <td class="text">${escape(session.venue || '–')}</td>
        <td class="text">${escape(session.type)} ${jersey(session.jersey)}</td>
        <td><button class="training-edit" type="button" data-training-id="${escape(session.id)}"
          aria-label="Upraviť ${escape(session.type)} ${dateLabel(dates[session.day])} ${session.start}">Upraviť</button></td>
      </tr>`).join('');
      return `<section class="card training-list" aria-labelledby="training-${player}">
        <h3 class="training-key ${player}" id="training-${player}">${playerName(player)}</h3>
        ${rows ? `<div class="table-scroll"><table class="data-table training-table">
          <thead><tr><th scope="col" class="text">Deň</th><th scope="col">Čas</th><th scope="col" class="text">Miesto</th>
          <th scope="col" class="text">Aktivita</th><th scope="col" aria-label="Úprava"></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>` : '<p class="note">Žiadne termíny</p>'}
      </section>`;
    }).join('');
  }

  root.createTrainingPlan = function (container, dialog, isVisible) {
    let dates;
    let editing;
    dialog.innerHTML = `<form>
      <h2 id="training-editor-heading">Termín</h2>
      <div class="row"><div><label for="training-player">Hráč</label><select id="training-player" name="player">
        ${players.map(player => `<option value="${player}">${playerName(player)}</option>`).join('')}</select></div>
      <div><label for="training-day">Deň</label><select id="training-day" name="day"></select></div></div>
      <div class="row"><div><label for="training-start">Od</label><input id="training-start" name="start" type="time" required></div>
      <div><label for="training-end">Do</label><input id="training-end" name="end" type="time" required></div></div>
      <label for="training-type">Aktivita</label>
      <input id="training-type" name="type" type="text" list="training-types" maxlength="80" required>
      <datalist id="training-types"><option>Futbal</option><option>Futbal – hala</option><option>Kondičný</option><option>Atletika</option><option>Angličtina</option></datalist>
      <label for="training-venue">Miesto</label>
      <input id="training-venue" name="venue" type="text" list="training-venues" maxlength="80">
      <datalist id="training-venues"><option>Klokan</option><option>ZŠ Javorka</option></datalist>
      <div class="row"><div><label for="training-jersey">Dres</label><select id="training-jersey" name="jersey">
        <option value="">Bez dresu</option><option value="blue">Modrý</option><option value="red">Červený</option></select></div>
      <div><label for="training-scope">Platnosť zmeny</label><select id="training-scope" name="scope">
        <option value="week">Iba tento týždeň</option><option value="recurring">Každý týždeň</option></select></div></div>
      <p class="training-error" role="alert" hidden></p>
      <div class="training-actions">
        <button type="button" class="btn o" data-close-term>Zrušiť</button>
        <button type="button" class="btn danger" data-delete-term>Odstrániť</button>
        <button type="submit" class="btn">Uložiť</button>
      </div>
    </form>`;
    const form = dialog.querySelector('form');
    const fields = form.elements;
    const error = dialog.querySelector('.training-error');
    const remove = dialog.querySelector('[data-delete-term]');

    function show(week) {
      dates = week;
      const scroll = container.querySelector('.training-scroll')?.scrollLeft || 0;
      const sessions = readPlan(dates[0]);
      const range = weekFormat.formatRange(new Date(dates[0]), new Date(dates[6]));
      const legend = players.map(player => `<span class="training-key ${player}">${playerName(player)}</span>`).join('');
      container.innerHTML = `<section class="card" aria-labelledby="training-range">
        <div class="panel-title training-heading"><h3 id="training-range">${range}</h3>
          <button type="button" class="btn" data-add-term>+ Pridať termín</button></div>
        <div class="training-legend training-players">${legend}<span class="training-key overlap">Prekrytie</span></div>
        <p class="note training-scroll-hint">Časovú os môžeš posúvať do strán.</p>
        ${renderTimeline(dates, sessions)}
        <div class="training-legend training-explanations" aria-label="Vysvetlivky">
          <span>OŠK · Klokan</span><span>ZŠ · ZŠ Javorka</span>
          <span>${activityIcon('Futbal')} Futbal</span><span>${activityIcon('Atletika')} Kondičný tréning a atletika</span>
          <span>${jersey('blue')} Modrý dres</span><span>${jersey('red')} Červený dres</span>
        </div>
      </section><div class="training-lists">${renderLists(dates, sessions)}</div>
      <p class="note">Zmeny sa ukladajú v tomto prehliadači.</p>`;
      container.querySelector('.training-scroll').scrollLeft = scroll;
    }

    function openEditor(session, activePlayer) {
      editing = { id: session?.id || crypto.randomUUID(), monday: dates[0], existing: Boolean(session) };
      form.reset();
      error.hidden = true;
      dialog.querySelector('h2').textContent = session ? 'Upraviť termín' : 'Pridať termín';
      fields.day.innerHTML = dates.map((date, day) => `<option value="${day}">${weekdays[day]} ${dateLabel(date)}</option>`).join('');
      fields.player.value = session?.player || activePlayer || players[0];
      fields.day.value = session?.day ?? 0;
      fields.start.value = session?.start ?? '17:00';
      fields.end.value = session?.end ?? '18:00';
      fields.type.value = session?.type ?? '';
      fields.venue.value = session?.venue ?? '';
      fields.jersey.value = session?.jersey ?? '';
      remove.hidden = !session;
      dialog.showModal();
    }

    function saveChange(session) {
      const changes = loadChanges();
      const week = changes.weeks[editing.monday] || {};
      if (fields.scope.value === 'recurring') {
        changes.recurring[editing.id] = session;
        delete week[editing.id];
      } else {
        week[editing.id] = session;
      }
      if (Object.keys(week).length) changes.weeks[editing.monday] = week;
      else delete changes.weeks[editing.monday];
      try {
        localStorage.setItem(storageKey, JSON.stringify(changes));
      } catch {
        error.textContent = 'Zmenu sa nepodarilo uložiť do prehliadača.';
        error.hidden = false;
        return;
      }
      dialog.close();
      show(dates);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const entry = Object.fromEntries(new FormData(form));
      if (!entry.type.trim() || entry.end <= entry.start) {
        error.textContent = 'Zadaj názov aktivity a čas konca neskorší než začiatok.';
        error.hidden = false;
        return;
      }
      saveChange({
        player: entry.player, day: Number(entry.day), start: entry.start, end: entry.end,
        type: entry.type.trim(), venue: entry.venue.trim(), jersey: entry.jersey
      });
    });
    remove.addEventListener('click', () => {
      if (!editing.existing) return;
      const question = fields.scope.value === 'recurring' ? 'Odstrániť termín každý týždeň?' : 'Odstrániť termín z tohto týždňa?';
      if (confirm(question)) saveChange(null);
    });
    dialog.querySelector('[data-close-term]').addEventListener('click', () => dialog.close());
    container.addEventListener('click', event => {
      const button = event.target.closest('[data-training-id], [data-add-term]');
      if (!button) return;
      if (button.hasAttribute('data-add-term')) {
        openEditor(null, document.querySelector('#who').value);
        return;
      }
      const session = readPlan(dates[0]).find(item => item.id === button.dataset.trainingId);
      if (session) openEditor(session);
    });
    root.addEventListener('storage', event => {
      if (event.key === storageKey && isVisible()) show(dates);
    });

    return { show };
  };
})(window);
