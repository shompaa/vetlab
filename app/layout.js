import '@fontsource-variable/newsreader';
import '@fontsource-variable/geist';
import '@fontsource-variable/caveat';
import './globals.css';

const BASE = process.env.BASE ?? '';

export const metadata = { title: 'VetLab · Análisis de hemogramas', description: 'Estadísticas de hemogramas por tanda' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ '--img-fondo': `url(${BASE}/brand/fondo.svg)`, '--img-hojas': `url(${BASE}/brand/hojas.svg)` }}>{children}</body>
    </html>
  );
}
