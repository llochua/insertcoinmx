// Resumen de sobres: las invitaciones editoriales deben conducir al relato real.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../content/card-texts.js',import.meta.url),'utf8'),context);
const texts=context.window.ICMX_CARD_TEXTS;

const label=(id,variant)=>{
 const story=variant==='e'?texts[id]?.holo:variant==='r'?texts[id]?.dorada:'';
 return story?(variant==='e'?'Así se diseñó':'Leer la anécdota'):'';
};

test('Los escenarios aprobados muestran una invitación solo con relato',()=>{
 assert.equal(label('gatosamurai','f'),'');
 assert.equal(label('abuket','e'),'Así se diseñó');
 assert.equal(label('arcade','r'),'Leer la anécdota');
 assert.equal(label('arcade','b'),'');
});

test('La pista está dentro de las cartas del resumen, también en la protagonista',()=>{
 assert.match(html,/const summaryStoryCta=c=>storyFor\(c\)/);
 assert.match(html,/<span class="rc-story-cta">/);
 assert.match(html,/class="rh-story-cta" data-k="\$\{H\.k\}"/);
 assert.match(html,/\.rs2 \.rc-story-cta\{/);
 assert.match(html,/@media\(max-width:360px\)/);
});

test('Al tocar una pista se llega primero a la historia sin perder la vista ampliada',()=>{
 const narrative=html.indexOf('id="zNarrative"');
 const voting=html.indexOf('id="zVoting"');
 assert.ok(narrative>=0&&voting>narrative,'El relato aparece antes de la calificación');
 assert.match(html,/storyFirst:!!e\.target\.closest\('\.rc-story-cta,\.rh-story-cta'\)/);
 assert.match(html,/narrative\.scrollIntoView\(\{block:'start',behavior:'auto'\}\)/);
 assert.match(html,/function openCard\(k,options=\{\}\)/);
});

test('La espera usa el contador real y conserva el acceso al álbum',()=>{
 assert.match(html,/id="sNextTime"\>\$\{nextPackCountdown\(\)\}<\/time>/);
 assert.match(html,/Recibirás 2 sobres nuevos en el siguiente ciclo de 6 horas/);
 assert.match(html,/refreshSummaryActions\(\)/);
 assert.match(html,/id="sAlb"/);
 assert.doesNotMatch(html,/Vista de propuesta/);
});
