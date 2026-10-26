import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parsearHemograma } from '../src/parse.js';

const FIXTURE = 'fixtures/muestra-canino.pdf';
if (!fs.existsSync(FIXTURE)) {
  console.log('Sin fixtures/muestra-canino.pdf: se omiten las pruebas con PDF real (los PDF reales traen datos de pacientes y no se suben al repositorio).');
  process.exit(0);
}

const r = await parsearHemograma(fs.readFileSync(FIXTURE));

assert.equal(r.especie, 'canino');
assert.equal(r.raza, 'Mestizo');
assert.equal(r.sexo, 'Macho');
assert.equal(r.edadAnios, 6);
assert.equal(r.agregadosPlaquetarios, true);

const a = r.hemograma;
assert.deepEqual([a.eritrocitos.valor, a.eritrocitos.refMin, a.eritrocitos.refMax], [5.74, 5.5, 8.5]);
assert.equal(a.hematocrito.valor, 38.1);
assert.equal(a.vcm.unidad, 'fL');
assert.equal(a.leucocitos.valor, 22580);
assert.equal(a.neutrofilos.pct, 75);
assert.equal(a.plaquetas.valor, 142800);
assert.equal(a.reticulocitos_pct.estado, 'no_medido');
assert.equal(a.basofilos.estado, 'no_medido');

const alterados = Object.entries(a).filter(([, x]) => x.estado === 'alto' || x.estado === 'bajo').map(([k, x]) => `${k}:${x.estado}`);
assert.deepEqual(alterados.sort(), ['chcm:bajo', 'hemoglobina:bajo', 'leucocitos:alto', 'monocitos:alto', 'neutrofilos:alto']);
assert.equal(a.neutrofilos.severidad, 'leve');
assert.equal(a.hemoglobina.severidad, null);
assert.equal(a.plaquetas.estado, 'no_fiable');

const b = r.bioquimico;
assert.deepEqual([b.proteinas_totales.valor, b.proteinas_totales.refMin, b.proteinas_totales.refMax], [5.82, 5.4, 7.1]);
assert.deepEqual([b.nus.refMin, b.nus.refMax], [8, 31]);
assert.deepEqual([b.ggt.valor, b.ggt.refMin, b.ggt.refMax], [3, 0, 10]);
assert.equal(b.albumina.unidad, 'g/dL');
assert.equal(b.indice_ag.unidad, '');
const alteradosBio = Object.entries(b).filter(([, x]) => x.estado === 'alto' || x.estado === 'bajo').map(([k, x]) => `${k}:${x.estado}`);
assert.deepEqual(alteradosBio.sort(), ['ast:bajo', 'bilirrubina_total:bajo', 'creatinina:bajo', 'fosfatasa_alcalina:alto']);
assert.equal(b.fosfatasa_alcalina.severidad, 'leve');

console.log('OK muestra', alterados.join(' '), '|', alteradosBio.join(' '));
