import assert from 'node:assert/strict';
import { PANELES } from '../src/reglas.js';
import { filtrarDemografia, opciones, pacientes, resumen, unificarEspecie } from '../src/agregar.js';

const base = (p) => Object.fromEntries(Object.keys(PANELES[p].analitos).map((k) => [k, { estado: 'normal', severidad: null, g3: false }]));
const caso = (id, sexo, edadAnios, cambios = {}, bio = {}) => ({
  id, especie: 'canino', raza: 'Mestizo', sexo, edadAnios, hemograma: { ...base('hemograma'), ...cambios }, bioquimico: { ...base('bioquimico'), ...bio },
});

const rs = [
  caso('Archivo 1', 'Macho', 6, { hemoglobina: { estado: 'bajo', severidad: null, g3: false }, plaquetas: { estado: 'no_fiable', severidad: null, g3: false } }),
  caso('Archivo 2', 'Hembra', 2, { neutrofilos: { estado: 'alto', severidad: 'leve', g3: false } }),
  caso('Archivo 3', 'Hembra', 9, { plaquetas: { estado: 'bajo', severidad: 'moderada', g3: false }, hematocrito: { estado: 'no_medido', severidad: null, g3: false } }),
  caso('Archivo 4', 'Macho', 4, {}, { creatinina: { estado: 'alto', severidad: 'moderada', g3: true }, ggt: { estado: 'no_medido', severidad: null, g3: false } }),
];

const r = resumen(rs);
assert.equal(r.total, 4);
assert.equal(r.conAlterados, 3);
assert.equal(r.pctAlterados, 75);
assert.equal(r.conModerada, 1);
assert.deepEqual(r.plaquetas, { noFiables: 1, pctNoFiables: 25, medidasFiables: 3, bajas: 1, altas: 0 });
assert.equal(r.porAnalito.hemoglobina.alterados, 1);
assert.equal(r.porAnalito.hemoglobina.pct, 25);
assert.equal(r.porAnalito.hematocrito.medidos, 3);
assert.equal(r.porAnalito.plaquetas.pct, 33.3);
assert.deepEqual(r.alteradosPorPaciente.find((x) => x.n === 0), { n: 0, pacientes: 1 });

assert.equal(filtrarDemografia(rs, { sexo: 'Hembra' }).length, 2);
assert.equal(filtrarDemografia(rs, { edadMin: 4, edadMax: 6 }).length, 2);
assert.deepEqual(pacientes(rs, { analito: 'neutrofilos', estado: 'alto' }).map((x) => x.id), ['Archivo 2']);
assert.deepEqual(pacientes(rs, { severidad: 'moderada' }).map((x) => x.id), ['Archivo 3']);
assert.deepEqual(pacientes(rs, { plaquetasNoFiables: true }).map((x) => x.id), ['Archivo 1']);
assert.deepEqual(opciones(rs), { sexos: ['Hembra', 'Macho'], razas: ['Mestizo'], edadMax: 9 });

const mix = unificarEspecie([...rs, { ...caso('Archivo 5', 'Macho', 3), especie: 'felino' }]);
assert.equal(mix.resultados.length, 4);
assert.deepEqual(mix.rechazados, [{ id: 'Archivo 5', motivo: 'especie distinta a la tanda (canino)' }]);

const rb = resumen(rs, 'bioquimico');
assert.equal(rb.plaquetas, undefined);
assert.equal(rb.conAlterados, 1);
assert.equal(rb.pctAlterados, 25);
assert.equal(rb.conModerada, 1);
assert.equal(rb.porAnalito.creatinina.pct, 25);
assert.equal(rb.porAnalito.ggt.medidos, 3);
assert.equal(rb.porAnalito.creatinina.g3, 1);
assert.deepEqual(pacientes(rs, { analito: 'creatinina' }, 'bioquimico').map((x) => x.id), ['Archivo 4']);

const rg = resumen(rs, 'general');
assert.equal(rg.conAlterados, 4);
assert.equal(rg.conModerada, 2);
assert.equal(Object.keys(rg.porAnalito).length, 31);
assert.equal(rg.plaquetas.noFiables, 1);

console.log('OK agregar');
