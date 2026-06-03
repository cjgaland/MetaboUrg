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
const APP_VERSION = "2026.06";
const APP_ANIO = APP_VERSION.split(".")[0];

const NOVEDADES = [
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
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = r.crumbs.map((c, i) => {
    const ultimo = i === r.crumbs.length - 1;
    return '<button class="crumb' + (ultimo ? " actual" : "") + '" data-hash="' + c[1] + '">' + escHtml(c[0]) + "</button>" +
      (ultimo ? "" : '<span class="crumb-sep">›</span>');
  }).join("");
  bc.querySelectorAll(".crumb").forEach(b => b.addEventListener("click", () => App.navegar(b.dataset.hash)));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.addEventListener("hashchange", renderRuta);

// ── Tarjetas (portal y sub-hubs) ──────────────────────────
function tarjetaHTML(c) {
  const prox = c.proximamente;
  return '<button class="card' + (prox ? " proximamente" : "") + '" ' +
    (prox ? "" : 'data-hash="' + c.hash + '"') + ' style="--card-color:' + c.color + '">' +
    (prox ? '<span class="card-badge">Próximamente</span>' : "") +
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
App.ui = { pintarTarjetas, tarjetaHTML };

// ── Portal: mapa de áreas (hub) ───────────────────────────
const HUB = [
  { titulo: "Trastornos de la Glucemia", desc: "Hiperglucemia, cetoacidosis, hiperosmolar e hipoglucemia.", icono: "🩸", color: "var(--brand)", hash: "#/glucemia" },
  { titulo: "Sodio", desc: "Hipo e hipernatremia.", icono: "🧂", color: "var(--c-hipo)", proximamente: true },
  { titulo: "Potasio", desc: "Hipo e hiperpotasemia.", icono: "🍌", color: "var(--c-insulina)", proximamente: true },
  { titulo: "Calcio", desc: "Hipo e hipercalcemia.", icono: "🦴", color: "var(--c-hiper)", proximamente: true },
  { titulo: "Fósforo y Magnesio", desc: "Trastornos del P y del Mg.", icono: "⚗️", color: "var(--c-ehh)", proximamente: true }
];

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
  renderRuta();
  renderHistorial();

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
