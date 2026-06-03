// ============================================================
//  app.js — Lógica · Trastornos de la Glucemia
//  Estado, enrutado de vistas, temas, PWA/actualización,
//  novedades, motor diagnóstico e informe copiable.
//  Sin módulos ES: protocolos.js expone globales (UMBRAL, etc.).
// ============================================================

// ── Claves de persistencia ────────────────────────────────
const KEY_TEMA    = "glucemia-tema";
const KEY_BIENV   = "glucemia-bienvenida-vista";
const KEY_VERSION = "glucemia-version-vista";

// ── Versión y novedades (changelog) ───────────────────────
// APP_VERSION debe coincidir con NOVEDADES[0].version.
// Al publicar: insertar entrada AL PRINCIPIO y actualizar APP_VERSION.
const APP_VERSION = "2026.06";
const APP_ANIO = APP_VERSION.split(".")[0];

const NOVEDADES = [
  {
    version: "2026.06",
    fecha: "Junio 2026",
    titulo: "Primera versión",
    cambios: [
      "Triaje diagnóstico de los trastornos de la glucemia: hiperglucemia simple, cetosis, cetoacidosis (CAD), estado hiperosmolar (EHH) e hipoglucemia, según SEEN y consenso ADA/EASD 2024.",
      "Cálculo automático de osmolalidad efectiva y sodio corregido.",
      "Informe copiable para pegar en la historia clínica.",
      "Funciona sin conexión (instalable en móvil, tablet y ordenador)."
    ]
  }
];

// ── Utilidades numéricas (es-ES, coma decimal) ────────────
function parseNum(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const v = (el.value || "").trim().replace(",", ".");
  if (v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function fmt(n, dec) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const f = (dec === undefined) ? (Math.abs(n) < 10 && n % 1 !== 0 ? 1 : 0) : dec;
  return n.toLocaleString("es-ES", { minimumFractionDigits: f, maximumFractionDigits: f });
}
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── Toast ──────────────────────────────────────────────────
function toast(msg, esError) {
  const t = document.getElementById("toast");
  document.getElementById("toast-text").textContent = msg;
  t.className = "toast show" + (esError ? " error" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = "toast"; }, 2200);
}

// ── Tema claro/oscuro ──────────────────────────────────────
(function () {
  const root = document.documentElement;
  const meta = document.getElementById("meta-theme-color");
  function aplicar(claro) {
    root.classList.toggle("modo-claro", claro);
    document.querySelector(".icon-luna").style.display = claro ? "none" : "block";
    document.querySelector(".icon-sol").style.display = claro ? "block" : "none";
    if (meta) meta.content = claro ? "#eef4fb" : "#0c1726";
  }
  const guardado = localStorage.getItem(KEY_TEMA);
  const prefClaro = window.matchMedia("(prefers-color-scheme: light)").matches;
  aplicar(guardado !== null ? guardado === "claro" : prefClaro);
  document.getElementById("btn-tema").addEventListener("click", () => {
    const claro = !root.classList.contains("modo-claro");
    aplicar(claro);
    localStorage.setItem(KEY_TEMA, claro ? "claro" : "oscuro");
  });
})();

// ── Enrutado de vistas (hash) ──────────────────────────────
const RUTAS = {
  "":                  { view: "view-hub",      crumbs: [["Inicio", "#/"]] },
  "/":                 { view: "view-hub",      crumbs: [["Inicio", "#/"]] },
  "/glucemia":         { view: "view-glucemia", crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"]] },
  "/glucemia/triaje":  { view: "view-triaje",   crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Triaje diagnóstico", "#/glucemia/triaje"]] }
};

function rutaActual() {
  const h = location.hash.replace(/^#/, "");
  return RUTAS[h] ? h : (RUTAS[""] ? "" : "");
}
function navegar(hash) { location.hash = hash; }

function renderRuta() {
  const r = RUTAS[rutaActual()] || RUTAS[""];
  document.querySelectorAll(".view").forEach(v => v.classList.remove("activa"));
  const vista = document.getElementById(r.view);
  if (vista) vista.classList.add("activa");
  // Migas de pan
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = r.crumbs.map((c, i) => {
    const ultimo = i === r.crumbs.length - 1;
    const btn = '<button class="crumb' + (ultimo ? " actual" : "") + '" data-hash="' + c[1] + '">' + escHtml(c[0]) + "</button>";
    return btn + (ultimo ? "" : '<span class="crumb-sep">›</span>');
  }).join("");
  bc.querySelectorAll(".crumb").forEach(b => b.addEventListener("click", () => navegar(b.dataset.hash)));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.addEventListener("hashchange", renderRuta);

// ── Tarjetas del portal (hub) y sub-hub de glucemia ───────
const HUB = [
  { titulo: "Trastornos de la Glucemia", desc: "Hiperglucemia, cetoacidosis, hiperosmolar e hipoglucemia.", icono: "🩸", color: "var(--brand)", hash: "#/glucemia" },
  { titulo: "Sodio", desc: "Hipo e hipernatremia.", icono: "🧂", color: "var(--c-hipo)", proximamente: true },
  { titulo: "Potasio", desc: "Hipo e hiperpotasemia.", icono: "🍌", color: "var(--c-insulina)", proximamente: true },
  { titulo: "Calcio", desc: "Hipo e hipercalcemia.", icono: "🦴", color: "var(--c-hiper)", proximamente: true },
  { titulo: "Fósforo y Magnesio", desc: "Trastornos del P y del Mg.", icono: "⚗️", color: "var(--c-ehh)", proximamente: true }
];

const GLUCEMIA_MODULOS = [
  { titulo: "Triaje diagnóstico", desc: "Introduce datos → identifica el cuadro.", icono: "🔎", color: "var(--brand)", hash: "#/glucemia/triaje" },
  { titulo: "Cetoacidosis (CAD)", desc: "Fluidos, insulina y potasio.", icono: "⚠️", color: "var(--c-cad)", proximamente: true },
  { titulo: "Estado hiperosmolar", desc: "Corrección lenta de la osmolalidad.", icono: "💧", color: "var(--c-ehh)", proximamente: true },
  { titulo: "Hipoglucemia", desc: "Tratamiento según consciencia.", icono: "🍬", color: "var(--c-hipo)", proximamente: true },
  { titulo: "Insulinización IV", desc: "Perfusión y objetivos 140–180.", icono: "💉", color: "var(--c-insulina)", proximamente: true },
  { titulo: "Insulinización SC", desc: "Basal-bolus-corrección.", icono: "🧪", color: "var(--c-insulina)", proximamente: true }
];

function tarjetaHTML(c) {
  const prox = c.proximamente;
  return '<button class="card' + (prox ? " proximamente" : "") + '" ' +
    (prox ? "" : 'data-hash="' + c.hash + '"') +
    ' style="--card-color:' + c.color + '">' +
    (prox ? '<span class="card-badge">Próximamente</span>' : "") +
    '<span class="card-icono">' + c.icono + "</span>" +
    '<span class="card-titulo">' + escHtml(c.titulo) + "</span>" +
    '<span class="card-desc">' + escHtml(c.desc) + "</span>" +
    "</button>";
}
function pintarTarjetas(contId, lista) {
  const cont = document.getElementById(contId);
  cont.innerHTML = lista.map(tarjetaHTML).join("");
  cont.querySelectorAll(".card[data-hash]").forEach(b => b.addEventListener("click", () => navegar(b.dataset.hash)));
}

// ============================================================
//  MOTOR DIAGNÓSTICO
// ============================================================
function osmolalidadEfectiva(na, glu) {
  if (na === null || glu === null) return null;
  return 2 * na + glu / 18;
}
function naCorregido(na, glu) {
  if (na === null || glu === null) return null;
  return na + 1.6 * ((glu - 100) / 100);
}

function evaluarDiagnostico(d) {
  // d: { peso, glu, ph, hco3, bhb, na, k, cetonuria, consciencia, isglt2 }
  const has = v => v !== null && v !== undefined;
  const osm = osmolalidadEfectiva(d.na, d.glu);
  const naCorr = naCorregido(d.na, d.glu);

  const cetosis  = (has(d.bhb) && d.bhb >= UMBRAL.bhb_cetosis) || d.cetonuria;
  const cetMarcada = (has(d.bhb) && d.bhb > UMBRAL.bhb_cad) || d.cetonuria;
  const acidosis = (has(d.ph) && d.ph < UMBRAL.ph_cad) || (has(d.hco3) && d.hco3 < UMBRAL.hco3_cad);
  const puedeValorarAcidosis = has(d.ph) || has(d.hco3);
  const hiperosm = osm !== null && osm > UMBRAL.osm_ehh;

  const criterios = [];
  const avisos = [];
  let cuadroId = null, gravedad = null;

  // 1) Hipoglucemia (prioritario)
  if (has(d.glu) && d.glu < UMBRAL.glucosa_hipo) {
    cuadroId = "hipoglucemia";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl (< 70)"]);
  }
  // 2) Cetoacidosis / mixto
  else if (cetosis && acidosis) {
    cuadroId = (hiperosm || (has(d.glu) && d.glu >= UMBRAL.glucosa_ehh)) ? "mixto" : "cad";
    gravedad = gravedadCAD(d);
    if (has(d.glu)) criterios.push([d.glu >= UMBRAL.glucosa_cad || d.isglt2, "Glucemia " + fmt(d.glu, 0) + " mg/dl"]);
    criterios.push([true, "Cetosis" + (has(d.bhb) ? " (β-OHB " + fmt(d.bhb, 1) + " mmol/l)" : d.cetonuria ? " (cetonuria ≥ 2+)" : "")]);
    criterios.push([true, "Acidosis metabólica" + (has(d.ph) ? " (pH " + fmt(d.ph, 2) + ")" : "") + (has(d.hco3) ? " · HCO₃ " + fmt(d.hco3, 0) : "")]);
    if (cuadroId === "mixto") criterios.push([true, "Componente hiperosmolar (osm " + fmt(osm, 0) + " mOsm/kg)"]);
  }
  // 3) EHH puro
  else if (has(d.glu) && d.glu >= UMBRAL.glucosa_ehh && hiperosm && !acidosis && (!has(d.bhb) || d.bhb < UMBRAL.bhb_cad)) {
    cuadroId = "ehh";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl (≥ 600)"]);
    criterios.push([true, "Osmolalidad efectiva " + fmt(osm, 0) + " mOsm/kg (> 320)"]);
    criterios.push([true, "Sin cetoacidosis relevante (pH > 7,3, HCO₃ conservado)"]);
  }
  // 4) Cetosis simple
  else if (cetosis && !acidosis && puedeValorarAcidosis) {
    cuadroId = "cetosis";
    criterios.push([true, "Cetosis presente" + (has(d.bhb) ? " (β-OHB " + fmt(d.bhb, 1) + ")" : "")]);
    criterios.push([true, "Sin acidosis (HCO₃ conservado, pH normal)"]);
  }
  // 5) Hiperglucemia simple
  else if (has(d.glu) && d.glu >= UMBRAL.glucosa_cad && !cetosis && !acidosis) {
    cuadroId = "hiperglucemia";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl, sin cetosis ni acidosis"]);
  }

  // ── Avisos de datos que faltan / matices ──
  if (cetosis && !puedeValorarAcidosis) {
    avisos.push({ nivel: "amber", txt: "Hay cetosis pero faltan pH y bicarbonato para confirmar o descartar cetoacidosis. Solicítalos." });
  }
  if (d.isglt2 && cetosis) {
    avisos.push({ nivel: "red", txt: "Paciente con iSGLT2: la CAD puede ser EUGLUCÉMICA (glucemia normal o poco elevada). No descartes CAD por una glucemia baja si hay cetosis y acidosis." });
  }
  if (d.consciencia && (cuadroId === "ehh" || cuadroId === "mixto" || cuadroId === "cad")) {
    avisos.push({ nivel: "red", txt: "Alteración de la consciencia: criterio de gravedad. Valora UCI y vía aérea." });
  }
  if (cuadroId && cuadroId !== "hipoglucemia" && !has(d.k)) {
    avisos.push({ nivel: "amber", txt: "Falta el potasio (K⁺): es imprescindible antes de iniciar insulina (si K < 3,3 mEq/l, reponer primero)." });
  }

  return { cuadroId, gravedad, criterios, avisos, osm, naCorr };
}

function gravedadCAD(d) {
  const has = v => v !== null && v !== undefined;
  if (d.consciencia) return "grave";
  if ((has(d.ph) && d.ph < 7.00) || (has(d.hco3) && d.hco3 < 10)) return "grave";
  if ((has(d.ph) && d.ph < 7.24) || (has(d.hco3) && d.hco3 < 15)) return "moderada";
  return "leve";
}

// ── Render del resultado del triaje ────────────────────────
let _ultimoDx = null;
function renderResultadoTriaje() {
  const d = leerDatosTriaje();
  if (!datosSuficientes(d)) {
    toast("Introduce al menos la glucemia.", true);
    return;
  }
  const res = evaluarDiagnostico(d);
  const cont = document.getElementById("triaje-resultado");

  if (!res.cuadroId) {
    cont.innerHTML =
      '<div class="result-card" style="--dx-color:var(--text-2)">' +
        '<div class="result-kicker">Resultado</div>' +
        '<div class="result-dx" style="font-size:1.15rem">Sin criterios de descompensación aguda</div>' +
        '<p class="result-explica">Con los datos introducidos no se cumplen criterios de hiperglucemia significativa, cetosis, cetoacidosis, estado hiperosmolar ni hipoglucemia. Reevalúa según la evolución clínica.</p>' +
      "</div>";
    _ultimoDx = null;
    cont.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const cuadro = CUADROS[res.cuadroId];
  const sevTxt = res.gravedad ? (cuadro.nombre.indexOf("CAD") >= 0 ? cuadro.nombre.replace("(CAD)", "").trim() : cuadro.nombre) : cuadro.nombre;
  const etiquetaGrav = res.gravedad ? ({ leve: "Leve", moderada: "Moderada", grave: "Grave" }[res.gravedad]) : null;

  let crit = res.criterios.map(c =>
    '<li class="' + (c[0] ? "ok" : "no") + '"><span class="mk">' + (c[0] ? "✓" : "·") + "</span><span>" + escHtml(c[1]) + "</span></li>"
  ).join("");

  let calc = "";
  if (res.osm !== null) calc += '<div class="result-row"><span class="label">Osmolalidad efectiva</span><span class="value">' + fmt(res.osm, 0) + " mOsm/kg</span></div>";
  if (res.naCorr !== null) calc += '<div class="result-row"><span class="label">Sodio corregido</span><span class="value">' + fmt(res.naCorr, 0) + " mEq/l</span></div>";

  let avisos = res.avisos.map(a =>
    '<div class="alert alert-' + a.nivel + '"><span>' + (a.nivel === "red" ? "⚠️" : "ℹ️") + "</span><span>" + escHtml(a.txt) + "</span></div>"
  ).join("");

  // Tratamiento resumido (inline) + nota de fuente híbrida
  let trat = "";
  if (cuadro.tratamiento) {
    trat = '<div class="result-divider"></div><h4 style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-2);margin-bottom:8px;">Tratamiento — pasos clave</h4>';
    trat += cuadro.tratamiento.map(b =>
      '<div style="margin-bottom:10px;"><b style="font-size:0.88rem;">' + escHtml(b.titulo) + "</b><ul style='margin:4px 0 0 17px;font-size:0.86rem;color:var(--text-2);'>" +
      b.puntos.map(p => "<li style='margin-bottom:3px;'>" + escHtml(p) + "</li>").join("") + "</ul></div>"
    ).join("");
  }
  let nota = "";
  if (cuadro.notas) {
    nota = cuadro.notas.map(k => '<div class="nota-fuente">' + escHtml(NOTAS_FUENTE[k]) + "</div>").join("");
  }

  // Fijar el diagnóstico ANTES de construir el bloque de informe (lo usa construirInforme()).
  _ultimoDx = { d, res, cuadro, etiquetaGrav };

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:' + cuadro.color + '">' +
      '<div class="result-kicker">Diagnóstico orientativo</div>' +
      (etiquetaGrav ? '<span class="severity-badge">' + etiquetaGrav + "</span><br>" : "") +
      '<div class="result-dx">' + escHtml(cuadro.nombre) + "</div>" +
      '<p class="result-explica">' + escHtml(cuadro.explica) + "</p>" +
      '<div class="result-divider"></div>' +
      '<ul class="criterio-list">' + crit + "</ul>" +
      calc +
      avisos +
      trat +
      nota +
      '<div class="acciones-result">' +
        '<button class="btn btn-secundario" id="btn-recalcular">Recalcular</button>' +
      "</div>" +
    "</div>" +
    construirBloqueInforme();

  document.getElementById("btn-recalcular").addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); });
  bindInforme();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function leerDatosTriaje() {
  return {
    peso: parseNum("t-peso"),
    glu: parseNum("t-glucosa"),
    ph: parseNum("t-ph"),
    hco3: parseNum("t-hco3"),
    bhb: parseNum("t-bhb"),
    na: parseNum("t-na"),
    k: parseNum("t-k"),
    cetonuria: document.getElementById("t-cetonuria").checked,
    consciencia: document.getElementById("t-consciencia").checked,
    isglt2: document.getElementById("t-isglt2").checked
  };
}
function datosSuficientes(d) {
  return d.glu !== null || d.bhb !== null || d.cetonuria;
}

// ── Informe copiable ───────────────────────────────────────
function construirBloqueInforme() {
  return '<div class="report-card">' +
    '<div class="report-head"><h3>Texto para el informe</h3>' +
    '<button class="btn-copy" id="btn-copiar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copiar</span></button></div>' +
    '<textarea class="report-textarea" id="report-text" spellcheck="false">' + escHtml(construirInforme()) + "</textarea>" +
    '<p class="report-hint">Puedes editar el texto antes de copiarlo y pegarlo en la historia clínica.</p>' +
    "</div>";
}
function construirInforme() {
  if (!_ultimoDx) return "";
  const { d, res, cuadro, etiquetaGrav } = _ultimoDx;
  const sep = "----------------------------------------------";
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  let t = "";
  t += "TRASTORNO DE LA GLUCEMIA — VALORACIÓN\n" + sep + "\n";
  t += "Fecha: " + fecha + "\n\n";
  t += "DATOS\n";
  if (d.peso !== null) t += "  - Peso: " + fmt(d.peso) + " kg\n";
  if (d.glu !== null) t += "  - Glucemia: " + fmt(d.glu, 0) + " mg/dl\n";
  if (d.ph !== null) t += "  - pH venoso: " + fmt(d.ph, 2) + "\n";
  if (d.hco3 !== null) t += "  - Bicarbonato: " + fmt(d.hco3, 0) + " mEq/l\n";
  if (d.bhb !== null) t += "  - β-hidroxibutirato: " + fmt(d.bhb, 1) + " mmol/l\n";
  if (d.cetonuria) t += "  - Cetonuria: ≥ 2+\n";
  if (d.na !== null) t += "  - Sodio: " + fmt(d.na, 0) + " mEq/l\n";
  if (d.k !== null) t += "  - Potasio: " + fmt(d.k, 1) + " mEq/l\n";
  if (res.osm !== null) t += "  - Osmolalidad efectiva: " + fmt(res.osm, 0) + " mOsm/kg\n";
  if (res.naCorr !== null) t += "  - Sodio corregido: " + fmt(res.naCorr, 0) + " mEq/l\n";
  if (d.isglt2) t += "  - En tratamiento con iSGLT2\n";
  if (d.consciencia) t += "  - Alteración del nivel de consciencia\n";
  t += "\nDIAGNÓSTICO ORIENTATIVO\n  " + cuadro.nombre + (etiquetaGrav ? " — " + etiquetaGrav : "") + "\n";
  t += "  " + cuadro.explica + "\n";
  if (res.criterios.length) {
    t += "\nCRITERIOS\n";
    res.criterios.forEach(c => { t += "  " + (c[0] ? "[x] " : "[ ] ") + c[1] + "\n"; });
  }
  if (cuadro.tratamiento) {
    t += "\nTRATAMIENTO — PASOS CLAVE\n";
    cuadro.tratamiento.forEach(b => {
      t += "  " + b.titulo + ":\n";
      b.puntos.forEach(p => { t += "    - " + p + "\n"; });
    });
  }
  if (res.avisos.length) {
    t += "\nAVISOS\n";
    res.avisos.forEach(a => { t += "  ! " + a.txt + "\n"; });
  }
  t += "\n" + sep + "\nApoyo clínico (SEEN / ADA-EASD 2024 / SAEDYN). Verificar por el facultativo.\n";
  return t;
}
function bindInforme() {
  const btn = document.getElementById("btn-copiar");
  if (btn) btn.addEventListener("click", copiarInforme);
}
function copiarInforme() {
  const ta = document.getElementById("report-text");
  const texto = ta ? ta.value : construirInforme();
  const ok = () => {
    const btn = document.getElementById("btn-copiar");
    if (btn) { btn.classList.add("copied"); btn.querySelector("span").textContent = "Copiado"; setTimeout(() => { btn.classList.remove("copied"); btn.querySelector("span").textContent = "Copiar"; }, 2000); }
    toast("Copiado al portapapeles");
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(ok, () => fallbackCopy(ta));
  } else fallbackCopy(ta);
}
function fallbackCopy(ta) {
  if (!ta) { toast("Selecciona y copia manualmente", true); return; }
  ta.focus(); ta.select(); ta.setSelectionRange(0, 99999);
  try {
    const ok = document.execCommand("copy");
    if (window.getSelection) window.getSelection().removeAllRanges();
    if (ok) toast("Copiado al portapapeles"); else toast("Selecciona y copia manualmente", true);
  } catch (e) { toast("Selecciona y copia manualmente", true); }
}

// ============================================================
//  NOVEDADES / CHANGELOG
// ============================================================
function esUsuarioExistente() {
  return !!(localStorage.getItem(KEY_BIENV) || localStorage.getItem(KEY_TEMA) || localStorage.getItem(KEY_VERSION));
}
function novedadesNoVistas(vista) {
  if (!vista) return NOVEDADES.slice();
  const idx = NOVEDADES.findIndex(n => n.version === vista);
  return idx === -1 ? NOVEDADES.slice() : NOVEDADES.slice(0, idx);
}
function activarCampana(activa) {
  const c = document.getElementById("btn-novedades");
  c.style.display = activa ? "flex" : "none";
  c.classList.toggle("activa", activa);
}
function gestionarNovedades(bienvenidaVisible) {
  const vista = localStorage.getItem(KEY_VERSION);
  if (vista === APP_VERSION) return;
  if (!esUsuarioExistente()) { localStorage.setItem(KEY_VERSION, APP_VERSION); return; }
  activarCampana(true);
  if (!bienvenidaVisible) setTimeout(abrirNovedades, 400);
}
function abrirNovedades() {
  const vista = localStorage.getItem(KEY_VERSION);
  let lista = novedadesNoVistas(vista);
  if (lista.length === 0) lista = [NOVEDADES[0]];
  document.getElementById("novedades-body").innerHTML = lista.map(n =>
    '<div class="novedad-bloque"><div class="novedad-titulo">' + escHtml(n.titulo) + "</div>" +
    '<div class="novedad-fecha">Versión ' + escHtml(n.version) + " · " + escHtml(n.fecha) + "</div>" +
    "<ul>" + n.cambios.map(c => "<li>" + escHtml(c) + "</li>").join("") + "</ul></div>"
  ).join("");
  document.getElementById("modal-novedades").classList.add("abierto");
}
function cerrarNovedades() {
  document.getElementById("modal-novedades").classList.remove("abierto");
  localStorage.setItem(KEY_VERSION, APP_VERSION);
  activarCampana(false);
}
function renderHistorial() {
  document.getElementById("historial-versiones").innerHTML = NOVEDADES.map(n =>
    '<div class="historial-item"><div class="historial-cab"><b>' + escHtml(n.titulo) + "</b>" +
    '<span class="historial-tag">v' + escHtml(n.version) + " · " + escHtml(n.fecha) + "</span></div>" +
    "<ul>" + n.cambios.map(c => "<li>" + escHtml(c) + "</li>").join("") + "</ul></div>"
  ).join("");
}

// ── Service Worker + banner de actualización ──────────────
function registrarSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) mostrarBanner(reg);
      });
    });
  }).catch(() => {});
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recargando) return; recargando = true; location.reload();
  });
}
function mostrarBanner(reg) {
  const b = document.createElement("div");
  b.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--brand);color:#fff;padding:12px 18px;border-radius:24px;font:600 .88rem var(--font);box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:9999;display:flex;gap:12px;align-items:center;max-width:calc(100vw - 32px);";
  b.innerHTML = "<span>Nueva versión disponible</span><button style='background:rgba(255,255,255,.22);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:14px;padding:6px 14px;font:700 .82rem inherit;cursor:pointer;'>Actualizar</button>";
  b.querySelector("button").onclick = () => { if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); b.remove(); };
  document.body.appendChild(b);
}

// ============================================================
//  ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  pintarTarjetas("hub-cards", HUB);
  pintarTarjetas("glucemia-cards", GLUCEMIA_MODULOS);
  renderRuta();
  renderHistorial();

  // Versión visible (pantalla principal, bienvenida y "Acerca de")
  const lineaVersion = "Versión " + APP_VERSION + " · " + APP_ANIO;
  const elFooter = document.getElementById("app-version");
  if (elFooter) elFooter.textContent = "Glucemia · v" + APP_VERSION + " · " + APP_ANIO;
  document.getElementById("bienvenida-version").textContent = lineaVersion;
  document.getElementById("info-version").textContent = lineaVersion;

  // Navegación de marca
  document.getElementById("brand-home").addEventListener("click", () => navegar("#/"));

  // Modales
  const info = document.getElementById("modal-info");
  document.getElementById("btn-info").addEventListener("click", () => info.classList.add("abierto"));
  document.getElementById("btn-cerrar-info").addEventListener("click", () => info.classList.remove("abierto"));
  info.addEventListener("click", e => { if (e.target === info) info.classList.remove("abierto"); });

  document.getElementById("btn-novedades").addEventListener("click", abrirNovedades);
  document.getElementById("btn-cerrar-novedades").addEventListener("click", cerrarNovedades);
  document.getElementById("btn-novedades-ok").addEventListener("click", cerrarNovedades);
  document.getElementById("modal-novedades").addEventListener("click", e => { if (e.target.id === "modal-novedades") cerrarNovedades(); });

  // Triaje
  document.getElementById("btn-diagnosticar").addEventListener("click", renderResultadoTriaje);
  document.getElementById("btn-limpiar-triaje").addEventListener("click", () => {
    ["t-peso", "t-glucosa", "t-ph", "t-hco3", "t-bhb", "t-na", "t-k"].forEach(id => { document.getElementById(id).value = ""; });
    ["t-cetonuria", "t-consciencia", "t-isglt2"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("triaje-resultado").innerHTML = "";
    _ultimoDx = null;
  });

  // Bienvenida
  let bienvenidaVisible = false;
  if (!localStorage.getItem(KEY_BIENV)) {
    document.getElementById("modal-bienvenida").classList.add("abierto");
    bienvenidaVisible = true;
  }
  document.getElementById("btn-bienvenida-ok").addEventListener("click", () => {
    document.getElementById("modal-bienvenida").classList.remove("abierto");
    localStorage.setItem(KEY_BIENV, "1");
  });

  gestionarNovedades(bienvenidaVisible);
  registrarSW();
});
