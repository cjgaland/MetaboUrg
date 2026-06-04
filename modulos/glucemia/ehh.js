// ============================================================
//  modulos/glucemia/ehh.js — Estado hiperglucémico hiperosmolar
//  Fluidos (corrección LENTA), insulina a dosis baja, potasio y
//  profilaxis de trombosis. Por defecto SEEN/ADA 2024.
//  Usa App, App.formulas, App.informe, CAD_CFG y EHH_CFG.
// ============================================================

App.registrarRuta("/glucemia/ehh", {
  view: "view-ehh",
  crumbs: [["Inicio", "#/"], ["Glucemia", "#/glucemia"], ["Estado hiperosmolar", "#/glucemia/ehh"]],
  onShow: prefillEHH
});

function prefillEHH() {
  const p = App.estado.paciente;
  if (!p) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e && (v !== null && v !== undefined)) e.value = (typeof v === "number" ? String(v).replace(".", ",") : v); };
  const chkSet = (id, v) => { const e = document.getElementById(id); if (e) e.checked = !!v; };
  set("e-peso", p.peso); set("e-glucosa", p.glu); set("e-na", p.na); set("e-k", p.k); set("e-bhb", p.bhb);
  chkSet("e-consciencia", p.consciencia);
  const a = p.ant || {};
  chkSet("e-ic", a.ic);
  chkSet("e-erc", a.erc);
  set("e-fge", a.fge);
  const ercExtra = document.getElementById("e-erc-extra");
  if (ercExtra) ercExtra.hidden = !a.erc;
  App.estado.paciente = null;
}

function leerDatosEHH() {
  const chk = id => { const e = document.getElementById(id); return e ? e.checked : false; };
  return {
    peso: parseNum("e-peso"), glu: parseNum("e-glucosa"), na: parseNum("e-na"),
    k: parseNum("e-k"), urea: parseNum("e-urea"), bhb: parseNum("e-bhb"),
    shock: chk("e-shock"), consciencia: chk("e-consciencia"), oliguria: chk("e-oliguria"),
    ic: chk("e-ic"), erc: chk("e-erc"), fge: parseNum("e-fge")
  };
}

// ── Cálculo ────────────────────────────────────────────────
function redondeaE(n, dec) { const f = Math.pow(10, dec); return Math.round(n * f) / f; }

function calcularEHH(d) {
  const cfg = CAD_CFG, ecfg = EHH_CFG;
  const has = v => v !== null && v !== undefined;
  const F = App.formulas;
  const o = {};

  // Datos calculados
  o.osmEf    = F.osmolalidadEfectiva(d.na, d.glu);
  o.osmTotal = F.osmolaridadTotal(d.na, d.glu, d.urea);
  o.naCorr   = F.naCorregido(d.na, d.glu);
  o.act      = F.aguaCorporalTotal(d.peso, cfg.act_factor);
  o.defAgua  = F.deficitAgua(d.na, cfg.na_deseado, o.act);
  o.perdidas = F.perdidasEstimadas(d.peso, cfg.perdidas_mlkg);
  o.defTotal = (o.defAgua === null) ? null : (o.defAgua < 0 ? o.perdidas : o.defAgua + o.perdidas);

  // Antecedentes que modulan el tratamiento
  o.cautelaFluidos = d.ic || d.erc || d.oliguria;
  o.cautelaK = d.erc || d.oliguria;
  o.motivoCautela = [d.ic ? "insuficiencia cardíaca" : null, d.erc ? "enfermedad renal crónica" : null, d.oliguria ? "oligoanuria/I. renal aguda" : null].filter(Boolean);

  // Fluidos (1ª hora + ritmo), reducidos si hay cautela
  const f1min = o.cautelaFluidos ? cfg.fluido_1h_mlkg_cauto_min : cfg.fluido_1h_mlkg_min;
  const f1max = o.cautelaFluidos ? cfg.fluido_1h_mlkg_cauto_max : cfg.fluido_1h_mlkg_max;
  o.fluido1hMin = has(d.peso) ? Math.round(f1min * d.peso) : null;
  o.fluido1hMax = has(d.peso) ? Math.min(Math.round(f1max * d.peso), cfg.fluido_1h_max_ml) : null;
  o.fluido1hMlkgMin = f1min; o.fluido1hMlkgMax = f1max;
  o.ritmoMin = o.cautelaFluidos ? cfg.ritmo_mlh_cauto_min : cfg.ritmo_mlh_min;
  o.ritmoMax = o.cautelaFluidos ? cfg.ritmo_mlh_cauto_max : cfg.ritmo_mlh_max;
  o.usar045 = has(o.naCorr) && o.naCorr >= cfg.na_corr_umbral_045;

  // Insulina a dosis baja (solo si cetonemia o si la glucemia deja de bajar con fluidos)
  o.insMin = has(d.peso) ? redondeaE(ecfg.insulina_uikgh_min * d.peso, 1) : null;
  o.insMax = has(d.peso) ? redondeaE(ecfg.insulina_uikgh_max * d.peso, 1) : null;
  o.cetonemia = has(d.bhb) && d.bhb >= UMBRAL.bhb_cetosis;

  // Potasio (KCl reducido y vigilancia estrecha si ERC/oliguria)
  const kLitMin = o.cautelaK ? cfg.kcl_por_litro_erc_min : cfg.kcl_por_litro_min;
  const kLitMax = o.cautelaK ? cfg.kcl_por_litro_erc_max : cfg.kcl_por_litro_max;
  const cautelaTxt = o.cautelaK ? " ERC/I. renal: reponer en el rango bajo, con diuresis confirmada y control de K cada 1-2 h (riesgo de hiperpotasemia)." : "";
  if (!has(d.k)) o.k = { nivel: "falta", txt: "Solicita el potasio antes de iniciar insulina." + cautelaTxt };
  else if (d.k < cfg.k_bajo) o.k = { nivel: "bajo", txt: "K < 3,3 mEq/l: RETRASAR la insulina. Reponer KCl " + cfg.kcl_reposicion_h_min + "-" + cfg.kcl_reposicion_h_max + " mEq/h IV (monitorizado) hasta K > 3,3 mEq/l." + cautelaTxt };
  else if (d.k <= cfg.k_alto) o.k = { nivel: "normal", txt: "K " + fmt(d.k, 1) + " mEq/l: añadir KCl " + kLitMin + "-" + kLitMax + " mEq por cada litro de suero. Objetivo K " + cfg.k_obj_min + "-" + cfg.k_obj_max + " mEq/l." + cautelaTxt };
  else o.k = { nivel: "alto", txt: "K > 5,3 mEq/l: NO reponer potasio. Revisar K en 2 h." + (o.cautelaK ? " ERC/I. renal: vigilancia estrecha de la hiperpotasemia." : "") };

  return o;
}

// ── Render ─────────────────────────────────────────────────
let _ultimoEHH = null;
function renderResultadoEHH() {
  const d = leerDatosEHH();
  if (d.peso === null) { toast("Introduce el peso del paciente.", true); return; }
  const o = calcularEHH(d);
  const ecfg = EHH_CFG;
  _ultimoEHH = { d, o };
  const cont = document.getElementById("ehh-resultado");

  function card(titulo, num, sub, lineas, color) {
    return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-ehh)") + '">' +
      "<h3>" + escHtml(titulo) + "</h3>" +
      (num ? '<div class="dosis-grande">' + num + (sub ? " <small>" + escHtml(sub) + "</small>" : "") + "</div>" : "") +
      (lineas && lineas.length ? '<ul class="trat-list">' + lineas.map(l => "<li>" + l + "</li>").join("") + "</ul>" : "") +
      "</div>";
  }
  function datosCalculados() {
    const items = [];
    const add = (lab, val, u) => { if (val !== null && val !== undefined) items.push([lab, val, u]); };
    add("Osmolalidad efectiva", o.osmEf !== null ? fmt(o.osmEf, 0) : null, "mOsm/kg");
    add("Osmolaridad plasmática total", o.osmTotal !== null ? fmt(o.osmTotal, 0) : null, "mOsm/l");
    add("Sodio corregido", o.naCorr !== null ? fmt(o.naCorr, 0) : null, "mEq/l");
    add("Agua corporal total", o.act !== null ? fmt(o.act, 1) : null, "litros");
    add("Déficit de agua", o.defAgua !== null ? fmt(o.defAgua, 1) : null, "litros");
    add("Pérdidas estimadas (25 ml/kg)", o.perdidas !== null ? fmt(o.perdidas, 1) : null, "litros");
    add("Déficit total de agua", o.defTotal !== null ? fmt(o.defTotal, 1) : null, "litros");
    const filas = items.map(it => '<div class="dato-item"><span class="dato-lab">' + escHtml(it[0]) + '</span><span class="dato-val">' + it[1] + " <small>" + escHtml(it[2]) + "</small></span></div>").join("");
    return '<div class="datos-card"><h3>Datos calculados</h3><div class="datos-grid">' + filas + "</div>" +
      '<p class="datos-pie">Corrección LENTA: descenso de la osmolalidad ' + ecfg.osm_descenso_min + "-" + ecfg.osm_descenso_max + " mOsm/kg/h. Resolución cuando osmolalidad ≤ " + ecfg.osm_resolucion + " mOsm/kg y el paciente esté alerta.</p></div>";
  }

  // Fluidos
  const fluidoLineas = [];
  if (o.cautelaFluidos) fluidoLineas.push("⚠️ <b>" + escHtml(o.motivoCautela.join(" / ")) + ":</b> fluidoterapia más prudente — ritmos reducidos y reevaluación frecuente (vigilar sobrecarga / edema agudo de pulmón).");
  if (d.shock) fluidoLineas.push("<b>Shock / TA &lt; 90:</b> bolo de <b>" + CAD_CFG.bolo_shock_ml + " ml</b> de SSF 0,9% en 10-15 min; repetir hasta TA sistólica &gt; 90 mmHg (valorar expansores).");
  fluidoLineas.push("<b>1.ª hora:</b> SSF 0,9% <b>" + fmt(o.fluido1hMin, 0) + "-" + fmt(o.fluido1hMax, 0) + " ml</b> (≈" + fmt(o.fluido1hMlkgMin, 0) + "-" + fmt(o.fluido1hMlkgMax, 0) + " ml/kg).");
  fluidoLineas.push("<b>Mantenimiento:</b> " + (o.usar045 ? "salino 0,45%" : "SSF 0,9%") + " a <b>" + o.ritmoMin + "-" + o.ritmoMax + " ml/h</b>" + (o.naCorr !== null ? " (Na corregido " + fmt(o.naCorr, 0) + " mEq/l" + (o.usar045 ? ", ≥135 → hiposalino" : "") + ")" : "") + ". Objetivo: descenso LENTO de la osmolalidad (" + ecfg.osm_descenso_min + "-" + ecfg.osm_descenso_max + " mOsm/kg/h) y del sodio.");
  fluidoLineas.push("<b>Al bajar la glucemia a ≤ " + ecfg.glu_anadir_glucosa + " mg/dl:</b> añadir suero glucosado 5-10%, manteniendo la glucemia en " + ecfg.glu_objetivo_min + "-" + ecfg.glu_objetivo_max + " mg/dl hasta normalizar la osmolalidad.");

  // Insulina (dosis baja, condicional)
  const insLineas = [
    "Indicada <b>si hay cetonemia significativa</b>" + (o.cetonemia ? " (β-OHB " + fmt(d.bhb, 1) + " mmol/l → SÍ indicada)" : (d.bhb !== null ? " (β-OHB " + fmt(d.bhb, 1) + " mmol/l)" : "") + "") + " <b>o cuando la glucemia deja de bajar solo con fluidos</b>.",
    "Perfusión de insulina rápida <b>" + fmt(o.insMin, 1) + "-" + fmt(o.insMax, 1) + " UI/h</b> (0,05-0,1 UI/kg/h). Preparación: 50 UI en 50 ml de SSF (1 UI/ml).",
    "<b>Objetivo:</b> glucemia " + ecfg.glu_objetivo_min + "-" + ecfg.glu_objetivo_max + " mg/dl hasta que se normalicen la osmolalidad y el nivel de consciencia. No descender la glucemia bruscamente."
  ];

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-ehh)">' +
      '<div class="result-kicker">Tratamiento calculado · ' + fmt(d.peso) + " kg</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Estado hiperglucémico hiperosmolar</div>' +
      '<p class="result-explica">Reposición de volumen con corrección LENTA de la osmolalidad, insulina a dosis baja y profilaxis de trombosis. Verifica cada dosis y ritmo.</p>' +
    "</div>" +
    datosCalculados() +
    card("1 · Fluidoterapia (lenta)", null, null, fluidoLineas, "var(--c-hipo)") +
    card("2 · Insulina (dosis baja)", fmt(o.insMin, 1) + "-" + fmt(o.insMax, 1) + " UI/h", "0,05-0,1 UI/kg/h", insLineas, "var(--c-insulina)") +
    card("3 · Potasio (K⁺)", null, null, [escHtml(o.k.txt) + (o.k.nivel === "normal" || o.k.nivel === "bajo" ? " Requiere diuresis adecuada (~50 ml/h)." : "")], "var(--violet)") +
    card("4 · Profilaxis de trombosis", null, null, ["Riesgo trombótico ALTO: HBPM a dosis profiláctica salvo contraindicación.", "Considerar dosis ajustada al peso y la función renal."], "var(--c-cad)") +
    card("Monitorización y resolución", null, null, [
      "Glucemia horaria; osmolalidad, iones (sobre todo K⁺) y función renal cada 2-4 h.",
      "Resolución: osmolalidad ≤ " + ecfg.osm_resolucion + " mOsm/kg y paciente alerta (suele tardar &gt; 24 h).",
      "Buscar y tratar el precipitante (infección frecuente). Después, transición a insulina SC."
    ], "var(--brand)") +
    '<div class="acciones-result">' +
      '<button class="btn btn-primario" id="btn-ehh-a-sc">Planificar insulinización SC →</button>' +
      '<button class="btn btn-secundario" id="btn-recalcular-ehh">Recalcular</button>' +
    "</div>" +
    App.informe.bloque(construirInformeEHH());

  document.getElementById("btn-recalcular-ehh").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.getElementById("btn-ehh-a-sc").addEventListener("click", () => {
    App.estado.paciente = { peso: d.peso, glu: d.glu };
    App.navegar("#/glucemia/insulina-sc");
  });
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInformeEHH() {
  if (!_ultimoEHH) return "";
  const { d, o } = _ultimoEHH;
  const ecfg = EHH_CFG;
  let t = App.informe.cabecera("ESTADO HIPERGLUCÉMICO HIPEROSMOLAR — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Peso: " + fmt(d.peso) + " kg";
  if (d.glu !== null) t += " · Glucemia: " + fmt(d.glu, 0) + " mg/dl";
  if (d.na !== null) t += " · Na: " + fmt(d.na, 0);
  if (d.k !== null) t += " · K: " + fmt(d.k, 1);
  if (o.naCorr !== null) t += " · Na corregido: " + fmt(o.naCorr, 0);
  const sit = [];
  if (d.shock) sit.push("shock/TA<90"); if (d.consciencia) sit.push("alt. consciencia"); if (d.oliguria) sit.push("oligoanuria");
  if (d.ic) sit.push("insuf. cardíaca"); if (d.erc) sit.push("ERC" + (d.fge !== null ? " (FGe " + fmt(d.fge, 0) + ")" : ""));
  if (sit.length) t += "\n  - " + sit.join(", ");
  t += "\n\nDATOS CALCULADOS\n";
  if (o.osmEf !== null) t += "  - Osmolalidad efectiva: " + fmt(o.osmEf, 0) + " mOsm/kg\n";
  if (o.osmTotal !== null) t += "  - Osmolaridad plasmática total: " + fmt(o.osmTotal, 0) + " mOsm/l\n";
  if (o.naCorr !== null) t += "  - Sodio corregido: " + fmt(o.naCorr, 0) + " mEq/l\n";
  if (o.act !== null) t += "  - Agua corporal total: " + fmt(o.act, 1) + " l\n";
  if (o.defAgua !== null) t += "  - Déficit de agua: " + fmt(o.defAgua, 1) + " l\n";
  if (o.defTotal !== null) t += "  - Déficit total de agua: " + fmt(o.defTotal, 1) + " l\n";
  t += "\n1) FLUIDOTERAPIA (LENTA)\n";
  if (o.cautelaFluidos) t += "  - " + o.motivoCautela.join(" / ") + ": ritmos reducidos, vigilar sobrecarga.\n";
  if (d.shock) t += "  - Shock/TA<90: bolo " + CAD_CFG.bolo_shock_ml + " ml SSF 0,9%, repetir hasta TA>90 (valorar expansores).\n";
  t += "  - 1.ª hora: SSF 0,9% " + fmt(o.fluido1hMin, 0) + "-" + fmt(o.fluido1hMax, 0) + " ml (" + fmt(o.fluido1hMlkgMin, 0) + "-" + fmt(o.fluido1hMlkgMax, 0) + " ml/kg).\n";
  t += "  - Mantenimiento: " + (o.usar045 ? "salino 0,45%" : "SSF 0,9%") + " " + o.ritmoMin + "-" + o.ritmoMax + " ml/h. Descenso LENTO de osmolalidad " + ecfg.osm_descenso_min + "-" + ecfg.osm_descenso_max + " mOsm/kg/h.\n";
  t += "  - Glucemia <= " + ecfg.glu_anadir_glucosa + " mg/dl: añadir glucosado (objetivo " + ecfg.glu_objetivo_min + "-" + ecfg.glu_objetivo_max + ").\n";
  t += "\n2) INSULINA (DOSIS BAJA)\n";
  t += "  - Solo si cetonemia significativa o si la glucemia deja de bajar con fluidos: " + fmt(o.insMin, 1) + "-" + fmt(o.insMax, 1) + " UI/h (0,05-0,1 UI/kg/h).\n";
  t += "  - Objetivo glucemia " + ecfg.glu_objetivo_min + "-" + ecfg.glu_objetivo_max + " mg/dl.\n";
  t += "\n3) POTASIO\n  - " + o.k.txt + "\n";
  t += "\n4) PROFILAXIS DE TROMBOSIS\n  - Riesgo alto: HBPM profiláctica salvo contraindicación.\n";
  t += "\nMONITORIZACIÓN Y RESOLUCIÓN\n  - Glucemia horaria; osmolalidad/iones/función renal cada 2-4 h. Resolución: osmolalidad <= " + ecfg.osm_resolucion + " y paciente alerta. Buscar precipitante.\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (SEEN / ADA-EASD 2024 / SAEDYN). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-calcular-ehh").addEventListener("click", renderResultadoEHH);
  const ercToggle = document.getElementById("e-erc");
  const ercExtra = document.getElementById("e-erc-extra");
  if (ercToggle && ercExtra) ercToggle.addEventListener("change", () => { ercExtra.hidden = !ercToggle.checked; });

  document.getElementById("btn-limpiar-ehh").addEventListener("click", () => {
    ["e-peso", "e-glucosa", "e-na", "e-k", "e-urea", "e-bhb", "e-fge"].forEach(id => { const e = document.getElementById(id); if (e) e.value = ""; });
    ["e-shock", "e-consciencia", "e-oliguria", "e-ic", "e-erc"].forEach(id => { const e = document.getElementById(id); if (e) e.checked = false; });
    if (ercExtra) ercExtra.hidden = true;
    document.getElementById("ehh-resultado").innerHTML = "";
    _ultimoEHH = null;
  });
});
