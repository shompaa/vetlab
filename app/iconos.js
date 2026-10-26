const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Huella = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="5.500" cy="11" rx="2" ry="2.800" transform="rotate(-20 5.500 11)" />
    <ellipse cx="9.500" cy="6.200" rx="2.100" ry="3" />
    <ellipse cx="14.500" cy="6.200" rx="2.100" ry="3" />
    <ellipse cx="18.500" cy="11" rx="2" ry="2.800" transform="rotate(20 18.500 11)" />
    <path d="M12 12c-3.200 0-6 3.200-6 5.800 0 1.700 1.400 2.700 3 2.700 1.200 0 1.900-.5 3-.5s1.800.5 3 .5c1.600 0 3-1 3-2.700 0-2.600-2.800-5.800-6-5.800Z" />
  </svg>
);

export const Nube = ({ size = 46 }) => (
  <svg {...base} width={size} height={size} strokeWidth={1.6}>
    <path d="M7 18a4.500 4.500 0 0 1-.8-8.900A6 6 0 0 1 17.700 8 4.600 4.600 0 0 1 17.500 18" />
    <path d="M12 21v-8M9 15.500l3-3 3 3" />
  </svg>
);

export const Usuarios = ({ size = 30 }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="9" cy="8" r="3.200" />
    <path d="M3 19c.5-3.200 3-5 6-5s5.500 1.800 6 5" />
    <circle cx="17" cy="9" r="2.500" />
    <path d="M17 14c2.300 0 4 1.400 4.500 4" />
  </svg>
);

export const Alerta = ({ size = 30 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M12 4 2.800 19.500h18.400L12 4Z" />
    <path d="M12 10v4.500M12 17.200v.1" />
  </svg>
);

export const Barras = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="12" width="4.500" height="9" rx="1.200" />
    <rect x="9.800" y="6" width="4.500" height="15" rx="1.200" />
    <rect x="16.500" y="9" width="4.500" height="12" rx="1.200" />
  </svg>
);

export const Informe = ({ size = 30 }) => (
  <svg {...base} width={size} height={size}>
    <rect x="5" y="4.500" width="14" height="17" rx="2" />
    <path d="M9 4.500V3.500h6v1M9 11h6M9 15h6" />
  </svg>
);

export const Refrescar = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M20 11a8 8 0 0 0-14-4.500L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4.500L20 15M20 20v-5h-5" />
  </svg>
);

export const Excel = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#1d7f4e" />
    <path d="m8 8 8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.200" strokeLinecap="round" />
  </svg>
);

export const Pdf = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 2.500h8l5 5V20a1.500 1.500 0 0 1-1.500 1.500h-11A1.500 1.500 0 0 1 5 20V4A1.500 1.500 0 0 1 6 2.500Z" fill="#e34b4b" />
    <path d="M14 2.500v5h5" fill="#f4a0a0" />
    <text x="12" y="17" textAnchor="middle" fontSize="6.500" fontWeight="800" fill="#fff" fontFamily="system-ui">PDF</text>
  </svg>
);

export const Candado = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.500" y="10.500" width="15" height="10" rx="2.500" fill="#e0a43a" />
    <path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" fill="none" stroke="#c88a20" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Corazon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#ef5b5b" aria-hidden="true">
    <path d="M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11Z" />
  </svg>
);
