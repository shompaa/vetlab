import assert from 'node:assert/strict';
import { cabeceraBioquimico, edadAnios, leerPanel } from '../src/parse.js';
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

const estado = () => ({ notas: [], problema: null });
const conEstado = (clave, valores) => {
  const e = estado();
  return { out: leerPanel(clave, hoja(clave, valores), 'canino', () => true, e), e };
};

const punto = conEstado('hemograma', { reticulocitos_pct: '.' });
assert.equal(punto.out.reticulocitos_pct.estado, 'no_medido');
assert.deepEqual(punto.e, { notas: [], problema: null });

for (const texto of ['Mx coagulada', 'a']) {
  const { out, e } = conEstado('hemograma', { hematocrito: texto });
  assert.equal(e.problema, `Hematocrito «${texto}»`);
  assert.ok(Object.values(out).every((a) => a.estado === 'no_medido'), 'un panel con problemas queda sin datos');
}

const alto = conEstado('bioquimico', { glucosa: '>500' });
assert.equal(alto.out.glucosa.estado, 'no_medido');
assert.equal(alto.out.albumina.estado, 'normal');
assert.deepEqual(alto.e, { notas: ['Glucosa «>500» se tomó como sin dato'], problema: null });

const x = (str, xPos, y) => item(str, xPos, y);
const cab = cabeceraBioquimico([x('NOMBRE:', 62, 800), x('RAZA', 62, 788), x('BORDER COLLIE', 90, 788), x('ESPECIE:CANINO', 62, 776), x('EDAD:NO INFORMADO', 62, 764), x('SEXO:HEMBRA', 62, 752)]);
assert.deepEqual(cab, { RAZA: 'BORDER COLLIE', EDAD: 'NO INFORMADO', SEXO: 'HEMBRA' });

assert.equal(edadAnios('6 años'), 6);
assert.equal(edadAnios('2a 1m'), 2 + 1 / 12);
assert.equal(edadAnios('1 a 4 m'), 1 + 4 / 12);
assert.equal(edadAnios('8 meses'), 8 / 12);
assert.equal(edadAnios('12 semanas'), 12 / 52);
assert.equal(edadAnios('NO INFORMADO'), null);
assert.equal(edadAnios(undefined), null);

console.log('OK lector');
