/**
 * Razas que se pueden dejar fuera del análisis (por ejemplo, braquicéfalas, que casi siempre salen alteradas).
 * `tomar: false` = los pacientes de esa raza no se cuentan.
 */
export const RAZAS_INICIALES = ['Bulldog Inglés', 'Bulldog Francés', 'Pug (Carlino)', 'Boston Terrier'].map((nombre) => ({ nombre, tomar: false }));

const ALIAS = {
  bulldogingles: ['English Bulldog'],
  bulldogfrances: ['French Bulldog', 'Bouledogue Français'],
};

const letras = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const clave = (s) => letras(s).replace(/ /g, '');

/** Nombres con los que se reconoce una raza de la lista: el nombre, lo que va entre paréntesis y sus alias ("Pug (Carlino)" → pug, carlino). */
function variantes(nombre) {
  const partes = nombre.split(/[()]/).map(clave).filter(Boolean);
  return [...new Set([clave(nombre), ...partes, ...(ALIAS[clave(nombre)] ?? []).map(clave)])];
}

function distancia(a, b) {
  let fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    for (let j = 1; j <= b.length; j++) nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    fila = nueva;
  }
  return fila[b.length];
}

const parecido = (a, b) => 1 - distancia(a, b) / Math.max(a.length, b.length);

/**
 * ¿La raza escrita en el PDF corresponde a la de la lista? Ignora mayúsculas, tildes y espacios (también los sueltos que dejan
 * algunos PDF), acepta que el PDF agregue algo ("Pug mestizo") y tolera pequeños errores de tipeo (parecido ≥ 85 %).
 */
export function coincide(razaPdf, nombreLista) {
  const r = clave(razaPdf ?? '');
  if (!r) return false;
  const palabras = letras(razaPdf).split(' ');
  return variantes(nombreLista).some((v) => r === v || (v.length >= 4 && r.includes(v)) || palabras.includes(v) || parecido(r, v) >= 0.85);
}

/** Separa los pacientes cuya raza está en la lista con `tomar: false`. `excluidos` cuenta cuántos salieron por cada raza de la lista. */
export function excluirPorRaza(rs, razas) {
  const fuera = razas.filter((r) => !r.tomar);
  const excluidos = {};
  const incluidos = [];
  for (const p of rs) {
    const hit = fuera.find((r) => coincide(p.raza, r.nombre));
    if (hit) excluidos[hit.nombre] = (excluidos[hit.nombre] ?? 0) + 1;
    else incluidos.push(p);
  }
  return { incluidos, excluidos, totalExcluidos: Object.values(excluidos).reduce((a, b) => a + b, 0) };
}

/** Para cada raza de la lista, con qué razas escritas en esta tanda coincide (sirve para comprobar que el match es el esperado). */
export function coincidencias(rs, razas) {
  return razas.map((r) => {
    const vistas = {};
    for (const p of rs) if (coincide(p.raza, r.nombre)) vistas[p.raza] = (vistas[p.raza] ?? 0) + 1;
    return { nombre: r.nombre, n: Object.values(vistas).reduce((a, b) => a + b, 0), vistas };
  });
}
