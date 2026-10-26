import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PANELES, REFERENCIAS } from './reglas.js';
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

function rango(txt, analito, def) {
  if (!txt) return [null, null];
  const t = txt.replace(/[–—]/g, '-').trim();
  const div = def.refDiv ?? 1;
  const tope = /^<\s*([\d.,]+)$/.exec(t);
  if (tope) return [0, num(tope[1], def.ref) / div];
  const p = t.split('-').map((s) => s.trim());
  if (p.length !== 2 || p.some((s) => !/^[\d.,]+$/.test(s))) throw new Error(`referencia ilegible en ${analito}: "${txt}"`);
  return p.map((s) => num(s, def.ref) / div);
}

export function edadAnios(txt) {
  const m = /(\d+(?:[.,]\d+)?)\s*(año|mes|semana|dia)/i.exec(txt ?? '');
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return { año: n, mes: n / 12, semana: n / 52, dia: n / 365 }[m[2].toLowerCase()];
}

async function hojas(doc) {
  const hallado = {};
  const claves = Object.keys(PANELES);
  for (let p = 1; p <= doc.numPages && Object.keys(hallado).length < claves.length; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    const txt = items.map((i) => i.str).join(' ');
    for (const k of claves) {
      const m = !hallado[k] && PANELES[k].pagina.exec(txt);
      if (m) hallado[k] = { items, txt, m };
    }
  }
  return hallado;
}

function leerPanel(clave, items, especie, confiable) {
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
  if (faltan.length) throw new Error(`layout inesperado en ${panel.nombre}: faltan filas ${faltan.join(', ')} (etiquetas leídas: ${leidas.slice(0, 25).join(' | ')})`);

  const out = {};
  for (const [k, f] of Object.entries(crudos)) {
    const def = panel.analitos[k];
    const v = col(f, panel.col.valor);
    let valor = v ? num(v, def.valor) : null;
    if (valor !== null && Number.isNaN(valor)) {
      if (!panel.tolerante) throw new Error(`valor ilegible en ${k}: "${v}"`);
      valor = null;
    }
    const [refMin, refMax] = REFERENCIAS[especie]?.[k] ?? rango(col(f, panel.col.ref), k, def);
    const pct = panel.col.pct ? col(f, panel.col.pct) : '';
    const u = col(f, panel.col.unidad);
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

export async function parsearHemograma(buffer) {
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const doc = await task.promise;
    const h = await hojas(doc);
    if (!h.hemograma) throw new Error('layout inesperado: falta el titulo HEMOGRAMA');
    if (!h.bioquimico) throw new Error('layout inesperado: falta la hoja PERFIL BIOQUIMICO');
    const especie = ESPECIES[norm(h.hemograma.m[1])];
    if (!especie) throw new Error(`especie sin reglas: ${h.hemograma.m[1]}`);

    const cab = {};
    for (const f of filas(h.hemograma.items)) {
      const e = f[0]?.s.trim();
      if (f[0].x < 100 && e?.endsWith(':')) cab[norm(e.slice(0, -1))] = col(f, [130, 350]).trim();
    }

    const agregados = /agregados\s+plaquetarios/i.test(h.hemograma.txt);
    return {
      especie,
      raza: cab.RAZA || null,
      sexo: cab.SEXO || null,
      edad: cab.EDAD || null,
      edadAnios: edadAnios(cab.EDAD),
      agregadosPlaquetarios: agregados,
      hemograma: leerPanel('hemograma', h.hemograma.items, especie, (k) => !(k === 'plaquetas' && agregados)),
      bioquimico: leerPanel('bioquimico', h.bioquimico.items, especie, () => true),
    };
  } finally {
    await task.destroy();
  }
}
