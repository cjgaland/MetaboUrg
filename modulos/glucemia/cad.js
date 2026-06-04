// ============================================================
//  modulos/glucemia/cad.js — Calculadora de tratamiento de la CAD
//  Fluidos, insulina, potasio y bicarbonato según peso y situación.
//  Por defecto SEEN/ADA-EASD 2024; variante SAEDYN 2017 como nota.
//  Usa App, CAD_CFG, NOTAS_FUENTE y gravedadCAD() (glucemia.js).
// ============================================================

App.registrarRuta("/glucemia/cad", {
  view: "view-cad",
  crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Cetoacidosis", "#/glucemia/cad"]],
  onShow: prefillCAD
});

// Prerellena el formulario con los datos del triaje (si los hay).
function prefillCAD() {
  const p = App.estado.paciente;
  if (!p) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e && (v !== null && v !== undefined)) e.value = (typeof v === "number" ? String(v).replace(".", ",") : v); };
  const chkSet = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
  set("c-peso", p.peso); set("c-glucosa", p.glu); set("c-k", p.k);
  set("c-ph", p.ph); set("c-hco3", p.hco3); set("c-na", p.na);
  chkSet("c-consciencia", p.consciencia);

  // Antecedentes y tratamiento previo (heredados del triaje)
  const a = p.ant || {};
  chkSet("c-ic", a.ic);
  chkSet("c-erc", a.erc);
  set("c-fge", a.fge);
  const ercExtra = document.getElementById("c-erc-extra");
  if (ercExtra) ercExtra.hidden = !a.erc;
  if (a.insulina) { set("c-ins-dtd", a.insulina.dtd); set("c-ins-basal", a.insulina.lenta); }
  if (a.tipoDM === "no") chkSet("c-debut", true);   // no diabético conocido → posible début

  App.estado.paciente = null; // se consume una vez
}

function leerDatosCAD() {
  const chk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  return {
    peso: parseNum("c-peso"), glu: parseNum("c-glucosa"), k: parseNum("c-k"),
    ph: parseNum("c-ph"), hco3: parseNum("c-hco3"), na: parseNum("c-na"),
    urea: parseNum("c-urea"), eb: parseNum("c-eb"), crea: parseNum("c-crea"),
    naOrina: parseNum("c-naorina"), creaOrina: parseNum("c-creaorina"),
    shock: chk("c-shock"),
    debut: chk("c-debut"),
    oliguria: chk("c-oliguria"),
    consciencia: chk("c-consciencia"),
    ic: chk("c-ic"),
    erc: chk("c-erc"),
    fge: parseNum("c-fge"),
    insDtd: parseNum("c-ins-dtd"),
    insBasal: parseNum("c-ins-basal")
  };
}

// ── Cálculo ────────────────────────────────────────────────
function calcularCAD(d) {
  const cfg = CAD_CFG;
  const has = v => v !== null && v !== undefined;
  const F = App.formulas;
  const o = { gravedad: gravedadCAD(d), naCorr: F.naCorregido(d.na, d.glu) };

  // Datos calculados (resumen previo al tratamiento)
  o.osmEf    = F.osmolalidadEfectiva(d.na, d.glu);
  o.osmTotal = F.osmolaridadTotal(d.na, d.glu, d.urea);
  o.act      = F.aguaCorporalTotal(d.peso, cfg.act_factor);
  o.defAgua  = F.deficitAgua(d.na, cfg.na_deseado, o.act);
  o.perdidas = F.perdidasEstimadas(d.peso, cfg.perdidas_mlkg);
  o.defTotal = (o.defAgua === null) ? null : (o.defAgua < 0 ? o.perdidas : o.defAgua + o.perdidas);
  o.fena     = F.fena(d.naOrina, d.crea, d.na, d.creaOrina);
  o.defHCO3  = F.deficitHCO3(d.peso, d.eb);

  // Antecedentes que modulan el tratamiento
  o.cautelaFluidos = d.ic || d.erc || d.oliguria;            // ritmos más prudentes
  o.cautelaK = d.erc || d.oliguria;                          // riesgo de hiperpotasemia
  o.motivoCautela = [d.ic ? "insuficiencia cardíaca" : null, d.erc ? "enfermedad renal crónica" : null, d.oliguria ? "oligoanuria/I. renal aguda" : null].filter(Boolean);

  // Insulina
  o.insUIh = redondea(cfg.insulina_uikgh * d.peso, 1);
  o.insMlh = o.insUIh; // preparación 1 UI/ml → ml/h = UI/h
  o.insUIhRed = redondea(cfg.insulina_uikgh_reducida * d.peso, 1);
  o.boloSaedyn = redondea(cfg.bolo_uikg_saedyn * d.peso, 1);
  o.basalDebut = Math.round(cfg.basal_uikg_debut * d.peso);
  // Basal de partida según la insulina previa del paciente
  o.basalPrevia = has(d.insBasal) ? d.insBasal : null;
  o.basalDesdeDtd = has(d.insDtd) ? Math.round(cfg.basal_frac_dtd * d.insDtd) : null;
  o.dtdPrevia = has(d.insDtd) ? d.insDtd : null;

  // Fluidos 1ª hora (reducidos si hay cautela)
  const f1min = o.cautelaFluidos ? cfg.fluido_1h_mlkg_cauto_min : cfg.fluido_1h_mlkg_min;
  const f1max = o.cautelaFluidos ? cfg.fluido_1h_mlkg_cauto_max : cfg.fluido_1h_mlkg_max;
  o.fluido1hMin = Math.round(f1min * d.peso);
  o.fluido1hMax = Math.min(Math.round(f1max * d.peso), cfg.fluido_1h_max_ml);
  o.fluido1hMlkgMin = f1min;
  o.fluido1hMlkgMax = f1max;
  o.ritmoMin = o.cautelaFluidos ? cfg.ritmo_mlh_cauto_min : cfg.ritmo_mlh_min;
  o.ritmoMax = o.cautelaFluidos ? cfg.ritmo_mlh_cauto_max : cfg.ritmo_mlh_max;
  o.usar045 = has(o.naCorr) && o.naCorr >= cfg.na_corr_umbral_045;

  // Potasio (KCl reducido y vigilancia estrecha si ERC/oliguria)
  const kLitMin = o.cautelaK ? cfg.kcl_por_litro_erc_min : cfg.kcl_por_litro_min;
  const kLitMax = o.cautelaK ? cfg.kcl_por_litro_erc_max : cfg.kcl_por_litro_max;
  const cautelaTxt = o.cautelaK ? " ERC/I. renal: reponer en el rango bajo, con diuresis confirmada y control de K cada 1–2 h (riesgo de hiperpotasemia)." : "";
  if (!has(d.k)) o.k = { nivel: "falta", txt: "Solicita el potasio antes de iniciar insulina." + cautelaTxt };
  else if (d.k < cfg.k_bajo) o.k = { nivel: "bajo", txt: "K < 3,3 mEq/l: RETRASAR la insulina. Reponer KCl " + cfg.kcl_reposicion_h_min + "–" + cfg.kcl_reposicion_h_max + " mEq/h IV (monitorizado) hasta K > 3,3 mEq/l; iniciar insulina cuando se supere." + cautelaTxt };
  else if (d.k <= cfg.k_alto) o.k = { nivel: "normal", txt: "K " + fmt(d.k, 1) + " mEq/l: añadir KCl " + kLitMin + "–" + kLitMax + " mEq por cada litro de suero. Objetivo K " + cfg.k_obj_min + "–" + cfg.k_obj_max + " mEq/l." + cautelaTxt };
  else o.k = { nivel: "alto", txt: "K > 5,3 mEq/l: NO reponer potasio. Revisar K en 2 h. Iniciar insulina (desciende el K⁺)." + (o.cautelaK ? " ERC/I. renal: vigilancia estrecha de la hiperpotasemia." : "") };

  // Bicarbonato (variante SAEDYN, solo si pH ≤ 7,0)
  if (has(d.ph) && d.ph <= cfg.bicarbonato_ph_umbral) {
    o.bicarbonato = d.ph < 6.9
      ? "pH < 6,9 (variante SAEDYN): 100 mEq de bicarbonato 1 M en 500 ml de salino + 20 mEq de KCl, a pasar en 2 h. Repetir cada 2 h hasta pH > 7. Controlar K."
      : "pH 6,9–7,0 (variante SAEDYN): 50 mEq de bicarbonato 1 M en 250 ml de salino + 10 mEq de KCl, a pasar en 1 h. Repetir hasta pH > 7. Controlar K.";
  } else o.bicarbonato = null;

  // Dosis SC orientativa (transición)
  o.scMin = redondea(0.5 * d.peso, 0);
  o.scMax = redondea(0.8 * d.peso, 0);
  return o;
}
function redondea(n, dec) { const f = Math.pow(10, dec); return Math.round(n * f) / f; }

// ── Render ─────────────────────────────────────────────────
let _ultimoCAD = null;
function renderResultadoCAD() {
  const d = leerDatosCAD();
  if (d.peso === null) { toast("Introduce el peso del paciente.", true); return; }
  const o = calcularCAD(d);
  _ultimoCAD = { d, o };
  const cont = document.getElementById("cad-resultado");
  const cfg = CAD_CFG;
  const etiqueta = { leve: "CAD leve", moderada: "CAD moderada", grave: "CAD grave" }[o.gravedad];

  function card(titulo, num, sub, lineas, nota, color) {
    return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-cad)") + '">' +
      "<h3>" + escHtml(titulo) + "</h3>" +
      (num ? '<div class="dosis-grande">' + num + (sub ? ' <small>' + escHtml(sub) + "</small>" : "") + "</div>" : "") +
      '<ul class="trat-list">' + lineas.map(l => "<li>" + l + "</li>").join("") + "</ul>" +
      (nota ? '<div class="nota-fuente">' + escHtml(NOTAS_FUENTE[nota]) + "</div>" : "") +
      "</div>";
  }

  // Panel "Datos calculados" (previo al tratamiento)
  function datosCalculados() {
    const items = [];
    const add = (lab, val, unidad) => { if (val !== null && val !== undefined) items.push([lab, val, unidad]); };
    add("Osmolalidad efectiva", o.osmEf !== null ? fmt(o.osmEf, 0) : null, "mOsm/kg");
    add("Osmolaridad plasmática total", o.osmTotal !== null ? fmt(o.osmTotal, 0) : null, "mOsm/l");
    add("Sodio corregido", o.naCorr !== null ? fmt(o.naCorr, 0) : null, "mEq/l");
    add("Agua corporal total", o.act !== null ? fmt(o.act, 1) : null, "litros");
    add("Déficit de agua", o.defAgua !== null ? fmt(o.defAgua, 1) : null, "litros");
    add("Pérdidas estimadas (25 ml/kg)", o.perdidas !== null ? fmt(o.perdidas, 1) : null, "litros");
    add("Déficit total de agua", o.defTotal !== null ? fmt(o.defTotal, 1) : null, "litros");
    add("Fracción de excreción de Na", o.fena !== null ? fmt(o.fena, 1) : null, "%");
    add("Déficit de HCO₃", o.defHCO3 !== null ? fmt(o.defHCO3, 0) : null, "mEq");
    const filas = items.map(it =>
      '<div class="dato-item"><span class="dato-lab">' + escHtml(it[0]) + "</span>" +
      '<span class="dato-val">' + it[1] + ' <small>' + escHtml(it[2]) + "</small></span></div>"
    ).join("");
    return '<div class="datos-card"><h3>Datos calculados</h3>' +
      '<div class="datos-grid">' + filas + "</div>" +
      '<p class="datos-pie">Parámetros derivados de los datos introducidos; orientan el ajuste del tratamiento (Na deseado ' + cfg.na_deseado + ' mEq/l, ACT ' + cfg.act_factor + '×peso).</p></div>';
  }

  // Fluidos
  const fluidoLineas = [];
  if (o.cautelaFluidos) fluidoLineas.push("⚠️ <b>" + escHtml(o.motivoCautela.join(" / ")) + ":</b> fluidoterapia más prudente — ritmos reducidos y reevaluación frecuente de la volemia (vigilar sobrecarga / edema agudo de pulmón).");
  if (d.shock) fluidoLineas.push("<b>Shock / TA &lt; 90:</b> bolo de <b>" + cfg.bolo_shock_ml + " ml</b> de SSF 0,9% en 10–15 min; repetir hasta TA sistólica &gt; 90 mmHg.");
  fluidoLineas.push("<b>1.ª hora:</b> SSF 0,9% <b>" + fmt(o.fluido1hMin, 0) + "–" + fmt(o.fluido1hMax, 0) + " ml</b> (≈" + fmt(o.fluido1hMlkgMin, 0) + "–" + fmt(o.fluido1hMlkgMax, 0) + " ml/kg" + (o.cautelaFluidos ? ", reducido por antecedentes" : "") + ").");
  fluidoLineas.push("<b>2.ª–6.ª hora:</b> " + (o.usar045 ? "salino 0,45%" : "SSF 0,9%") + " a <b>" + o.ritmoMin + "–" + o.ritmoMax + " ml/h</b>" + (o.naCorr !== null ? " (Na corregido " + fmt(o.naCorr, 0) + " mEq/l" + (o.usar045 ? ", ≥135 → hiposalino" : "") + ")" : "") + ", ajustando a volemia y diuresis.");
  fluidoLineas.push("<b>Al bajar la glucemia a ≤ " + cfg.glu_anadir_glucosa + " mg/dl:</b> añadir suero glucosado 5–10 % a 125–250 ml/h, manteniendo la glucemia en " + cfg.glu_objetivo_min + "–" + cfg.glu_objetivo_max + " mg/dl.");

  // Insulina — basal de partida según la situación / insulina previa
  let basalTxt;
  if (d.debut) basalTxt = "Début: iniciar insulina basal glargina <b>" + fmt(o.basalDebut, 0) + " UI/día</b> (0,25 UI/kg).";
  else if (o.basalPrevia !== null) basalTxt = "Mantener la basal habitual del paciente: <b>" + fmt(o.basalPrevia, 0) + " UI/día</b> (glargina/degludec).";
  else if (o.basalDesdeDtd !== null) basalTxt = "Mantener la basal habitual; si se desconoce el desglose, estimar ≈ <b>" + fmt(o.basalDesdeDtd, 0) + " UI/día</b> (50% de la DTD previa de " + fmt(o.dtdPrevia, 0) + " UI).";
  else basalTxt = "Mantener la insulina basal habitual del paciente (no suspenderla nunca).";
  const insLineas = [
    "<b>Preparación:</b> 50 UI de insulina rápida (regular: Actrapid®/Humulina Regular®) en 50 ml de SSF 0,9% → 1 UI/ml, es decir <b>" + fmt(o.insMlh, 1) + " ml/h</b> en bomba.",
    "Sin bolo inicial. " + basalTxt,
    "<b>Al alcanzar glucemia ≤ " + cfg.glu_anadir_glucosa + " mg/dl:</b> reducir a <b>" + fmt(o.insUIhRed, 1) + " UI/h</b> (0,05 UI/kg/h) y añadir glucosa.",
    "<b>Objetivo:</b> descenso de glucemia " + cfg.descenso_glu_min + "–" + cfg.descenso_glu_max + " mg/dl/h. Si no baja, duplicar el ritmo."
  ];

  // Bicarbonato
  const bicarbLineas = o.bicarbonato
    ? [o.bicarbonato]
    : ["No indicado: " + (d.ph !== null ? "pH " + fmt(d.ph, 2) + " > 7,0. " : "") + "El bicarbonato no se recomienda de rutina."];

  // Monitorización / resolución
  const monitor = [
    "Glucemia capilar <b>cada hora</b>.",
    "Gasometría venosa, iones (sobre todo K⁺) y β-hidroxibutirato <b>cada 2–4 h</b>.",
    "Función renal y balance hídrico. Buscar y tratar el factor precipitante."
  ];
  let scTxt;
  if (d.debut) scTxt = " (orientativo en début: <b>" + fmt(o.scMin, 0) + "–" + fmt(o.scMax, 0) + " UI/día</b> = 0,5–0,8 UI/kg, 50% basal / 50% bolus).";
  else if (o.dtdPrevia !== null) scTxt = ", reanudando su pauta domiciliaria (DTD previa ≈ <b>" + fmt(o.dtdPrevia, 0) + " UI/día</b>).";
  else scTxt = ".";
  const resolucion = [
    "<b>Resolución:</b> β-OHB &lt; 0,6 mmol/l y pH &gt; 7,3 (o HCO₃ ≥ 18 y anión gap normal).",
    "Cuando el paciente tolere la ingesta, pasar a insulina SC en pauta basal-bolus-corrección" + scTxt,
    "<b>Solapar</b> la insulina rápida SC 1–2 h antes de suspender la perfusión IV."
  ];

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-cad)">' +
      '<div class="result-kicker">Tratamiento calculado · ' + fmt(d.peso) + " kg</div>" +
      '<span class="severity-badge" style="--dx-color:var(--c-cad)">' + etiqueta + "</span><br>" +
      '<div class="result-dx" style="font-size:1.2rem">Cetoacidosis diabética</div>' +
      '<p class="result-explica">Manejo en 3 ejes: fluidos, insulina y potasio. Verifica cada dosis y ritmo según el paciente.</p>' +
    "</div>" +
    datosCalculados() +
    card("1 · Fluidoterapia", null, null, fluidoLineas, null, "var(--c-hipo)") +
    card("2 · Insulina IV (perfusión)", fmt(o.insUIh, 1) + " UI/h", "0,1 UI/kg/h × " + fmt(d.peso) + " kg", insLineas, "insulina_cad", "var(--c-insulina)") +
    card("3 · Potasio (K⁺)", null, null, [escHtml(o.k.txt) + (o.k.nivel === "normal" || o.k.nivel === "bajo" ? " Requiere diuresis adecuada (~50 ml/h)." : "")], null, "var(--violet)") +
    card("4 · Bicarbonato", null, null, bicarbLineas, o.bicarbonato ? "bicarbonato_cad" : null, "var(--c-cad)") +
    card("Monitorización", null, null, monitor, null, "var(--brand)") +
    card("Resolución y paso a SC", null, null, resolucion, "resolucion_cad", "var(--c-ehh)") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-recalcular-cad">Recalcular</button></div>' +
    App.informe.bloque(construirInformeCAD());

  document.getElementById("btn-recalcular-cad").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInformeCAD() {
  if (!_ultimoCAD) return "";
  const { d, o } = _ultimoCAD;
  const cfg = CAD_CFG;
  const etiqueta = { leve: "leve", moderada: "moderada", grave: "grave" }[o.gravedad];
  let t = App.informe.cabecera("CETOACIDOSIS DIABÉTICA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Peso: " + fmt(d.peso) + " kg";
  if (d.glu !== null) t += " · Glucemia: " + fmt(d.glu, 0) + " mg/dl";
  if (d.k !== null) t += " · K: " + fmt(d.k, 1) + " mEq/l";
  if (d.ph !== null) t += " · pH: " + fmt(d.ph, 2);
  if (d.hco3 !== null) t += " · HCO3: " + fmt(d.hco3, 0);
  if (o.naCorr !== null) t += " · Na corregido: " + fmt(o.naCorr, 0) + " mEq/l";
  t += "\n  - Gravedad: CAD " + etiqueta;
  const sit = [];
  if (d.shock) sit.push("shock/TA<90"); if (d.debut) sit.push("début"); if (d.oliguria) sit.push("oligoanuria"); if (d.consciencia) sit.push("alt. consciencia");
  if (d.ic) sit.push("insuf. cardíaca");
  if (d.erc) sit.push("ERC" + (d.fge !== null ? " (FGe " + fmt(d.fge, 0) + ")" : ""));
  if (sit.length) t += " · " + sit.join(", ");
  t += "\n\nDATOS CALCULADOS\n";
  if (o.osmEf !== null) t += "  - Osmolalidad efectiva: " + fmt(o.osmEf, 0) + " mOsm/kg\n";
  if (o.osmTotal !== null) t += "  - Osmolaridad plasmática total: " + fmt(o.osmTotal, 0) + " mOsm/l\n";
  if (o.naCorr !== null) t += "  - Sodio corregido: " + fmt(o.naCorr, 0) + " mEq/l\n";
  if (o.act !== null) t += "  - Agua corporal total: " + fmt(o.act, 1) + " l\n";
  if (o.defAgua !== null) t += "  - Déficit de agua: " + fmt(o.defAgua, 1) + " l\n";
  if (o.perdidas !== null) t += "  - Pérdidas estimadas (25 ml/kg): " + fmt(o.perdidas, 1) + " l\n";
  if (o.defTotal !== null) t += "  - Déficit total de agua: " + fmt(o.defTotal, 1) + " l\n";
  if (o.fena !== null) t += "  - Fracción de excreción de Na: " + fmt(o.fena, 1) + " %\n";
  if (o.defHCO3 !== null) t += "  - Déficit de HCO3: " + fmt(o.defHCO3, 0) + " mEq\n";
  t += "\n1) FLUIDOTERAPIA\n";
  if (o.cautelaFluidos) t += "  - " + o.motivoCautela.join(" / ") + ": fluidoterapia más prudente (ritmos reducidos, vigilar sobrecarga).\n";
  if (d.shock) t += "  - Shock/TA<90: bolo " + cfg.bolo_shock_ml + " ml SSF 0,9% en 10-15 min, repetir hasta TA>90.\n";
  t += "  - 1.ª hora: SSF 0,9% " + fmt(o.fluido1hMin, 0) + "-" + fmt(o.fluido1hMax, 0) + " ml (" + fmt(o.fluido1hMlkgMin, 0) + "-" + fmt(o.fluido1hMlkgMax, 0) + " ml/kg).\n";
  t += "  - 2.ª-6.ª h: " + (o.usar045 ? "salino 0,45%" : "SSF 0,9%") + " " + o.ritmoMin + "-" + o.ritmoMax + " ml/h" + (o.naCorr !== null ? " (Na corr " + fmt(o.naCorr, 0) + ")" : "") + ".\n";
  t += "  - Glucemia <= " + cfg.glu_anadir_glucosa + " mg/dl: añadir glucosado 5-10% 125-250 ml/h (objetivo 200-250).\n";
  // Basal de partida (texto plano)
  let basalPlano;
  if (d.debut) basalPlano = "Début: basal glargina " + fmt(o.basalDebut, 0) + " UI/día (0,25 UI/kg).";
  else if (o.basalPrevia !== null) basalPlano = "Mantener basal habitual: " + fmt(o.basalPrevia, 0) + " UI/día.";
  else if (o.basalDesdeDtd !== null) basalPlano = "Mantener basal habitual (~" + fmt(o.basalDesdeDtd, 0) + " UI/día, 50% de la DTD previa de " + fmt(o.dtdPrevia, 0) + " UI).";
  else basalPlano = "Mantener basal habitual (no suspenderla nunca).";
  t += "\n2) INSULINA IV\n";
  t += "  - Perfusión: " + fmt(o.insUIh, 1) + " UI/h (0,1 UI/kg/h). Prep.: 50 UI en 50 ml SSF (1 UI/ml) = " + fmt(o.insMlh, 1) + " ml/h.\n";
  t += "  - Sin bolo. " + basalPlano + "\n";
  t += "  - Glucemia <= " + cfg.glu_anadir_glucosa + ": reducir a " + fmt(o.insUIhRed, 1) + " UI/h (0,05 UI/kg/h) + glucosa.\n";
  t += "  - Objetivo descenso 50-75 mg/dl/h.\n";
  t += "\n3) POTASIO\n  - " + o.k.txt + "\n";
  t += "\n4) BICARBONATO\n  - " + (o.bicarbonato || "No indicado de rutina" + (d.ph !== null ? " (pH " + fmt(d.ph, 2) + ")" : "") + ".") + "\n";
  t += "\nMONITORIZACIÓN\n  - Glucemia horaria; gasometría/iones/β-OHB cada 2-4 h; función renal; precipitante.\n";
  let scPlano;
  if (d.debut) scPlano = " (~" + fmt(o.scMin, 0) + "-" + fmt(o.scMax, 0) + " UI/día)";
  else if (o.dtdPrevia !== null) scPlano = " (reanudar pauta domiciliaria, DTD ~" + fmt(o.dtdPrevia, 0) + " UI/día)";
  else scPlano = "";
  t += "\nRESOLUCIÓN Y PASO A SC\n  - β-OHB <0,6 mmol/l y pH >7,3. Paso a SC basal-bolus-corrección" + scPlano + "; solapar 1-2 h.\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (SEEN / ADA-EASD 2024 / SAEDYN). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-calcular-cad").addEventListener("click", renderResultadoCAD);

  // FGe visible solo al marcar ERC
  const ercToggle = document.getElementById("c-erc");
  const ercExtra = document.getElementById("c-erc-extra");
  if (ercToggle && ercExtra) ercToggle.addEventListener("change", () => { ercExtra.hidden = !ercToggle.checked; });

  document.getElementById("btn-limpiar-cad").addEventListener("click", () => {
    ["c-peso", "c-glucosa", "c-k", "c-ph", "c-hco3", "c-na", "c-urea", "c-eb", "c-crea", "c-naorina", "c-creaorina", "c-fge", "c-ins-dtd", "c-ins-basal"].forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; });
    ["c-shock", "c-debut", "c-oliguria", "c-consciencia", "c-ic", "c-erc"].forEach(id => { const e = document.getElementById(id); if (e) e.checked = false; });
    if (ercExtra) ercExtra.hidden = true;
    document.getElementById("cad-resultado").innerHTML = "";
    _ultimoCAD = null;
  });
});
