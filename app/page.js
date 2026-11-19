'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { alteracionesPorEdad, filtrarDemografia, opciones, pacientes, resumen, unificarEspecie, unificarTextos } from '../src/agregar.js';
import { exportarExcel } from '../src/exportar.js';
import { RAZAS_INICIALES, clave, coincidencias, excluirPorRaza } from '../src/razas.js';
import { PANELES } from '../src/reglas.js';
import { NOMBRES } from '../src/etiquetas.js';
import { Alerta, Barras, Basura, Candado, Capas, Carpeta, CheckCirculo, Corazon, Excel, Huella, Info, Informe, Lupa, Mas, Nube, Pdf, Refrescar, Usuarios } from './iconos.js';

const MAX = 1000;

const BASE = process.env.BASE ?? '';

async function analizarArchivos(files, onProgreso) {
  const { parsearHemograma } = await import('../src/parse.js');
  const resultados = [];
  const errores = [];
  const usados = new Map();
  for (const [i, f] of files.entries()) {
    const n = (usados.get(f.name) ?? 0) + 1;
    usados.set(f.name, n);
    const id = n === 1 ? f.name : `${f.name} (${n})`;
    try {
      resultados.push({ id, ...(await parsearHemograma(await f.arrayBuffer())) });
    } catch (e) {
      errores.push({ id, motivo: e.message });
    }
    onProgreso((i + 1) / files.length);
    await new Promise((r) => setTimeout(r));
  }
  return { resultados, errores };
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
const pc = (n) => `${n.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;

export default function Pagina() {
  const [vista, setVista] = useState('subida');
  const [files, setFiles] = useState([]);
  const [sobre, setSobre] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [tanda, setTanda] = useState(null);
  const [repetidos, setRepetidos] = useState([]);
  const input = useRef(null);

  const agregar = (lista) => {
    const vistos = new Set(files.map((f) => f.name));
    const nuevos = [];
    const copias = [];
    for (const f of [...lista].filter((f) => /\.pdf$/i.test(f.name))) {
      if (vistos.has(f.name)) copias.push(f);
      else {
        nuevos.push(f);
        vistos.add(f.name);
      }
    }
    setFiles((prev) => [...prev, ...nuevos].slice(0, MAX));
    if (copias.length) setRepetidos((p) => [...p, ...copias]);
  };

  const resolverRepetidos = (subir) => {
    if (subir) setFiles((prev) => [...prev, ...repetidos].slice(0, MAX));
    setRepetidos([]);
  };

  const analizar = async () => {
    setFallo(null);
    setProgreso(0);
    try {
      const { resultados, errores } = await analizarArchivos(files, setProgreso);
      const u = unificarEspecie(unificarTextos(resultados));
      setTanda({ ...u, errores: [...errores, ...u.rechazados], enviados: files.length });
      setVista('resultados');
    } catch (e) {
      setFallo(e.message);
    }
    setProgreso(null);
  };

  const razas = useRazas();
  const nuevaTanda = () => {
    razas.reiniciarTemporales();
    setFiles([]);
    setRepetidos([]);
    setTanda(null);
    setVista('subida');
  };

  return (
    <div className="page">
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <main className="app">
        <header className="header">
          <div className="brand">
            <img className="logo" src={`${BASE}/brand/logo.webp`} alt="HemoPuppy, análisis veterinario" />
          </div>
          <div className="hero">
            <h1>Análisis de hemogramas</h1>
            <p>Sube una tanda de exámenes y revisa cuántos pacientes tienen valores alterados, por parámetro y por severidad.</p>
          </div>
          <div className="mascotas">
            <div className="lema" aria-hidden="true">
              Juntos por<br />pacientes más sanos
              <svg width="150" height="22" viewBox="0 0 150 22" fill="none" stroke="#0b8b87" strokeWidth="1.600" strokeLinecap="round"><path d="M4 6c40 18 90 18 130 2 6-2 10-5 8-8-2-2-5 0-4 3" /></svg>
              <span className="corazon"><Corazon size={17} /></span>
            </div>
            <img className="trio" src={`${BASE}/brand/trio.webp`} alt="Tres veterinarios con bata y estetoscopio: un perro café, un cocker negro con pañuelo rojo y un gato naranja" />
          </div>
        </header>

        <nav className="tabs no-print" aria-label="Secciones">
          <button className="tab" aria-current={vista === 'subida' ? 'page' : undefined} onClick={() => setVista('subida')}>Subida</button>
          <button className="tab" aria-current={vista === 'resultados' ? 'page' : undefined} disabled={!tanda} onClick={() => setVista('resultados')}>Resultados</button>
        </nav>

        <div id="contenido" key={vista}>
          {vista === 'subida' ? (
            <Subida {...{ files, setFiles, sobre, setSobre, agregar, analizar, progreso, fallo, input, repetidos, resolverRepetidos, razas, resultados: tanda?.resultados ?? [] }} />
          ) : (
            <Resultados tanda={tanda} nuevaTanda={nuevaTanda} razas={razas} />
          )}
        </div>
      </main>
    </div>
  );
}

function Subida({ files, setFiles, sobre, setSobre, agregar, analizar, progreso, fallo, input, repetidos, resolverRepetidos, razas, resultados }) {
  const [buscar, setBuscar] = useState('');
  const ocupado = progreso !== null;
  const q = buscar.trim().toLowerCase();
  const visibles = files.map((f, i) => ({ f, i })).filter(({ f }) => f.name.toLowerCase().includes(q));
  const hay = files.length > 0;
  return (
    <section className="view" aria-label="Subida de archivos">
      <div className="upload-layout">
        <div
          className={`dropzone ${sobre ? 'drag' : ''} ${hay ? 'con-archivos' : ''}`}
          onClick={() => input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); agregar(e.dataTransfer.files); }}
        >
          <div className="dz-cabecera">
            <div className="upload-icon"><Nube /></div>
            <div className="dz-texto">
              <h2>Arrastra tus PDF aquí</h2>
              <p>Hasta {MAX} archivos por tanda.<br />Solo se procesan los datos necesarios del hemograma y del perfil bioquímico.</p>
            </div>
            <button type="button" className="pick-btn" onClick={(e) => { e.stopPropagation(); input.current.click(); }}><Carpeta /> {hay ? 'Agregar más' : 'Elegir archivos'}</button>
          </div>
          <input ref={input} type="file" accept=".pdf,application/pdf" multiple hidden onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />

          {hay && (
            <div className="dz-archivos" onClick={(e) => e.stopPropagation()}>
              <div className="files-head">
                <h3 role="status">{files.length} archivo(s) en la tanda{files.length >= MAX ? ' (límite alcanzado)' : ''}</h3>
                <div className="buscar-wrap">
                  <Lupa />
                  <input className="buscar" type="search" aria-label="Buscar entre los archivos subidos" placeholder="Buscar archivo por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
                </div>
                <div className="actions">
                  <button className="btn primary" disabled={ocupado} onClick={analizar}><Barras size={18} /> Analizar tanda</button>
                  <button className="btn" disabled={ocupado} onClick={() => { setFiles([]); setBuscar(''); }}><Basura /> Vaciar</button>
                </div>
              </div>
              {fallo && <div className="aviso error" role="alert" style={{ marginBottom: 12 }}>No se pudo analizar la tanda: {fallo}. Inténtalo de nuevo.</div>}
              {ocupado ? (
                <div className="analizando">
                  <img src={`${BASE}/brand/perro-negro-muestra.webp`} alt="" height="72" />
                  <div style={{ flex: 1 }}>
                    <strong>Analizando… {Math.round(progreso * 100)}%</strong>
                    <div className="bar" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progreso * 100}%` }} /></div>
                  </div>
                </div>
              ) : (
                <>
                  {q && <p className="cap" role="status">{visibles.length} de {files.length} archivo(s) coinciden con “{buscar.trim()}”.</p>}
                  {visibles.length ? (
                    <div className="file-list">
                      {visibles.map(({ f, i }) => (
                        <div className="file-row" key={f.name + f.size + i}>
                          <div className="file-icon"><Pdf size={22} /></div>
                          <div>
                            <strong title={f.name}>{f.name}</strong>
                            <small>{mb(f.size)}</small>
                          </div>
                          <button className="remove" aria-label={`Quitar ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-files">Ningún archivo coincide con la búsqueda.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <aside className="upload-side">
          <div className="card steps-card">
            <div className="step"><div className="step-num">1</div><div className="step-icon"><Nube size={22} /></div><div><strong>Sube la tanda</strong><span>PDF del mismo laboratorio y de una sola especie.</span></div></div>
            <div className="step"><div className="step-num">2</div><div className="step-icon"><Barras size={22} /></div><div><strong>Se leen los valores</strong><span>Solo resultados y rangos necesarios para el análisis.</span></div></div>
            <div className="step"><div className="step-num">3</div><div className="step-icon"><CheckCirculo /></div><div><strong>Revisa el resultado</strong><span>Conteos, porcentajes, filtros y exportación.</span></div></div>
          </div>
        </aside>
      </div>

      {repetidos.length > 0 && (
        <div className="aviso" role="alert">
          <strong>{repetidos.length} archivo(s) ya estaban en la tanda con el mismo nombre</strong> y no se agregaron:
          <ul>{repetidos.slice(0, 5).map((f, i) => <li key={f.name + i}>{f.name}</li>)}{repetidos.length > 5 && <li>y {repetidos.length - 5} más…</li>}</ul>
          <div className="actions">
            <button className="btn primary" onClick={() => resolverRepetidos(true)}>Subir también las copias</button>
            <button className="btn" onClick={() => resolverRepetidos(false)}>Omitir las copias</button>
          </div>
        </div>
      )}

      <RazasFuera razas={razas} resultados={resultados} abierto />

      <div className="session-bar">
        <span className="sb-izq"><Info /> Los PDF se leen en tu navegador y no se envían a ningún servidor. La tanda es temporal: al vaciar o recargar, los datos no se conservan.</span>
        <span><Candado /> Sin historial</span>
      </div>
    </section>
  );
}

const COLOR = { sin: '#2f9e83', leve: '#d9920f', moderada: '#d9453d', hemograma: '#d9453d', bioquimico: '#2f84c7', ambos: '#8a3fb5', ninguno: '#2f9e83' };

function Donut({ conAlt, total, segmentos }) {
  let acc = 0;
  const partes = segmentos.filter((s) => s.n > 0).map((s) => {
    const a = acc;
    acc += total ? (s.n / total) * 100 : 0;
    return `${s.color} ${a}% ${acc}%`;
  });
  return (
    <div className="donut" role="img" aria-label={`${conAlt} de ${total} pacientes con alteraciones`} style={{ background: `conic-gradient(${partes.join(', ') || '#e6e0d3 0 100%'})` }}>
      <div className="donut-label"><strong>{conAlt}</strong><small>pacientes</small></div>
    </div>
  );
}

function Histograma({ datos, total }) {
  const tope = 10;
  const bins = Array.from({ length: Math.min(Math.max(0, ...datos.map((d) => d.n)), tope) + 1 }, (_, n) => ({ n, pacientes: 0, moderada: 0 }));
  for (const d of datos) {
    bins[Math.min(d.n, tope)].pacientes += d.pacientes;
    bins[Math.min(d.n, tope)].moderada += d.moderada;
  }
  const max = Math.max(1, ...bins.map((b) => b.pacientes));
  const paso = max > 8 ? Math.ceil(max / 4) : 1;
  const ticks = [];
  for (let t = 0; t <= max; t += paso) ticks.push(t);
  const nombre = (b) => (b.n === tope ? `${tope}+` : b.n);
  const porcentaje = (n) => pc(total ? (n / total) * 100 : 0);

  const orden = [...datos].sort((a, b) => a.n - b.n);
  const promedio = total ? orden.reduce((s, d) => s + d.n * d.pacientes, 0) / total : 0;
  let acumulado = 0;
  const mediana = orden.find((d) => (acumulado += d.pacientes) >= total / 2)?.n ?? 0;
  const mayor = orden.filter((d) => d.pacientes > 0).at(-1)?.n ?? 0;
  const cincoOMas = orden.filter((d) => d.n >= 5).reduce((s, d) => s + d.pacientes, 0);
  return (
    <>
      <div className="vchart">
        <div className="yaxis">{ticks.map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{t}</span>)}</div>
        <div className="plot">
          {ticks.map((t) => <div key={t} className="gl" style={{ bottom: `${(t / max) * 100}%` }} />)}
          <div className="bars">
            {bins.map((b) => (
              <i key={b.n} title={`${b.pacientes} paciente(s) con ${nombre(b)} parámetro(s) alterado(s) (${porcentaje(b.pacientes)})${b.n ? ` · ${b.moderada} con alguna moderada o más` : ''}`} style={{ height: `${(b.pacientes / max) * 100}%` }}>
                <em>{b.pacientes}</em>
                {b.n === 0 ? <s style={{ flex: 1, background: COLOR.sin }} /> : (
                  <>
                    <s style={{ flex: b.moderada, background: COLOR.moderada }} />
                    <s style={{ flex: b.pacientes - b.moderada, background: COLOR.leve }} />
                  </>
                )}
              </i>
            ))}
          </div>
        </div>
        <div className="xlab">{bins.map((b) => <span key={b.n}>{nombre(b)}<small>{porcentaje(b.pacientes)}</small></span>)}</div>
        <div className="xtit">Parámetros alterados en el paciente (debajo, % de los pacientes)</div>
      </div>
      <div className="legend-chips">
        <div className="chip-fila"><span className="dot" style={{ background: COLOR.sin }} /><div>Sin alteraciones</div></div>
        <div className="chip-fila"><span className="dot" style={{ background: COLOR.leve }} /><div>Solo leves o sin escala</div></div>
        <div className="chip-fila"><span className="dot" style={{ background: COLOR.moderada }} /><div>Con alguna moderada o más</div></div>
      </div>
      <div className="detalle-grid una-col">
        <section>
          <div className="det-fila"><span>Promedio por paciente</span><b>{promedio.toLocaleString('es-CL', { maximumFractionDigits: 1 })} <small>parámetros alterados</small></b></div>
          <div className="det-fila"><span>Mediana</span><b>{mediana} <small>parámetro(s)</small></b></div>
          <div className="det-fila"><span>Máximo en un paciente</span><b>{mayor} <small>parámetro(s)</small></b></div>
          <div className="det-fila"><span>Pacientes con 5 o más</span><b>{porcentaje(cincoOMas)} <small>({cincoOMas} de {total})</small></b></div>
        </section>
      </div>
    </>
  );
}

const pctDe = (n, t) => (t ? Math.round((n / t) * 1000) / 10 : 0);

function Tarjeta({ icono, t, n, p, pct }) {
  return (
    <article className="kpi">
      <div className="kpi-icon">{icono}</div>
      <div><span>{t}</span><strong>{n}</strong><small>{p}</small>{pct != null && <div className="kpi-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}</div>
    </article>
  );
}

function TablasImpresion({ rs, paneles }) {
  const tablas = useMemo(() => paneles.map((k) => ({ k, nombre: PANELES[k].nombre, filas: Object.entries(resumen(rs, k).porAnalito).filter(([, c]) => c.medidos > 0 || c.noFiable > 0) })), [rs, paneles]);
  return tablas.map(({ k, nombre, filas }) => (
    <article key={k} className="card tabla-imp">
      <h3>Detalle por parámetro · {nombre}</h3>
      <table>
        <thead>
          <tr>{['Parámetro', 'Medidos', 'Normal', 'Alto', 'Bajo', 'Leve', 'Moderada', '% alterado', 'Sin dato', 'No fiable'].map((t) => <th key={t}>{t}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map(([a, c]) => (
            <tr key={a}>
              <td>{NOMBRES[a]}</td><td>{c.medidos}</td><td>{c.normal}</td><td>{c.alto}</td><td>{c.bajo}</td><td>{c.leve}</td><td>{c.moderada}</td><td>{pc(c.pct)}</td><td>{c.noMedido + c.sinRef}</td><td>{c.noFiable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  ));
}

function AlteracionesPorEdad({ rs, examen }) {
  const tramos = useMemo(() => alteracionesPorEdad(rs, examen), [rs, examen]);
  const mayor = Math.max(...tramos.map((t) => t.pct), 0);
  return (
    <div className="charts una">
      <article className="chart-card por-edad">
        <h3><Barras size={22} /> Alteraciones por edad</h3>
        <p className="cap">Porcentaje de pacientes con alguna alteración (hemograma o bioquímico) en cada tramo de edad, en años. A la derecha, alterados sobre pacientes del tramo.</p>
        <div className="hchart">
          {tramos.map((t) => (
            <div className="hrow" key={t.nombre} title={`${t.alterados} de ${t.total} paciente(s) de ${t.nombre} con alguna alteración`}>
              <span>{t.nombre}</span>
              <div className="track"><div className="fill" style={{ width: `${t.pct}%` }}><i className={t.pct > 0 && t.pct === mayor ? 'alto' : 'sobre'} style={{ flex: 1 }} /></div></div>
              <b>{pc(t.pct)} <small>{t.alterados}/{t.total}</small></b>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function AvisosLectura({ resultados }) {
  const conAviso = resultados.filter((r) => r.advertencias?.length);
  if (!conAviso.length) return null;
  return (
    <details className="aviso no-print" role="status" open={conAviso.length <= 5}>
      <summary>
        <strong>{conAviso.length} archivo(s) con avisos de lectura.</strong> Un examen sin datos o con problemas no se cuenta para ese paciente.
      </summary>
      <ul>
        {conAviso.map((r) => (
          <li key={r.id}>{r.id}: {r.advertencias.join('; ')}</li>
        ))}
      </ul>
    </details>
  );
}

function useRazas() {
  const [fijas, setFijas] = useState(RAZAS_INICIALES);
  const [temporales, setTemporales] = useState([]);
  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem(CLAVE_RAZAS));
      if (Array.isArray(guardadas)) setFijas(RAZAS_INICIALES.map((r) => ({ ...r, excluir: guardadas.find((g) => g.nombre === r.nombre)?.excluir ?? r.excluir })));
    } catch {}
  }, []);
  const setFija = (nombre, excluir) =>
    setFijas((prev) => {
      const nuevas = prev.map((r) => (r.nombre === nombre ? { ...r, excluir } : r));
      try {
        localStorage.setItem(CLAVE_RAZAS, JSON.stringify(nuevas));
      } catch {}
      return nuevas;
    });
  const agregarTemporal = (nombre) => {
    const n = nombre.trim();
    if (n && ![...fijas, ...temporales].some((r) => clave(r.nombre) === clave(n))) setTemporales((prev) => [...prev, { nombre: n, excluir: true }]);
  };
  return {
    fijas,
    temporales,
    todas: [...fijas, ...temporales],
    setFija,
    setTemporal: (nombre, excluir) => setTemporales((prev) => prev.map((r) => (r.nombre === nombre ? { ...r, excluir } : r))),
    agregarTemporal,
    quitarTemporal: (nombre) => setTemporales((prev) => prev.filter((r) => r.nombre !== nombre)),
    reiniciarTemporales: () => setTemporales([]),
  };
}

function RazasFuera({ razas, resultados, abierto }) {
  const [nueva, setNueva] = useState('');
  const coinc = useMemo(() => coincidencias(resultados, razas.todas), [resultados, razas.todas]);
  const { totalExcluidos } = useMemo(() => excluirPorRaza(resultados, razas.todas), [resultados, razas.todas]);
  const detectadas = useMemo(() => [...new Set(resultados.map((r) => r.raza).filter(Boolean))].sort(), [resultados]);
  const filas = [...razas.fijas.map((r) => ({ ...r, temporal: false })), ...razas.temporales.map((r) => ({ ...r, temporal: true }))];
  const agregar = () => {
    razas.agregarTemporal(nueva);
    setNueva('');
  };
  return (
    <details className="card razas-card no-print" open={abierto}>
      <summary>
        Razas fuera del análisis <small>{resultados.length ? (totalExcluidos > 0 ? `· ${totalExcluidos} paciente(s) sin contar` : '· ninguna en esta tanda') : '· se aplican solas al analizar'}</small>
      </summary>
      <p className="razas-info">
        <Info /> Marca las razas que quieres excluir del análisis. Se aplican automáticamente al analizar la tanda y sus pacientes no se cuentan en ninguna cifra, gráfico ni exportación.
      </p>
      <ul className="razas-lista">
        {filas.map((r) => {
          const c = coinc.find((x) => x.nombre === r.nombre);
          return (
            <li key={r.nombre}>
              <label>
                <input type="checkbox" checked={r.excluir} onChange={(e) => (r.temporal ? razas.setTemporal(r.nombre, e.target.checked) : razas.setFija(r.nombre, e.target.checked))} />
                <strong>{r.nombre}</strong>
                {r.temporal && <em className="temporal">temporal</em>}
              </label>
              <small>{!resultados.length ? 'se verá cuántos pacientes coinciden al analizar' : c.n ? `${c.n} paciente(s) en esta tanda (en el PDF: ${Object.entries(c.vistas).map(([v, n]) => `${v} ×${n}`).join(', ')})` : 'ninguno en esta tanda'}</small>
              {r.temporal && (
                <button className="remove" aria-label={`Quitar ${r.nombre} de la lista`} onClick={() => razas.quitarTemporal(r.nombre)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="razas-nueva">
        <div className="buscar-wrap">
          <Lupa />
          <input className="buscar" list="razas-detectadas" value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} placeholder="Agregar una raza temporal (como sale en el PDF)" aria-label="Agregar una raza temporal a la lista" />
        </div>
        <datalist id="razas-detectadas">
          {detectadas.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <button className="btn borde" onClick={agregar} disabled={!nueva.trim()}>
          <Mas /> Agregar
        </button>
      </div>
      <p className="cap">Las razas que agregues valen para esta tanda y no se guardan. La coincidencia ignora mayúsculas, tildes y espacios, y tolera pequeños errores de escritura.</p>
    </details>
  );
}

const DONUT_TEXTO = {
  general: 'Pacientes con al menos un parámetro fuera de su rango de referencia, en hemograma o bioquímico.',
  hemograma: 'Pacientes con al menos un parámetro del hemograma fuera de su rango de referencia, sobre los que traen hemograma.',
  bioquimico: 'Pacientes con al menos un parámetro del perfil bioquímico fuera de su rango de referencia, sobre los que traen perfil.',
};

function detalleTanda(enTanda, gen, excluidos) {
  const partes = [`${enTanda} en la tanda`];
  if (excluidos) partes.push(`${excluidos} sin contar por raza`);
  if (gen.porPanel.hemograma !== gen.total || gen.porPanel.bioquimico !== gen.total) partes.push(`hemograma ${gen.porPanel.hemograma}`, `bioquímico ${gen.porPanel.bioquimico}`);
  return partes.join(' · ');
}

const EXAMENES = [['general', 'Todos los exámenes'], ['hemograma', 'Hemograma'], ['bioquimico', 'Perfil bioquímico']];
const FOCO_INICIAL = { analito: null, estado: 'alterado', severidad: '', plaquetasNoFiables: false };
const ordenados = (r) => Object.entries(r.porAnalito).map(([k, c]) => ({ k, nombre: NOMBRES[k], ...c })).filter((x) => x.alterados > 0).sort((a, b) => b.alterados - a.alterados);

function DetalleFila({ etiqueta, n, de, sufijoDe }) {
  return (
    <div className="det-fila"><span>{etiqueta}</span><b>{pc(pctDe(n, de))} <small>({n} de {de}{sufijoDe})</small></b></div>
  );
}

function LeyendaFila({ t, n, total, color, chip }) {
  return (
    <div className={chip ? 'chip-fila' : 'legend-row'}>
      <span className="dot" style={{ background: color }} />
      <div>{t}{chip ? ' · ' : <br />}<b>{pc(pctDe(n, total))} ({n} de {total})</b></div>
    </div>
  );
}

function PacientesConAlteraciones({ r, examen, sufijo }) {
  const a = r.alteraciones;
  const mas = ordenados(r).slice(0, 3);
  const niv = [
    { k: 'sin', t: 'Sin alteraciones', n: r.niveles.sin, color: COLOR.sin },
    { k: 'leve', t: 'Solo alteraciones leves o sin escala', n: r.niveles.leve, color: COLOR.leve },
    { k: 'moderada', t: 'Con alguna moderada o más', n: r.niveles.moderada, color: COLOR.moderada },
  ];
  const grp = [
    { k: 'ninguno', t: 'Ninguno', n: r.grupos.ninguno, color: COLOR.ninguno },
    { k: 'hemograma', t: 'Solo hemograma', n: r.grupos.hemograma, color: COLOR.hemograma },
    { k: 'bioquimico', t: 'Solo perfil bioquímico', n: r.grupos.bioquimico, color: COLOR.bioquimico },
    { k: 'ambos', t: 'Ambos exámenes', n: r.grupos.ambos, color: COLOR.ambos },
  ];
  return (
    <article className="chart-card">
      <h3><Usuarios size={22} /> Pacientes con alteraciones{sufijo}</h3>
      <p className="cap">{DONUT_TEXTO[examen]}</p>
      <div className="donut-area">
        <Donut conAlt={r.conAlterados} total={r.total} segmentos={niv} />
        <div className="legend">
          {niv.map((s) => <LeyendaFila key={s.k} {...s} total={r.total} />)}
        </div>
      </div>
      {examen === 'general' && (
        <div className="origen">
          <h4>Dónde están las alteraciones <small>pacientes según el examen en que se alteran</small></h4>
          <div className="barra-apilada" role="img" aria-label="Pacientes por examen alterado">
            {grp.map((s) => s.n > 0 && <i key={s.k} style={{ flex: s.n, background: s.color }} title={`${s.t}: ${s.n}`} />)}
          </div>
          <div className="legend-chips">{grp.map((s) => <LeyendaFila key={s.k} {...s} total={r.total} chip />)}</div>
        </div>
      )}
      <div className="detalle-grid">
        <section>
          <h4>Pacientes</h4>
          <DetalleFila etiqueta="Con alteración moderada" n={r.conModerada} de={r.total} />
          {examen === 'general' && (
            <>
              <DetalleFila etiqueta="Alterados en hemograma" n={r.origen.hemograma.n} de={r.origen.hemograma.de} />
              <DetalleFila etiqueta="Alterados en perfil bioquímico" n={r.origen.bioquimico.n} de={r.origen.bioquimico.de} />
              <DetalleFila etiqueta="Alterados en ambos" n={r.origen.ambos.n} de={r.origen.ambos.de} />
            </>
          )}
        </section>
        <section>
          <h4>Alteraciones registradas <small>{a.total} de {a.medidas} valores medidos ({pc(pctDe(a.total, a.medidas))})</small></h4>
          <DetalleFila etiqueta="Por sobre el rango" n={a.alto} de={a.total} />
          <DetalleFila etiqueta="Por debajo del rango" n={a.bajo} de={a.total} />
          <DetalleFila etiqueta="Leves" n={a.leve} de={a.total} />
          <DetalleFila etiqueta="Moderadas o más" n={a.moderada} de={a.total} sufijoDe={a.g3 ? ` · ${a.g3} ≥G3` : ''} />
          <DetalleFila etiqueta="Sin escala de severidad" n={a.sinEscala} de={a.total} />
        </section>
        <section>
          <h4>Los más alterados <small>% de los pacientes con ese valor medido</small></h4>
          {mas.length ? mas.map((x) => <DetalleFila key={x.k} etiqueta={x.nombre} n={x.alterados} de={x.medidos} />) : <p className="vacio">Ninguno.</p>}
        </section>
      </div>
    </article>
  );
}

function PacientesPorParametro({ r, sufijo }) {
  const [verTodos, setVerTodos] = useState(false);
  const altos = ordenados(r);
  const top = verTodos ? altos : altos.slice(0, 10);
  const max = Math.max(1, altos[0]?.alterados ?? 1);
  const celda = (n, medidos, clase) => (
    <span className={`prm-n ${n ? clase : 'cero'}`}>{n}<small>{pc(pctDe(n, medidos))}</small></span>
  );
  return (
    <article className="chart-card">
      <h3><Capas /> Pacientes alterados por parámetro{sufijo}</h3>
      <p className="cap">Cada parámetro con pacientes fuera de rango, del más al menos alterado. Los porcentajes son sobre los pacientes con ese valor medido.</p>
      <div className="legend-chips">
        <div className="chip-fila"><span className="dot" style={{ background: '#d9453d' }} /><div>Por sobre el rango</div></div>
        <div className="chip-fila"><span className="dot" style={{ background: '#2f84c7' }} /><div>Por debajo del rango</div></div>
        <div className="chip-fila"><span className="dot" style={{ background: COLOR.leve }} /><div>Leve y moderada: columnas de la derecha (solo parámetros con escala VCOG)</div></div>
      </div>
      {top.length ? (
        <div className="prm-wrap">
          <div className="prm">
            <div className="prm-fila prm-cab"><span>Parámetro</span><span>Pacientes alterados</span><span>Alterados</span><span>Por sobre</span><span>Por debajo</span><span>Leve</span><span>Moderada</span><span>Medidos</span></div>
            {top.map((x) => (
              <div className="prm-fila" key={x.k} title={`${x.nombre}: ${x.alto} por sobre y ${x.bajo} por debajo, de ${x.medidos} medidos`}>
                <span className="prm-nombre">{x.nombre}</span>
                <div className="track"><div className="fill" style={{ width: `${(x.alterados / max) * 100}%` }}><i style={{ flex: x.alto, background: '#d9453d' }} /><i style={{ flex: x.bajo, background: '#2f84c7' }} /></div></div>
                <span className="prm-n"><b>{x.alterados}</b><small>{pc(x.pct)}</small></span>
                {celda(x.alto, x.medidos, 'alto')}
                {celda(x.bajo, x.medidos, 'bajo')}
                {celda(x.leve, x.medidos, 'leve')}
                {celda(x.moderada, x.medidos, 'moderada')}
                <span className="prm-n">{x.medidos}</span>
              </div>
            ))}
          </div>
          {altos.length > 10 && <button className="link-btn" onClick={() => setVerTodos((v) => !v)}>{verTodos ? 'Ver menos' : `Ver los ${altos.length} parámetros`}</button>}
        </div>
      ) : (
        <p className="vacio">Ningún parámetro alterado con estos filtros.</p>
      )}
    </article>
  );
}

function PanelDetalle({ rs, clave, seleccionado, onSeleccionar }) {
  const res = useMemo(() => resumen(rs, clave), [rs, clave]);
  const [orden, setOrden] = useState({ col: null, dir: 'desc' });
  const todas = Object.entries(res.porAnalito).map(([k, c]) => ({ k, nombre: NOMBRES[k], ...c }));
  const filas = todas.filter((x) => x.medidos > 0 || x.noFiable > 0);
  const sinDatos = todas.filter((x) => !(x.medidos > 0 || x.noFiable > 0)).map((x) => x.nombre);
  const valor = (x, c) => (c === 'nombre' ? x.nombre : c === 'sinDato' ? x.noMedido + x.sinRef : x[c]);
  const filasOrd = orden.col
    ? [...filas].sort((a, b) => {
        const va = valor(a, orden.col);
        const vb = valor(b, orden.col);
        const d = typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb;
        return orden.dir === 'asc' ? d : -d;
      })
    : filas;
  const ordenar = (c) => setOrden((o) => (o.col === c ? (o.dir === 'desc' ? { col: c, dir: 'asc' } : { col: null, dir: 'desc' }) : { col: c, dir: c === 'nombre' ? 'asc' : 'desc' }));
  return (
    <article className="card table-card no-print">
      <h3><Informe size={22} /> Detalle por parámetro · {PANELES[clave].nombre} <small>{res.total} paciente(s)</small></h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[['nombre', 'Parámetro'], ['medidos', 'Medidos'], ['normal', 'Normal'], ['alto', 'Alto'], ['bajo', 'Bajo'], ['leve', 'Leve'], ['moderada', 'Moderada'], ['pct', '% alterado'], ['sinDato', 'Sin dato'], ['noFiable', 'No fiable']].map(([c, t]) => (
                <th key={c} aria-sort={orden.col === c ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button className="th-sort" data-on={orden.col === c} onClick={() => ordenar(c)}>{t}<span className="fl" aria-hidden="true">{orden.col === c ? (orden.dir === 'asc' ? '▲' : '▼') : '▲▼'}</span></button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasOrd.map((x) => {
              const n = (v, c) => <td className={v ? c : c ? 'cero' : ''}>{v}</td>;
              return (
                <tr key={x.k} className={seleccionado === x.k ? 'sel' : ''} tabIndex={0} aria-selected={seleccionado === x.k} onClick={() => onSeleccionar(x.k)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}>
                  <td>{x.nombre}</td>{n(x.medidos, '')}{n(x.normal, '')}{n(x.alto, 'alto')}{n(x.bajo, 'bajo')}{n(x.leve, 'leve')}{n(x.moderada, 'moderada')}
                  <td><div className="pct"><div className="pct-track"><div className={`pct-fill ${x.pct >= 50 ? 'alta' : x.pct >= 25 ? 'media' : 'baja'}`} style={{ width: `${x.pct}%` }} /></div><b>{pc(x.pct)}</b></div></td>
                  {n(x.noMedido + x.sinRef, 'cero')}{n(x.noFiable, 'cero')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">% alterado = alterados sobre los pacientes con ese parámetro medido y fiable. Severidad solo donde existe escala publicada (VCOG-CTCAE v2). Haz clic en una fila para ver qué archivos cumplen.{sinDatos.length > 0 && ` Sin datos en esta tanda: ${sinDatos.join(', ')}.`}</p>
    </article>
  );
}

function Resultados({ tanda, nuevaTanda, razas }) {
  const [f, setF] = useState({});
  const [examen, setExamen] = useState('general');
  const [foco, setFoco] = useState(FOCO_INICIAL);
  const [exp, setExp] = useState(null);
  const refPac = useRef(null);
  const set = (k) => (e) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v === '' ? undefined : k.startsWith('edad') ? Number(v) : v }));
  };

  const { incluidos, totalExcluidos } = useMemo(() => excluirPorRaza(tanda.resultados, razas.todas), [tanda, razas.todas]);
  const op = useMemo(() => opciones(incluidos), [incluidos]);
  const rs = useMemo(() => filtrarDemografia(incluidos, f), [incluidos, f]);
  const gen = useMemo(() => resumen(rs, 'general'), [rs]);
  const r = useMemo(() => resumen(rs, examen), [rs, examen]);
  const lista = useMemo(
    () => pacientes(rs, { ...foco, estado: foco.estado === 'alterado' ? undefined : foco.estado, severidad: foco.severidad || undefined }, examen),
    [rs, foco, examen],
  );
  const paneles = examen === 'general' ? Object.keys(PANELES) : [examen];
  const sufijo = examen === 'general' ? '' : ` · ${PANELES[examen].nombre}`;
  const rangoMal = f.edadMin != null && f.edadMax != null && f.edadMin > f.edadMax;
  const cambiarExamen = (k) => {
    setExamen(k);
    setFoco(FOCO_INICIAL);
  };
  const seleccionar = (analito) => {
    setFoco((p) => ({ ...p, analito: p.analito === analito ? null : analito, plaquetasNoFiables: false }));
    refPac.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!tanda.resultados.length) {
    return (
      <section className="view">
        <div className="aviso error" role="alert">Ningún archivo se pudo procesar. {tanda.errores[0]?.motivo}</div>
        <div className="vacio-img"><img src={`${BASE}/brand/perro-negro-sentado.webp`} alt="" /><span>Revisa que los PDF traigan hemograma y perfil bioquímico del laboratorio habitual.</span></div>
        <div className="bottom-actions"><button className="btn primary" onClick={nuevaTanda}>Subir otra tanda</button></div>
      </section>
    );
  }

  return (
    <section className="view" aria-label="Resultados de la tanda">
      {tanda.errores.length > 0 && (
        <div className="aviso" role="alert">
          {tanda.errores.length} de {tanda.enviados} archivo(s) no se procesaron y no cuentan en las cifras.
          <ul>{tanda.errores.slice(0, 20).map((e) => <li key={e.id}>{e.id}: {e.motivo}</li>)}</ul>
        </div>
      )}

      <AvisosLectura resultados={tanda.resultados} />
      {exp === 'error' && <div className="aviso error no-print" role="alert">No se pudo generar el Excel. Inténtalo de nuevo.</div>}
      {rangoMal && <div className="aviso no-print" role="alert">La edad mínima es mayor que la máxima, por eso no hay pacientes. Corrige el rango o límpialo.</div>}
      <RazasFuera razas={razas} resultados={tanda.resultados} />

      <div className="toolbar no-print">
        <div className="examen-sel" role="group" aria-label="Examen que muestra toda la página">
          <span>Examen</span>
          {EXAMENES.map(([k, t]) => (
            <button key={k} aria-pressed={examen === k} className={`btn ${examen === k ? 'on' : ''}`} onClick={() => cambiarExamen(k)}>
              {t}{k !== 'general' && <small> · {gen.porPanel[k]} paciente(s)</small>}
            </button>
          ))}
        </div>
        <div className="filters">
          <div className="field"><label htmlFor="f-sexo">Sexo</label>
            <select id="f-sexo" value={f.sexo ?? ''} onChange={set('sexo')}><option value="">Todos</option>{op.sexos.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="f-raza">Raza</label>
            <select id="f-raza" value={f.raza ?? ''} onChange={set('raza')}><option value="">Todas</option>{op.razas.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="f-desde">Edad desde (años)</label>
            <input id="f-desde" type="number" min="0" max={op.edadMax} placeholder="Mín." value={f.edadMin ?? ''} onChange={set('edadMin')} /></div>
          <div className="field"><label htmlFor="f-hasta">Edad hasta (años)</label>
            <input id="f-hasta" type="number" min="0" max={op.edadMax} placeholder="Máx." value={f.edadMax ?? ''} onChange={set('edadMax')} /></div>
          <button className="btn" onClick={() => setF({})}><Refrescar /> Limpiar filtros</button>
        </div>
        {gen.total !== tanda.resultados.length && <p className="resumen-filtro" role="status">Mostrando {gen.total} de {tanda.resultados.length} pacientes con los filtros actuales</p>}
        <div className="export-actions">
          <button className="btn" disabled={exp === 'gen'} onClick={async () => {
            setExp('gen');
            try { await exportarExcel(rs, tanda.especie); setExp(null); } catch { setExp('error'); }
          }}><Excel /> {exp === 'gen' ? 'Generando…' : 'Exportar Excel'}</button>
          <button className="btn" onClick={() => window.print()}><Pdf /> Exportar PDF</button>
        </div>
      </div>

      {gen.total === 0 && (
        <div className="card vacio-total">
          <img src={`${BASE}/brand/perro-negro-sentado.webp`} alt="" />
          <h3>Ningún paciente con estos filtros</h3>
          <p>Prueba con otro sexo, raza o rango de edad.</p>
          <button className="btn primary" onClick={() => setF({})}><Refrescar /> Limpiar filtros</button>
        </div>
      )}
      <div hidden={gen.total === 0}>
        {gen.total > 0 && r.total === 0 && <div className="aviso" role="status">Ningún paciente de esta selección trae {PANELES[examen].nombre.toLowerCase()}.</div>}

        <div className="kpis">
          <Tarjeta icono={<Usuarios />} t={`Pacientes analizados · ${tanda.especie}${sufijo}`} n={r.total} p={detalleTanda(tanda.resultados.length, gen, totalExcluidos)} />
          <Tarjeta icono={<Alerta />} t="Con alguna alteración" n={r.conAlterados} pct={r.pctAlterados} p={`${pc(r.pctAlterados)} de los pacientes`} />
          <Tarjeta icono={<Barras />} t="Con alteración moderada" n={r.conModerada} pct={r.pctModerada} p={`${pc(r.pctModerada)} de los pacientes`} />
          {r.plaquetas && <Tarjeta icono={<Informe />} t="Plaquetas no fiables (agregados)" n={r.plaquetas.noFiables} pct={r.plaquetas.pctNoFiables} p={`${pc(r.plaquetas.pctNoFiables)} de los pacientes`} />}
        </div>

        <div className="charts">
          <PacientesConAlteraciones r={r} examen={examen} sufijo={sufijo} />
          <article className="chart-card">
            <h3><Barras size={22} /> Parámetros alterados por paciente{sufijo}</h3>
            <p className="cap">Cuántos pacientes tienen 0, 1, 2… parámetros fuera de rango. La barra verde son los pacientes sin alteraciones.</p>
            <Histograma datos={r.alteradosPorPaciente} total={r.total} />
          </article>
          <PacientesPorParametro r={r} sufijo={sufijo} />
        </div>

        <AlteracionesPorEdad rs={rs} examen={examen} />

        {paneles.map((k) => (
          <PanelDetalle key={k} rs={rs} clave={k} seleccionado={foco.analito} onSeleccionar={seleccionar} />
        ))}

        <div className="solo-print"><TablasImpresion rs={rs} paneles={paneles} /></div>

        <article className="card pacientes-card" ref={refPac}>
          <h3>
            Pacientes{sufijo}
            {foco.analito && (
              <button className="filtro-activo no-print" onClick={() => setFoco((p) => ({ ...p, analito: null }))} aria-label={`Quitar filtro de ${NOMBRES[foco.analito]}`}>
                {NOMBRES[foco.analito]} <span aria-hidden="true">×</span>
              </button>
            )}
          </h3>
          <div className="filtros-pac no-print">
            <div className="field"><label htmlFor="p-estado">Estado</label>
              <select id="p-estado" value={foco.estado} onChange={(e) => setFoco((p) => ({ ...p, estado: e.target.value, plaquetasNoFiables: false }))}>
                <option value="alterado">Alterado (alto o bajo)</option><option value="alto">Alto</option><option value="bajo">Bajo</option>
              </select></div>
            <div className="field"><label htmlFor="p-sev">Severidad</label>
              <select id="p-sev" value={foco.severidad} onChange={(e) => setFoco((p) => ({ ...p, severidad: e.target.value }))}>
                <option value="">Cualquiera</option><option value="leve">Leve</option><option value="moderada">Moderada</option>
              </select></div>
            {r.plaquetas && <button className={`btn ${foco.plaquetasNoFiables ? 'on' : ''}`} onClick={() => setFoco((p) => ({ ...p, plaquetasNoFiables: !p.plaquetasNoFiables }))}>Plaquetas no fiables</button>}
          </div>
          <p className="estado" role="status"><strong>{lista.length}</strong> paciente(s) con este filtro</p>
          {lista.length ? (
            <div className="chips">{lista.map((p) => <span key={p.id} className="chip">{p.id}</span>)}</div>
          ) : (
            <div className="vacio-img"><img src={`${BASE}/brand/pareja-estetoscopio.webp`} alt="" /><span>Ningún paciente cumple esta combinación. Prueba con otro estado o severidad.</span></div>
          )}
        </article>
      </div>

      <div className="bottom-actions no-print"><button className="btn" onClick={nuevaTanda}>Subir otra tanda</button></div>
    </section>
  );
}
