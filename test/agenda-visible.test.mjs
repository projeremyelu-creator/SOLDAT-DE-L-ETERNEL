import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {agendaVisible} from '../frontend/agenda-visible.js';
import {PHARE_DEFAUT} from '../frontend/evenement-phare.js';

const novembre=Date.parse('2026-11-09T10:00:00Z');
test('La TPA publique complète le prochain rendez-vous sans inventer une inscription',()=>{
 const liste=agendaVisible([],PHARE_DEFAUT,novembre);
 assert.equal(liste.length,1);
 assert.equal(liste[0].source,'programme-public');
 assert.equal(liste[0].date,'2026-12-18');
 assert.equal(liste[0].inscrit,undefined);
 assert.equal(liste[0].fiche,'/programmes#tpa-2026');
 const source=readFileSync('frontend/operations.jsx','utf8');
 assert.match(source,/const next=agendaVisible\(news\.data\?\.evenements,phare\)\[0\]/);
 assert.match(source,/Rencontres annoncées',agendaVisible\(d\.evenements,phare\)\.length/);
});

test('Une rencontre interne homonyme reste unique et une date passée disparaît',()=>{
 const interne={id:'x',titre:'Traversée Prophétique Annuelle — TPA 2026',date:'2026-12-18',heure:'20:00',inscrit:true};
 assert.deepEqual(agendaVisible([interne],PHARE_DEFAUT,novembre),[interne]);
 assert.deepEqual(agendaVisible([],PHARE_DEFAUT,Date.parse('2026-12-19T00:00:00Z')),[]);
 const avant={id:'autre',titre:'Veillée',date:'2026-12-01',heure:'18:00'};
 assert.equal(agendaVisible([avant],PHARE_DEFAUT,novembre)[0],avant);
});
