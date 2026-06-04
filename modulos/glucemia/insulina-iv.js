// ============================================================
//  modulos/glucemia/insulina-iv.js — Insulinización IV (perfusión)
//  Pauta en perfusión para el paciente crítico/perioperatorio.
//  Fuente: folleto SAEDYN 2017 (datos en INSULINA_IV, protocolos.js).
//  Usa App, App.informe e INSULINA_IV.
// ============================================================

App.registrarRuta("/glucemia/insulina-iv", {
  view: "view-insulina-iv",
  crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Insulinización IV", "#/glucemia/insulina-iv"]]
});

function leerDatosIV() {
  const chk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  return {
    glu: parseNum("iv-glu"),
    pauta: parseInt(document.getElementById("iv-pauta").value, 10) || 1,
    ins6h: parseNum("iv-ins6h"),
    crit: {
      nocontrol:   chk("iv-nocontrol"),
      cardio:      chk("iv-cardio"),
      trasplante:  chk("iv-trasplante"),
      corticoides: chk("iv-corticoides"),
      altorreq:    chk("iv-altorreq")
    }
  };
}

// ── Cálculo ────────────────────────────────────────────────
function calcularIV(d) {
  const cfg = INSULINA_IV;
  const has = v => v !== null && v !== undefined;
  const o = {};

  // Pauta de inicio sugerida (2 si se cumple algún criterio; si no, 1)
  o.criteriosP2 = Object.keys(cfg.pauta2_criterios).filter(k => d.crit[k]);
  o.pautaInicio = o.criteriosP2.length ? 2 : 1;

  // Fila de glucemia actual y ritmo en UI/h para la pauta seleccionada
  o.pauta = d.pauta;
  o.idxFila = null;
  o.hipo = has(d.glu) && d.glu < cfg.hipo_umbral;
  if (has(d.glu) && !o.hipo) {
    o.idxFila = cfg.pautas_filas.findIndex(f => d.glu >= f.min && d.glu <= f.max);
    if (o.idxFila >= 0) o.uih = cfg.pautas_filas[o.idxFila].p[d.pauta - 1];
  }

  // Transición a SC: DTD estimada desde las últimas 6 h
  if (has(d.ins6h)) o.dtiEstimada = Math.round(d.ins6h * cfg.transicion_factor);

  return o;
}

// ── Render ─────────────────────────────────────────────────
let _ultimoIV = null;

function tablaPautasIV(pautaSel, idxFila) {
  const cfg = INSULINA_IV;
  const cls = i => (i + 1) === pautaSel ? ' class="col-activa"' : "";
  let h = '<table class="pauta-tabla"><thead><tr><th>Glucemia (mg/dl)</th>';
  for (let i = 0; i < 4; i++) h += "<th" + cls(i) + ">Pauta " + (i + 1) + "</th>";
  h += "</tr></thead><tbody>";
  // Fila de hipoglucemia
  h += '<tr><td>&lt; 70</td><td colspan="4" style="text-align:center;color:var(--text-2);">Protocolo de hipoglucemia</td></tr>';
  cfg.pautas_filas.forEach((f, idx) => {
    const activa = idx === idxFila ? ' class="fila-activa"' : "";
    h += "<tr" + activa + "><td>" + escHtml(f.rango) + "</td>";
    for (let i = 0; i < 4; i++) h += "<td" + cls(i) + ">" + f.p[i] + "</td>";
    h += "</tr>";
  });
  h += "</tbody></table>";
  return h;
}

function renderResultadoIV() {
  const d = leerDatosIV();
  const o = calcularIV(d);
  _ultimoIV = { d, o };
  const cont = document.getElementById("iv-resultado");
  const cfg = INSULINA_IV;

  function card(titulo, num, sub, lineas, color) {
    return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-insulina)") + '">' +
      "<h3>" + escHtml(titulo) + "</h3>" +
      (num ? '<div class="dosis-grande">' + num + (sub ? " <small>" + escHtml(sub) + "</small>" : "") + "</div>" : "") +
      (lineas && lineas.length ? '<ul class="trat-list">' + lineas.map(l => "<li>" + l + "</li>").join("") + "</ul>" : "") +
      "</div>";
  }

  // Aviso de pauta de inicio
  const inicioLineas = [
    "Iniciar si hay indicación establecida y <b>glucemia > " + cfg.glu_inicio + " mg/dl</b>.",
    o.criteriosP2.length
      ? "Sugerido <b>iniciar por Pauta 2</b> (" + escHtml(o.criteriosP2.map(k => cfg.pauta2_criterios[k]).join("; ")) + ")."
      : "Sugerido <b>iniciar por Pauta 1</b> (la mayoría de los pacientes)."
  ];

  // Resultado de glucemia actual
  let resultadoUih = "";
  if (o.hipo) {
    resultadoUih = card("⚠️ Hipoglucemia", "PARAR", "perfusión de insulina", cfg.hipo.map(escHtml), "var(--c-hipo)");
  } else if (o.uih !== undefined) {
    resultadoUih = card("Ritmo actual (Pauta " + d.pauta + ")", fmt(o.uih, 0) + " UI/h", "= " + fmt(o.uih, 0) + " ml/h (1 UI/ml)", [
      "Glucemia " + fmt(d.glu, 0) + " mg/dl → tramo " + escHtml(cfg.pautas_filas[o.idxFila].rango) + " mg/dl.",
      o.uih === 0 ? "Sin insulina en este tramo; mantener vigilancia y la línea de glucosa." : "Objetivo de glucemia " + cfg.objetivo_min + "-" + cfg.objetivo_max + " mg/dl."
    ], "var(--c-insulina)");
  }

  // Transición a SC
  const transLineas = cfg.transicion.map(escHtml);
  if (o.dtiEstimada) transLineas.push("Con la insulina de las últimas 6 h (" + fmt(d.ins6h, 0) + " UI) → DTD estimada ≈ <b>" + fmt(o.dtiEstimada, 0) + " UI/día</b> (× 4).");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-insulina)">' +
      '<div class="result-kicker">Insulinización IV en perfusión</div>' +
      '<div class="result-dx" style="font-size:1.2rem">Objetivo de glucemia ' + cfg.objetivo_min + "-" + cfg.objetivo_max + " mg/dl</div>" +
      '<p class="result-explica">Pauta en dos líneas separadas (Y). Verifica cada ritmo según el paciente.</p>' +
    "</div>" +
    card("Preparación", null, null, [cfg.prep_insulina, cfg.prep_liquidos], "var(--brand)") +
    card("Pauta de inicio", null, null, inicioLineas, "var(--brand)") +
    resultadoUih +
    '<div class="trat-card" style="--trat-color:var(--c-insulina)"><h3>Tabla de pautas (UI/h)</h3>' +
      tablaPautasIV(d.pauta, o.idxFila) +
      '<p class="datos-pie" style="margin-top:6px;">Pauta ' + d.pauta + " resaltada" + (o.idxFila != null ? "; tramo de la glucemia actual marcado" : "") + ".</p></div>" +
    card("Cambio de pauta", null, null, cfg.cambio.map(escHtml), "var(--violet)") +
    card("Monitorización", null, null, cfg.monitor.map(escHtml), "var(--brand)") +
    card("Hipoglucemia (< 70 mg/dl)", null, null, cfg.hipo.map(escHtml), "var(--c-hipo)") +
    card("Cuándo avisar al médico", null, null, cfg.avisar.map(escHtml), "var(--c-cad)") +
    card("Control de potasio", null, null, ["Vigilar los niveles de potasio y comprobar una función renal adecuada (diuresis ~50 ml/h)."], "var(--violet)") +
    '<div class="trat-card" style="--trat-color:var(--c-ehh)"><h3>Transición a insulina SC</h3>' +
      '<ul class="trat-list">' + transLineas.map(l => "<li>" + l + "</li>").join("") + "</ul>" +
      (o.dtiEstimada ? '<div class="acciones-result" style="margin-top:10px;"><button class="btn btn-primario" id="btn-iv-a-sc">Calcular pauta SC con esta DTD →</button></div>' : "") +
    "</div>" +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-recalcular-iv">Recalcular</button></div>' +
    App.informe.bloque(construirInformeIV());

  document.getElementById("btn-recalcular-iv").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const btnSc = document.getElementById("btn-iv-a-sc");
  if (btnSc) btnSc.addEventListener("click", () => {
    App.estado.paciente = { ant: { tipoDM: "dm2ins", insulina: { dtd: o.dtiEstimada } } };
    App.navegar("#/glucemia/insulina-sc");
  });
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInformeIV() {
  if (!_ultimoIV) return "";
  const { d, o } = _ultimoIV;
  const cfg = INSULINA_IV;
  let t = App.informe.cabecera("INSULINIZACIÓN IV — PERFUSIÓN") + "\n";
  t += "OBJETIVO: glucemia " + cfg.objetivo_min + "-" + cfg.objetivo_max + " mg/dl.\n";
  t += "PREPARACIÓN\n  - " + cfg.prep_insulina + "\n  - " + cfg.prep_liquidos + "\n";

  t += "\nPAUTA DE INICIO: " + (o.criteriosP2.length ? "Pauta 2 (" + o.criteriosP2.map(k => cfg.pauta2_criterios[k]).join("; ") + ")" : "Pauta 1") + ".\n";

  if (o.hipo) {
    t += "\nGLUCEMIA " + fmt(d.glu, 0) + " mg/dl: HIPOGLUCEMIA — parar la perfusión y aplicar protocolo de hipoglucemia.\n";
  } else if (o.uih !== undefined) {
    t += "\nGLUCEMIA " + fmt(d.glu, 0) + " mg/dl (tramo " + cfg.pautas_filas[o.idxFila].rango + ") · Pauta " + d.pauta + " → " + fmt(o.uih, 0) + " UI/h (= " + fmt(o.uih, 0) + " ml/h).\n";
  }

  t += "\nTABLA DE PAUTAS (UI/h) · Pauta " + d.pauta + "\n";
  cfg.pautas_filas.forEach(f => { t += "  - " + f.rango + " mg/dl: " + f.p[d.pauta - 1] + " UI/h\n"; });

  t += "\nCAMBIO DE PAUTA\n";    cfg.cambio.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nMONITORIZACIÓN\n";     cfg.monitor.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nHIPOGLUCEMIA (<70)\n"; cfg.hipo.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nAVISAR AL MÉDICO\n";   cfg.avisar.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nPOTASIO\n  - Vigilar K y función renal (diuresis ~50 ml/h).\n";
  t += "\nTRANSICIÓN A SC\n";    cfg.transicion.forEach(x => { t += "  - " + x + "\n"; });
  if (o.dtiEstimada) t += "  - Últimas 6 h (" + fmt(d.ins6h, 0) + " UI) × 4 → DTD estimada ≈ " + fmt(o.dtiEstimada, 0) + " UI/día.\n";

  t += "\n" + App.informe.SEP + "\nApoyo clínico (SAEDYN 2017). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-calcular-iv").addEventListener("click", renderResultadoIV);

  // Al marcar un criterio de pauta 2, sugerir la pauta 2 en el selector (si sigue en 1)
  const pautaSel = document.getElementById("iv-pauta");
  ["iv-nocontrol", "iv-cardio", "iv-trasplante", "iv-corticoides", "iv-altorreq"].forEach(id => {
    document.getElementById(id).addEventListener("change", e => {
      if (e.target.checked && pautaSel.value === "1") pautaSel.value = "2";
    });
  });

  document.getElementById("btn-limpiar-iv").addEventListener("click", () => {
    ["iv-glu", "iv-ins6h"].forEach(id => { document.getElementById(id).value = ""; });
    ["iv-nocontrol", "iv-cardio", "iv-trasplante", "iv-corticoides", "iv-altorreq"].forEach(id => { document.getElementById(id).checked = false; });
    pautaSel.value = "1";
    document.getElementById("iv-resultado").innerHTML = "";
    _ultimoIV = null;
  });
});
