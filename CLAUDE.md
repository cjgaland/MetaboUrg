# CLAUDE.md — MetaboUrg

Guía para el desarrollo asistido por IA de este proyecto. **Léelo antes de proponer cambios.**

---

## 1. Qué es

**MetaboUrg** es un portal PWA de apoyo clínico a las **urgencias endocrino-metabólicas** del adulto hospitalizado. Primer módulo: **Trastornos de la Glucemia** (hiperglucemia simple, cetosis, CAD, EHH, hipoglucemia). Hoy el portal tiene cuatro áreas: **Glucemia**, **Trastornos Hidroelectrolíticos** (Na, K, Ca, P, Mg), **Patología Tiroidea** y **Trastornos Suprarrenales** (mapa completo en §3). Hermano de **DosisPed** y **HidratIV** del mismo autor (Carlos J. Galán Doval), de los que hereda arquitectura y patrones.

Es **apoyo clínico, no decisión clínica**: modal de bienvenida con aviso legal y disclaimer en "Acerca de".

## 2. Principios

- **PWA pura**: HTML/CSS/JS sin frameworks, sin bundler, sin módulos ES. Todo global vía el objeto `App`.
- **SPA única → sin saltos ni esperas**: un solo `index.html`, un solo Service Worker, una sola caché. Navegación por hash (`#/glucemia/diagnostico`), vistas que cambian al instante.
- **Seguridad clínica antes que estética**: los números (mg/dl, ml/h, mEq) y los avisos de seguridad son lo prioritario.
- **Separación de capas**: chasis común en `shared/`, datos clínicos y vistas por módulo en `modulos/<area>/`.
- **Decimal con coma (es-ES)**: `fmt()` formatea; `parseNum()` admite coma.

## 3. Arquitectura

```
index.html              Shell HTML: cabecera, sidebar, vistas (<section class="view" id="view-…">),
                        modales (bienvenida, novedades, Acerca de, sugerencias) y los <script>
styles.css              Tokens CSS claro/oscuro, componentes, responsive
shared/
  core.js               Objeto global App; utilidades (fmt/parseNum/escHtml/toast);
                        temas; enrutado (App.rutas); árbol AREAS (sidebar, portal y sub-hubs; HUB se
                        deriva de él); glosario (GLOSARIO/glosar); NOVEDADES; buzón de sugerencias
                        (Web3Forms); PWA/actualización; arranque (DOMContentLoaded)
  formulas.js           App.formulas: osmolalidadEfectiva, naCorregido, osmolaridadTotal,
                        aguaCorporalTotal, deficitAgua, perdidasEstimadas, fena, deficitHCO3
  informe.js            App.informe: bloque(texto), bind(), cabecera(titulo), SEP
modulos/
  glucemia/             protocolos.js (datos: UMBRAL, GRAVEDAD_CAD, CUADROS, NOTAS_FUENTE, CAD_CFG,
                        INSULINA_SC, INSULINA_IV, EHH_CFG, HIPO_CFG), glucemia.js (diagnóstico),
                        cad.js, ehh.js, hipoglucemia.js, insulina-sc.js, insulina-iv.js
  hidro/                protocolos.js (NA_CFG/NA_TXT, K_CFG/K_TXT, CA_CFG/CA_TXT, P_CFG/P_TXT,
                        MG_CFG/MG_TXT), sodio.js, potasio.js, calcio.js, fosforo.js, magnesio.js
  endo/                 protocolos.js (BWPS, TIRO, SUPRA), tiroides.js, suprarrenal.js
  sintomas.js           Tarjetas plegables «Síntomas y signos» de cada vista (lista por id de vista)
sw.js · manifest.json · icon-{192,512}.svg
README.md               Descripción pública (parte desactualizada: ver §9)
autorespuesta-metabourg.gs   Script de Google Apps Script del buzón; NO forma parte de la app (ver §9)
Apoyo/                  Material de referencia (PDFs SAEDYN de insulinización SC/IV, protocolo SAEDYN,
                        tríptico de diabetes gestacional, dietas 1800/2000/2200 kcal, Excel
                        «Tratamiento Trastornos Metabólicos», HTML antiguo de CAD) — NO se versiona
Backup/                 Copias de seguridad locales — NO se versiona (ver §8)
.claude/                launch.json + serve.js (vista previa local) y permisos — NO se versiona
```

**Service worker (`sw.js`)**: estrategia network-first con respaldo en caché (offline); `ASSETS` lista todos los ficheros de la app y hay que mantenerla al día; el SW nuevo NO hace `skipWaiting()` al instalarse: espera a que el usuario pulse «Actualizar» en el banner (mensaje `SKIP_WAITING`). Versión de caché actual: `CACHE_NAME = "metabourg-v13"`.

**Orden de carga de scripts** (en index.html, antes del cierre de `<body>`): `shared/core.js` → `formulas.js` → `informe.js` → `modulos/glucemia/` (`protocolos.js`, `glucemia.js`, `cad.js`, `insulina-sc.js`, `insulina-iv.js`, `ehh.js`, `hipoglucemia.js`) → `modulos/hidro/` (`protocolos.js`, `sodio.js`, `potasio.js`, `calcio.js`, `fosforo.js`, `magnesio.js`) → `modulos/endo/` (`protocolos.js`, `tiroides.js`, `suprarrenal.js`) → `modulos/sintomas.js`. Los módulos se registran en `App` antes de que `core.js` dispare su `DOMContentLoaded`.

Son scripts clásicos (no módulos ES): todo lo declarado con `function`/`const` queda en el ámbito global compartido, y hay dependencias entre ficheros que fijan el orden: `cad.js` y `ehh.js` usan `gravedadCAD()` (glucemia.js) y `CAD_CFG`; `potasio.js`, `calcio.js`, `fosforo.js` y `magnesio.js` usan `cardTrat`, `setVal`, `chkVal` y `redNa` definidos en `sodio.js`; `tiroides.js` usa `cardTrat` y `chkVal` (de `sodio.js`) y `suprarrenal.js` usa `manejoCards`/`listaCard` de `tiroides.js`. No duplicar nombres de función globales entre ficheros.

### El objeto App (core.js)
- `App.registrarRuta(hash, {view, onShow, crumbs})` — añade una vista al enrutador. `hash` va SIN `#` (p. ej. `"/glucemia/cad"`); `onShow` se ejecuta al mostrar la vista (los módulos lo usan para prerrellenar desde `App.estado.paciente`); `crumbs` figura en las rutas pero core.js no lo usa.
- `App.alIniciar(fn)` — registra una función de init del módulo (se ejecuta en DOMContentLoaded).
- `App.navegar(hash)`, `App.ui.{pintarTarjetas, tarjetaHTML, insertarSintomas}`, `App.util.{fmt,parseNum,escHtml,toast,glosar}`.
- `App.estado.paciente` — almacén de un solo uso para pasar datos entre módulos: el módulo de origen lo rellena y navega; el `onShow` del destino lo lee y lo pone a `null`. Si ya había datos al cambiar de ruta, no sale el aviso «Para una valoración completa, empieza por Diagnóstico» (`gestionarAvisoDiagnostico`, solo en módulos con `aviso:true`; se silencia con `sessionStorage["aviso-dx-off"]`).
- `App.formulas` (formulas.js), `App.informe` (informe.js).

### Añadir un módulo nuevo (p. ej. sodio)
1. Crear `modulos/sodio/protocolos.js` (datos) y `modulos/sodio/sodio.js` (vistas+lógica).
2. En `sodio.js`: `App.registrarRuta(...)`, render del sub-hub, `App.alIniciar(...)`.
3. Añadir su `<section class="view">` en `index.html` y los `<script>` (antes del cierre de `<body>`).
4. Portal, sidebar y sub-hubs salen del árbol `AREAS` (core.js; `HUB` se deriva de él): añadir el módulo en `modulos` de su área (o un área nueva con su `<section class="view" id="view-<id>">` y un contenedor `cardsId`), con `hash`, `icono` y `color`. `destacado:true` marca el Diagnóstico, `aviso:true` activa el aviso «empieza por Diagnóstico» (y `diagnostico:` apunta a otro Diagnóstico distinto del del área) y `proximamente:true` lo deja deshabilitado.
5. Añadir los nuevos archivos a `ASSETS` de `sw.js`.
6. Si debe tener tarjeta «Síntomas y signos», añadir la clave `view-…` en `modulos/sintomas.js`.

### Motor diagnóstico (glucemia.js)
`evaluarDiagnostico(d)` clasifica por prioridad: hipoglucemia → CAD/mixto → EHH → cetosis simple → hiperglucemia simple → sin criterios. Usa `App.formulas`. `gravedadCAD()` por pH/HCO₃ y consciencia (grave: consciencia alterada, pH < 7,00 o HCO₃ < 10; moderada: pH < 7,24 o HCO₃ < 15; si no, leve). Esos números están escritos dentro de la función: la constante `GRAVEDAD_CAD` de `protocolos.js` no se lee.

### Mapa de módulos clínicos (verificado en el código el 24/11/2026)
Rutas con `#/`. «Datos» = dónde están los valores clínicos que se pueden auditar. Los textos y cifras citados están transcritos de lo que hace el código; no los he corregido ni interpretado.

**Glucemia** (`modulos/glucemia/`; datos en `protocolos.js` salvo indicación)
- **Diagnóstico y Antecedentes** `#/glucemia/diagnostico` (`view-triaje`) · `glucemia.js` (`evaluarDiagnostico`, `gravedadCAD`, `renderResultadoTriaje`, `construirInforme`). Entradas: peso, glucemia, pH, HCO₃, β-OHB, Na, K, cetonuria, consciencia alterada y antecedentes (IC; ERC con FGe y estadio; tipo de DM; 8 ADO; insulina previa DTD/rápida/lenta/ultra). Calcula osmolalidad efectiva y Na corregido y clasifica en este orden: glucemia < 70 → hipoglucemia; cetosis (β-OHB ≥ 0,6 o cetonuria) y acidosis (pH < 7,30 o HCO₃ < 18) → CAD (mixto si osmolalidad efectiva > 320 o glucemia ≥ 600) con gravedad; glucemia ≥ 600 y osmolalidad > 320, sin acidosis y con β-OHB < 3,0 (o sin dato) → EHH; cetosis sin acidosis (con pH o HCO₃ introducido) → cetosis simple; glucemia ≥ 200 sin cetosis ni acidosis → hiperglucemia simple; si no, «sin criterios». Avisos: iSGLT2 + cetosis (CAD euglucémica), consciencia alterada, falta de K, DM1 (no suspender basal), ERC, IC, pioglitazona + IC, metformina, sulfonilurea + hipoglucemia. Botón al tratamiento (`CUADROS[x].modulo`): hiperglucemia → insulina-sc; cetosis, CAD y mixto → cad; EHH → ehh; hipoglucemia → hipoglucemia. Datos: `UMBRAL`, `GRAVEDAD_CAD` (sin uso), `CUADROS`, `NOTAS_FUENTE`.
- **CAD** `#/glucemia/cad` · `cad.js` (`calcularCAD`, `prefillCAD`). Entradas: peso (obligatorio), glucemia, K, pH, HCO₃, Na, urea, EB, creatinina, Na y creatinina en orina, shock, début, oligoanuria, consciencia, IC, ERC (FGe), insulina previa (DTD, basal). Calcula: osmolalidad efectiva y total, Na corregido, agua corporal total, déficit de agua, pérdidas (25 ml/kg), FENa, déficit de HCO₃; fluidos (1.ª hora 15-20 ml/kg con tope 1500 ml, o 5-10 ml/kg si IC/ERC/oligoanuria; luego 250-500 ml/h o 125-250 ml/h con cautela; salino 0,45 % si Na corregido ≥ 135; bolo 500 ml si shock); insulina 0,1 UI/kg/h sin bolo (50 UI en 50 ml → ml/h = UI/h), bajar a 0,05 UI/kg/h al llegar a glucemia ≤ 250, basal de partida (début 0,25 UI/kg; si no, basal previa o 50 % de la DTD previa); potasio (K < 3,3 retrasar insulina y KCl 10-20 mEq/h; 3,3-5,3 KCl 20-40 mEq/l, 10-20 si ERC/oligoanuria; > 5,3 no reponer); bicarbonato solo si pH ≤ 7,0 (variante SAEDYN); paso a SC. Datos: `CAD_CFG`; escritos en `cad.js` y no en `CAD_CFG`: dosis de bicarbonato (pH < 6,9: 100 mEq; 6,9-7,0: 50 mEq), SC orientativa en début 0,5-0,8 UI/kg/día y «si no baja, duplicar el ritmo».
- **EHH** `#/glucemia/ehh` · `ehh.js` (`calcularEHH`). Entradas: peso (obligatorio), glucemia, Na, K, urea, β-OHB, shock, consciencia, oligoanuria, IC, ERC. Mismos datos calculados que la CAD (sin FENa ni HCO₃); fluidos y potasio con los mismos parámetros de `CAD_CFG`; insulina 0,05-0,1 UI/kg/h solo si β-OHB ≥ 0,6 o la glucemia deja de bajar con fluidos; glucosa al llegar a glucemia ≤ 300, objetivo 250-300; descenso de osmolalidad 3-8 mOsm/kg/h; resolución con osmolalidad ≤ 315 y paciente alerta; profilaxis con HBPM; botón a insulinización SC con peso y glucemia. Datos: `EHH_CFG` + `CAD_CFG`.
- **Hipoglucemia** `#/glucemia/hipoglucemia` · `hipoglucemia.js`. Entradas: glucemia, consciente, vía venosa, sulfonilurea, insulina prolongada, ayuno/alcohol. Árbol: consciente → 15 g de hidratos de absorción rápida; inconsciente sin vía → glucagón 1 mg IM/SC; con vía → 30 ml de glucosa al 33 % (o 20 ml al 50 %) IV; avisos de recaída (sulfonilurea/insulina prolongada) y de glucagón posiblemente ineficaz (inconsciente sin vía y ayuno). Datos: `HIPO_CFG` (umbral 70).
- **Insulinización SC** `#/glucemia/insulina-sc` · `insulina-sc.js` (`calcularSC`). Entradas: peso, glucemia, HbA1c, tratamiento previo (sin insulina / insulina / insulina + ADO), DTD domiciliaria, si come. DTD = la domiciliaria (+ 20 % si insulina + ADO) y, si no hay, peso × 0,3 / 0,4 / 0,5 UI/kg según glucemia < 150 / 150-200 / > 200; basal 50 %; bolo 50 % (solo si come) en 30/40/30 % desayuno/comida/cena; pauta de corrección A/B/C (por DTD < 40 / 40-80 / > 80, o por peso < 60 / 60-90 / > 90 si no hay DTD) con su tabla; plan al alta según HbA1c (< 8, 8-10, > 10). Datos: `INSULINA_SC`.
- **Insulinización IV** `#/glucemia/insulina-iv` · `insulina-iv.js` (`calcularIV`). Entradas: glucemia, pauta 1-4, criterios para iniciar por pauta 2 (5 casillas), insulina de las últimas 6 h. Devuelve UI/h (= ml/h, 1 UI/ml) del tramo de glucemia y pauta elegidos (tabla `pautas_filas`); glucemia < 70 → parar perfusión y protocolo de hipoglucemia; DTD estimada = insulina de 6 h × 4; botón a insulinización SC. Datos: `INSULINA_IV` (objetivo 140-180).

**Trastornos Hidroelectrolíticos** (`modulos/hidro/`; datos en `protocolos.js`; unidades mmol/l para Na y K, mg/dl para Ca, P y Mg)
- **Diagnóstico (Na)** `#/hidro/diagnostico` · `sodio.js` `evaluarSodio`. Na > 145 hipernatremia; Na < 135 hiponatremia (leve 130-134, moderada 125-129, profunda < 125); síntomas graves; avisos de hiperglucemia (glucemia > 200 con Na corregido ≥ 135, o Na corregido − Na ≥ 2); orientación por orina (osmolalidad urinaria ≤ 100; Na urinario < 30 o ≥ 30). Datos: `NA_CFG`, `NA_TXT`.
- **Hiponatremia** `#/hidro/hiponatremia` · `sodio.js` `calcularHO`. Entradas: Na, peso, síntomas graves, alto riesgo de desmielinización, volemia, aguda. Con síntomas graves: SSH 3 % 150 ml en 20 min (o 2 ml/kg), hasta 2-3 veces, objetivo +5 mmol/l en la 1.ª hora, control de Na cada 4 h; preparación casera (SSF 400 ml + 5 amp ClNa 20 % de 10 ml → 450 ml ≈ 231 mEq). Límites de ascenso: +10 mmol/l en 24 h (+8 si alto riesgo) y +8 en cada 24 h siguientes. Con peso: déficit de Na = (Na objetivo − Na) × 0,6 × peso, con Na objetivo = menor de 130 y Na + límite de 24 h; mitad en 12 h y ml/h con SSH 3 % a 514 mEq/l (cifra escrita en `sodio.js`); SSF 0,5-1 ml/kg/h si hipovolémica. Datos: `NA_CFG`, `NA_TXT`.
- **Hipernatremia** `#/hidro/hipernatremia` · `sodio.js` `calcularHE`. Entradas: Na, peso (obligatorios), sexo, anciano, aguda, vía oral, inestabilidad. Agua corporal total = peso × (varón 0,6; mujer 0,5; anciano 0,5; anciana 0,45); déficit = ACT × (Na/140 − 1); descenso máx. 10 mmol/l/día si crónica; reposición en 48-72 h; volumen/día = déficit repartido + 1500 ml de mantenimiento + 1500 ml de pérdidas; ml/h para 48 h y 72 h; efecto de 1 l de glucosado 5 % (Adrogué-Madias). Datos: `NA_CFG`.
- **Diagnóstico (K)** `#/hidro/diagnostico-k`, **Hiperpotasemia** `#/hidro/hiperpotasemia`, **Hipopotasemia** `#/hidro/hipopotasemia` · `potasio.js` (`evaluarK`, `calcularHK`, `calcularPK`). K > 5,0 hiper (≥ 6,5 grave, ≥ 6,0 moderada, si no leve; cualquier cambio ECG = grave); K < 3,5 hipo (< 2,5 grave, < 3,0 moderada, si no leve). Hiper: calcio (gluconato 10 % 10 ml en 2-3 min) si ECG o K ≥ 6,5; insulina 10 UI + 25 g de glucosa, con glucosado 10 % a 50 ml/h × 5 h si glucemia < 126; salbutamol 10-20 mg; quelantes/diuréticos/diálisis. Hipo: vía IV si K < 2,5, ECG o sin vía oral (periférica 20 mEq KCl en 500 ml SSF en 2 h = 250 ml/h; central 20 mEq en 100 ml en 1 h = 100 ml/h); oral 40-60 mEq por toma; objetivo K > 3,5 (> 4,5 si cardiopatía). Datos: `K_CFG`, `K_TXT`.
- **Calcio** `#/hidro/hipercalcemia`, `#/hidro/hipocalcemia` · `calcio.js`. Ca corregido = Ca + 0,8 × (4 − albúmina). Hiper: grave > 14, moderada ≥ 12; SSF 200-300 ml/h; calcitonina 4 UI/kg cada 12 h si grave o sintomática; zoledrónico 4 mg o pamidronato 60-90 mg (denosumab 120 mg si ERC). Hipo: IV si síntomas o corregido < 7,0 (grave < 7, moderada < 8); gluconato 10-20 ml; oral 1500-2000 mg/día; objetivo 8-9. Datos: `CA_CFG`, `CA_TXT`.
- **Fósforo** `#/hidro/hipofosfatemia`, `#/hidro/hiperfosfatemia` · `fosforo.js`. Hipo: grave < 1,0, moderada < 2,0; IV si < 1,0, síntomas o sin vía oral: 0,08-0,16 mmol/kg en 250-500 ml SSF en 6 h (ml/h = volumen / 6; fosfato potásico si hipopotasemia). Hiper: texto según ERC/forma aguda (SSF 200-300 ml/h + furosemida 20-40 mg). Datos: `P_CFG`, `P_TXT`.
- **Magnesio** `#/hidro/hipomagnesemia`, `#/hidro/hipermagnesemia` · `magnesio.js`. Hipo: grave si Mg < 1,25, síntomas o torsades; IV si grave o sin vía oral: 1-2 g en 100 ml SG 5 % en 15 min, torsades 2 g en 10 ml, perfusión 4-8 g en 500 ml en 12-24 h (ml/h = 500/24 a 500/12); en ERC «reducir 25-50 %» (texto en `magnesio.js`). Hiper: suspender aporte, calcio IV 10-20 ml si síntomas, SSF 200-300 ml/h + furosemida 20-40 mg. Datos: `MG_CFG`, `MG_TXT`.

**Patología Tiroidea y Trastornos Suprarrenales** (`modulos/endo/`; datos en `protocolos.js`)
- **Tormenta tiroidea** `#/tiroides/tormenta` · `tiroides.js` `calcularBWPS`: escala de Burch-Wartofsky (temperatura, FC, SNC, GI, IC, FA, precipitante); ≥ 45 tormenta probable, 25-44 inminente, < 25 improbable; muestra siempre el tratamiento `TIRO.tormenta_tto`. Datos: `BWPS`, `TIRO`.
- **Coma mixedematoso** `#/tiroides/mixedema` · `tiroides.js`: solo texto (`TIRO.mixedema_*`), sin cálculos.
- **Crisis suprarrenal, apoplejía, Addison, Cushing, feocromocitoma, Conn** `#/suprarrenal/…` · `suprarrenal.js` (`renderProto`): solo texto de diagnóstico y manejo (`SUPRA`), sin cálculos.

**Síntomas y signos**: `modulos/sintomas.js` (`SINTOMAS`: lista por id de vista). **Informes**: cada módulo tiene su `construirInforme…`/`informe…` que arma el texto plano y lo pasa a `App.informe.bloque`.

## 4. Decisiones clínicas (validadas con el autor, junio 2026)

- **Columna vertebral HÍBRIDA**: por defecto SEEN/ADA-EASD 2024; variante SAEDYN 2017 como `nota-fuente` donde difiere (insulina con/sin bolo; bicarbonato). Notas en `NOTAS_FUENTE`, referenciadas por clave en `CUADROS[x].notas`.
- **Insulina CAD por defecto**: perfusión fija 0,1 UI/kg/h SIN bolo + mantener basal (0,25 UI/kg si début).
- **Bicarbonato**: no de rutina (ADA 2024); variante SAEDYN si pH≤7,0 en la nota. (Verificado: en `cad.js`, con pH ≤ 7,0 la tarjeta «4 · Bicarbonato» muestra la pauta SAEDYN como texto principal y la nota; con pH > 7,0 pone «No indicado».)
- **Resolución CAD**: β-OHB < 0,6 mmol/l y pH > 7,3.
- **CAD leve-moderada**: incluir vía SC alternativa (análogo rápido cada 1-2 h fuera de UCI). (Verificado: hoy esta vía solo aparece en el texto del resultado del Diagnóstico, `CUADROS.cad`; la calculadora `cad.js` no la menciona.)

Fuentes en `Apoyo/`. NO modificar valores clínicos sin validación.

## 5. Versionado y novedades (core.js)

- `APP_VERSION` (formato `AAAA.NN`) debe coincidir con `NOVEDADES[0].version`. El changelog es del portal completo.
- Para publicar: insertar entrada AL PRINCIPIO de `NOVEDADES` y actualizar `APP_VERSION`.
- Usuarios existentes ven el modal de novedades + campana 🔔 (`metabourg-version-vista` en localStorage). Nuevos solo la bienvenida.
- Versión + año + autor se pintan desde `APP_VERSION` en el pie (`#app-version`), bienvenida y "Acerca de".
- Versión actual: **2026.17** (`APP_VERSION` y `NOVEDADES[0]`); caché del SW: `metabourg-v13`. Son dos contadores independientes.
- Claves localStorage: `metabourg-tema`, `metabourg-bienvenida-vista`, `metabourg-version-vista`. Además `sessionStorage["aviso-dx-off"]` (cierra el aviso «empieza por Diagnóstico» durante la sesión). No se guarda ningún dato de paciente: los formularios solo viven en la pantalla.
- El historial de versiones de «Acerca de» sale de `NOVEDADES` (`renderHistorial`): solo se ve la última entrada y un botón «Ver todas las actualizaciones».
- **Buzón de sugerencias** (modal en «Acerca de»): formulario que envía a Web3Forms (`WEB3FORMS_KEY` en core.js; asunto «MetaboUrg · <tipo>»). `autorespuesta-metabourg.gs` es un script aparte de Google Apps Script (cuenta Gmail del autor, se instala a mano con un activador de tiempo) que contesta automáticamente a quien deja su email.

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
5. **Copia de seguridad local** (obligatoria en cada commit + push; ver §8).
6. `git commit -m "..."` (≤72 chars, sin co-autor salvo petición).
7. `git push origin main`.
8. Confirmar: Pages tarda 30-60 s; los usuarios verán el banner al reabrir.

- NUNCA `git push --force`. Si el remoto va por delante: `git pull --rebase origin main`.
- NUNCA commitear `.DS_Store`, `Apoyo/` ni `.claude/` (cubiertos por `.gitignore`).
- **Vista previa local**: `.claude/launch.json` (configuración «glucemia») lanza `node .claude/serve.js` → http://localhost:8765 (servidor estático mínimo; la ruta raíz del proyecto está escrita a mano dentro de `serve.js`). `.claude/` no se versiona.
- Nota: la carpeta local de trabajo se llama `…/Trastornos HIdroelectrolíticos/Glucemia` por motivos históricos; el nombre del repo y del producto es **MetaboUrg** (no hace falta que coincidan).

## 7. Estado actual (junio 2026)

- **v2026.17** — pautas IV hidroelectrolíticas con vehículo, volumen y ritmo en ml/h (SSH 3 % casero y perfusión lenta en hiponatremia; ml/h en hipernatremia; KCl periférico/central; fosfato en 250-500 ml; sulfato de Mg con vehículo). Sin versión propia, commits posteriores: buzón de sugerencias con Web3Forms (`4c664c9`) e historial de versiones plegable (`052b0e9`).
- **v2026.16** — fuentes científicas agrupadas por área en «Acerca de» (glucemia, hidroelectrolíticos, tiroides y suprarrenales).
- **v2026.15** — añadidas las áreas **Patología Tiroidea** (tormenta tiroidea con Burch-Wartofsky, coma mixedematoso) y **Trastornos Suprarrenales** (crisis, apoplejía, Addison, Cushing, feocromocitoma, Conn) en `modulos/endo/` (`protocolos.js` con `BWPS`/`TIRO`/`SUPRA`; `tiroides.js`, `suprarrenal.js`). Cada cuadro con diagnóstico + manejo + síntomas. **Glosario con tooltips** (`GLOSARIO`/`glosar` en core.js) para epónimos/tecnicismos; **tarjeta plegable de síntomas** (`modulos/sintomas.js` + `App.ui.insertarSintomas`). Cuatro áreas con bloque de color en el sidebar.
- **v2026.11** — área **Trastornos Hidroelectrolíticos** completa para **Na, K, Ca, P y Mg**: `modulos/hidro/` (`protocolos.js` con `NA_CFG`/`K_CFG`/`CA_CFG`/`P_CFG`/`MG_CFG` y sus `*_TXT`; `sodio.js`, `potasio.js`, `calcio.js`, `fosforo.js`, `magnesio.js`). Sodio y potasio con módulo de Diagnóstico + 2 tratamientos; Ca/P/Mg con 2 tratamientos autocontenidos (mg/dl). Chasis con **sidebar** (árbol `AREAS` en core.js) escalable a nuevas áreas. Fuentes: guía europea 2014 (Na), UK Kidney Association 2023 (K), Endocrine Society 2023 (Ca), Merck/MSD, EMCrit y Nefrología al día (S.E.N.).
- **v2026.08** — módulo **Glucemia** completo: triaje diagnóstico (con antecedentes IC/ERC y tratamiento previo: tipo de DM, ADO, insulina), calculadora de **CAD** (con cautela de fluidos/K por IC/ERC y basal según insulina previa), **EHH**, **hipoglucemia** (árbol de decisión), **insulinización SC** (basal-bolo-corrección A/B/C) e **insulinización IV** (4 pautas SAEDYN). Accesos directos entre módulos vía `App.estado.paciente`. Datos clínicos en `protocolos.js` (`UMBRAL`, `CUADROS`, `CAD_CFG`, `INSULINA_SC`, `INSULINA_IV`, `EHH_CFG`, `HIPO_CFG`). Módulos en `modulos/glucemia/`: `glucemia`, `cad`, `ehh`, `hipoglucemia`, `insulina-sc`, `insulina-iv`.
- **Pendiente** (no hay tabla horaria de la CAD en el código a 24/11/2026): tabla horaria de la CAD en el informe; pulir el plan de insulinización al alta. Luego, **módulos de electrolitos** (Na, K, Ca, P, Mg) [ya hechos en v2026.11; anotación del 24/11/2026, la frase original es anterior].

## 8. Copias de seguridad locales

- Carpeta `Backup/` en la raíz del proyecto, **ignorada por git** (está en `.gitignore`).
- Cada copia es el proyecto completo (sin `.git`) en `Backup/Copia_Seguridad_MetaboUrg_DD_MM_YYYY-HH_MM`.
- Se conservan solo las **5 más recientes**: al crear una nueva se borra la más antigua.
- **OBLIGATORIO**: hacer una copia **antes de modificar la app** y otra **en cada commit + push** (paso 5 de «despliega», §6).
- Comando:

```bash
bash /Users/Trabajo/.claude/skills/app-copia_seguridad/scripts/copia_seguridad.sh --root "/Users/Trabajo/Desktop/Utilidades Clínicas/Urgencias/Trastornos HIdroelectrolíticos/Glucemia" --name MetaboUrg
```

## 9. Puntos delicados y deuda conocida (verificado el 24/11/2026; NO corregido, solo anotado)

Antes de cambiar un valor clínico, tener en cuenta:
- **Un mismo dato clínico vive en varios sitios.** El resumen del Diagnóstico (`CUADROS[x].tratamiento`, protocolos.js) y las calculadoras llevan el texto por separado. Diferencias actuales: 1.ª hora de fluidos en CAD/EHH («1000 ml» en `CUADROS`, protocolos.js:73 y :98, frente a 15-20 ml/kg con tope 1500 ml en `CAD_CFG`, usado por cad.js y ehh.js); objetivo de glucemia en EHH («200-250» en `CUADROS.ehh`, protocolos.js:103, frente a `EHH_CFG.glu_objetivo` 250-300, usado en ehh.js).
- **Cifras escritas en el código y no en los objetos de datos**: gravedad de la CAD (glucemia.js:100-106), bicarbonato y SC en début (cad.js:111-113, :117-118), «duplicar el ritmo» (cad.js:183), osmolalidad 320 y glucemia 600 en los textos de criterios (glucemia.js:49-50), glucemia > 200 del aviso de pseudohiponatremia (sodio.js:57), 514 mEq/l del SSH 3 % (sodio.js:169), «reducir 25-50 %» (magnesio.js:32).
- **Constantes definidas y sin uso** (a fecha de hoy): `GRAVEDAD_CAD`, `UMBRAL.osm_ehh_ada`, `UMBRAL.hco3_ehh_min`, `EHH_CFG.na_descenso_max`, `NA_CFG.agudo_h`, `NA_CFG.hts_repeticiones`, `K_CFG.hiper_leve`, `K_CFG.ecg12_k`, `K_CFG.monitor_k`, `MG_CFG.hiper`, `MG_CFG.hiper_sintomas`.
- **Casillas que no cambian el cálculo**: `hk-erc` y `hk-diuresis` (potasio.js:90, `calcularHK` no las usa), `lc-oral` (calcio.js:88). En magnesio, `hm-erc`, `hm-diuresis` y `lm-erc` solo ponen negrita o una línea de texto.
- **Etiqueta frente a umbral**: texto de cetosis simple «bicarbonato conservado (>15)» (protocolos.js:57) mientras el código exige HCO₃ ≥ 18 para no haber acidosis (protocolos.js:22, glucemia.js:29); hiperpotasemia: el diagnóstico la declara con K > 5,0 y gravedad «leve», pero la etiqueta dice «leve (5,5-5,9)» (potasio.js:23 y :129).
- **Tabla de insulinización IV**: los tramos son enteros (`min`/`max`, protocolos.js) y el campo admite decimales; una glucemia entre tramos (p. ej. 139,5) no coincide con ninguna fila y no muestra ritmo (insulina-iv.js:44).
- **Déficit de HCO₃** = 0,3 × peso × EB (formulas.js:49): con EB negativo el resultado sale negativo y se muestra con la etiqueta «Déficit de HCO₃» (cad.js:155).
- **Textos que ya no reflejan la app**: `index.html` línea 11 (meta description: «a futuro, electrolitos»), línea 526 (portal de hidroelectrolíticos: «Potasio, calcio, fósforo y magnesio, en desarrollo»), línea 1052 (bienvenida: «Próximamente: trastornos hidroelectrolíticos»); `README.md` (solo describe Glucemia y la estructura antigua) y `manifest.json` (`description`: «a futuro, electrolitos»).
- **Git a 24/11/2026**: sin seguimiento `AGENTS.md` (copia de este fichero) y `autorespuesta-metabourg.gs`; `.gitignore` con la línea `Backup/` sin commitear. `autorespuesta-metabourg.gs` no está en el `git add` de §6, y ese `git add` incluye solo uno de los dos ficheros de instrucciones (el que lleva su nombre). `AGENTS.md` escribe `.Codex/` donde este fichero escribe `.claude/` (la carpeta real es `.claude/`). Mantener ambos ficheros sincronizados.
- `WEB3FORMS_KEY` está en claro en core.js:21 (clave de cliente del formulario; el correo del autor no aparece en el código).
