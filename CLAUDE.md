# CLAUDE.md — MetaboUrg

Guía para el desarrollo asistido por IA de este proyecto. **Léelo antes de proponer cambios.**

---

## 1. Qué es

**MetaboUrg** es un portal PWA de apoyo clínico a las **urgencias endocrino-metabólicas** del adulto hospitalizado. Primer módulo: **Trastornos de la Glucemia** (hiperglucemia simple, cetosis, CAD, EHH, hipoglucemia). A futuro: trastornos hidroelectrolíticos (Na, K, Ca, P, Mg). Hermano de **DosisPed** y **HidratIV** del mismo autor (Carlos J. Galán Doval), de los que hereda arquitectura y patrones.

Es **apoyo clínico, no decisión clínica**: modal de bienvenida con aviso legal y disclaimer en "Acerca de".

## 2. Principios

- **PWA pura**: HTML/CSS/JS sin frameworks, sin bundler, sin módulos ES. Todo global vía el objeto `App`.
- **SPA única → sin saltos ni esperas**: un solo `index.html`, un solo Service Worker, una sola caché. Navegación por hash (`#/glucemia/triaje`), vistas que cambian al instante.
- **Seguridad clínica antes que estética**: los números (mg/dl, ml/h, mEq) y los avisos de seguridad son lo prioritario.
- **Separación de capas**: chasis común en `shared/`, datos clínicos y vistas por módulo en `modulos/<area>/`.
- **Decimal con coma (es-ES)**: `fmt()` formatea; `parseNum()` admite coma.

## 3. Arquitectura

```
index.html              Shell HTML: header, vistas (<section class="view">), modales
styles.css              Tokens CSS claro/oscuro, componentes, responsive
shared/
  core.js               Objeto global App; utilidades (fmt/parseNum/escHtml/toast);
                        temas; enrutado (App.rutas); portal/hub (HUB); novedades;
                        PWA/actualización; arranque (DOMContentLoaded)
  formulas.js           App.formulas: osmolalidadEfectiva, naCorregido, …
  informe.js            App.informe: bloque(texto), bind(), cabecera(titulo)
modulos/
  glucemia/
    protocolos.js       Datos clínicos: UMBRAL, GRAVEDAD_CAD, CUADROS, NOTAS_FUENTE
    glucemia.js         Registra rutas/sub-hub + motor diagnóstico + triaje + informe
sw.js · manifest.json · icon-{192,512}.svg
Apoyo/                  Material de referencia (PDFs SAEDYN, Excel, HTML antiguo) — NO se versiona
```

**Orden de carga de scripts** (en index.html): `core.js` → `formulas.js` → `informe.js` → `modulos/glucemia/protocolos.js` → `modulos/glucemia/glucemia.js`. Los módulos se registran en `App` antes de que `core.js` dispare su `DOMContentLoaded`.

### El objeto App (core.js)
- `App.registrarRuta(hash, {view, crumbs})` — añade una vista al enrutador.
- `App.alIniciar(fn)` — registra una función de init del módulo (se ejecuta en DOMContentLoaded).
- `App.navegar(hash)`, `App.ui.pintarTarjetas(contId, lista)`, `App.util.{fmt,parseNum,escHtml,toast}`.
- `App.formulas` (formulas.js), `App.informe` (informe.js).

### Añadir un módulo nuevo (p. ej. sodio)
1. Crear `modulos/sodio/protocolos.js` (datos) y `modulos/sodio/sodio.js` (vistas+lógica).
2. En `sodio.js`: `App.registrarRuta(...)`, render del sub-hub, `App.alIniciar(...)`.
3. Añadir su `<section class="view">` en `index.html` y los `<script>` (antes del cierre de `<body>`).
4. La tarjeta del portal ya está en `HUB` (core.js): cambiarle `proximamente:true` por su `hash`.
5. Añadir los nuevos archivos a `ASSETS` de `sw.js`.

### Motor diagnóstico (glucemia.js)
`evaluarDiagnostico(d)` clasifica por prioridad: hipoglucemia → CAD/mixto → EHH → cetosis simple → hiperglucemia simple → sin criterios. Usa `App.formulas`. `gravedadCAD()` por pH/HCO₃ y consciencia.

## 4. Decisiones clínicas (validadas con el autor, junio 2026)

- **Columna vertebral HÍBRIDA**: por defecto SEEN/ADA-EASD 2024; variante SAEDYN 2017 como `nota-fuente` donde difiere (insulina con/sin bolo; bicarbonato). Notas en `NOTAS_FUENTE`, referenciadas por clave en `CUADROS[x].notas`.
- **Insulina CAD por defecto**: perfusión fija 0,1 UI/kg/h SIN bolo + mantener basal (0,25 UI/kg si début).
- **Bicarbonato**: no de rutina (ADA 2024); variante SAEDYN si pH≤7,0 en la nota.
- **Resolución CAD**: β-OHB < 0,6 mmol/l y pH > 7,3.
- **CAD leve-moderada**: incluir vía SC alternativa (análogo rápido cada 1-2 h fuera de UCI).

Fuentes en `Apoyo/`. NO modificar valores clínicos sin validación.

## 5. Versionado y novedades (core.js)

- `APP_VERSION` (formato `AAAA.NN`) debe coincidir con `NOVEDADES[0].version`. El changelog es del portal completo.
- Para publicar: insertar entrada AL PRINCIPIO de `NOVEDADES` y actualizar `APP_VERSION`.
- Usuarios existentes ven el modal de novedades + campana 🔔 (`metabourg-version-vista` en localStorage). Nuevos solo la bienvenida.
- Versión + año + autor se pintan desde `APP_VERSION` en el pie (`#app-version`), bienvenida y "Acerca de".
- Claves localStorage: `metabourg-tema`, `metabourg-bienvenida-vista`, `metabourg-version-vista`.

## 6. Despliegue (GitHub Pages)

- Repo: **git@github.com:cjgaland/MetaboUrg.git** (SSH). Pages sirve desde rama `main`.
- URL: **https://cjgaland.github.io/MetaboUrg/**
- `gh` (GitHub CLI) está instalado y autenticado en el equipo del autor.

### Comando "despliega"
**REGLA 1 — No desplegar por iniciativa propia.** Al terminar un bloque, resumir y ofrecer; esperar a que el usuario lo pida.

**REGLA 2 — "despliega"/"sube"/"publica" = autorización total**, sin preguntas intermedias. Flujo:
1. `git status --short` y mostrar lo que se sube.
2. **Bump del Service Worker** si cambia código de la app: incrementar `CACHE_NAME` en `sw.js` (`metabourg-vN` → `metabourg-v(N+1)`) **con la herramienta `Edit`, NUNCA `sed`** (sed dispara prompt de permisos). Genera el banner "Nueva versión disponible".
3. Validar: `node -c` en todos los `.js` (`shared/*.js` y `modulos/**/*.js`). Abortar si falla.
4. Stage selectivo: `git add index.html styles.css shared modulos sw.js manifest.json README.md CLAUDE.md .gitignore icon-*.svg`. NUNCA `git add -A` (no arrastrar `Apoyo/` ni `.claude/`).
5. `git commit -m "..."` (≤72 chars, sin co-autor salvo petición).
6. `git push origin main`.
7. Confirmar: Pages tarda 30-60 s; los usuarios verán el banner al reabrir.

- NUNCA `git push --force`. Si el remoto va por delante: `git pull --rebase origin main`.
- NUNCA commitear `.DS_Store`, `Apoyo/` ni `.claude/` (cubiertos por `.gitignore`).
- Nota: la carpeta local de trabajo se llama `…/Trastornos HIdroelectrolíticos/Glucemia` por motivos históricos; el nombre del repo y del producto es **MetaboUrg** (no hace falta que coincidan).

## 7. Estado actual (junio 2026)

- **v2026.06** — primera versión. Portal MetaboUrg (chasis: temas, PWA, actualización, novedades, bienvenida, acerca) + módulo **Glucemia** con **triaje diagnóstico** funcional e informe copiable. Código ya modularizado en `shared/` + `modulos/glucemia/`.
- **Pendiente**: calculadora completa de CAD (perfusión insulina ml/h, fluidos por horas, K en mEq, tabla horaria en el informe); EHH; hipoglucemia; insulinización IV (tabla 4 pautas SAEDYN); insulinización SC (basal-bolus-corrección A/B/C). Luego, módulos de electrolitos.
