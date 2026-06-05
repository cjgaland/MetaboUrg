// ============================================================
//  modulos/hidro/potasio.js — Trastornos del potasio
//  Diagnóstico (K), hiperpotasemia e hipopotasemia.
//  Fuentes: UK Kidney Association 2023; consenso español
//  (Nefrología 2023 / Emergencias 2022); EMCrit; StatPearls.
//  Datos en K_CFG / K_TXT (protocolos.js). Reutiliza cardTrat /
//  setVal / chkVal de sodio.js (mismo área, cargado antes).
//  Usa App, App.informe.
// ============================================================

App.registrarRuta("/hidro/diagnostico-k",  { view: "view-hidro-dk" });
App.registrarRuta("/hidro/hiperpotasemia", { view: "view-hiperpotasemia", onShow: prefillHiperK });
App.registrarRuta("/hidro/hipopotasemia",  { view: "view-hipopotasemia",  onShow: prefillHipoK });

// ============================================================
//  1 · DIAGNÓSTICO (K)
// ============================================================
let _ultimoDK = null;
function leerDK() { return { k: parseNum("dk-k"), ecg: chkVal("dk-ecg") }; }
function evaluarK(d) {
  const cfg = K_CFG, o = {};
  if (d.k === null) return o;
  if (d.k > cfg.normal_max) {
    o.tipo = "hiper"; o.nombre = "Hiperpotasemia";
    o.grav = d.k >= cfg.hiper_grave ? "grave" : (d.k >= cfg.hiper_mod ? "moderada" : "leve");
    if (d.ecg) o.grav = "grave";
    o.destino = { nombre: "Hiperpotasemia", hash: "#/hidro/hiperpotasemia" };
  } else if (d.k < cfg.normal_min) {
    o.tipo = "hipo"; o.nombre = "Hipopotasemia";
    o.grav = d.k < cfg.hipo_mod ? "grave" : (d.k < cfg.hipo_leve ? "moderada" : "leve");
    if (d.ecg) o.grav = "grave";
    o.destino = { nombre: "Hipopotasemia", hash: "#/hidro/hipopotasemia" };
  } else { o.tipo = "normal"; o.nombre = "Potasio normal"; }
  return o;
}
function renderDK() {
  const d = leerDK();
  if (d.k === null) { toast("Introduce el potasio (K⁺).", true); return; }
  const o = evaluarK(d);
  _ultimoDK = { d, o };
  const cont = document.getElementById("dk-resultado");
  const color = o.tipo === "hiper" ? "var(--c-cad)" : (o.tipo === "hipo" ? "var(--c-insulina)" : "var(--text-2)");
  const etiquetaGrav = o.grav ? ({ leve: "leve", moderada: "moderada", grave: "grave" }[o.grav]) : "";
  const sub = "K " + fmt(d.k, 1) + " mmol/l" + (o.grav ? " · " + etiquetaGrav : "") + (d.ecg ? " · CAMBIOS ECG" : "");

  const aviso = d.ecg ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml((o.tipo === "hiper" ? K_TXT.ecg_hiper : K_TXT.ecg_hipo)) + " Cualquier cambio ECG obliga a tratar como grave.</span></div>" : "";

  let acciones = '<div class="acciones-result">';
  if (o.destino) acciones += '<button class="btn btn-primario" id="btn-dk-ir">Ir a ' + escHtml(o.destino.nombre) + " →</button>";
  acciones += '<button class="btn btn-secundario" id="btn-dk-recal">Recalcular</button></div>';

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:' + color + '">' +
      '<div class="result-kicker">Resultado</div>' +
      '<div class="result-dx" style="font-size:1.2rem">' + escHtml(o.nombre) + "</div>" +
      '<p class="result-explica">' + escHtml(sub) + "</p></div>" +
    aviso +
    (o.destino ? '<div class="result-reco"><span class="result-reco-ic">→</span><span>Módulo recomendado: <b>' + escHtml(o.destino.nombre) + "</b>" + (o.grav === "grave" ? " — grave: trátalo como urgencia." : "") + "</span></div>" : "") +
    acciones +
    App.informe.bloque(informeDK());

  document.getElementById("btn-dk-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const ir = document.getElementById("btn-dk-ir");
  if (ir) ir.addEventListener("click", () => { App.estado.paciente = { k: d.k, ecg: d.ecg }; App.navegar(o.destino.hash); });
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeDK() {
  if (!_ultimoDK) return "";
  const { d, o } = _ultimoDK;
  let t = App.informe.cabecera("TRASTORNO DEL POTASIO — VALORACIÓN") + "\n";
  t += "DATOS\n  - Potasio: " + fmt(d.k, 1) + " mmol/l" + (d.ecg ? " · cambios ECG" : "") + "\n";
  t += "\nRESULTADO\n  " + o.nombre + (o.grav ? " (" + o.grav + ")" : "") + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (UK Kidney 2023 / consenso español). Verificar por el facultativo.\n";
  return t;
}

// ============================================================
//  2 · HIPERPOTASEMIA
// ============================================================
function prefillHiperK() {
  const p = App.estado.paciente;
  if (!p) return;
  setVal("hk-k", p.k);
  const e = document.getElementById("hk-ecg"); if (e) e.checked = !!p.ecg;
  App.estado.paciente = null;
}
let _ultimoHK = null;
function leerHK() {
  return { k: parseNum("hk-k"), glu: parseNum("hk-glu"), ecg: chkVal("hk-ecg"), erc: chkVal("hk-erc"), diuresis: chkVal("hk-diuresis") };
}
function calcularHK(d) {
  const cfg = K_CFG, has = v => v !== null && v !== undefined, o = {};
  o.grav = d.k >= cfg.hiper_grave ? "grave" : (d.k >= cfg.hiper_mod ? "moderada" : "leve");
  o.calcioIndicado = d.ecg || d.k >= cfg.hiper_grave;
  o.glucosaMant = has(d.glu) && d.glu < cfg.glucosa_umbral_mgdl;
  return o;
}
function renderHK() {
  const d = leerHK();
  if (d.k === null) { toast("Introduce el potasio (K⁺).", true); return; }
  const cfg = K_CFG;
  const o = calcularHK(d);
  _ultimoHK = { d, o };
  const cont = document.getElementById("hk-resultado");

  // 1 · Proteger el corazón
  const calcioLineas = o.calcioIndicado
    ? [
        "<b>Gluconato cálcico 10%: " + cfg.gluconato_ml + " ml (1 g = 1 ampolla) IV en " + cfg.gluconato_min + " min</b>, con monitorización ECG.",
        "Repetir a los " + cfg.gluconato_repetir + " min si persisten los cambios ECG. Efecto rápido y transitorio (protege, no baja el K).",
        "Si vía central o parada/periparada, puede usarse cloruro cálcico 10% 10 ml."
      ]
    : ["ECG normal y K < 6,5 mmol/l: el calcio no es imprescindible. Prioriza meter el K en la célula y eliminarlo.", "Si aparecen cambios ECG, administra gluconato cálcico de inmediato."];

  // 2 · Meter K en la célula
  const celulaLineas = [
    "<b>Insulina rápida " + cfg.insulina_ui + " UI + " + cfg.glucosa_g + " g de glucosa IV</b> (p. ej. 250 ml de glucosado al 10% o 50 ml al 50%) en 15-30 min.",
    o.glucosaMant
      ? "Glucemia < " + cfg.glucosa_umbral_mgdl + " mg/dl: añadir glucosado 10% a " + cfg.glucosa_mant_ml_h + " ml/h durante " + cfg.glucosa_mant_h + " h (evita la hipoglucemia)."
      : "Vigilar la glucemia tras la insulina: riesgo de <b>hipoglucemia tardía</b> (controles hasta 6 h).",
    "<b>Salbutamol nebulizado " + cfg.salbutamol_min + "-" + cfg.salbutamol_max + " mg</b> como adyuvante (no en monoterapia).",
    "Bicarbonato sódico: no de rutina (solo si acidosis metabólica grave asociada)."
  ];

  // 3 · Eliminar K
  const eliminarLineas = K_TXT.hiper_eliminar.map(x => escHtml(x));

  const etiqueta = { leve: "leve (5,5-5,9)", moderada: "moderada (6,0-6,4)", grave: "grave (≥ 6,5)" }[o.grav];

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-cad)">' +
      '<div class="result-kicker">Hiperpotasemia' + (o.calcioIndicado ? " · urgencia" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">K ' + fmt(d.k, 1) + " mmol/l — " + etiqueta + "</div>" +
      '<p class="result-explica">' + (o.calcioIndicado ? "Cambios ECG o K ≥ 6,5: protege el corazón, mete el K en la célula y elimínalo." : "Sin cambios ECG y K < 6,5: mete el K en la célula y elimínalo; vigila el ECG.") + "</p></div>" +
    (d.ecg ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml(K_TXT.ecg_hiper) + "</span></div>" : "") +
    cardTrat("1 · Proteger el corazón (calcio)", null, null, calcioLineas, "var(--c-cad)") +
    cardTrat("2 · Meter el K en la célula", null, null, celulaLineas, "var(--c-insulina)") +
    cardTrat("3 · Eliminar el K del cuerpo", null, null, eliminarLineas, "var(--violet)") +
    cardTrat("Medidas generales", null, null, K_TXT.hiper_general.map(escHtml), "var(--brand)") +
    cardTrat("Monitorización", null, null, ["Controlar el K a las <b>" + cfg.control_k + "</b> (vigilar el efecto rebote).", "Glucemia capilar seriada tras la insulina (0-360 min)."], "var(--brand)") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-hk-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHK());

  document.getElementById("btn-hk-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHK() {
  if (!_ultimoHK) return "";
  const { d, o } = _ultimoHK;
  const cfg = K_CFG;
  let t = App.informe.cabecera("HIPERPOTASEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Potasio: " + fmt(d.k, 1) + " mmol/l (" + o.grav + ")" + (d.ecg ? " · cambios ECG" : "") + (d.glu !== null ? " · glucemia " + fmt(d.glu, 0) + " mg/dl" : "") + "\n";
  t += "\n1) PROTEGER EL CORAZÓN (CALCIO)\n";
  if (o.calcioIndicado) {
    t += "  - Gluconato cálcico 10% " + cfg.gluconato_ml + " ml (1 g) IV en " + cfg.gluconato_min + " min, con monitor ECG. Repetir a los " + cfg.gluconato_repetir + " min si persisten cambios.\n";
  } else t += "  - ECG normal y K < 6,5: calcio no imprescindible; administrar si aparecen cambios ECG.\n";
  t += "\n2) METER EL K EN LA CÉLULA\n";
  t += "  - Insulina rápida " + cfg.insulina_ui + " UI + " + cfg.glucosa_g + " g glucosa IV en 15-30 min.\n";
  t += "  - " + (o.glucosaMant ? "Glucemia <" + cfg.glucosa_umbral_mgdl + ": glucosado 10% " + cfg.glucosa_mant_ml_h + " ml/h x " + cfg.glucosa_mant_h + " h." : "Vigilar glucemia (hipoglucemia tardía).") + "\n";
  t += "  - Salbutamol nebulizado " + cfg.salbutamol_min + "-" + cfg.salbutamol_max + " mg (adyuvante). Bicarbonato no de rutina.\n";
  t += "\n3) ELIMINAR EL K\n"; K_TXT.hiper_eliminar.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nMEDIDAS GENERALES\n"; K_TXT.hiper_general.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nMONITORIZACIÓN\n  - K a las " + cfg.control_k + "; glucemia seriada tras la insulina.\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (UK Kidney 2023 / consenso español). Verificar por el facultativo.\n";
  return t;
}

// ============================================================
//  3 · HIPOPOTASEMIA
// ============================================================
function prefillHipoK() {
  const p = App.estado.paciente;
  if (!p) return;
  setVal("pk-k", p.k);
  const e = document.getElementById("pk-ecg"); if (e) e.checked = !!p.ecg;
  App.estado.paciente = null;
}
let _ultimoPK = null;
function leerPK() {
  return { k: parseNum("pk-k"), ecg: chkVal("pk-ecg"), oral: chkVal("pk-oral"), mg: chkVal("pk-mg"), cardio: chkVal("pk-cardio") };
}
function calcularPK(d) {
  const cfg = K_CFG, o = {};
  o.grav = d.k < cfg.hipo_mod ? "grave" : (d.k < cfg.hipo_leve ? "moderada" : "leve");
  o.iv = (d.k < cfg.hipo_mod) || d.ecg || !d.oral;
  o.objetivo = d.cardio ? cfg.objetivo_cardio : cfg.objetivo;
  return o;
}
function renderPK() {
  const d = leerPK();
  if (d.k === null) { toast("Introduce el potasio (K⁺).", true); return; }
  const cfg = K_CFG;
  const o = calcularPK(d);
  _ultimoPK = { d, o };
  const cont = document.getElementById("pk-resultado");

  // Reposición — vehículo + volumen + ritmo concreto
  const repoLineas = [];
  if (o.iv) {
    repoLineas.push("<b>Vía IV</b> (grave, cambios ECG o sin tolerancia oral):");
    repoLineas.push("<b>Periférica:</b> <b>" + cfg.kcl_perif_meq + " mEq KCl en " + cfg.kcl_perif_vol_ml + " ml de SSF 0,9% a pasar en " + cfg.kcl_perif_h + " h</b> (= " + cfg.kcl_iv_perif + " mEq/h, concentración " + cfg.kcl_conc_perif + " mEq/l). Ritmo de bomba: <b>" + Math.round(cfg.kcl_perif_vol_ml / cfg.kcl_perif_h) + " ml/h</b>.");
    repoLineas.push("<b>Vía central</b> (con monitor ECG, si grave o se necesita más velocidad): <b>" + cfg.kcl_central_meq + " mEq KCl en " + cfg.kcl_central_vol_ml + " ml de SSF 0,9% a pasar en " + cfg.kcl_central_h + " h</b> (= " + cfg.kcl_iv_central + " mEq/h). Ritmo de bomba: <b>" + Math.round(cfg.kcl_central_vol_ml / cfg.kcl_central_h) + " ml/h</b>.");
    repoLineas.push("<b>" + escHtml(K_TXT.hipo_via) + "</b>");
  } else {
    repoLineas.push("<b>Vía oral</b> (leve-moderada y tolera): KCl <b>" + cfg.kcl_oral_min + "-" + cfg.kcl_oral_max + " mEq por toma</b> (máx. ~60 por irritación gástrica), repartido en el día.");
    repoLineas.push("Si empeora, no tolera o aparecen cambios ECG, pasar a vía IV.");
  }
  repoLineas.push("Objetivo: K > <b>" + fmt(o.objetivo, 1) + " mmol/l</b>" + (d.cardio ? " (más alto por cardiopatía/isquemia/digital)" : "") + ". Reevaluar el K cada 2-4 h (o cada ~60 mEq administrados).");

  const etiqueta = { leve: "leve (3,0-3,4)", moderada: "moderada (2,5-2,9)", grave: "grave (< 2,5)" }[o.grav];

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-insulina)">' +
      '<div class="result-kicker">Hipopotasemia' + (o.iv ? " · IV" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">K ' + fmt(d.k, 1) + " mmol/l — " + etiqueta + "</div>" +
      '<p class="result-explica">Repón el potasio y, sobre todo, corrige el magnesio. Verifica la vía y el ritmo.</p></div>' +
    (d.ecg ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml(K_TXT.ecg_hipo) + "</span></div>" : "") +
    cardTrat("Magnesio (primero)", null, null, [escHtml(K_TXT.hipo_mg) + (d.mg ? " <b>(magnesio bajo: corrígelo ya)</b>" : "")], "var(--violet)") +
    cardTrat("Reposición de potasio", null, null, repoLineas, "var(--c-insulina)") +
    cardTrat("Causa y monitorización", null, null, ["Buscar la causa: " + escHtml(K_TXT.hipo_causas), "ECG: " + escHtml(K_TXT.ecg_hipo)], "var(--brand)") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-pk-recal">Recalcular</button></div>' +
    App.informe.bloque(informePK());

  document.getElementById("btn-pk-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informePK() {
  if (!_ultimoPK) return "";
  const { d, o } = _ultimoPK;
  const cfg = K_CFG;
  let t = App.informe.cabecera("HIPOPOTASEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Potasio: " + fmt(d.k, 1) + " mmol/l (" + o.grav + ")" + (d.ecg ? " · cambios ECG" : "") + (d.mg ? " · magnesio bajo" : "") + "\n";
  t += "\nMAGNESIO\n  - " + K_TXT.hipo_mg + "\n";
  t += "\nREPOSICIÓN\n";
  if (o.iv) {
    t += "  - Periférica: " + cfg.kcl_perif_meq + " mEq KCl en " + cfg.kcl_perif_vol_ml + " ml SSF en " + cfg.kcl_perif_h + " h (" + Math.round(cfg.kcl_perif_vol_ml / cfg.kcl_perif_h) + " ml/h = " + cfg.kcl_iv_perif + " mEq/h).\n";
    t += "  - Central (monitor ECG): " + cfg.kcl_central_meq + " mEq KCl en " + cfg.kcl_central_vol_ml + " ml SSF en " + cfg.kcl_central_h + " h (" + Math.round(cfg.kcl_central_vol_ml / cfg.kcl_central_h) + " ml/h = " + cfg.kcl_iv_central + " mEq/h).\n";
    t += "  - " + K_TXT.hipo_via + "\n";
  } else {
    t += "  - Oral: KCl " + cfg.kcl_oral_min + "-" + cfg.kcl_oral_max + " mEq/toma (máx ~60), repartido.\n";
  }
  t += "  - Objetivo K > " + fmt(o.objetivo, 1) + " mmol/l. Reevaluar cada 2-4 h.\n";
  t += "\nCAUSA\n  - " + K_TXT.hipo_causas + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (EMCrit / consenso español). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-dk-calcular").addEventListener("click", renderDK);
  document.getElementById("btn-dk-limpiar").addEventListener("click", () => {
    document.getElementById("dk-k").value = ""; document.getElementById("dk-ecg").checked = false;
    document.getElementById("dk-resultado").innerHTML = ""; _ultimoDK = null;
  });
  document.getElementById("btn-hk-calcular").addEventListener("click", renderHK);
  document.getElementById("btn-hk-limpiar").addEventListener("click", () => {
    ["hk-k", "hk-glu"].forEach(id => { document.getElementById(id).value = ""; });
    ["hk-ecg", "hk-erc", "hk-diuresis"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("hk-resultado").innerHTML = ""; _ultimoHK = null;
  });
  document.getElementById("btn-pk-calcular").addEventListener("click", renderPK);
  document.getElementById("btn-pk-limpiar").addEventListener("click", () => {
    document.getElementById("pk-k").value = "";
    ["pk-ecg", "pk-mg", "pk-cardio"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("pk-oral").checked = true;
    document.getElementById("pk-resultado").innerHTML = ""; _ultimoPK = null;
  });
});
