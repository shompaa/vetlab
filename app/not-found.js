import Link from 'next/link';

const BASE = process.env.BASE ?? '';

export const metadata = { title: 'Página no encontrada · VetLab' };

export default function NoEncontrada() {
  return (
    <main className="not-found">
      <div>
        <img src={`${BASE}/brand/perro-negro-saludo.webp`} alt="Un cocker negro con bata y estetoscopio saludando" />
        <h1>No encontramos esa página</h1>
        <p>La dirección no existe o cambió. Vuelve al análisis de hemogramas.</p>
        <Link className="btn primary" href="/">Volver al inicio</Link>
      </div>
    </main>
  );
}
