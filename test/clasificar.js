import assert from 'node:assert/strict';
import { clasificar } from '../src/clasificar.js';

const hto = (esp, valor) => clasificar(esp, 'hematocrito', { valor, refMin: 37, refMax: 55 });
assert.deepEqual(hto('canino', 32), { estado: 'bajo', severidad: 'leve', g3: false });
assert.deepEqual(hto('canino', 28), { estado: 'bajo', severidad: 'moderada', g3: false });
assert.deepEqual(hto('canino', 18), { estado: 'bajo', severidad: 'moderada', g3: true });
assert.equal(hto('felino', 27).severidad, 'leve');
assert.equal(hto('felino', 24).severidad, 'moderada');
const neu = (valor) => clasificar('canino', 'neutrofilos', { valor, refMin: 3000, refMax: 12000 });
assert.equal(neu(1400).severidad, 'moderada');
assert.equal(neu(60000).severidad, 'moderada');
assert.equal(neu(120000).g3, true);
const plq = clasificar('canino', 'plaquetas', { valor: 90000, refMin: 145000, refMax: 500000 });
assert.deepEqual(plq, { estado: 'bajo', severidad: 'moderada', g3: false });

const bio = (a, valor, refMin, refMax) => clasificar('canino', a, { valor, refMin, refMax });
assert.deepEqual(bio('creatinina', 2.0, 0.5, 1.5), { estado: 'alto', severidad: 'leve', g3: false });
assert.deepEqual(bio('creatinina', 2.5, 0.5, 1.5), { estado: 'alto', severidad: 'moderada', g3: false });
assert.equal(bio('creatinina', 3.1, 0.5, 1.5).g3, true);
assert.deepEqual(bio('albumina', 1.4, 2.6, 3.3), { estado: 'bajo', severidad: 'moderada', g3: true });
assert.deepEqual(bio('fosforo', 8, 2.6, 6.2), { estado: 'alto', severidad: 'leve', g3: false });
assert.equal(bio('colesterol', 400, 135, 270).severidad, null);
assert.equal(clasificar('felino', 'creatinina', { valor: 9, refMin: 0.5, refMax: 1.5 }).severidad, null);

console.log('OK clasificar');
