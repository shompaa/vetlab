import assert from 'node:assert/strict';
import { RAZAS_INICIALES, coincidencias, coincide, excluirPorRaza } from '../src/razas.js';

const si = (raza, lista) => assert.equal(coincide(raza, lista), true, `${raza} debería coincidir con ${lista}`);
const no = (raza, lista) => assert.equal(coincide(raza, lista), false, `${raza} no debería coincidir con ${lista}`);

si('Bulldog Inglés', 'Bulldog Inglés');
si('BULLDOG INGLES', 'Bulldog Inglés');
si('bulldog  ingles', 'Bulldog Inglés');
si('Bulldog Ingles Mestizo', 'Bulldog Inglés');
si('English Bulldog', 'Bulldog Inglés');
si('Bulldog Frances', 'Bulldog Francés');
si('French Bulldog', 'Bulldog Francés');
si('Pug', 'Pug (Carlino)');
si('Carlino', 'Pug (Carlino)');
si('Pug Mestizo', 'Pug (Carlino)');
si('Pug (Carlino)', 'Pug (Carlino)');
si('Boston Terrier', 'Boston Terrier');
si('BostonTerrier', 'Boston Terrier');
si('Boston Terrer', 'Boston Terrier');
si('B ulldog Fr ances', 'Bulldog Francés');

no('Bulldog Inglés', 'Bulldog Francés');
no('Bulldog Francés', 'Bulldog Inglés');
no('American Bulldog', 'Bulldog Inglés');
no('Yorkshire Terrier', 'Boston Terrier');
no('Terrier', 'Boston Terrier');
no('Pastor Alemán', 'Pug (Carlino)');
no('Mestizo', 'Pug (Carlino)');
no('Dachshund', 'Pug (Carlino)');
no(null, 'Pug (Carlino)');
no('', 'Pug (Carlino)');

assert.deepEqual(RAZAS_INICIALES.map((r) => [r.nombre, r.excluir]), [['Bulldog Inglés', true], ['Bulldog Francés', true], ['Pug (Carlino)', true], ['Boston Terrier', true]]);

const pacientes = [{ raza: 'Pug' }, { raza: 'Bulldog Ingles' }, { raza: 'Mestizo' }, { raza: null }, { raza: 'Dachshund' }];
const r = excluirPorRaza(pacientes, RAZAS_INICIALES);
assert.deepEqual(r.incluidos.map((p) => p.raza), ['Mestizo', null, 'Dachshund']);
assert.deepEqual(r.excluidos, { 'Pug (Carlino)': 1, 'Bulldog Inglés': 1 });
assert.equal(r.totalExcluidos, 2);

const tomando = RAZAS_INICIALES.map((x) => (x.nombre.startsWith('Pug') ? { ...x, excluir: false } : x));
assert.equal(excluirPorRaza(pacientes, tomando).incluidos.length, 4);

const agregada = [...RAZAS_INICIALES, { nombre: 'Dachshund', excluir: true }];
assert.deepEqual(excluirPorRaza(pacientes, agregada).incluidos.map((p) => p.raza), ['Mestizo', null]);

const c = coincidencias(pacientes, agregada);
assert.deepEqual(c.find((x) => x.nombre === 'Pug (Carlino)'), { nombre: 'Pug (Carlino)', n: 1, vistas: { Pug: 1 } });
assert.equal(c.find((x) => x.nombre === 'Boston Terrier').n, 0);

console.log('OK razas');
