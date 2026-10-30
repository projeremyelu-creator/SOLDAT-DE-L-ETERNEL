import {test} from 'node:test';import assert from 'node:assert/strict';
import {infireState,tpaState} from '../frontend/event-clock.js';
test('IN FIRE : compte à rebours sur l’heure officielle d’Abidjan',()=>{
 assert.deepEqual(infireState(Date.parse('2026-10-28T08:30:00Z')),{phase:'upcoming',days:3,hours:0,minutes:0,seconds:0});
 assert.deepEqual(infireState(Date.parse('2026-10-31T08:29:59Z')),{phase:'upcoming',days:0,hours:0,minutes:0,seconds:1});
});
test('IN FIRE : bascule en cours puis archive sans compte à rebours négatif',()=>{
 assert.equal(infireState(Date.parse('2026-10-31T08:30:00Z')).phase,'ongoing');
 assert.equal(infireState(Date.parse('2026-10-31T18:00:00Z')).phase,'finished');
 assert.equal(infireState(Date.parse('2027-01-01')).seconds,0);
});

test('TPA prend automatiquement le relais après IN FIRE, heure Abidjan',()=>{
 assert.equal(tpaState(Date.parse('2026-10-31T17:59:59Z')).phase,'hidden');
 assert.equal(tpaState(Date.parse('2026-10-31T18:00:00Z')).phase,'upcoming');
 assert.deepEqual(tpaState(Date.parse('2026-12-18T19:59:59Z')),
  {phase:'upcoming',days:0,hours:0,minutes:0,seconds:1});
 assert.equal(tpaState(Date.parse('2026-12-18T20:00:00Z')).phase,'day-of');
 assert.equal(tpaState(Date.parse('2026-12-19T00:00:00Z')).phase,'hidden');
});
