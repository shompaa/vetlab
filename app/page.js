'use client';
import { useMemo, useRef, useState } from 'react';
import { filtrarDemografia, opciones, pacientes, resumen, unificarEspecie } from '../src/agregar.js';
import { exportarExcel } from '../src/exportar.js';
import { PANELES } from '../src/reglas.js';
import { NOMBRES } from '../src/etiquetas.js';
import { Alerta, Barras, Candado, Corazon, Excel, Huella, Informe, Nube, Pdf, Refrescar, Usuarios } from './iconos.js';

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
      const u = unificarEspecie(resultados);
      setTanda({ ...u, errores: [...errores, ...u.rechazados], enviados: files.length });
      setVista('resultados');
    } catch (e) {
      setFallo(e.message);
    }
    setProgreso(null);
  };

  const nuevaTanda = () => {
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
            <Huella size={50} />
            <div>
              <strong>VetLab</strong>
              <span>Análisis veterinario</span>
            </div>
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
            <Subida {...{ files, setFiles, sobre, setSobre, agregar, analizar, progreso, fallo, input, repetidos, resolverRepetidos }} />
          ) : (
            <Resultados tanda={tanda} nuevaTanda={nuevaTanda} />
          )}
        </div>
      </main>
    </div>
  );
}

function Subida({ files, setFiles, sobre, setSobre, agregar, analizar, progreso, fallo, input, repetidos, resolverRepetidos }) {
  const [buscar, setBuscar] = useState('');
  const ocupado = progreso !== null;
  const q = buscar.trim().toLowerCase();
  const visibles = files.map((f, i) => ({ f, i })).filter(({ f }) => f.name.toLowerCase().includes(q));
  return (
    <section className="view" aria-label="Subida de archivos">
      <div className="upload-layout">
        <div
          className={`dropzone ${sobre ? 'drag' : ''}`}
          onClick={() => input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); agregar(e.dataTransfer.files); }}
        >
          <div className="upload-icon"><Nube /></div>
          <h2>Arrastra tus PDF aquí</h2>
          <p>Hasta {MAX} archivos por tanda.<br />Solo se procesan los datos necesarios del hemograma y del perfil bioquímico.</p>
          <button type="button" className="pick-btn" onClick={(e) => { e.stopPropagation(); input.current.click(); }}>Elegir archivos</button>
          <input ref={input} type="file" accept=".pdf,application/pdf" multiple hidden onChange={(e) => { agregar(e.target.files); e.target.value = ''; }} />
        </div>

        <aside className="upload-side">
          <div className="card steps-card">
            <div className="step"><div className="step-num">1</div><div><strong>Sube la tanda</strong><span>PDF del mismo laboratorio y de una sola especie.</span></div></div>
            <div className="step"><div className="step-num">2</div><div><strong>Se leen los valores</strong><span>Solo resultados y rangos necesarios para el análisis.</span></div></div>
            <div className="step"><div className="step-num">3</div><div><strong>Revisa el resultado</strong><span>Conteos, porcentajes, filtros y exportación.</span></div></div>
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

      <div className="card files-card files-main">
        <div className="files-head">
          <h3 role="status">{files.length} archivo(s) en la tanda{files.length >= MAX ? ' (límite alcanzado)' : ''}</h3>
          <input className="buscar" type="search" aria-label="Buscar entre los archivos subidos" placeholder="Buscar archivo por nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} disabled={!files.length} />
          <div className="actions">
            <button className="btn primary" disabled={!files.length || ocupado} onClick={analizar}>Analizar tanda</button>
            <button className="btn" disabled={!files.length || ocupado} onClick={() => { setFiles([]); setBuscar(''); }}>Vaciar</button>
          </div>
        </div>
        {fallo && <div className="aviso error" role="alert" style={{ marginBottom: 12 }}>No se pudo analizar la tanda: {fallo}. Revisa que el servidor siga abierto e inténtalo de nuevo.</div>}
        {ocupado ? (
          <div className="analizando">
            <img src={`${BASE}/brand/perro-negro-muestra.webp`} alt="" height="72" />
            <div style={{ flex: 1 }}>
              <strong>Analizando… {Math.round(progreso * 100)}%</strong>
              <div className="bar" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progreso * 100}%` }} /></div>
            </div>
          </div>
        ) : files.length ? (
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
        ) : (
          <div className="empty-files">Aún no hay archivos seleccionados.</div>
        )}
      </div>

      <div className="session-bar">
        <span>Los PDF se leen en tu navegador y no se envían a ningún servidor. La tanda es temporal: al vaciar o recargar, los datos no se conservan.</span>
        <span><Candado /> Sin historial</span>
      </div>
    </section>
  );
}

function Donut({ conAlt, total }) {
  const p = total ? (conAlt / total) * 100 : 0;
  return (
    <div className="donut" role="img" aria-label={`${conAlt} de ${total} pacientes con alteraciones`} style={{ background: `conic-gradient(#ee5d5d 0 ${p}%, #73b8aa 0)` }}>
      <div className="donut-label"><strong>{conAlt}</strong><small>pacientes</small></div>
    </div>
  );
}

function Histograma({ datos, total }) {
  const tope = 10;
  const bins = Array.from({ length: Math.min(Math.max(0, ...datos.map((d) => d.n)), tope) + 1 }, (_, n) => ({ n, pacientes: 0 }));
  for (const d of datos) bins[Math.min(d.n, tope)].pacientes += d.pacientes;
  const max = Math.max(1, ...bins.map((b) => b.pacientes));
  const paso = max > 8 ? Math.ceil(max / 4) : 1;
  const ticks = [];
  for (let t = 0; t <= max; t += paso) ticks.push(t);
  const nombre = (b) => (b.n === tope ? `${tope}+` : b.n);
  return (
    <div className="vchart">
      <div className="yaxis">{ticks.map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{t}</span>)}</div>
      <div className="plot">
        {ticks.map((t) => <div key={t} className="gl" style={{ bottom: `${(t / max) * 100}%` }} />)}
        <div className="bars">
          {bins.map((b) => (
            <i key={b.n} className={b.n === 0 ? 'ok' : ''} title={`${b.pacientes} paciente(s) con ${nombre(b)} parámetro(s) alterado(s) (${pc(total ? (b.pacientes / total) * 100 : 0)})`} style={{ height: `${(b.pacientes / max) * 100}%` }}>
              <em>{b.pacientes}</em>
            </i>
          ))}
        </div>
      </div>
      <div className="xlab">{bins.map((b) => <span key={b.n}>{nombre(b)}</span>)}</div>
      <div className="xtit">Parámetros alterados en el paciente</div>
    </div>
  );
}

function Tarjeta({ icono, t, n, p, pct }) {
  return (
    <article className="kpi">
      <div className="kpi-icon">{icono}</div>
      <div><span>{t}</span><strong>{n}</strong><small>{p}</small>{pct != null && <div className="kpi-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>}</div>
    </article>
  );
}

function TablasImpresion({ rs }) {
  const paneles = useMemo(() => Object.entries(PANELES).map(([k, p]) => ({ k, nombre: p.nombre, filas: Object.entries(resumen(rs, k).porAnalito).filter(([, c]) => c.medidos > 0 || c.noFiable > 0) })), [rs]);
  return paneles.map(({ k, nombre, filas }) => (
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

function Resultados({ tanda, nuevaTanda }) {
  const [f, setF] = useState({});
  const [panel, setPanel] = useState('hemograma');
  const [foco, setFoco] = useState({ analito: null, estado: 'alterado', severidad: '', plaquetasNoFiables: false });
  const [exp, setExp] = useState(null);
  const [verTodos, setVerTodos] = useState(false);
  const [orden, setOrden] = useState({ col: null, dir: 'desc' });
  const refPac = useRef(null);
  const set = (k) => (e) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v === '' ? undefined : k.startsWith('edad') ? Number(v) : v }));
  };

  const op = useMemo(() => opciones(tanda.resultados), [tanda]);
  const rs = useMemo(() => filtrarDemografia(tanda.resultados, f), [tanda, f]);
  const gen = useMemo(() => resumen(rs, 'general'), [rs]);
  const res = useMemo(() => resumen(rs, panel), [rs, panel]);
  const lista = useMemo(
    () => pacientes(rs, { ...foco, estado: foco.estado === 'alterado' ? undefined : foco.estado, severidad: foco.severidad || undefined }, panel),
    [rs, foco, panel],
  );
  const cambiarPanel = (p) => {
    setPanel(p);
    setFoco({ analito: null, estado: 'alterado', severidad: '', plaquetasNoFiables: false });
    setVerTodos(false);
    setOrden({ col: null, dir: 'desc' });
  };
  const todas = Object.entries(res.porAnalito).map(([k, c]) => ({ k, nombre: NOMBRES[k], ...c }));
  const rangoMal = f.edadMin != null && f.edadMax != null && f.edadMin > f.edadMax;
  const filas = todas.filter((x) => x.medidos > 0 || x.noFiable > 0);
  const sinDatos = todas.filter((x) => !(x.medidos > 0 || x.noFiable > 0)).map((x) => x.nombre);
  const altos = Object.entries(gen.porAnalito).map(([k, c]) => ({ k, nombre: NOMBRES[k], ...c })).filter((x) => x.alterados > 0).sort((a, b) => b.alterados - a.alterados);
  const top = verTodos ? altos : altos.slice(0, 5);
  const maxTop = Math.max(1, altos[0]?.alterados ?? 1);
  const valor = (x, c) => (c === 'nombre' ? x.nombre : c === 'sinDato' ? x.noMedido + x.sinRef : x[c]);
  const filasOrd = orden.col
    ? [...filas].sort((a, b) => {
        const va = valor(a, orden.col);
        const vb = valor(b, orden.col);
        const r = typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb;
        return orden.dir === 'asc' ? r : -r;
      })
    : filas;
  const ordenar = (c) => setOrden((o) => (o.col === c ? (o.dir === 'desc' ? { col: c, dir: 'asc' } : { col: null, dir: 'desc' }) : { col: c, dir: c === 'nombre' ? 'asc' : 'desc' }));

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

      {exp === 'error' && <div className="aviso error no-print" role="alert">No se pudo generar el Excel. Inténtalo de nuevo.</div>}
      {rangoMal && <div className="aviso no-print" role="alert">La edad mínima es mayor que la máxima, por eso no hay pacientes. Corrige el rango o límpialo.</div>}
      <div className="toolbar no-print">
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
        {res.total !== tanda.resultados.length && <p className="resumen-filtro" role="status">Mostrando {res.total} de {tanda.resultados.length} pacientes con los filtros actuales</p>}
        <div className="export-actions">
          <button className="btn" disabled={exp === 'gen'} onClick={async () => {
            setExp('gen');
            try { await exportarExcel(rs, tanda.especie); setExp(null); } catch { setExp('error'); }
          }}><Excel /> {exp === 'gen' ? 'Generando…' : 'Exportar Excel'}</button>
          <button className="btn" onClick={() => window.print()}><Pdf /> Exportar PDF</button>
        </div>
      </div>

      {res.total === 0 && (
        <div className="card vacio-total">
          <img src={`${BASE}/brand/perro-negro-sentado.webp`} alt="" />
          <h3>Ningún paciente con estos filtros</h3>
          <p>Prueba con otro sexo, raza o rango de edad.</p>
          <button className="btn primary" onClick={() => setF({})}><Refrescar /> Limpiar filtros</button>
        </div>
      )}
      <div hidden={res.total === 0}>
      <div className="kpis">
        <Tarjeta icono={<Usuarios />} t={`Pacientes analizados · ${tanda.especie}`} n={gen.total} p={`${tanda.resultados.length} en la tanda`} />
        <Tarjeta icono={<Alerta />} t="Con alguna alteración" n={gen.conAlterados} pct={gen.pctAlterados} p={`${pc(gen.pctAlterados)} de los pacientes`} />
        <Tarjeta icono={<Barras />} t="Con alteración moderada" n={gen.conModerada} pct={gen.pctModerada} p={`${pc(gen.pctModerada)} de los pacientes`} />
        <Tarjeta icono={<Informe />} t="Plaquetas no fiables (agregados)" n={gen.plaquetas.noFiables} pct={gen.plaquetas.pctNoFiables} p={`${pc(gen.plaquetas.pctNoFiables)} de los pacientes`} />
      </div>

      <div className="charts">
        <article className="chart-card">
          <h3>Pacientes con alteraciones</h3>
          <p className="cap">Pacientes con al menos un parámetro fuera de su rango de referencia, en hemograma o bioquímico.</p>
          <div className="donut-area">
            <Donut conAlt={gen.conAlterados} total={gen.total} />
            <div className="legend">
              <div className="legend-row"><span className="dot" style={{ background: '#ee5d5d' }} /><div>Con alteraciones<br /><b>{pc(gen.pctAlterados)} ({gen.conAlterados})</b></div></div>
              <div className="legend-row"><span className="dot" style={{ background: '#73b8aa' }} /><div>Sin alteraciones<br /><b>{pc(100 - gen.pctAlterados)} ({gen.sinAlterados})</b></div></div>
            </div>
          </div>
        </article>

        <article className="chart-card">
          <h3>Parámetros alterados por paciente</h3>
          <p className="cap">Cuántos pacientes tienen 0, 1, 2… parámetros fuera de rango. La barra verde son los pacientes sin alteraciones.</p>
          <Histograma datos={gen.alteradosPorPaciente} total={gen.total} />
        </article>

        <article className="chart-card">
          <h3>Pacientes alterados por parámetro</h3>
          <p className="cap">Los parámetros con más pacientes fuera de rango. <span className="sw alto" /> por sobre el rango · <span className="sw bajo" /> por debajo.</p>
          {top.length ? (
            <div className="hchart">
              {top.map((x) => (
                <div className="hrow" key={x.k} title={`${x.nombre}: ${x.alto} alto(s), ${x.bajo} bajo(s) de ${x.medidos} medidos`}>
                  <span>{x.nombre}</span>
                  <div className="track"><div className="fill" style={{ width: `${(x.alterados / maxTop) * 100}%` }}><i className="alto" style={{ flex: x.alto }} /><i className="bajo" style={{ flex: x.bajo }} /></div></div>
                  <b>{x.alterados} <small>{pc(x.pct)}</small></b>
                </div>
              ))}
              {altos.length > 5 && (
                <button className="link-btn" onClick={() => setVerTodos((v) => !v)}>{verTodos ? 'Ver menos' : `Ver los ${altos.length} parámetros`}</button>
              )}
            </div>
          ) : (
            <p className="vacio">Ningún parámetro alterado con estos filtros.</p>
          )}
        </article>
      </div>

      <article className="card table-card no-print">
        <h3><Informe size={22} /> Detalle por parámetro</h3>
        <nav className="tabs sub no-print" aria-label="Tipo de examen">
          {Object.entries(PANELES).map(([k, p]) => (
            <button key={k} className="tab" aria-current={panel === k ? 'page' : undefined} onClick={() => cambiarPanel(k)}>{p.nombre}</button>
          ))}
        </nav>
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
                  <tr key={x.k} className={foco.analito === x.k ? 'sel' : ''} tabIndex={0} aria-selected={foco.analito === x.k}
                    onClick={() => {
                      setFoco((p) => ({ ...p, analito: p.analito === x.k ? null : x.k, plaquetasNoFiables: false }));
                      refPac.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}>
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

      <div className="solo-print"><TablasImpresion rs={rs} /></div>

      <article className="card pacientes-card" ref={refPac}>
        <h3>
          Pacientes
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
          {res.plaquetas && <button className={`btn ${foco.plaquetasNoFiables ? 'on' : ''}`} onClick={() => setFoco((p) => ({ ...p, plaquetasNoFiables: !p.plaquetasNoFiables }))}>Plaquetas no fiables</button>}
        </div>
        <p className="estado" role="status"><strong>{lista.length}</strong> paciente(s) con este filtro</p>
        {lista.length ? (
          <div className="chips">{lista.map((r) => <span key={r.id} className="chip">{r.id}</span>)}</div>
        ) : (
          <div className="vacio-img"><img src={`${BASE}/brand/pareja-estetoscopio.webp`} alt="" /><span>Ningún paciente cumple esta combinación. Prueba con otro estado o severidad.</span></div>
        )}
      </article>

      </div>

      <div className="bottom-actions no-print"><button className="btn" onClick={nuevaTanda}>Subir otra tanda</button></div>
    </section>
  );
}
