import {test} from 'node:test';import assert from 'node:assert/strict';
import {infireState} from '../frontend/event-clock.js';
test('IN FIRE : compte à rebours sur l’heure officielle d’Abidjan',()=>{
 assert.deepEqual(infireState(Date.parse('2026-10-28T08:30:00Z')),{phase:'upcoming',days:3,hours:0,minutes:0,seconds:0});
 assert.deepEqual(infireState(Date.parse('2026-10-31T08:29:59Z')),{phase:'upcoming',days:0,hours:0,minutes:0,seconds:1});
});
test('IN FIRE : bascule en cours puis archive sans compte à rebours négatif',()=>{
 assert.equal(infireState(Date.parse('2026-10-31T08:30:00Z')).phase,'ongoing');
 assert.equal(infireState(Date.parse('2026-10-31T18:00:00Z')).phase,'finished');
 assert.equal(infireState(Date.parse('2027-01-01')).seconds,0);
});
