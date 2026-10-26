export const FUENTE = 'VCOG-CTCAE v2 (LeBlanc et al. 2021, Vet Comp Oncol)';

const comun = {
  neutrofilos: { bajo: { moderada: 1500, g3: 1000 }, alto: { moderada: 50000, g3: 100000 } },
  plaquetas: { bajo: { moderada: 100000, g3: 50000 } },
};

// TODO: (bioquimico:fix) verificar estos umbrales contra la tabla original de LeBlanc 2021 (PMC8248125)
const bioquimica = {
  albumina: { bajo: { moderada: 2.0, g3: 1.5 } },
  glucosa: { bajo: { moderada: 55, g3: 40 }, alto: { moderada: 160, g3: 250 } },
  fosforo: { alto: { moderada: 9.0, g3: 13.0 } },
  calcio: { bajo: { moderada: 8.0, g3: 7.0 }, alto: { moderada: 12.0, g3: 13.0 } },
  creatinina: { alto: { moderada: 1.5, g3: 2.0, xULN: true } },
  ast: { alto: { moderada: 1.5, g3: 2.0, xULN: true } },
  alt: { alto: { moderada: 1.5, g3: 4.0, xULN: true } },
  bilirrubina_total: { alto: { moderada: 1.5, g3: 3.0, xULN: true } },
  fosfatasa_alcalina: { alto: { moderada: 2.5, g3: 5.0, xULN: true } },
};

export const ESCALAS = {
  canino: { ...comun, ...bioquimica, hematocrito: { bajo: { moderada: 30, g3: 20 } } },
  felino: { ...comun, hematocrito: { bajo: { moderada: 25, g3: 20 } } },
};

export const REFERENCIAS = {
  canino: {
    eritrocitos: [5.5, 8.5],
    hematocrito: [37, 55],
    hemoglobina: [12, 19.2],
    vcm: [60, 77],
    chcm: [32, 36.5],
    reticulocitos_pct: [null, null],
    reticulocitos_abs: [null, null],
    leucocitos: [6000, 17400],
    neutrofilos: [3000, 12000],
    linfocitos: [800, 4800],
    eosinofilos: [100, 1900],
    basofilos: [null, null],
    monocitos: [100, 1800],
    baciliformes: [null, null],
    metamielocitos: [null, null],
    plaquetas: [145000, 500000],
    proteinas_totales: [5.4, 7.1],
    albumina: [2.6, 3.3],
    globulinas: [2.7, 4.4],
    indice_ag: [0.59, 1.1],
    colesterol: [135, 270],
    glucosa: [65, 118],
    fosforo: [2.6, 6.2],
    creatinina: [0.5, 1.5],
    nus: [8, 31],
    ast: [23, 66],
    alt: [21, 102],
    bilirrubina_total: [0.1, 0.5],
    fosfatasa_alcalina: [20, 156],
    calcio: [8, 11.3],
    ggt: [0, 10],
  },
};

const dec = (etiqueta) => ({ etiqueta, ref: 'dec', valor: 'dec' });

export const PANELES = {
  hemograma: {
    nombre: 'Hemograma',
    pagina: /HEMOGRAMA\s+(\w+)/i,
    col: { etiqueta: [80, 225], valor: [225, 300], pct: [300, 360], unidad: [360, 430], ref: [430, 620] },
    analitos: {
      eritrocitos: { etiqueta: 'ERITROCITOS', ref: 'miles', refDiv: 1e6, valor: 'dec' },
      hematocrito: dec('HEMATOCRITO'),
      hemoglobina: dec('HEMOGLOBINA'),
      vcm: dec('VCM'),
      chcm: dec('CHCM'),
      reticulocitos_pct: dec('% RETICULOCITOS'),
      reticulocitos_abs: { etiqueta: 'RETICULOCITOS', ref: 'miles', valor: 'miles' },
      leucocitos: { etiqueta: 'LEUCOCITOS', ref: 'miles', valor: 'miles' },
      neutrofilos: { etiqueta: 'NEUTROFILOS SEGMENTADOS', ref: 'miles', valor: 'miles' },
      linfocitos: { etiqueta: 'LINFOCITOS', ref: 'miles', valor: 'miles' },
      eosinofilos: { etiqueta: 'EOSINOFILOS', ref: 'miles', valor: 'miles' },
      basofilos: { etiqueta: 'BASOFILOS', ref: 'miles', valor: 'miles' },
      monocitos: { etiqueta: 'MONOCITOS', ref: 'miles', valor: 'miles' },
      baciliformes: { etiqueta: 'BACILIFORMES', ref: 'miles', valor: 'miles' },
      metamielocitos: { etiqueta: 'METAMIELOCITOS', ref: 'miles', valor: 'miles' },
      plaquetas: { etiqueta: 'PLAQUETAS', ref: 'miles', valor: 'miles' },
    },
  },
  bioquimico: {
    nombre: 'Bioquímico',
    pagina: /PERFIL\s+BIOQU[IÍ]MICO/i,
    col: { etiqueta: [60, 205], unidad: [205, 300], valor: [300, 420], ref: [420, 620] },
    tolerante: true,
    analitos: {
      proteinas_totales: dec('PROTEINAS TOTALES'),
      albumina: dec('ALBUMINA'),
      globulinas: dec('GLOBULINAS'),
      indice_ag: dec('INDICE A/G'),
      colesterol: dec('COLESTEROL'),
      glucosa: dec('GLUCOSA'),
      fosforo: dec('FOSFORO'),
      creatinina: dec('CREATININA'),
      nus: dec('NUS'),
      ast: dec('GOT/AST'),
      alt: dec('GPT/ALT'),
      bilirrubina_total: dec('BILIRRUBINA TOTAL'),
      fosfatasa_alcalina: dec('FOSFATASA ALCALINA'),
      calcio: dec('CALCIO'),
      ggt: dec('GGT'),
    },
  },
};
