// ============================================================
//  modulos/hidro/magnesio.js — Trastornos del magnesio
//  Hipomagnesemia e hipermagnesemia (mg/dl).
//  Fuentes: Merck/MSD; EMCrit; SPS NHS; Nefrología al día.
//  Datos en MG_CFG / MG_TXT. Reutiliza cardTrat / chkVal (sodio.js).
// ============================================================

App.registrarRuta("/hidro/hipomagnesemia",  { view: "view-hipomagnesemia" });
App.registrarRuta("/hidro/hipermagnesemia", { view: "view-hipermagnesemia" });

// ── Hipomagnesemia ─────────────────────────────────────────
let _ultimoLM = null;
function renderLM() {
  const cfg = MG_CFG;
  const mg = parseNum("lm-mg");
  if (mg === null) { toast("Introduce el magnesio.", true); return; }
  const sintomas = chkVal("lm-sintomas"), torsades = chkVal("lm-torsades"), oral = chkVal("lm-oral"), erc = chkVal("lm-erc");
  const grav = mg < cfg.hipo_grave || sintomas || torsades;
  const iv = grav || !oral;
  _ultimoLM = { mg, sintomas, torsades, oral, erc, grav, iv };
  const cont = document.getElementById("lm-resultado");
  // Insuficiencia renal: afecta tanto a la pauta IV como a la oral
  const ercLinea = "<b>Insuficiencia renal: reducir la dosis un " + cfg.erc_reduccion_pct + "%</b> y vigilar reflejos y ECG (riesgo de hipermagnesemia).";

  let repo;
  if (iv) {
    const lineas = [];
    if (torsades) lineas.push("<b>Torsades / convulsiones:</b> <b>sulfato de Mg " + cfg.mgso4_torsades_g + " g en " + cfg.mgso4_torsades_vehiculo_ml + " ml de SG 5% IV en bolo de 5-10 min</b>, repetible.");
    lineas.push("<b>Carga (grave / sintomática estable):</b> <b>sulfato de Mg " + cfg.mgso4_g_min + "-" + cfg.mgso4_g_max + " g en " + cfg.mgso4_carga_vehiculo_ml + " ml de SG 5% IV en " + cfg.mgso4_carga_min + " min</b> (bomba ≈ " + Math.round(cfg.mgso4_carga_vehiculo_ml * 60 / cfg.mgso4_carga_min) + " ml/h).");
    // Ritmo de la perfusión de mantenimiento (vol total / horas) — usamos 12 h y 24 h como extremos
    const mlhMax = Math.round(cfg.perfusion_vehiculo_ml / 12); // más rápido (12 h)
    const mlhMin = Math.round(cfg.perfusion_vehiculo_ml / 24); // más lento (24 h)
    lineas.push("<b>Perfusión de mantenimiento:</b> <b>" + cfg.perfusion_g_min + "-" + cfg.perfusion_g_max + " g en " + cfg.perfusion_vehiculo_ml + " ml de SG 5% a pasar en " + cfg.perfusion_h + " h</b> (bomba <b>" + mlhMin + "-" + mlhMax + " ml/h</b>). El Mg se elimina rápido por la orina, por eso conviene mantener la perfusión.");
    if (erc) lineas.push(ercLinea);
    repo = cardTrat("Sulfato de magnesio IV", null, null, lineas, "var(--c-cad)");
  } else {
    const lineas = [
      "<b>Sales de magnesio orales</b> repartidas en el día.",
      "Limita la dosis por la diarrea; pasar a IV si hay síntomas, arritmia o no se corrige."
    ];
    if (erc) lineas.push(ercLinea);
    repo = cardTrat("Magnesio oral (leve)", null, null, lineas, "var(--c-insulina)");
  }

  const otros = cardTrat("Iones asociados y causa", null, null, [
    "Reponer también <b>potasio y calcio</b>: la hipomagnesemia suele asociarlos y los hace refractarios.",
    "ECG: " + escHtml(MG_TXT.hipo_ecg),
    "Buscar la causa: " + escHtml(MG_TXT.hipo_causas)
  ], "var(--brand)");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">Hipomagnesemia' + (iv ? " · IV" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Mg ' + fmt(mg, 1) + " mg/dl" + (grav ? " — grave" : "") + "</div>" +
      '<p class="result-explica">Repón el magnesio y, a la vez, el potasio y el calcio. Verifica la dosis y el ritmo.</p></div>' +
    (torsades ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml(MG_TXT.hipo_ecg) + "</span></div>" : "") +
    repo + otros +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-lm-recal">Recalcular</button></div>' +
    App.informe.bloque(informeLM());
  document.getElementById("btn-lm-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeLM() {
  if (!_ultimoLM) return "";
  const o = _ultimoLM, cfg = MG_CFG;
  let t = App.informe.cabecera("HIPOMAGNESEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Magnesio: " + fmt(o.mg, 1) + " mg/dl" + (o.grav ? " · grave/sintomática" : "") + (o.torsades ? " · torsades/convulsiones" : "") + (o.erc ? " · ERC" : "") + "\n";
  if (o.iv) {
    t += "\nSULFATO DE MAGNESIO IV\n";
    if (o.torsades) t += "  - Torsades/convulsiones: " + cfg.mgso4_torsades_g + " g en " + cfg.mgso4_torsades_vehiculo_ml + " ml SG 5% IV en bolo 5-10 min, repetible.\n";
    t += "  - Carga: " + cfg.mgso4_g_min + "-" + cfg.mgso4_g_max + " g en " + cfg.mgso4_carga_vehiculo_ml + " ml SG 5% en " + cfg.mgso4_carga_min + " min.\n";
    t += "  - Perfusión: " + cfg.perfusion_g_min + "-" + cfg.perfusion_g_max + " g en " + cfg.perfusion_vehiculo_ml + " ml SG 5% a pasar en " + cfg.perfusion_h + " h (~" + Math.round(cfg.perfusion_vehiculo_ml / 24) + "-" + Math.round(cfg.perfusion_vehiculo_ml / 12) + " ml/h).\n";
    if (o.erc) t += "  - ERC: reducir dosis " + cfg.erc_reduccion_pct + "% y vigilar.\n";
  } else {
    t += "\nORAL\n  - Sales de magnesio orales; pasar a IV si síntomas/arritmia.\n";
    if (o.erc) t += "  - ERC: reducir dosis " + cfg.erc_reduccion_pct + "% y vigilar.\n";
  }
  t += "\nASOCIADOS/CAUSA\n  - Reponer K y Ca. " + MG_TXT.hipo_causas + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Merck / EMCrit / SPS NHS). Verificar por el facultativo.\n";
  return t;
}

// ── Hipermagnesemia ────────────────────────────────────────
let _ultimoHM = null;
// Líneas de «Eliminar el magnesio» según ERC y diuresis: [{ txt, destacar }]
function eliminarMg(d) {
  const cfg = MG_CFG, T = MG_TXT, l = [];
  if (d.erc) l.push({ txt: T.hiper_dialisis_erc, destacar: true });   // ERC/diálisis: la diálisis va primero
  l.push(d.diuresis
    ? { txt: "SSF 0,9% 200-300 ml/h + furosemida " + cfg.furosemida_mg_min + "-" + cfg.furosemida_mg_max + " mg IV, si la función renal lo permite. Repetir furosemida según respuesta." }
    : { txt: T.hiper_sin_diuresis, destacar: true });
  if (!d.erc) l.push({ txt: T.hiper_dialisis });
  return l;
}
function renderHM() {
  const cfg = MG_CFG;
  const mg = parseNum("hm-mg");
  if (mg === null) { toast("Introduce el magnesio.", true); return; }
  const sintomas = chkVal("hm-sintomas"), erc = chkVal("hm-erc"), diuresis = chkVal("hm-diuresis");
  const elim = eliminarMg({ erc, diuresis });
  _ultimoHM = { mg, sintomas, erc, diuresis, elim };
  const cont = document.getElementById("hm-resultado");

  const suspender = cardTrat("Suspender el aporte", null, null, [
    "Retirar <b>todo aporte de magnesio</b>: laxantes y antiácidos con Mg, sulfato de magnesio, enemas.",
    "Buscar la causa: " + escHtml(MG_TXT.hiper_causas)
  ], "var(--brand)");

  const calcio = sintomas ? cardTrat("Calcio IV (antagonista)", null, null, [
    "<b>Gluconato cálcico 10% " + cfg.gluconato_ml_min + "-" + cfg.gluconato_ml_max + " ml (1-2 g) IV en 3-10 min</b>: antagoniza los efectos cardíacos y neuromusculares.",
    "Repetir según la respuesta clínica y el ECG."
  ], "var(--c-cad)") : "";

  const eliminar = cardTrat("Eliminar el magnesio", null, null,
    elim.map(x => x.destacar ? "<b>" + escHtml(x.txt) + "</b>" : escHtml(x.txt))
      .concat(["Monitorizar reflejos osteotendinosos, ECG y respiración. " + escHtml(MG_TXT.hiper_clinica)]),
    "var(--violet)");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-ehh)">' +
      '<div class="result-kicker">Hipermagnesemia' + (sintomas ? " · urgencia" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Mg ' + fmt(mg, 1) + " mg/dl</div>" +
      '<p class="result-explica">Casi siempre por insuficiencia renal con aporte de Mg. Suspender el aporte, antagonizar con calcio si hay síntomas y eliminar.</p></div>' +
    (sintomas ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml(MG_TXT.hiper_clinica) + "</span></div>" : "") +
    suspender + calcio + eliminar +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-hm-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHM());
  document.getElementById("btn-hm-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHM() {
  if (!_ultimoHM) return "";
  const o = _ultimoHM, cfg = MG_CFG;
  let t = App.informe.cabecera("HIPERMAGNESEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Magnesio: " + fmt(o.mg, 1) + " mg/dl" + (o.sintomas ? " · sintomática" : "") + (o.erc ? " · ERC" : "") + (o.diuresis ? "" : " · sin diuresis conservada") + "\n";
  t += "\nSUSPENDER\n  - Retirar todo aporte de Mg (laxantes/antiácidos). " + MG_TXT.hiper_causas + "\n";
  if (o.sintomas) t += "\nCALCIO IV\n  - Gluconato cálcico 10% " + cfg.gluconato_ml_min + "-" + cfg.gluconato_ml_max + " ml (1-2 g) IV en 3-10 min (antagonista), repetible.\n";
  t += "\nELIMINAR\n"; o.elim.forEach(x => { t += "  - " + x.txt + "\n"; });
  t += "  - Monitorizar reflejos, ECG y respiración.\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Merck / EMCrit). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-lm-calcular").addEventListener("click", renderLM);
  document.getElementById("btn-lm-limpiar").addEventListener("click", () => {
    document.getElementById("lm-mg").value = "";
    ["lm-sintomas", "lm-torsades", "lm-erc"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("lm-oral").checked = true;
    document.getElementById("lm-resultado").innerHTML = ""; _ultimoLM = null;
  });
  document.getElementById("btn-hm-calcular").addEventListener("click", renderHM);
  document.getElementById("btn-hm-limpiar").addEventListener("click", () => {
    document.getElementById("hm-mg").value = "";
    ["hm-sintomas", "hm-erc"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("hm-diuresis").checked = true;   // por defecto: diuresis conservada
    document.getElementById("hm-resultado").innerHTML = ""; _ultimoHM = null;
  });
});
