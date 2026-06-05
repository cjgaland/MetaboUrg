// ============================================================
//  shared/core.js — Núcleo del portal MetaboUrg
//  Chasis común a todos los módulos: utilidades, temas, enrutado
//  (SPA por hash), portal (hub), novedades, PWA/actualización.
//  Los módulos se registran mediante el objeto global `App`.
// ============================================================

// ── Claves de persistencia ────────────────────────────────
const KEY_TEMA    = "metabourg-tema";
const KEY_BIENV   = "metabourg-bienvenida-vista";
const KEY_VERSION = "metabourg-version-vista";

// ── Versión y novedades (changelog del portal completo) ───
// APP_VERSION debe coincidir con NOVEDADES[0].version.
const APP_VERSION = "2026.17";
const APP_ANIO = APP_VERSION.split(".")[0];

const NOVEDADES = [
  {
    version: "2026.17",
    fecha: "Junio 2026",
    titulo: "Tratamientos hidroelectrolíticos con vehículo, volumen y ritmo concretos",
    cambios: [
      "Las pautas IV del área hidroelectrolítica ya no se limitan al principio activo: ahora muestran el vehículo (SSF 0,9%, SG 5%), el volumen total y el ritmo de bomba en ml/h listos para programar.",
      "Hiponatremia grave: se añade la preparación «casera» del salino hipertónico al 3% (SSF 400 ml + 5 amp de ClNa 20% → 450 ml ≈ 231 mEq) y, si hay peso, el déficit de Na en mEq y los ml/h de perfusión lenta repartidos en 12 + 24 h.",
      "Hipernatremia: el volumen diario incluye explícitamente mantenimiento y pérdidas insensibles (~1500 ml/día cada uno) y se muestra el ritmo en ml/h para reposición en 48 h o 72 h.",
      "Hipopotasemia IV: pauta concreta periférica (20 mEq KCl en 500 ml SSF a 250 ml/h = 10 mEq/h) y central (20 mEq KCl en 100 ml SSF a 100 ml/h = 20 mEq/h, con monitor ECG).",
      "Hipofosfatemia: dilución en 250-500 ml de SSF a pasar en 6 h con ritmo de bomba en ml/h y aviso de incompatibilidades (Ca, bicarbonato, Ringer).",
      "Hipomagnesemia: vehículo en cada paso (carga 1-2 g en 100 ml SG 5% en 15 min; torsades 2 g en 10 ml SG 5% en bolo) y perfusión 4-8 g en 500 ml SG 5% con ritmo en ml/h. Hiperfosfatemia/hipermagnesemia agudas: SSF 0,9% 200-300 ml/h + furosemida 20-40 mg IV."
    ]
  },
  {
    version: "2026.16",
    fecha: "Junio 2026",
    titulo: "Fuentes científicas ampliadas",
    cambios: [
      "En «Acerca de», las fuentes se agrupan por áreas e incluyen las referencias internacionales de los trastornos hidroelectrolíticos, tiroideos y suprarrenales (guía europea de hiponatremia, UK Kidney Association, Endocrine Society, JCEM 2025, NICE NG243, Society for Endocrinology, Merck/MSD y EMCrit)."
    ]
  },
  {
    version: "2026.15",
    fecha: "Junio 2026",
    titulo: "Tiroides y suprarrenales",
    cambios: [
      "Nueva área Patología Tiroidea: tormenta tiroidea (con calculadora de la escala de Burch-Wartofsky) y coma mixedematoso.",
      "Nueva área Trastornos Suprarrenales: crisis suprarrenal aguda, apoplejía, Addison, Cushing, feocromocitoma e hiperaldosteronismo primario (Conn), cada uno con diagnóstico, manejo y síntomas.",
      "Glosario ampliado con más epónimos y tecnicismos (SIADH, Burch-Wartofsky, Wolff-Chaikoff, Jod-Basedow, Waterhouse-Friderichsen, Cullen, Grey-Turner, metanefrinas…).",
      "Fuentes: JCEM 2025, NICE NG243, Endocrine Society, Merck/MSD y EMCrit."
    ]
  },
  {
    version: "2026.14",
    fecha: "Junio 2026",
    titulo: "Glosario con tooltips",
    cambios: [
      "Los epónimos y tecnicismos del texto de ayuda (Chvostek, Trousseau, Kussmaul, torsade de pointes, onda U, taquifilaxia, mielinólisis, Adrogué-Madias…) aparecen subrayados y muestran una breve explicación al pasar el ratón o tocarlos."
    ]
  },
  {
    version: "2026.13",
    fecha: "Junio 2026",
    titulo: "Recordatorio de síntomas y signos",
    cambios: [
      "Cada módulo de tratamiento incluye una tarjeta plegable «Síntomas y signos» bajo el formulario, con los hallazgos más frecuentes (incluidos los del ECG) basados en la literatura.",
      "Disponible en glucemia (CAD, EHH, hipoglucemia) y en los diez trastornos hidroelectrolíticos."
    ]
  },
  {
    version: "2026.12",
    fecha: "Junio 2026",
    titulo: "Mejoras visuales del menú y los temas",
    cambios: [
      "El menú lateral muestra un icono junto a cada proceso y agrupa cada área en un bloque con fondo de color tenue (Glucemia y Trastornos Hidroelectrolíticos), preparado para futuras áreas.",
      "Corregido un fallo por el que algunos títulos de las tarjetas se veían en negro en el modo oscuro."
    ]
  },
  {
    version: "2026.11",
    fecha: "Junio 2026",
    titulo: "Potasio, calcio, fósforo y magnesio",
    cambios: [
      "Potasio: Diagnóstico (K), Hiperpotasemia (calcio, insulina-glucosa, salbutamol, quelantes/diálisis) e Hipopotasemia (reposición oral/IV y magnesio).",
      "Calcio: Hipercalcemia (hidratación, calcitonina, bifosfonato/denosumab) e Hipocalcemia (calcio IV y magnesio), con calcio corregido por albúmina.",
      "Fósforo: Hiperfosfatemia (quelantes) e Hipofosfatemia (reposición oral/IV; aviso de realimentación).",
      "Magnesio: Hipermagnesemia (calcio antagonista, eliminación) e Hipomagnesemia (sulfato de magnesio).",
      "Con esto, el área de Trastornos Hidroelectrolíticos cubre el sodio, el potasio, el calcio, el fósforo y el magnesio.",
      "Fuentes: UK Kidney Association 2023, Endocrine Society 2023, consenso español y Nefrología al día (S.E.N.), entre otras."
    ]
  },
  {
    version: "2026.10",
    fecha: "Junio 2026",
    titulo: "Trastornos del sodio",
    cambios: [
      "Nueva área de Trastornos Hidroelectrolíticos, con el primer bloque: el sodio.",
      "Diagnóstico (Na): clasifica hipo/hipernatremia y su gravedad, descarta la pseudohiponatremia por hiperglucemia, orienta la causa por la orina y la volemia, y recomienda el módulo de tratamiento.",
      "Hiponatremia: salino hipertónico al 3% en los síntomas graves, con los límites de ascenso para evitar la mielinólisis, y manejo según la causa.",
      "Hipernatremia: cálculo del déficit de agua libre, velocidad de corrección y fluidoterapia.",
      "Basado en la guía europea 2014 (ESICM/ESE/ERA-EDTA) y la guía española SEN-SEEN-SEMI."
    ]
  },
  {
    version: "2026.09",
    fecha: "Junio 2026",
    titulo: "Nueva navegación y diseño",
    cambios: [
      "Menú lateral con áreas desplegables: navega entre los módulos desde el lateral o desde las tarjetas. En el móvil, menú hamburguesa.",
      "Mejor aprovechamiento del ancho de pantalla en ordenador, manteniendo el texto legible.",
      "El «triaje» pasa a llamarse «Diagnóstico y Antecedentes», se muestra destacado y recomienda de forma explícita el módulo de tratamiento adecuado.",
      "Al entrar directamente a un tratamiento se recuerda empezar por «Diagnóstico y Antecedentes».",
      "Corregido el solape de la barra superior con la hora y la batería en el móvil.",
      "Estructura preparada para crecer: trastornos hidroelectrolíticos y futuras áreas."
    ]
  },
  {
    version: "2026.08",
    fecha: "Junio 2026",
    titulo: "Insulinización, EHH e hipoglucemia",
    cambios: [
      "Nuevos módulos de insulinización: subcutánea (basal-bolo-corrección con pautas A/B/C) e intravenosa en perfusión (tabla de 4 pautas, objetivo 140-180 mg/dl) según SAEDYN 2017.",
      "Nuevo módulo de estado hiperglucémico hiperosmolar (EHH): corrección lenta de la osmolalidad, insulina a dosis baja, potasio y profilaxis de trombosis.",
      "Nuevo módulo de hipoglucemia: árbol de decisión según consciencia y vía venosa, con avisos de recaída por sulfonilurea/insulina lenta.",
      "El triaje recoge ahora antecedentes (insuficiencia cardíaca, ERC) y el tratamiento previo (tipo de diabetes, antidiabéticos e insulina), que ajustan los fluidos, el potasio y la insulina basal en la CAD y se heredan entre módulos.",
      "Accesos directos entre módulos con los datos ya rellenados (triaje → tratamiento, CAD/EHH → insulinización SC, IV → SC)."
    ]
  },
  {
    version: "2026.07",
    fecha: "Junio 2026",
    titulo: "Calculadora de cetoacidosis (CAD)",
    cambios: [
      "Nueva calculadora de tratamiento de la cetoacidosis diabética: fluidos, insulina, potasio y bicarbonato calculados según el peso y la situación del paciente, con dosis, composición de sueros y ritmos de perfusión.",
      "Panel de «Datos calculados» antes del tratamiento: osmolaridad, agua corporal total, déficit de agua, pérdidas estimadas, fracción de excreción de Na y déficit de bicarbonato.",
      "Acceso directo desde el triaje con los datos ya rellenados, e informe copiable completo.",
      "Cada apartado del tratamiento se distingue con un color suave."
    ]
  },
  {
    version: "2026.06",
    fecha: "Junio 2026",
    titulo: "Primera versión",
    cambios: [
      "Portal MetaboUrg de urgencias endocrino-metabólicas.",
      "Módulo de Trastornos de la Glucemia con triaje diagnóstico: hiperglucemia, cetosis, cetoacidosis (CAD), estado hiperosmolar (EHH) e hipoglucemia, según SEEN y consenso ADA/EASD 2024.",
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
function toast(msg, esError) {
  const t = document.getElementById("toast");
  document.getElementById("toast-text").textContent = msg;
  t.className = "toast show" + (esError ? " error" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.className = "toast"; }, 2200);
}

// ── Objeto global del portal: registro de módulos ─────────
const App = {
  rutas: {
    "":  { view: "view-hub", crumbs: [["Inicio", "#/"]] },
    "/": { view: "view-hub", crumbs: [["Inicio", "#/"]] }
  },
  inits: [],
  estado: {},   // almacén compartido entre módulos (p. ej. datos del paciente del triaje)
  registrarRuta(hash, def) { this.rutas[hash] = def; },
  alIniciar(fn) { this.inits.push(fn); },
  navegar(hash) { location.hash = hash; },
  util: { fmt, parseNum, escHtml, toast }
};
window.App = App;

// ── Tema claro/oscuro ──────────────────────────────────────
(function () {
  const root = document.documentElement;
  const meta = document.getElementById("meta-theme-color");
  function aplicar(claro) {
    root.classList.toggle("modo-claro", claro);
    const luna = document.querySelector(".icon-luna"), sol = document.querySelector(".icon-sol");
    if (luna) luna.style.display = claro ? "none" : "block";
    if (sol) sol.style.display = claro ? "block" : "none";
    if (meta) meta.content = claro ? "#eef4fb" : "#0c1726";
  }
  const guardado = localStorage.getItem(KEY_TEMA);
  const prefClaro = window.matchMedia("(prefers-color-scheme: light)").matches;
  aplicar(guardado !== null ? guardado === "claro" : prefClaro);
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-tema");
    if (btn) btn.addEventListener("click", () => {
      const claro = !root.classList.contains("modo-claro");
      aplicar(claro);
      localStorage.setItem(KEY_TEMA, claro ? "claro" : "oscuro");
    });
  });
})();

// ── Enrutado de vistas (hash) ──────────────────────────────
function rutaActual() {
  const h = location.hash.replace(/^#/, "");
  return App.rutas[h] ? h : "";
}
function renderRuta() {
  const r = App.rutas[rutaActual()] || App.rutas[""];
  document.querySelectorAll(".view").forEach(v => v.classList.remove("activa"));
  const vista = document.getElementById(r.view);
  if (vista) vista.classList.add("activa");
  const vinoConDatos = !!App.estado.paciente;
  if (typeof r.onShow === "function") { try { r.onShow(); } catch (e) { console.error(e); } }
  sincronizarSidebar();
  gestionarAvisoDiagnostico(vinoConDatos);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.addEventListener("hashchange", renderRuta);

// ── Tarjetas (portal y sub-hubs) ──────────────────────────
function tarjetaHTML(c) {
  const prox = c.proximamente;
  const dest = c.destacado;
  return '<button class="card' + (prox ? " proximamente" : "") + (dest ? " destacado" : "") + '" ' +
    (prox ? "" : 'data-hash="' + c.hash + '"') + ' style="--card-color:' + c.color + '">' +
    (prox ? '<span class="card-badge">Próximamente</span>' : "") +
    (dest ? '<span class="card-badge card-badge-go">Empieza aquí</span>' : "") +
    '<span class="card-icono">' + c.icono + "</span>" +
    '<span class="card-titulo">' + escHtml(c.titulo) + "</span>" +
    '<span class="card-desc">' + escHtml(c.desc) + "</span></button>";
}
function pintarTarjetas(contId, lista) {
  const cont = document.getElementById(contId);
  if (!cont) return;
  cont.innerHTML = lista.map(tarjetaHTML).join("");
  cont.querySelectorAll(".card[data-hash]").forEach(b => b.addEventListener("click", () => App.navegar(b.dataset.hash)));
}
// ── Glosario: tooltips para epónimos y tecnicismos ────────
const GLOSARIO = {
  "chvostek": "Signo de Chvostek: contracción de los músculos faciales al percutir el nervio facial; refleja la hiperexcitabilidad neuromuscular de la hipocalcemia.",
  "trousseau": "Signo de Trousseau: espasmo carpopedal al inflar el manguito de presión por encima de la sistólica durante unos minutos; típico de la hipocalcemia.",
  "kussmaul": "Respiración de Kussmaul: respiración rápida y profunda que compensa una acidosis metabólica (p. ej., la cetoacidosis).",
  "torsades de pointes": "Torsade de pointes: taquicardia ventricular polimórfica asociada a un QT largo; potencialmente mortal.",
  "torsade de pointes": "Torsade de pointes: taquicardia ventricular polimórfica asociada a un QT largo; potencialmente mortal.",
  "torsades": "Torsade de pointes: taquicardia ventricular polimórfica asociada a un QT largo; potencialmente mortal.",
  "onda u": "Onda U: pequeña deflexión positiva tras la onda T en el ECG; característica de la hipopotasemia.",
  "taquifilaxia": "Taquifilaxia: pérdida rápida de la eficacia de un fármaco con su uso repetido (p. ej., la calcitonina tras 48-72 h).",
  "mielinólisis": "Síndrome de desmielinización osmótica (mielinólisis central pontina): daño cerebral por corregir la hiponatremia demasiado deprisa.",
  "desmielinización osmótica": "Síndrome de desmielinización osmótica (mielinólisis central pontina): daño cerebral por corregir la hiponatremia demasiado deprisa.",
  "adrogué-madias": "Fórmula de Adrogué-Madias: estima el cambio del sodio sérico que produce 1 litro de un fluido; ayuda a planificar la corrección.",
  "siadh": "SIADH: secreción inadecuada de ADH; causa hiponatremia euvolémica por retención de agua.",
  "anión gap": "Anión gap: diferencia entre los iones medidos (Na − [Cl + HCO₃]); aumenta en la cetoacidosis y otras acidosis.",
  "glasgow": "Escala de Glasgow: valora el nivel de consciencia de 3 (coma profundo) a 15 (normal).",
  "burch-wartofsky": "Escala de Burch-Wartofsky: puntúa la probabilidad de tormenta tiroidea (≥ 45 muy probable; 25-44 inminente).",
  "wolff-chaikoff": "Efecto Wolff-Chaikoff: el yodo en exceso frena de forma transitoria la liberación de hormona tiroidea; base de su uso en la tormenta.",
  "jod-basedow": "Fenómeno de Jod-Basedow: hipertiroidismo inducido por yodo; por eso el yodo se administra DESPUÉS de la tionamida.",
  "waterhouse-friderichsen": "Síndrome de Waterhouse-Friderichsen: hemorragia suprarrenal bilateral con insuficiencia suprarrenal aguda, típica de la sepsis meningocócica.",
  "mixedema": "Mixedema: edema duro por depósito de mucopolisacáridos en el hipotiroidismo grave; el coma mixedematoso es su forma extrema.",
  "cosintropina": "Cosintropina (ACTH sintética): se usa en el test de estimulación para diagnosticar la insuficiencia suprarrenal.",
  "metanefrinas": "Metanefrinas: metabolitos de las catecolaminas; su elevación en plasma u orina es la prueba clave del feocromocitoma.",
  "cullen": "Signo de Cullen: equimosis periumbilical por hemorragia retroperitoneal o intraabdominal (p. ej., pancreatitis).",
  "grey-turner": "Signo de Grey-Turner: equimosis en los flancos por hemorragia retroperitoneal.",
  "exoftalmos": "Exoftalmos: protrusión de los globos oculares; típico de la oftalmopatía de Graves-Basedow."
};
const GLOSS_RE = new RegExp(
  Object.keys(GLOSARIO).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gi"
);
// Envuelve los términos del glosario con un tooltip, sin tocar las etiquetas HTML
function glosar(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/(<[^>]+>)|([^<]+)/g, (full, tag, text) => {
    if (tag) return tag;
    return text.replace(GLOSS_RE, m => {
      const def = GLOSARIO[m.toLowerCase()];
      return def ? '<abbr class="gloss" tabindex="0" data-tip="' + escHtml(def) + '">' + m + "</abbr>" : m;
    });
  });
}
App.util.glosar = glosar;

// Evita que el tooltip se salga por la derecha: si el término está en la
// mitad derecha de la pantalla, el globo se ancla a la derecha.
function posicionarTip(e) {
  const g = e.target && e.target.closest && e.target.closest(".gloss");
  if (!g) return;
  const r = g.getBoundingClientRect();
  g.classList.toggle("tip-right", r.left > window.innerWidth * 0.5);
}
document.addEventListener("pointerover", posicionarTip, true);
document.addEventListener("focusin", posicionarTip, true);

// Tarjeta plegable de "Síntomas y signos" bajo el formulario de una vista
function insertarSintomas(viewId, items) {
  const view = document.getElementById(viewId);
  if (!view) return;
  const form = view.querySelector(".form-card");
  if (!form || view.querySelector(".sintomas-card")) return;
  const det = document.createElement("details");
  det.className = "sintomas-card";
  det.innerHTML =
    '<summary><span class="sint-ic">🩺</span><span>Síntomas y signos</span></summary>' +
    '<div class="sint-body"><ul>' + items.map(i => "<li>" + glosar(i) + "</li>").join("") + "</ul>" +
    '<p class="sint-fuente">Recordatorio orientativo basado en la literatura; no sustituye la valoración clínica.</p></div>';
  form.insertAdjacentElement("afterend", det);
}
App.ui = { pintarTarjetas, tarjetaHTML, insertarSintomas };

// ── Portal: árbol de áreas y módulos (fuente única) ───────
// Alimenta a la vez el sidebar, las tarjetas del portal y los sub-hubs.
// Escalable: añadir un área nueva (p. ej. Tiroides) es una entrada más.
const AREAS = [
  {
    id: "glucemia",
    titulo: "Trastornos de la Glucemia",
    desc: "Diagnóstico, CAD, hiperosmolar, hipoglucemia e insulinización.",
    icono: "🩸", color: "var(--brand)", hash: "#/glucemia",
    cardsId: "glucemia-cards", diagnostico: "#/glucemia/diagnostico",
    modulos: [
      { titulo: "Diagnóstico y Antecedentes", desc: "Introduce datos → identifica el cuadro y te lleva a su tratamiento.", icono: "🔎", color: "var(--brand)", hash: "#/glucemia/diagnostico", destacado: true },
      { titulo: "Cetoacidosis (CAD)", desc: "Fluidos, insulina y potasio.", icono: "⚠️", color: "var(--c-cad)", hash: "#/glucemia/cad", aviso: true },
      { titulo: "Estado hiperosmolar", desc: "Corrección lenta de la osmolalidad.", icono: "💧", color: "var(--c-ehh)", hash: "#/glucemia/ehh", aviso: true },
      { titulo: "Hipoglucemia", desc: "Tratamiento según consciencia.", icono: "🍬", color: "var(--c-hipo)", hash: "#/glucemia/hipoglucemia", aviso: true },
      { titulo: "Insulinización IV", desc: "Perfusión y objetivos 140–180.", icono: "💉", color: "var(--c-insulina)", hash: "#/glucemia/insulina-iv", aviso: true },
      { titulo: "Insulinización SC", desc: "Basal-bolo-corrección.", icono: "🧪", color: "var(--c-insulina)", hash: "#/glucemia/insulina-sc", aviso: true }
    ]
  },
  {
    id: "hidro",
    titulo: "Trastornos Hidroelectrolíticos",
    desc: "Sodio, potasio, calcio, fósforo y magnesio.",
    icono: "🧪", color: "var(--brand-2)", hash: "#/hidro",
    cardsId: "hidro-cards", diagnostico: "#/hidro/diagnostico",
    modulos: [
      { titulo: "Diagnóstico (Na)", desc: "Clasifica el trastorno del sodio y recomienda el manejo.", icono: "🔎", color: "var(--brand)", hash: "#/hidro/diagnostico", destacado: true },
      { titulo: "Hiponatremia", desc: "Sodio bajo: gravedad, hipertónico y límites.", icono: "🧂", color: "var(--c-hipo)", hash: "#/hidro/hiponatremia", aviso: true },
      { titulo: "Hipernatremia", desc: "Sodio alto: déficit de agua libre.", icono: "🧂", color: "var(--c-ehh)", hash: "#/hidro/hipernatremia", aviso: true },
      { titulo: "Diagnóstico (K)", desc: "Clasifica el trastorno del potasio y recomienda el manejo.", icono: "🔎", color: "var(--brand)", hash: "#/hidro/diagnostico-k", destacado: true },
      { titulo: "Hiperpotasemia", desc: "Potasio alto: calcio, insulina y eliminación.", icono: "🍌", color: "var(--c-cad)", hash: "#/hidro/hiperpotasemia", aviso: true, diagnostico: "#/hidro/diagnostico-k" },
      { titulo: "Hipopotasemia", desc: "Potasio bajo: reposición y magnesio.", icono: "🍌", color: "var(--c-insulina)", hash: "#/hidro/hipopotasemia", aviso: true, diagnostico: "#/hidro/diagnostico-k" },
      { titulo: "Hipercalcemia", desc: "Calcio alto: hidratación y antirresortivos.", icono: "🦴", color: "var(--c-hiper)", hash: "#/hidro/hipercalcemia" },
      { titulo: "Hipocalcemia", desc: "Calcio bajo: calcio IV y magnesio.", icono: "🦴", color: "var(--c-hipo)", hash: "#/hidro/hipocalcemia" },
      { titulo: "Hiperfosfatemia", desc: "Fósforo alto: quelantes y dieta.", icono: "⚗️", color: "var(--c-ehh)", hash: "#/hidro/hiperfosfatemia" },
      { titulo: "Hipofosfatemia", desc: "Fósforo bajo: reposición oral o IV.", icono: "⚗️", color: "var(--c-hipo)", hash: "#/hidro/hipofosfatemia" },
      { titulo: "Hipermagnesemia", desc: "Magnesio alto: calcio y eliminación.", icono: "🧲", color: "var(--c-ehh)", hash: "#/hidro/hipermagnesemia" },
      { titulo: "Hipomagnesemia", desc: "Magnesio bajo: sulfato de magnesio.", icono: "🧲", color: "var(--c-insulina)", hash: "#/hidro/hipomagnesemia" }
    ]
  },
  {
    id: "tiroides",
    titulo: "Patología Tiroidea",
    desc: "Tormenta tiroidea y coma mixedematoso.",
    icono: "🦋", color: "var(--amber)", hash: "#/tiroides",
    cardsId: "tiroides-cards",
    modulos: [
      { titulo: "Tormenta tiroidea", desc: "Crisis tirotóxica: Burch-Wartofsky y tratamiento.", icono: "🔥", color: "var(--c-cad)", hash: "#/tiroides/tormenta" },
      { titulo: "Coma mixedematoso", desc: "Hipotiroidismo descompensado.", icono: "❄️", color: "var(--c-hipo)", hash: "#/tiroides/mixedema" }
    ]
  },
  {
    id: "suprarrenal",
    titulo: "Trastornos Suprarrenales",
    desc: "Crisis, apoplejía, Addison, Cushing, feocromocitoma y Conn.",
    icono: "🔺", color: "var(--green)", hash: "#/suprarrenal",
    cardsId: "suprarrenal-cards",
    modulos: [
      { titulo: "Crisis suprarrenal aguda", desc: "Hidrocortisona y fluidos sin demora.", icono: "🚨", color: "var(--c-cad)", hash: "#/suprarrenal/crisis" },
      { titulo: "Apoplejía suprarrenal", desc: "Hemorragia/infarto suprarrenal.", icono: "🩸", color: "var(--c-cad)", hash: "#/suprarrenal/apoplejia" },
      { titulo: "Síndrome de Addison", desc: "Insuf. suprarrenal primaria crónica.", icono: "🟤", color: "var(--c-ehh)", hash: "#/suprarrenal/addison" },
      { titulo: "Síndrome de Cushing", desc: "Hipercortisolismo: cribado y manejo.", icono: "🌙", color: "var(--c-hiper)", hash: "#/suprarrenal/cushing" },
      { titulo: "Feocromocitoma", desc: "Metanefrinas y bloqueo alfa.", icono: "⚡", color: "var(--violet)", hash: "#/suprarrenal/feocromocitoma" },
      { titulo: "Hiperaldosteronismo (Conn)", desc: "Aldosterona/renina; espironolactona.", icono: "🧪", color: "var(--c-insulina)", hash: "#/suprarrenal/conn" }
    ]
  }
];
window.AREAS = AREAS;

// Rutas de los sub-hubs de cada área (id → view-<id>)
AREAS.forEach(a => App.registrarRuta(a.hash.replace(/^#/, ""), { view: "view-" + a.id }));

// Tarjetas del portal = áreas de nivel superior
const HUB = AREAS.map(a => ({ titulo: a.titulo, desc: a.desc, icono: a.icono, color: a.color, hash: a.hash }));

// Pintar los sub-hubs (tarjetas de módulos de cada área)
function pintarSubHubs() {
  AREAS.forEach(a => { if (document.getElementById(a.cardsId)) pintarTarjetas(a.cardsId, a.modulos); });
}

// ── Sidebar de navegación (acordeón por área) ─────────────
function construirSidebar() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;
  nav.innerHTML = AREAS.map(a => {
    const mods = a.modulos.map(m => {
      const prox = m.proximamente;
      return '<button class="side-mod' + (prox ? " prox" : "") + '"' + (prox ? " disabled" : ' data-hash="' + m.hash + '"') + '>' +
        '<span class="side-mod-ic">' + (m.icono || "•") + "</span>" +
        '<span class="side-mod-pt">' + escHtml(m.titulo) + "</span>" + (m.destacado ? '<span class="side-mod-star">★</span>' : "") + "</button>";
    }).join("");
    return '<div class="side-area" data-area="' + a.id + '" style="--area-color:' + a.color + '">' +
      '<div class="side-area-head">' +
        '<button class="side-area-link" data-hash="' + a.hash + '"><span class="side-area-ic">' + a.icono + '</span><span class="side-area-tt">' + escHtml(a.titulo) + "</span></button>" +
        '<button class="side-chevron-btn" data-area="' + a.id + '" aria-label="Desplegar">▾</button>' +
      "</div>" +
      '<div class="side-area-modulos">' + mods + "</div></div>";
  }).join("");
  nav.querySelectorAll(".side-mod[data-hash]").forEach(b => b.addEventListener("click", () => { App.navegar(b.dataset.hash); cerrarSidebarMovil(); }));
  nav.querySelectorAll(".side-area-link").forEach(b => b.addEventListener("click", () => {
    const area = b.closest(".side-area"); area.classList.add("abierta");
    App.navegar(b.dataset.hash); cerrarSidebarMovil();
  }));
  nav.querySelectorAll(".side-chevron-btn").forEach(b => b.addEventListener("click", () => {
    b.closest(".side-area").classList.toggle("abierta");
  }));
}

function sincronizarSidebar() {
  const nav = document.getElementById("sidebar-nav");
  if (!nav) return;
  const h = location.hash || "#/";
  nav.querySelectorAll(".side-mod").forEach(b => b.classList.toggle("activa", b.dataset.hash === h));
  AREAS.forEach(a => {
    const contiene = a.hash === h || a.modulos.some(m => m.hash === h);
    const el = nav.querySelector('.side-area[data-area="' + a.id + '"]');
    if (!el) return;
    el.classList.toggle("area-activa", contiene);
    if (contiene) el.classList.add("abierta");
  });
}

// Aviso no bloqueante "empieza por Diagnóstico" al entrar directo a un tratamiento
function gestionarAvisoDiagnostico(vinoConDatos) {
  document.querySelectorAll(".vista-aviso").forEach(e => e.remove());
  const h = location.hash;
  let area = null, mod = null;
  AREAS.forEach(a => a.modulos.forEach(m => { if (m.hash === h) { area = a; mod = m; } }));
  const dxHash = mod && (mod.diagnostico || area.diagnostico);
  if (!mod || !mod.aviso || vinoConDatos || !dxHash) return;
  if (sessionStorage.getItem("aviso-dx-off") === "1") return;
  const view = document.querySelector(".view.activa");
  if (!view) return;
  let dxTitulo = "Diagnóstico";
  area.modulos.forEach(m => { if (m.hash === dxHash) dxTitulo = m.titulo; });
  const div = document.createElement("div");
  div.className = "vista-aviso";
  div.innerHTML = '<span class="vista-aviso-ic">ℹ️</span>' +
    '<span class="vista-aviso-tx">Para una valoración completa, empieza por <b>' + escHtml(dxTitulo) + '</b>.</span>' +
    '<button class="vista-aviso-ir">Ir →</button><button class="vista-aviso-x" aria-label="Cerrar">✕</button>';
  const intro = view.querySelector(".view-intro");
  if (intro) intro.insertAdjacentElement("afterend", div); else view.insertBefore(div, view.firstChild);
  div.querySelector(".vista-aviso-ir").addEventListener("click", () => App.navegar(dxHash));
  div.querySelector(".vista-aviso-x").addEventListener("click", () => { sessionStorage.setItem("aviso-dx-off", "1"); div.remove(); });
}

// Sidebar en móvil (drawer)
function abrirSidebarMovil() {
  const s = document.getElementById("sidebar"), b = document.getElementById("sidebar-backdrop");
  if (s) s.classList.add("movil-abierta"); if (b) b.classList.add("visible");
}
function cerrarSidebarMovil() {
  const s = document.getElementById("sidebar"), b = document.getElementById("sidebar-backdrop");
  if (s) s.classList.remove("movil-abierta"); if (b) b.classList.remove("visible");
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
  if (!c) return;
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
  const cont = document.getElementById("historial-versiones");
  if (!cont) return;
  cont.innerHTML = NOVEDADES.map(n =>
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
//  ARRANQUE DEL PORTAL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  pintarTarjetas("hub-cards", HUB);
  pintarSubHubs();
  construirSidebar();
  renderRuta();
  renderHistorial();

  // Sidebar: hamburguesa (móvil) y marca → inicio
  const bm = document.getElementById("btn-menu");
  if (bm) bm.addEventListener("click", abrirSidebarMovil);
  const bd = document.getElementById("sidebar-backdrop");
  if (bd) bd.addEventListener("click", cerrarSidebarMovil);
  const sb = document.getElementById("sidebar-brand");
  if (sb) sb.addEventListener("click", () => { App.navegar("#/"); cerrarSidebarMovil(); });

  const linea = "Versión " + APP_VERSION + " · " + APP_ANIO;
  const elFooter = document.getElementById("app-version");
  if (elFooter) elFooter.textContent = "MetaboUrg · v" + APP_VERSION + " · " + APP_ANIO;
  const elB = document.getElementById("bienvenida-version"); if (elB) elB.textContent = linea;
  const elI = document.getElementById("info-version"); if (elI) elI.textContent = linea;

  const brand = document.getElementById("brand-home");
  if (brand) brand.addEventListener("click", () => App.navegar("#/"));

  // Modal Acerca de
  const info = document.getElementById("modal-info");
  document.getElementById("btn-info").addEventListener("click", () => info.classList.add("abierto"));
  document.getElementById("btn-cerrar-info").addEventListener("click", () => info.classList.remove("abierto"));
  info.addEventListener("click", e => { if (e.target === info) info.classList.remove("abierto"); });

  // Modal Novedades
  document.getElementById("btn-novedades").addEventListener("click", abrirNovedades);
  document.getElementById("btn-cerrar-novedades").addEventListener("click", cerrarNovedades);
  document.getElementById("btn-novedades-ok").addEventListener("click", cerrarNovedades);
  document.getElementById("modal-novedades").addEventListener("click", e => { if (e.target.id === "modal-novedades") cerrarNovedades(); });

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

  // Inicialización de cada módulo registrado
  App.inits.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });

  gestionarNovedades(bienvenidaVisible);
  registrarSW();
});
