# CLAUDE.md — Trastornos de la Glucemia

Guía para el desarrollo asistido por IA de este proyecto. **Léelo antes de proponer cambios.**

---

## 1. Qué es

PWA de apoyo clínico al **diagnóstico y tratamiento de los trastornos agudos de la glucemia** en el adulto hospitalizado (hiperglucemia simple, cetosis, CAD, EHH, hipoglucemia). Es el primer módulo de un portal de **Endocrinología y Metabolismo** (a futuro: Na, K, Ca, P, Mg). Hermana de los proyectos **DosisPed** y **HidratIV** del mismo autor (Carlos J. Galán Doval), de los que hereda arquitectura y patrones.

Es **apoyo clínico, no decisión clínica**: modal de bienvenida con aviso legal y disclaimer en "Acerca de".

## 2. Principios

- **PWA pura**: HTML/CSS/JS sin frameworks, sin bundler, sin módulos ES. Todo global.
- **Sin saltos ni esperas**: SPA con enrutado por hash (`#/glucemia/triaje`), navegación instantánea, una sola caché offline.
- **Seguridad clínica antes que estética**: los números (mg/dl, ml/h, mEq) y los avisos de seguridad son lo prioritario.
- **Separación de capas**: datos clínicos en `protocolos.js`, lógica en `app.js`, presentación en `styles.css`.
- **Decimal con coma (es-ES)**: `fmt()` formatea; `parseNum()` admite coma.

## 3. Arquitectura

```
index.html      Estructura HTML + modales (bienvenida, acerca, novedades)
styles.css      Tokens CSS claro/oscuro, componentes, responsive
app.js          Estado, enrutado de vistas, temas, PWA/actualización,
                novedades, motor diagnóstico, informe copiable
protocolos.js   Datos clínicos (UMBRAL, GRAVEDAD_CAD, CUADROS, NOTAS_FUENTE)
sw.js           Service Worker (network-first)
manifest.json   Manifest PWA
icon-{192,512}.svg
Apoyo/          Material de referencia (PDFs SAEDYN, Excel, HTML antiguo) — NO se versiona
```

`protocolos.js` se carga antes que `app.js` y expone globales: `UMBRAL`, `GRAVEDAD_CAD`, `CUADROS`, `NOTAS_FUENTE`.

### Enrutado (RUTAS en app.js)
- `#/` → portal (hub de trastornos)
- `#/glucemia` → sub-hub de módulos de glucemia
- `#/glucemia/triaje` → triaje diagnóstico

Al añadir un módulo nuevo: añadir su ruta a `RUTAS`, su tarjeta a `GLUCEMIA_MODULOS` y su `<section class="view">` en index.html.

### Motor diagnóstico (app.js)
`evaluarDiagnostico(d)` clasifica por prioridad: hipoglucemia → CAD/mixto → EHH → cetosis simple → hiperglucemia simple → sin criterios. Calcula `osmolalidadEfectiva()` (2·Na + glu/18) y `naCorregido()` (Na + 1,6·(glu−100)/100). `gravedadCAD()` usa pH/HCO₃ y consciencia.

## 4. Decisiones clínicas (validadas con el autor, junio 2026)

- **Columna vertebral HÍBRIDA**: por defecto SEEN/ADA-EASD 2024; se muestra la variante SAEDYN 2017 como `nota-fuente` donde difiere (insulina con/sin bolo; bicarbonato). Las notas están en `NOTAS_FUENTE` y se referencian por clave en `CUADROS[x].notas`.
- **Insulina CAD por defecto**: perfusión fija 0,1 UI/kg/h SIN bolo + mantener basal (0,25 UI/kg si début).
- **Bicarbonato**: no de rutina (ADA 2024); variante SAEDYN si pH≤7,0 en la nota.
- **Resolución CAD**: β-OHB < 0,6 mmol/l y pH > 7,3.
- **CAD leve-moderada**: incluir vía SC alternativa (análogo rápido cada 1-2 h fuera de UCI).

Fuentes en `Apoyo/` y en la memoria del proyecto. NO modificar valores clínicos sin validación.

## 5. Versionado y novedades

- `APP_VERSION` (formato `AAAA.NN`) debe coincidir con `NOVEDADES[0].version`.
- Para publicar una versión: insertar entrada AL PRINCIPIO de `NOVEDADES` y actualizar `APP_VERSION`.
- Usuarios existentes ven el modal de novedades + campana 🔔 (`glucemia-version-vista` en localStorage). Usuarios nuevos solo la bienvenida.
- La versión + año + autor se pintan desde `APP_VERSION` en el pie de la pantalla principal (`#app-version`), bienvenida y "Acerca de".

## 6. Despliegue (GitHub Pages)

- Repo: **git@github.com:cjgaland/Glucemia.git** (SSH). Pages sirve desde rama `main`.
- URL: **https://cjgaland.github.io/Glucemia/**

### Comando "despliega"
**REGLA 1 — No desplegar por iniciativa propia.** Al terminar un bloque, resumir y ofrecer desplegar; esperar a que el usuario lo pida.

**REGLA 2 — "despliega"/"sube"/"publica" = autorización total**, sin preguntas intermedias. Flujo:
1. `git status --short` y mostrar lo que se sube.
2. **Bump del Service Worker** si cambian `app.js`, `protocolos.js`, `styles.css`, `index.html` o `sw.js`: incrementar `CACHE_NAME` en `sw.js` (`glucemia-vN` → `glucemia-v(N+1)`) **con la herramienta `Edit`, NUNCA `sed`** (sed dispara prompt de permisos). Esto genera el banner "Nueva versión disponible".
3. Validar: `node -c app.js && node -c protocolos.js`. Abortar si falla.
4. Stage selectivo: `git add index.html styles.css app.js protocolos.js sw.js manifest.json README.md CLAUDE.md .gitignore icon-*.svg`. NUNCA `git add -A` (no arrastrar `Apoyo/` ni `.claude/`).
5. `git commit -m "..."` (≤72 chars, sin co-autor salvo petición).
6. `git push origin main`.
7. Confirmar: Pages tarda 30-60 s; los usuarios verán el banner al reabrir.

- NUNCA `git push --force`. Si el remoto va por delante: `git pull --rebase origin main`.
- NUNCA commitear `.DS_Store`, `Apoyo/` ni `.claude/` (cubiertos por `.gitignore`).

## 7. Estado actual (junio 2026)

- **v2026.06** — primera versión. Chasis completo (portal, temas, PWA, actualización, novedades, bienvenida, acerca) + **triaje diagnóstico** funcional con informe copiable.
- **Pendiente**: calculadora completa de CAD (perfusión insulina ml/h, fluidos por horas, K en mEq, tabla horaria en el informe); EHH; hipoglucemia; insulinización IV (tabla 4 pautas SAEDYN); insulinización SC (basal-bolus-corrección A/B/C).
