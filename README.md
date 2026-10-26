# VetLab · vet-app

Análisis de hemogramas y perfil bioquímico veterinario (informes de Analítica Lab). Corre **100% en el navegador**: los PDF se leen en el equipo de quien los sube y no se envían a ningún servidor. No guarda historial.

- Hasta 1000 PDF por tanda, de una sola especie (perros; gatos leen el rango del propio PDF).
- Lee el hemograma y el perfil bioquímico; ignora coagulación, electrolitos y otras hojas.
- Tarjetas y gráficos generales, tabla de detalle por panel, filtros de sexo, raza y edad, exportación a Excel y PDF.
- Severidad leve/moderada según VCOG-CTCAE v2 (LeBlanc et al. 2021) donde hay escala. Las escalas del perfil bioquímico están pendientes de verificar (`src/reglas.js`).

## Desarrollo

```
npm install
npm run dev      # http://localhost:3000
npm test
npm run build    # genera out/ para GitHub Pages (basePath /vet-app)
```

## Datos de pacientes

Los PDF de laboratorio contienen datos de pacientes. No los subas al repositorio: `*.pdf` y `fixtures/` están en `.gitignore`. Las pruebas con un PDF real (`test/muestra.js`) solo corren si existe `fixtures/muestra-canino.pdf` en tu equipo.

## Publicar en GitHub Pages

Settings → Pages → Source: **GitHub Actions**. Cada push a `main` ejecuta `.github/workflows/deploy.yml` y publica en `https://<usuario>.github.io/vet-app/`.
