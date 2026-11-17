import {reconcileGoals} from '../public/ui/official-rosters.js';

const base = 'https://hoqueihub.cat';
const nameKey = name => name.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
const pairKey = (home, away) => JSON.stringify([home, away]);
const isScore = score => Number.isSafeInteger(score) && score >= 0;

function findMatches(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.matches) && value.matches[0]?.home_team_name) return value.matches;
  for (const child of Object.values(value)) {
    const matches = findMatches(child);
    if (matches) return matches;
  }
}

export function parseHubCalendar(document) {
  // Read the calendar embedded in the public group page. Ignore player and club data.
  const payload = [...document.querySelectorAll('script')].flatMap(script => {
    const frame = script.textContent.match(/^self\.__next_f\.push\((\[.*\])\)$/s);
    if (!frame) return [];
    const [type, content] = JSON.parse(frame[1]);
    return type === 1 && typeof content === 'string' ? [content] : [];
  }).join('');
  for (const line of payload.split('\n')) {
    if (!/^[a-f\d]+:[\[{]/i.test(line) || !line.includes('"matches":[')) continue;
    const fixtures = findMatches(JSON.parse(line.slice(line.indexOf(':') + 1)));
    if (!fixtures) continue;
    return fixtures.map(row => {
      if (!Number.isSafeInteger(row.id) || typeof row.home_team_name !== 'string' || typeof row.away_team_name !== 'string') {
        throw Error('Partit de HoqueiHub incomplet.');
      }
      const starts = typeof row.starts_at === 'string' && row.starts_at.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}$/);
      const score = row.status === 'played' && isScore(row.home_score) && isScore(row.away_score)
        ? [row.home_score, row.away_score] : null;
      return {id: row.id, home: row.home_team_name, away: row.away_team_name, date: starts?.[1] || '', time: starts?.[2] || '', score, suspended: !!row.suspes};
    });
  }
  throw Error('No s’ha trobat el calendari al grup de HoqueiHub.');
}

export async function fetchHubCalendar(path, DOMParser) {
  if (!/^\/group\/\d+-[a-z0-9-]+$/.test(path)) throw Error('Grup de HoqueiHub no vàlid.');
  const response = await fetch(new URL(path, base), {signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('HoqueiHub HTTP ' + response.status);
  return parseHubCalendar(new DOMParser().parseFromString(await response.text(), 'text/html'));
}

export function mergeHubCalendar(data, fixtures, {now, aliases = {}, log = () => {}}) {
  if (!data?.matches?.length) throw Error('Falta el calendari de la federació per enllaçar els partits.');
  const names = new Map(data.teams.map(name => [nameKey(name), name]));
  for (const [official, name] of Object.entries(data.officialNames || {})) {
    if (data.teams.includes(name)) names.set(nameKey(official), name);
  }
  for (const [alias, name] of Object.entries(aliases)) {
    if (data.teams.includes(name)) names.set(nameKey(alias), name);
  }
  const byPair = new Map();
  const ids = new Set();
  for (const fixture of fixtures) {
    if (ids.has(fixture.id)) throw Error('HoqueiHub ha retornat partits duplicats.');
    ids.add(fixture.id);
    const home = names.get(nameKey(fixture.home)), away = names.get(nameKey(fixture.away));
    if (!home || !away) continue;
    const key = pairKey(home, away);
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(fixture);
  }
  const pairs = new Map(), fixturesByMatch = new Map(), matchedIds = new Set();
  for (const match of data.matches) {
    const key = pairKey(match.home, match.away);
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(match);
  }
  for (const [key, matches] of pairs) {
    const options = byPair.get(key) || [];
    for (const match of matches) {
      if (!match.date || matches.filter(other => other.date === match.date).length !== 1) continue;
      const sameDate = options.filter(fixture => fixture.date === match.date);
      if (sameDate.length !== 1) continue;
      fixturesByMatch.set(match.id, sameDate[0]);
      matchedIds.add(sameDate[0].id);
    }
    const remaining = matches.filter(match => !fixturesByMatch.has(match.id));
    const unassigned = options.filter(fixture => !matchedIds.has(fixture.id));
    if (remaining.length === 1 && unassigned.length === 1) fixturesByMatch.set(remaining[0].id, unassigned[0]);
  }
  let changed = false;
  const matches = data.matches.map(match => {
    const fixture = fixturesByMatch.get(match.id);
    if (!fixture) return match;
    if (fixture.suspended || (match.score && !fixture.score)) return match;
    if (match.score && fixture.score && String(match.score) !== String(fixture.score) && match.scoreSource !== 'HoqueiHub') {
      log(`Resultat diferent per al partit ${match.id}. Es conserva el resultat de la federació.`);
      return match;
    }
    const date = fixture.date || match.date;
    const time = fixture.time && fixture.time !== '00:00' ? fixture.time : match.time;
    const scoreChanged = fixture.score && String(fixture.score) !== String(match.score);
    if (!scoreChanged && date === match.date && time === match.time) return match;
    changed = true;
    if (!scoreChanged) return {...match, date, time};
    return {...match, date, time, score: fixture.score, scoreSource: 'HoqueiHub', rosters: reconcileGoals(match.rosters || {}, fixture.score)};
  });
  const matched = fixturesByMatch.size;
  if (matched < data.matches.length * 0.8) {
    throw Error(`Només coincideixen ${matched} de ${data.matches.length} partits a HoqueiHub.`);
  }
  log(`${matched}/${data.matches.length} partits verificats a HoqueiHub.`);
  return {data: changed ? {...data, matches, updatedAt: new Date(now).toISOString(), calendarSource: 'HoqueiHub'} : data, changed, failed: 0, read: 0};
}
