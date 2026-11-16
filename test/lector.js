import assert from 'node:assert/strict';
import { leerPanel } from '../src/parse.js';
import { PANELES, REFERENCIAS } from '../src/reglas.js';

const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] });

function hoja(clave, valores = {}, sin = []) {
  const panel = PANELES[clave];
  const items = [];
  let y = 700;
  for (const [k, def] of Object.entries(panel.analitos)) {
    y -= 12;
    if (sin.includes(k)) continue;
    const [min, max] = REFERENCIAS.canino[k];
    const normal = min == null ? undefined : String((min + max) / 2);
    const v = k in valores ? valores[k] : normal;
    items.push(item(def.etiqueta, panel.col.etiqueta[0] + 2, y));
    if (v !== undefined) items.push(item(v, panel.col.valor[0] + 5, y));
  }
  return items;
}

const leer = (clave, valores, sin) => leerPanel(clave, hoja(clave, valores, sin), 'canino', () => true);

const ok = leer('bioquimico');
assert.equal(ok.creatinina.estado, 'normal');

const sinCreatinina = leer('bioquimico', {}, ['creatinina']);
assert.equal(sinCreatinina.creatinina.estado, 'no_medido');
assert.equal(sinCreatinina.albumina.estado, 'normal');

assert.throws(() => leer('bioquimico', {}, ['creatinina', 'albumina', 'glucosa', 'ast', 'alt', 'ggt']), /layout inesperado en Bioquímico/);
assert.throws(() => leer('hemograma', {}, ['hematocrito']), /layout inesperado en Hemograma: faltan filas hematocrito/);

assert.equal(leer('hemograma', { reticulocitos_pct: '.' }).reticulocitos_pct.estado, 'no_medido');
assert.throws(() => leer('hemograma', { hematocrito: 'Mx coagulada' }), /muestra coagulada/);
assert.throws(() => leer('hemograma', { hematocrito: 'a' }), /valor ilegible en hematocrito: "a"/);
assert.equal(leer('bioquimico', { glucosa: '>500' }).glucosa.estado, 'no_medido');

console.log('OK lector');
