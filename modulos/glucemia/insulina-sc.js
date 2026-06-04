// ============================================================
//  modulos/glucemia/insulina-sc.js — Insulinización subcutánea
//  Pauta basal-bolo-corrección para el paciente NO crítico.
//  Fuente: cartel SAEDYN 2017 (datos en INSULINA_SC, protocolos.js).
//  Usa App, App.formulas, App.informe e INSULINA_SC.
// ============================================================

App.registrarRuta("/glucemia/insulina-sc", {
  view: "view-insulina-sc",
  crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Insulinización SC", "#/glucemia/insulina-sc"]],
  onShow: prefillSC
});

// Prerellena con los datos heredados del triaje (antecedentes incluidos).
function prefillSC() {
  const p = App.estado.paciente;
  if (!p) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e && (v !== null && v !== undefined)) e.value = (typeof v === "number" ? String(v).replace(".", ",") : v); };
  set("s-peso", p.peso);
  set("s-glu", p.glu);
  const a = p.ant || {};
  const ados = a.ados || {};
  const hayAdo = Object.keys(ados).some(k => ados[k]);
  const insDtd = a.insulina ? a.insulina.dtd : null;
  const usaInsulina = (insDtd !== null && insDtd !== undefined) || a.tipoDM === "dm1" || a.tipoDM === "dm2ins";
  let tto = "noins";
  if (usaInsulina && hayAdo) tto = "insado";
  else if (usaInsulina) tto = "ins";
  const ttoSel = document.getElementById("s-tto");
  if (ttoSel) { ttoSel.value = tto; ttoSel.dispatchEvent(new Event("change")); }
  set("s-dtd-domic", insDtd);
  App.estado.paciente = null; // se consume una vez
}

function leerDatosSC() {
  const chk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  const val = id => { const e = document.getElementById(id); return e ? e.value : ""; };
  return {
    peso: parseNum("s-peso"),
    glu: parseNum("s-glu"),
    hba1c: parseNum("s-hba1c"),
    tto: val("s-tto"),
    dtdDomic: parseNum("s-dtd-domic"),
    come: chk("s-come")
  };
}

// ── Cálculo ────────────────────────────────────────────────
function redondeaSC(n) { return Math.round(n); }

function calcularSC(d) {
  const cfg = INSULINA_SC;
  const has = v => v !== null && v !== undefined;
  const o = { avisos: [] };

  // 1 · DTD según el tratamiento previo
  if ((d.tto === "ins" || d.tto === "insado") && has(d.dtdDomic)) {
    if (d.tto === "insado") {
      o.dtd = redondeaSC(d.dtdDomic * (1 + cfg.recargo_ins_ado));
      o.metodo = "Insulina domiciliaria (" + fmt(d.dtdDomic, 0) + " UI) + 20% por terapias no insulínicas asociadas";
    } else {
      o.dtd = redondeaSC(d.dtdDomic);
      o.metodo = "Suma de la insulina domiciliaria del paciente";
    }
  } else if (has(d.peso) && has(d.glu)) {
    const uikg = d.glu < cfg.dtd_glu_bajo ? cfg.dtd_uikg_bajo
               : d.glu <= cfg.dtd_glu_alto ? cfg.dtd_uikg_medio
               : cfg.dtd_uikg_alto;
    o.uikg = uikg;
    o.dtd = redondeaSC(uikg * d.peso);
    o.metodo = "Peso × " + fmt(uikg, 1) + " UI/kg/día (glucemia de ingreso " + fmt(d.glu, 0) + " mg/dl)";
  } else {
    o.dtd = null;
    if (d.tto === "ins" || d.tto === "insado") o.avisos.push("Introduce la insulina domiciliaria (DTD) para calcular la dosis.");
    else o.avisos.push("Introduce el peso y la glucemia de ingreso para calcular la dosis.");
    return o;
  }

  // 2 · Distribución (el bolo total = suma de los repartos redondeados, para que cuadre)
  o.basal = redondeaSC(cfg.basal_frac * o.dtd);
  if (d.come) {
    const boloRaw = cfg.bolo_frac * o.dtd;
    o.boloDes = redondeaSC(cfg.bolo_desayuno * boloRaw);
    o.boloCom = redondeaSC(cfg.bolo_comida * boloRaw);
    o.boloCen = redondeaSC(cfg.bolo_cena * boloRaw);
    o.boloTotal = o.boloDes + o.boloCom + o.boloCen;
  }

  // 3 · Pauta de corrección (por DTD; si no, por peso)
  if (has(o.dtd)) {
    o.pauta = o.dtd < cfg.pauta_dtd_AB ? "A" : (o.dtd <= cfg.pauta_dtd_BC ? "B" : "C");
    o.pautaCriterio = "DTD " + fmt(o.dtd, 0) + " UI/día";
  } else if (has(d.peso)) {
    o.pauta = d.peso < cfg.pauta_kg_AB ? "A" : (d.peso <= cfg.pauta_kg_BC ? "B" : "C");
    o.pautaCriterio = "peso " + fmt(d.peso, 0) + " kg";
  } else { o.pauta = "B"; o.pautaCriterio = "por defecto"; }

  // 4 · Plan al alta (si hay HbA1c)
  if (has(d.hba1c)) o.alta = cfg.alta.find(x => d.hba1c < x.hba1c_max) || cfg.alta[cfg.alta.length - 1];

  return o;
}

// ── Render ─────────────────────────────────────────────────
let _ultimoSC = null;

function tablaCorreccion(pauta) {
  const cfg = INSULINA_SC;
  const cols = ["A", "B", "C"];
  const cls = c => c === pauta ? ' class="col-activa"' : "";
  let h = '<table class="pauta-tabla"><thead><tr><th>Glucemia capilar</th>';
  cols.forEach(c => { h += "<th" + cls(c) + ">Pauta " + c + "</th>"; });
  h += '</tr><tr class="crit"><th></th>';
  cols.forEach(c => { h += "<th" + cls(c) + ">" + escHtml(cfg.pautas_corr[c]) + "</th>"; });
  h += "</tr></thead><tbody>";
  cfg.corr_filas.forEach(f => {
    h += "<tr><td>" + escHtml(f.rango) + " mg/dl</td>";
    cols.forEach(c => { const v = f[c]; h += "<td" + cls(c) + ">" + (v > 0 ? "+" + v : "" + v) + "</td>"; });
    h += "</tr>";
  });
  h += "</tbody></table>";
  return h;
}

function renderResultadoSC() {
  const d = leerDatosSC();
  const o = calcularSC(d);
  const cont = document.getElementById("sc-resultado");
  const cfg = INSULINA_SC;

  if (o.dtd === null) {
    _ultimoSC = null;
    cont.innerHTML = o.avisos.map(a =>
      '<div class="alert alert-amber"><span>ℹ️</span><span>' + escHtml(a) + "</span></div>"
    ).join("");
    cont.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  _ultimoSC = { d, o };

  function card(titulo, num, sub, lineas, color) {
    return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-insulina)") + '">' +
      "<h3>" + escHtml(titulo) + "</h3>" +
      (num ? '<div class="dosis-grande">' + num + (sub ? " <small>" + escHtml(sub) + "</small>" : "") + "</div>" : "") +
      (lineas && lineas.length ? '<ul class="trat-list">' + lineas.map(l => "<li>" + l + "</li>").join("") + "</ul>" : "") +
      "</div>";
  }

  // Basal
  const basalLineas = [
    "<b>50%</b> de la dosis total diaria.",
    cfg.insulinas_basal
  ];
  // Bolo
  let boloCard = "";
  if (d.come) {
    boloCard = card("Bolo prandial (50%)", fmt(o.boloTotal, 0) + " UI/día", null, [
      "<b>Desayuno (30%): " + fmt(o.boloDes, 0) + " UI</b> · <b>Comida (40%): " + fmt(o.boloCom, 0) + " UI</b> · <b>Cena (30%): " + fmt(o.boloCen, 0) + " UI</b>.",
      cfg.insulinas_bolo
    ], "var(--c-insulina)");
  } else {
    boloCard = card("Bolo prandial", null, null, [
      "El paciente <b>NO come</b>: no se pauta bolo prandial.",
      "Solo insulina basal + pauta de corrección <b>cada 4-6 horas</b>."
    ], "var(--text-3)");
  }
  // Corrección
  const corrLineas = [
    "Pauta <b>" + o.pauta + "</b> (según " + escHtml(o.pautaCriterio) + ").",
    d.come ? "Se <b>suma al bolo</b> de la comida correspondiente." : "Se administra <b>cada 4-6 horas</b> (paciente que no come).",
    cfg.objetivos
  ];
  // Ajustes
  const ajustesLineas = [
    "<b>Hiperglucemia:</b>"
  ].concat(cfg.ajustes_hiper.map(x => "· " + escHtml(x)))
   .concat(["<b>Hipoglucemia (ajuste de dosis):</b>"])
   .concat(cfg.ajustes_hipo.map(x => "· " + escHtml(x)));

  let altaCard = "";
  if (o.alta) altaCard = card("Plan al alta", null, null, [escHtml(o.alta.txt), "El paciente o la familia debe recibir educación de supervivencia, material y plan de seguimiento."], "var(--c-ehh)");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-insulina)">' +
      '<div class="result-kicker">Pauta calculada' + (d.peso !== null ? " · " + fmt(d.peso) + " kg" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Insulinización SC basal-bolo-corrección</div>' +
      '<p class="result-explica">Pauta para paciente no crítico. ' + (d.come ? "Con ingesta oral: basal + bolos + corrección." : "Sin ingesta: solo basal + corrección.") + " Verifica cada dosis según el paciente.</p>" +
    "</div>" +
    card("Dosis total diaria (DTD)", fmt(o.dtd, 0) + " UI/día", null, ["Método: " + escHtml(o.metodo) + ".", "Reparto: <b>basal 50%</b>" + (d.come ? " + <b>bolo 50%</b>" : " (sin bolo, no come)") + "."], "var(--brand)") +
    card("Insulina basal", fmt(o.basal, 0) + " UI/día", null, basalLineas, "var(--c-insulina)") +
    boloCard +
    '<div class="trat-card" style="--trat-color:var(--violet)"><h3>Pauta de corrección (A/B/C)</h3>' +
      tablaCorreccion(o.pauta) +
      '<ul class="trat-list">' + corrLineas.map(l => "<li>" + l + "</li>").join("") + "</ul></div>" +
    card("Ajustes de la dosis", null, null, ajustesLineas, "var(--brand)") +
    altaCard +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-recalcular-sc">Recalcular</button></div>' +
    App.informe.bloque(construirInformeSC());

  document.getElementById("btn-recalcular-sc").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInformeSC() {
  if (!_ultimoSC) return "";
  const { d, o } = _ultimoSC;
  const cfg = INSULINA_SC;
  let t = App.informe.cabecera("INSULINIZACIÓN SC — BASAL-BOLO-CORRECCIÓN") + "\n";
  t += "PACIENTE\n";
  if (d.peso !== null) t += "  - Peso: " + fmt(d.peso, 0) + " kg\n";
  if (d.glu !== null) t += "  - Glucemia de ingreso: " + fmt(d.glu, 0) + " mg/dl\n";
  if (d.hba1c !== null) t += "  - HbA1c: " + fmt(d.hba1c, 1) + " %\n";
  t += "  - Ingesta oral: " + (d.come ? "sí" : "no") + "\n";

  t += "\nDOSIS TOTAL DIARIA (DTD): " + fmt(o.dtd, 0) + " UI/día\n";
  t += "  - Método: " + o.metodo + ".\n";
  t += "\nBASAL: " + fmt(o.basal, 0) + " UI/día (50%) — glargina 1 dosis / detemir 1-2 / NPH 2-3.\n";
  if (d.come) {
    t += "BOLO PRANDIAL: " + fmt(o.boloTotal, 0) + " UI/día (50%)\n";
    t += "  - Desayuno (30%): " + fmt(o.boloDes, 0) + " UI · Comida (40%): " + fmt(o.boloCom, 0) + " UI · Cena (30%): " + fmt(o.boloCen, 0) + " UI.\n";
    t += "  - Análogo rápido (lispro/aspart/glulisina).\n";
  } else {
    t += "BOLO PRANDIAL: no (paciente que no come). Solo basal + corrección cada 4-6 h.\n";
  }

  t += "\nPAUTA DE CORRECCIÓN " + o.pauta + " (según " + o.pautaCriterio + ") — UI a sumar/restar:\n";
  cfg.corr_filas.forEach(f => {
    const v = f[o.pauta];
    t += "  - " + f.rango + " mg/dl: " + (v > 0 ? "+" + v : "" + v) + "\n";
  });
  t += "  - " + (d.come ? "Se suma al bolo de la comida correspondiente." : "Se administra cada 4-6 h.") + "\n";

  t += "\nOBJETIVOS\n  - " + cfg.objetivos + "\n";
  t += "\nAJUSTES\n";
  cfg.ajustes_hiper.forEach(x => { t += "  + " + x + "\n"; });
  cfg.ajustes_hipo.forEach(x => { t += "  - " + x + "\n"; });
  if (o.alta) t += "\nAL ALTA\n  - " + o.alta.txt + "\n";

  t += "\n" + App.informe.SEP + "\nApoyo clínico (SAEDYN 2017). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-calcular-sc").addEventListener("click", renderResultadoSC);

  // Mostrar DTD domiciliaria solo si el tratamiento previo incluye insulina
  const ttoSel = document.getElementById("s-tto");
  const dtdField = document.getElementById("s-dtd-field");
  const sincDtd = () => { dtdField.hidden = !(ttoSel.value === "ins" || ttoSel.value === "insado"); };
  ttoSel.addEventListener("change", sincDtd);
  sincDtd();

  document.getElementById("btn-limpiar-sc").addEventListener("click", () => {
    ["s-peso", "s-glu", "s-hba1c", "s-dtd-domic"].forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; });
    ttoSel.value = "noins";
    document.getElementById("s-come").checked = true;
    sincDtd();
    document.getElementById("sc-resultado").innerHTML = "";
    _ultimoSC = null;
  });
});
