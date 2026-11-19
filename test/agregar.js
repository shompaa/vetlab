import assert from 'node:assert/strict';
import { PANELES } from '../src/reglas.js';
import { alteracionesPorEdad, filtrarDemografia, opciones, pacientes, resumen, unificarEspecie, unificarTextos } from '../src/agregar.js';

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
assert.deepEqual(r.alteradosPorPaciente.find((x) => x.n === 0), { n: 0, pacientes: 1, moderada: 0 });

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

const porEdad = alteracionesPorEdad([...rs, caso('Archivo 6', 'Macho', 0.5), { ...caso('Archivo 7', 'Hembra', 12, { vcm: { estado: 'alto', severidad: null, g3: false } }), edadAnios: 12 }, { ...caso('Archivo 8', 'Hembra', null), edadAnios: null }]);
assert.deepEqual(porEdad.map((t) => [t.nombre, t.total, t.alterados]), [['Menos de 1', 1, 0], ['1 a 3', 1, 1], ['4 a 6', 2, 2], ['7 a 9', 1, 1], ['10 o más', 1, 1], ['Sin edad', 1, 0]]);
assert.equal(porEdad.find((t) => t.nombre === '4 a 6').pct, 100);

const sinHemo = { ...caso('Archivo 9', 'Hembra', 3, {}, { creatinina: { estado: 'alto', severidad: null, g3: false } }), cuenta: { hemograma: false, bioquimico: true } };
const con = [{ ...rs[0], cuenta: { hemograma: true, bioquimico: true } }, sinHemo];
const g = resumen(con, 'general');
assert.equal(g.total, 2);
assert.deepEqual(g.porPanel, { hemograma: 1, bioquimico: 2 });
assert.deepEqual(g.origen, { hemograma: { n: 1, de: 1 }, bioquimico: { n: 1, de: 2 }, ambos: { n: 0, de: 1 } });
assert.equal(resumen(con, 'hemograma').total, 1);
assert.equal(resumen(con, 'bioquimico').total, 2);
assert.equal(resumen(con, 'bioquimico').conAlterados, 1);
assert.equal(g.plaquetas.pctNoFiables, 100);

const textos = unificarTextos([{ raza: 'Pastor Americano', sexo: 'Hembra' }, { raza: 'P astor Amer ic ano', sexo: 'Hembr a' }, { raza: null, sexo: 'Macho' }]);
assert.deepEqual(textos.map((t) => t.raza), ['Pastor Americano', 'Pastor Americano', null]);
assert.deepEqual(textos.map((t) => t.sexo), ['Hembra', 'Hembra', 'Macho']);

const bioPorEdad = alteracionesPorEdad(rs, 'bioquimico');
assert.deepEqual(bioPorEdad.map((t) => [t.nombre, t.total, t.alterados]), [['1 a 3', 1, 0], ['4 a 6', 2, 1], ['7 a 9', 1, 0]]);
const hemoPorEdad = alteracionesPorEdad(rs, 'hemograma');
assert.deepEqual(hemoPorEdad.map((t) => [t.nombre, t.alterados]), [['1 a 3', 1], ['4 a 6', 1], ['7 a 9', 1]]);

const alts = resumen(rs, 'hemograma').alteraciones;
assert.deepEqual([alts.total, alts.alto, alts.bajo, alts.leve, alts.moderada, alts.g3, alts.sinEscala], [3, 1, 2, 1, 1, 0, 1]);
assert.equal(resumen(rs, 'bioquimico').alteraciones.g3, 1);
assert.equal(resumen(rs, 'general').alteraciones.total, 4);

console.log('OK agregar');
