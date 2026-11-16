import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PANELES, REFERENCIAS } from './reglas.js';
import { NOMBRES } from './etiquetas.js';
import { clasificar } from './clasificar.js';

if (typeof window !== 'undefined') GlobalWorkerOptions.workerSrc = `${process.env.BASE ?? ''}/pdf.worker.min.mjs`;

const UNIDADES = { 'mm³': '/µL', Ft: 'fL' };
const ESPECIES = { CANINO: 'canino', FELINO: 'felino' };

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
const compacta = (s) => norm(s).replace(/[^A-Z0-9%/]/g, '');
const num = (s, fmt) => (fmt === 'miles' ? parseInt(s.replace(/\./g, ''), 10) : parseFloat(s.replace(',', '.')));

function filas(items) {
  const orden = items.filter((i) => i.str.trim()).sort((a, b) => b.transform[5] - a.transform[5]);
  const out = [];
  for (const it of orden) {
    const y = it.transform[5];
    const f = out.at(-1);
    if (f && Math.abs(f.y - y) <= 1.5) f.items.push(it);
    else out.push({ y, items: [it] });
  }
  return out.map((f) => f.items.map((i) => ({ x: i.transform[4], s: i.str })).sort((a, b) => a.x - b.x));
}

const col = (fila, [a, b]) => fila.filter((i) => i.x >= a && i.x < b).map((i) => i.s).join('');

/** Edad en años desde "6 años", "8 meses", "2a 1m" o "1 a 4 m". */
export function edadAnios(txt) {
  const t = txt ?? '';
  const parte = (re, dividir) => {
    const m = re.exec(t);
    return m ? parseFloat(m[1].replace(',', '.')) / dividir : 0;
  };
  const total =
    parte(/(\d+(?:[.,]\d+)?)\s*a(?:ños?)?(?![a-zñ])/i, 1) +
    parte(/(\d+(?:[.,]\d+)?)\s*m(?:es(?:es)?)?(?![a-zñ])/i, 12) +
    parte(/(\d+(?:[.,]\d+)?)\s*semanas?/i, 52) +
    parte(/(\d+(?:[.,]\d+)?)\s*d[ií]as?/i, 365);
  return total > 0 ? total : null;
}

const sinEspacios = (s) => s.replace(/\s+/g, '');

/** Ubica la hoja de cada panel por su título. Algunos PDF dejan espacios sueltos dentro de las palabras ("HEMO GRAMA"), así que se busca sin espacios. */
async function hojas(doc) {
  const hallado = {};
  const claves = Object.keys(PANELES);
  for (let p = 1; p <= doc.numPages && Object.keys(hallado).length < claves.length; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    const txt = items.map((i) => i.str).join(' ');
    const plano = sinEspacios(txt);
    for (const k of claves) {
      if (!hallado[k] && PANELES[k].pagina.test(plano)) hallado[k] = { items, txt, plano };
    }
  }
  return hallado;
}

/**
 * Lee un panel. `estado` recoge lo que no se pudo leer: `notas` (valores tomados como sin dato) y
 * `problema` (un valor que no es número ni un "<"/">": la muestra no sirve y el panel no se cuenta).
 */
export function leerPanel(clave, items, especie, confiable, estado = { notas: [], problema: null }) {
  const panel = PANELES[clave];
  const rows = filas(items);
  const claves = Object.entries(panel.analitos).map(([k, v]) => [k, compacta(v.etiqueta)]).sort((x, y) => y[1].length - x[1].length);
  const crudos = {};
  const leidas = [];
  for (const f of rows) {
    const txt = norm(col(f, panel.col.etiqueta));
    if (txt) leidas.push(txt);
    const lab = compacta(txt);
    const k = lab && claves.find(([, e]) => lab === e || lab.startsWith(e) || (e.length >= 8 && lab.includes(e)))?.[0];
    if (!k || crudos[k]) continue;
    crudos[k] = f;
  }
  const faltan = Object.keys(panel.analitos).filter((k) => !crudos[k]);
  const toleradas = panel.tolerante ? Math.floor(Object.keys(panel.analitos).length / 3) : 0;
  if (faltan.length > toleradas) throw new Error(`layout inesperado en ${panel.nombre}: faltan filas ${faltan.join(', ')} (etiquetas leídas: ${leidas.slice(0, 25).join(' | ')})`);
  const out = armar(clave, crudos, especie, confiable, estado);
  return estado.problema ? armar(clave, {}, especie, confiable) : out;
}

function armar(clave, crudos, especie, confiable, estado = { notas: [], problema: null }) {
  const panel = PANELES[clave];
  const out = {};
  for (const [k, def] of Object.entries(panel.analitos)) {
    const f = crudos[k];
    const v = f ? col(f, panel.col.valor) : '';
    const [refMin, refMax] = REFERENCIAS[especie][k];
    let valor = v ? num(v, def.valor) : null;
    if (valor !== null && Number.isNaN(valor)) {
      if (refMin != null && /^\s*[<>≤≥]/.test(v)) estado.notas.push(`${NOMBRES[k]} «${v.trim()}» se tomó como sin dato`);
      else if (refMin != null) estado.problema ??= `${NOMBRES[k]} «${v.trim()}»`;
      valor = null;
    }
    const pct = f && panel.col.pct ? col(f, panel.col.pct) : '';
    const u = f ? col(f, panel.col.unidad) : '';
    const base = { valor, refMin, refMax };
    out[k] = {
      ...base,
      unidad: UNIDADES[u] ?? u,
      pct: pct ? parseFloat(pct) : null,
      ...clasificar(especie, k, base, confiable(k)),
    };
  }
  return out;
}

const dato = (s) => (s && !/^no informad/i.test(s) ? s : null);
const titulo = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : s);
const SEXOS = { HEMBRA: 'Hembra', MACHO: 'Macho' };

function cabeceraHemograma(items) {
  const cab = {};
  for (const f of filas(items)) {
    const e = f[0]?.s.trim();
    if (f[0].x < 100 && e?.endsWith(':')) cab[norm(e.slice(0, -1))] = col(f, [130, 350]).trim();
  }
  return cab;
}

/** Sin la hoja del hemograma, raza, sexo y edad se toman del encabezado de la hoja bioquímica ("RAZA BORDER COLLIE", "SEXO:HEMBRA"). */
export function cabeceraBioquimico(items) {
  const cab = {};
  for (const f of filas(items)) {
    const m = /^(RAZA|SEXO|EDAD)\s*:?\s*(.+)$/i.exec(col(f, PANELES.bioquimico.col.etiqueta).trim());
    if (m) cab[m[1].toUpperCase()] = m[2].trim();
  }
  return cab;
}

export async function parsearHemograma(buffer) {
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const doc = await task.promise;
    const h = await hojas(doc);
    if (!h.hemograma && !h.bioquimico) throw new Error('layout inesperado: no hay hoja HEMOGRAMA ni PERFIL BIOQUIMICO');
    const plano = (h.hemograma ?? h.bioquimico).plano.toUpperCase();
    const nombreEspecie = /(CANINO|FELINO)/.exec(plano)?.[1];
    const especie = ESPECIES[nombreEspecie];
    if (!especie || !REFERENCIAS[especie]) {
      throw new Error(nombreEspecie ? `HemoPuppy solo analiza perros: este informe es de ${nombreEspecie}` : 'no se pudo determinar la especie del informe (se esperaba canino)');
    }

    const cab = h.hemograma ? cabeceraHemograma(h.hemograma.items) : cabeceraBioquimico(h.bioquimico.items);
    const agregados = h.hemograma ? /AGREGADOSPLAQUETARIOS/.test(h.hemograma.plano.toUpperCase()) : false;
    const advertencias = [];
    const cuenta = {};
    const paneles = {};
    for (const clave of Object.keys(PANELES)) {
      const hoja = h[clave];
      const nombre = PANELES[clave].nombre;
      cuenta[clave] = false;
      paneles[clave] = armar(clave, {}, especie, () => true);
      if (!hoja) {
        advertencias.push(`Sin hoja de ${nombre}: no se cuenta en ese examen`);
        continue;
      }
      const estado = { notas: [], problema: null };
      const confiable = clave === 'hemograma' ? (k) => !(k === 'plaquetas' && agregados) : () => true;
      const datos = leerPanel(clave, hoja.items, especie, confiable, estado);
      advertencias.push(...estado.notas);
      if (estado.problema) advertencias.push(`${nombre} con problemas, no se cuenta: ${estado.problema}`);
      else {
        paneles[clave] = datos;
        cuenta[clave] = true;
      }
    }
    if (!cuenta.hemograma && !cuenta.bioquimico) throw new Error(advertencias.join('; '));

    const raza = dato(cab.RAZA);
    const sexo = dato(cab.SEXO);
    return {
      especie,
      raza: raza && titulo(raza),
      sexo: sexo && (SEXOS[norm(sinEspacios(sexo))] ?? titulo(sexo)),
      edad: dato(cab.EDAD),
      edadAnios: edadAnios(dato(cab.EDAD)),
      agregadosPlaquetarios: agregados,
      cuenta,
      advertencias,
      ...paneles,
    };
  } finally {
    await task.destroy();
  }
}
