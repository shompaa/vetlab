import { PANELES } from './reglas.js';

const claves = (panel) => (panel === 'general' ? Object.keys({ ...PANELES.hemograma.analitos, ...PANELES.bioquimico.analitos }) : Object.keys(PANELES[panel].analitos));
const datos = (r, panel) => (panel === 'general' ? { ...r.hemograma, ...r.bioquimico } : r[panel]);
const alterado = (a) => a.estado === 'alto' || a.estado === 'bajo';
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

export function resumen(rs, panel = 'hemograma') {
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
  const noFiables = porAnalito.plaquetas?.noFiable;
  const dist = {};
  for (const r of rs) {
    const n = Object.values(datos(r, panel)).filter(alterado).length;
    dist[n] = (dist[n] ?? 0) + 1;
  }
  return {
    total,
    conAlterados,
    sinAlterados: total - conAlterados,
    pctAlterados: pct(conAlterados, total),
    conModerada,
    pctModerada: pct(conModerada, total),
    plaquetas: porAnalito.plaquetas && {
      noFiables,
      pctNoFiables: pct(noFiables, total),
      medidasFiables: porAnalito.plaquetas.medidos,
      bajas: porAnalito.plaquetas.bajo,
      altas: porAnalito.plaquetas.alto,
    },
    porAnalito,
    alteradosPorPaciente: Object.entries(dist).map(([n, pacientes]) => ({ n: Number(n), pacientes })),
  };
}

export function unificarEspecie(rs) {
  if (!rs.length) return { resultados: rs, rechazados: [], especie: null };
  const especie = rs[0].especie;
  const rechazados = rs.filter((r) => r.especie !== especie).map((r) => ({ id: r.id, motivo: `especie distinta a la tanda (${especie})` }));
  return { resultados: rs.filter((r) => r.especie === especie), rechazados, especie };
}
