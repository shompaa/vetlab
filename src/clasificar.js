import { ESCALAS } from './reglas.js';

export function clasificar(especie, analito, { valor, refMin, refMax }, confiable = true) {
  if (valor == null) return { estado: 'no_medido', severidad: null, g3: false };
  if (refMin == null || refMax == null) return { estado: 'sin_referencia', severidad: null, g3: false };
  if (!confiable) return { estado: 'no_fiable', severidad: null, g3: false };
  const dir = valor < refMin ? 'bajo' : valor > refMax ? 'alto' : null;
  if (!dir) return { estado: 'normal', severidad: null, g3: false };
  const esc = ESCALAS[especie]?.[analito]?.[dir];
  if (!esc) return { estado: dir, severidad: null, g3: false };
  const bajo = dir === 'bajo';
  const u = esc.xULN ? refMax : 1;
  const moderada = bajo ? valor < esc.moderada * u : valor >= esc.moderada * u;
  const g3 = bajo ? valor < esc.g3 * u : valor > esc.g3 * u;
  return { estado: dir, severidad: moderada ? 'moderada' : 'leve', g3 };
}
