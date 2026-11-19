import { PANELES } from './reglas.js';

const claves = (panel) => (panel === 'general' ? Object.keys({ ...PANELES.hemograma.analitos, ...PANELES.bioquimico.analitos }) : Object.keys(PANELES[panel].analitos));
const datos = (r, panel) => (panel === 'general' ? { ...r.hemograma, ...r.bioquimico } : r[panel]);
const alterado = (a) => a.estado === 'alto' || a.estado === 'bajo';
const cuenta = (r, panel) => panel === 'general' || r.cuenta?.[panel] !== false;
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export function opciones(rs) {
  const u = (f) => [...new Set(rs.map(f).filter(Boolean))].sort();
  const edades = rs.map((r) => r.edadAnios).filter((e) => e != null);
  return { sexos: u((r) => r.sexo), razas: u((r) => r.raza), edadMax: edades.length ? Math.ceil(Math.max(...edades)) : 0 };
}

export function filtrarDemografia(rs, { sexo, raza, edadMin, edadMax } = {}) {
  return rs.filter(
    (r) =>
      (!sexo || r.sexo === sexo) &&
      (!raza || r.raza === raza) &&
      (edadMin == null || (r.edadAnios != null && r.edadAnios >= edadMin)) &&
      (edadMax == null || (r.edadAnios != null && r.edadAnios <= edadMax)),
  );
}

export function pacientes(rs, { analito, estado, severidad, plaquetasNoFiables } = {}, panel = 'hemograma') {
  const ks = analito ? [analito] : claves(panel);
  return rs.filter((r) => {
    if (plaquetasNoFiables) return r.hemograma.plaquetas.estado === 'no_fiable';
    return ks.some((k) => {
      const a = datos(r, panel)[k];
      const okEstado = !estado ? alterado(a) : estado === 'alterado' ? alterado(a) : a.estado === estado;
      return okEstado && (!severidad || a.severidad === severidad);
    });
  });
}

export function resumen(todos, panel = 'hemograma') {
  const rs = todos.filter((r) => cuenta(r, panel));
  const total = rs.length;
  const conAlterados = pacientes(rs, {}, panel).length;
  const conModerada = rs.filter((r) => Object.values(datos(r, panel)).some((a) => a.severidad === 'moderada')).length;
  const porAnalito = {};
  for (const k of claves(panel)) {
    const c = { medidos: 0, normal: 0, alto: 0, bajo: 0, leve: 0, moderada: 0, g3: 0, noMedido: 0, noFiable: 0, sinRef: 0 };
    for (const r of rs) {
      const a = datos(r, panel)[k];
      if (a.estado === 'no_medido') c.noMedido++;
      else if (a.estado === 'no_fiable') c.noFiable++;
      else if (a.estado === 'sin_referencia') c.sinRef++;
      else {
        c.medidos++;
        c[a.estado]++;
        if (a.severidad) c[a.severidad]++;
        if (a.g3) c.g3++;
      }
    }
    c.alterados = c.alto + c.bajo;
    c.pct = pct(c.alterados, c.medidos);
    porAnalito[k] = c;
  }
  const alteraciones = { medidas: 0, alto: 0, bajo: 0, leve: 0, moderada: 0, g3: 0 };
  for (const c of Object.values(porAnalito)) for (const k of Object.keys(alteraciones)) alteraciones[k] += k === 'medidas' ? c.medidos : c[k];
  alteraciones.total = alteraciones.alto + alteraciones.bajo;
  alteraciones.sinEscala = alteraciones.total - alteraciones.leve - alteraciones.moderada;
  const noFiables = porAnalito.plaquetas?.noFiable;
  const dist = {};
  const niveles = { sin: 0, leve: 0, moderada: 0 };
  const grupos = { ninguno: 0, hemograma: 0, bioquimico: 0, ambos: 0 };
  for (const r of rs) {
    const vs = Object.values(datos(r, panel));
    const n = vs.filter(alterado).length;
    const mod = vs.some((a) => a.severidad === 'moderada');
    dist[n] ??= { pacientes: 0, moderada: 0 };
    dist[n].pacientes++;
    if (mod) dist[n].moderada++;
    niveles[n === 0 ? 'sin' : mod ? 'moderada' : 'leve']++;
    const h = cuenta(r, 'hemograma') && Object.values(r.hemograma).some(alterado);
    const b = cuenta(r, 'bioquimico') && Object.values(r.bioquimico).some(alterado);
    grupos[h && b ? 'ambos' : h ? 'hemograma' : b ? 'bioquimico' : 'ninguno']++;
  }
  return {
    total,
    conAlterados,
    sinAlterados: total - conAlterados,
    pctAlterados: pct(conAlterados, total),
    conModerada,
    pctModerada: pct(conModerada, total),
    alteraciones,
    porPanel: { hemograma: todos.filter((r) => cuenta(r, 'hemograma')).length, bioquimico: todos.filter((r) => cuenta(r, 'bioquimico')).length },
    origen: origen(todos),
    plaquetas: porAnalito.plaquetas && {
      noFiables,
      pctNoFiables: pct(noFiables, panel === 'general' ? todos.filter((r) => cuenta(r, 'hemograma')).length : total),
      medidasFiables: porAnalito.plaquetas.medidos,
      bajas: porAnalito.plaquetas.bajo,
      altas: porAnalito.plaquetas.alto,
    },
    porAnalito,
    niveles,
    grupos,
    alteradosPorPaciente: Object.entries(dist).map(([n, d]) => ({ n: Number(n), ...d })),
  };
}

/** Pacientes con alteración en cada examen, sobre los pacientes que traen ese examen (`de`). */
function origen(todos) {
  const hemo = todos.filter((r) => cuenta(r, 'hemograma'));
  const bio = todos.filter((r) => cuenta(r, 'bioquimico'));
  const ambos = hemo.filter((r) => cuenta(r, 'bioquimico'));
  const con = (rs, f) => rs.filter((r) => Object.values(f(r)).some(alterado)).length;
  return {
    hemograma: { n: con(hemo, (r) => r.hemograma), de: hemo.length },
    bioquimico: { n: con(bio, (r) => r.bioquimico), de: bio.length },
    ambos: { n: ambos.filter((r) => con([r], (x) => x.hemograma) && con([r], (x) => x.bioquimico)).length, de: ambos.length },
  };
}

/** Une variantes de un mismo texto que solo difieren en espacios sueltos ("P astor Amer ic ano"): se muestra la que tiene menos espacios. */
export function unificarTextos(rs) {
  const clave = (s) => s.replace(/\s+/g, '').toLowerCase();
  const mejor = (campo) => {
    const m = new Map();
    for (const r of rs) {
      const v = r[campo];
      if (!v) continue;
      const k = clave(v);
      const actual = m.get(k);
      if (!actual || v.split(' ').length < actual.split(' ').length) m.set(k, v);
    }
    return m;
  };
  const razas = mejor('raza');
  const sexos = mejor('sexo');
  return rs.map((r) => ({ ...r, raza: r.raza ? razas.get(clave(r.raza)) : r.raza, sexo: r.sexo ? sexos.get(clave(r.sexo)) : r.sexo }));
}

export function unificarEspecie(rs) {
  if (!rs.length) return { resultados: rs, rechazados: [], especie: null };
  const especie = rs[0].especie;
  const rechazados = rs.filter((r) => r.especie !== especie).map((r) => ({ id: r.id, motivo: `especie distinta a la tanda (${especie})` }));
  return { resultados: rs.filter((r) => r.especie === especie), rechazados, especie };
}

const GRUPOS_EDAD = [
  ['Menos de 1', (e) => e < 1],
  ['1 a 3', (e) => e >= 1 && e < 4],
  ['4 a 6', (e) => e >= 4 && e < 7],
  ['7 a 9', (e) => e >= 7 && e < 10],
  ['10 o más', (e) => e >= 10],
];

/** Pacientes con alguna alteración por tramo de edad, en años cumplidos, solo en el examen pedido ('general' = hemograma o bioquímico). Los tramos vacíos no salen. */
export function alteracionesPorEdad(todos, panel = 'general') {
  const rs = todos.filter((r) => cuenta(r, panel));
  const conAlteracion = (r) => Object.values(datos(r, panel)).some(alterado);
  const tramos = [...GRUPOS_EDAD.map(([nombre, en]) => ({ nombre, pacientes: rs.filter((r) => r.edadAnios != null && en(r.edadAnios)) })), { nombre: 'Sin edad', pacientes: rs.filter((r) => r.edadAnios == null) }];
  return tramos
    .filter((t) => t.pacientes.length)
    .map((t) => {
      const alterados = t.pacientes.filter(conAlteracion).length;
      return { nombre: t.nombre, total: t.pacientes.length, alterados, pct: pct(alterados, t.pacientes.length) };
    });
}
