// ============================================================
//  modulos/glucemia/hipoglucemia.js — Tratamiento de la hipoglucemia
//  Árbol de decisión según consciencia y vía venosa.
//  Fuente: SEEN / SAEDYN 2017 (datos en HIPO_CFG, protocolos.js).
//  Usa App, App.informe e HIPO_CFG.
// ============================================================

App.registrarRuta("/glucemia/hipoglucemia", {
  view: "view-hipoglucemia",
  crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Hipoglucemia", "#/glucemia/hipoglucemia"]],
  onShow: prefillHipo
});

function prefillHipo() {
  const p = App.estado.paciente;
  if (!p) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e && (v !== null && v !== undefined)) e.value = (typeof v === "number" ? String(v).replace(".", ",") : v); };
  set("h-glucosa", p.glu);
  if (p.consciencia && document.getElementById("h-consciente")) document.getElementById("h-consciente").checked = false;
  const a = p.ant || {};
  if (a.ados && a.ados.sulfonilurea) document.getElementById("h-sulfonilurea").checked = true;
  App.estado.paciente = null;
}

function leerDatosHipo() {
  const chk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  return {
    glu: parseNum("h-glucosa"),
    consciente: chk("h-consciente"),
    viavenosa: chk("h-viavenosa"),
    sulfonilurea: chk("h-sulfonilurea"),
    insulinalenta: chk("h-insulinalenta"),
    ayuno: chk("h-ayuno")
  };
}

// ── Render ─────────────────────────────────────────────────
let _ultimoHipo = null;
function renderResultadoHipo() {
  const d = leerDatosHipo();
  const cfg = HIPO_CFG;
  const has = v => v !== null && v !== undefined;

  // Vía de tratamiento
  const claveVia = d.consciente ? "consciente" : (d.viavenosa ? "inconsciente_convia" : "inconsciente_sinvia");
  const via = cfg[claveVia];
  const recaida = d.sulfonilurea || d.insulinalenta;
  const glucagonInutil = !d.consciente && !d.viavenosa && d.ayuno;
  _ultimoHipo = { d, claveVia, recaida, glucagonInutil };

  const cont = document.getElementById("hipo-resultado");

  function card(titulo, lineas, color, destacado) {
    return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-hipo)") + (destacado ? ";box-shadow:0 0 0 2px var(--c-hipo)" : "") + '">' +
      "<h3>" + escHtml(titulo) + "</h3>" +
      '<ul class="trat-list">' + lineas.map(l => "<li>" + escHtml(l) + "</li>").join("") + "</ul></div>";
  }

  // Cabecera: ¿es hipoglucemia?
  let kicker = "Pauta de tratamiento";
  if (has(d.glu)) kicker = d.glu < cfg.umbral ? ("Glucemia " + fmt(d.glu, 0) + " mg/dl — hipoglucemia") : ("Glucemia " + fmt(d.glu, 0) + " mg/dl — ≥ 70 mg/dl");

  const avisos = [];
  if (glucagonInutil) avisos.push({ nivel: "red", txt: cfg.glucagon_inutil });
  if (recaida) avisos.push({ nivel: "red", txt: cfg.vigilancia_prolongada });
  if (has(d.glu) && d.glu >= cfg.umbral) avisos.push({ nivel: "amber", txt: "La glucemia es ≥ 70 mg/dl: si hay síntomas neuroglucopénicos, trata igualmente y reevalúa; si no, busca otras causas." });
  const avisosHtml = avisos.map(a => '<div class="alert alert-' + a.nivel + '"><span>' + (a.nivel === "red" ? "⚠️" : "ℹ️") + "</span><span>" + escHtml(a.txt) + "</span></div>").join("");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">' + escHtml(kicker) + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">' + escHtml(via.titulo) + "</div>" +
      '<p class="result-explica">Trata de inmediato y reevalúa a los 15 min. La vía depende de la consciencia y de la vía venosa.</p>' +
    "</div>" +
    avisosHtml +
    card(via.titulo, via.pasos, "var(--c-hipo)", true) +
    card("Tras la recuperación", cfg.tras, "var(--brand)") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-recalcular-hipo">Recalcular</button></div>' +
    App.informe.bloque(construirInformeHipo());

  document.getElementById("btn-recalcular-hipo").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInformeHipo() {
  if (!_ultimoHipo) return "";
  const { d, claveVia, recaida, glucagonInutil } = _ultimoHipo;
  const cfg = HIPO_CFG;
  const via = cfg[claveVia];
  let t = App.informe.cabecera("HIPOGLUCEMIA — TRATAMIENTO") + "\n";
  t += "SITUACIÓN\n";
  if (d.glu !== null) t += "  - Glucemia: " + fmt(d.glu, 0) + " mg/dl\n";
  t += "  - " + (d.consciente ? "Consciente, tolera vía oral" : "Inconsciente / no tolera vía oral") + (d.consciente ? "" : (d.viavenosa ? " · con vía venosa" : " · sin vía venosa")) + "\n";
  const causas = [];
  if (d.sulfonilurea) causas.push("sulfonilurea"); if (d.insulinalenta) causas.push("insulina prolongada"); if (d.ayuno) causas.push("ayuno/alcohol");
  if (causas.length) t += "  - Causa: " + causas.join(", ") + "\n";
  t += "\n" + via.titulo.toUpperCase() + "\n";
  via.pasos.forEach(p => { t += "  - " + p + "\n"; });
  t += "\nTRAS LA RECUPERACIÓN\n";
  cfg.tras.forEach(p => { t += "  - " + p + "\n"; });
  if (glucagonInutil) t += "\nAVISO\n  ! " + cfg.glucagon_inutil + "\n";
  if (recaida) t += "\nAVISO\n  ! " + cfg.vigilancia_prolongada + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (SEEN / SAEDYN). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-calcular-hipo").addEventListener("click", renderResultadoHipo);
  document.getElementById("btn-limpiar-hipo").addEventListener("click", () => {
    document.getElementById("h-glucosa").value = "";
    document.getElementById("h-consciente").checked = true;
    document.getElementById("h-viavenosa").checked = true;
    ["h-sulfonilurea", "h-insulinalenta", "h-ayuno"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("hipo-resultado").innerHTML = "";
    _ultimoHipo = null;
  });
});
