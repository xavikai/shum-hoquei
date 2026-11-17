import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from 'linkedom';
import {mergeHubCalendar, parseHubCalendar} from '../scripts/hoqueihub.mjs';

const kickoff = '2026-11-14T16:15:00+01:00';
const feedRow = {id: 10, home_team_name: 'SHUM FRIT RAVICH', away_team_name: 'CLUB PATÍ CUBELLES A',
  starts_at: kickoff, status: 'played', home_score: 0, away_score: 6};
const snapshot = (matches) => {
  const payload = 'a:' + JSON.stringify(['$', 'div', null, {matches}]) + '\n';
  const html = '<script>self.__next_f.push(' + JSON.stringify([1, payload]) + ')</script>';
  return new DOMParser().parseFromString(html, 'text/html');
};
const match = {id: '8-0-6', date: '2026-11-14', time: '16:15', home: 'SHUM Frit Ravich', away: 'CP Cubelles A', officialId: '152276', score: null};
const published = matches => ({matches, teams: [match.home, match.away], officialNames: {'CLUB PATI CUBELLES A': match.away}});
const now = Date.parse('2026-11-17T00:00:00Z');

test('reads final scores and scheduled times from the public group page', () => {
  const [played, scheduled] = parseHubCalendar(snapshot([
    feedRow, {...feedRow, id: 11, status: 'scheduled', home_score: 0, away_score: 0}
  ]));
  assert.deepEqual(played.score, [0, 6]);
  assert.equal(played.date, '2026-11-14');
  assert.equal(played.time, '16:15');
  assert.equal(scheduled.score, null);
});

test('a postponed repeat is linked after assigning the fixture whose date already matches', () => {
  const repeat = {...match, id: '15-0-6', officialId: '152299', date: '2027-01-09'};
  const fixtures = parseHubCalendar(snapshot([
    feedRow, {...feedRow, id: 11, starts_at: '2027-01-10T10:00:00+01:00', home_score: 3, away_score: 0}
  ]));
  const {data} = mergeHubCalendar(published([match, repeat]), fixtures, {now});
  assert.deepEqual(data.matches[0].score, [0, 6]);
  assert.equal(data.matches[0].officialId, match.officialId);
  assert.equal(data.matches[0].scoreSource, 'HoqueiHub');
  assert.deepEqual(data.matches[1].score, [3, 0]);
  assert.equal(data.matches[1].date, '2027-01-10');
  assert.equal(data.calendarSource, 'HoqueiHub');
});

test('retains a confirmed federation score if the alternative disagrees', () => {
  const previous = published([{...match, score: [0, 5]}]);
  const {data, changed} = mergeHubCalendar(previous, parseHubCalendar(snapshot([feedRow])), {now});
  assert.equal(changed, false);
  assert.equal(data, previous);
});

test('an incomplete or unrelated calendar cannot overwrite the published fixtures', () => {
  const fixtures = parseHubCalendar(snapshot([{...feedRow, away_team_name: 'Un altre equip'}]));
  assert.throws(() => mergeHubCalendar(published([match]), fixtures, {now}), /Només coincideixen 0/);
});
