import { PANELES } from './reglas.js';
import { NOMBRES } from './etiquetas.js';
import { resumen } from './agregar.js';

function descargar(blob, nombre) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportarExcel(rs, especie) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const res = Object.fromEntries(Object.keys(PANELES).map((p) => [p, resumen(rs, p)]));

  const s1 = wb.addWorksheet('Resumen');
  s1.addRow(['Especie', especie]);
  s1.addRow(['Pacientes analizados', rs.length]);
  for (const [p, r] of Object.entries(res)) {
    const n = PANELES[p].nombre;
    s1.addRows([
      [],
      [n],
      ['Con alteraciones', r.conAlterados],
      ['% con alteraciones', r.pctAlterados],
      ['Con alteración moderada', r.conModerada],
      ['% con alteración moderada', r.pctModerada],
    ]);
    if (r.plaquetas) s1.addRows([['Plaquetas no fiables (agregados)', r.plaquetas.noFiables], ['% plaquetas no fiables', r.plaquetas.pctNoFiables]]);
  }
  s1.getColumn(1).width = 36;

  for (const [p, r] of Object.entries(res)) {
    const n = PANELES[p].nombre;
    const claves = Object.keys(PANELES[p].analitos);

    const s2 = wb.addWorksheet(`Por analito ${n}`);
    s2.addRow(['Analito', 'Medidos', 'Normal', 'Alto', 'Bajo', 'Leve', 'Moderada', '≥G3', '% alterado', 'No medido', 'No fiable', 'Sin referencia']);
    for (const [k, c] of Object.entries(r.porAnalito)) {
      s2.addRow([NOMBRES[k], c.medidos, c.normal, c.alto, c.bajo, c.leve, c.moderada, c.g3, c.pct, c.noMedido, c.noFiable, c.sinRef]);
    }
    s2.getRow(1).font = { bold: true };
    s2.getColumn(1).width = 22;

    const s3 = wb.addWorksheet(`Detalle ${n}`);
    s3.addRow(['Archivo', 'Raza', 'Sexo', 'Edad', ...claves.flatMap((k) => [NOMBRES[k], `${NOMBRES[k]} estado`])]);
    for (const x of rs) {
      s3.addRow([x.id, x.raza, x.sexo, x.edad, ...claves.flatMap((k) => [x[p][k].valor, x[p][k].estado + (x[p][k].severidad ? ` (${x[p][k].severidad})` : '')])]);
    }
    s3.getRow(1).font = { bold: true };
  }

  descargar(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'analisis-hemogramas.xlsx');
}
