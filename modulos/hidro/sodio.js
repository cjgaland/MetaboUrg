// ============================================================
//  modulos/hidro/sodio.js — Trastornos del sodio
//  Diagnóstico (Na), hiponatremia e hipernatremia.
//  Por defecto guía europea 2014 (ESICM/ESE/ERA-EDTA) y guía
//  española SEN-SEEN-SEMI. Datos en NA_CFG / NA_TXT (protocolos.js).
//  Usa App, App.formulas, App.informe.
// ============================================================

App.registrarRuta("/hidro/diagnostico",   { view: "view-hidro-dx" });
App.registrarRuta("/hidro/hiponatremia",   { view: "view-hiponatremia", onShow: prefillHipoNa });
App.registrarRuta("/hidro/hipernatremia",  { view: "view-hipernatremia", onShow: prefillHiperNa });

// ── Utilidades comunes ─────────────────────────────────────
function redNa(n, dec) { const f = Math.pow(10, dec || 0); return Math.round(n * f) / f; }
function cardTrat(titulo, num, sub, lineas, color) {
  const g = App.util.glosar;
  return '<div class="trat-card" style="--trat-color:' + (color || "var(--c-hipo)") + '">' +
    "<h3>" + escHtml(titulo) + "</h3>" +
    (num ? '<div class="dosis-grande">' + num + (sub ? " <small>" + escHtml(sub) + "</small>" : "") + "</div>" : "") +
    (lineas && lineas.length ? '<ul class="trat-list">' + lineas.map(l => "<li>" + g(l) + "</li>").join("") + "</ul>" : "") +
    "</div>";
}
function setVal(id, v) { const e = document.getElementById(id); if (e && v !== null && v !== undefined) e.value = (typeof v === "number" ? String(v).replace(".", ",") : v); }
function chkVal(id) { const e = document.getElementById(id); return e ? e.checked : false; }

// ============================================================
//  1 · DIAGNÓSTICO (Na)
// ============================================================
let _ultimoDN = null;
function leerDN() {
  return {
    na: parseNum("dn-na"), peso: parseNum("dn-peso"), glu: parseNum("dn-glu"),
    osmu: parseNum("dn-osmu"), nau: parseNum("dn-nau"),
    volemia: document.getElementById("dn-volemia").value,
    graves: chkVal("dn-graves"), agudo: chkVal("dn-agudo")
  };
}
function evaluarSodio(d) {
  const has = v => v !== null && v !== undefined;
  const o = { avisos: [], orienta: [] };
  if (!has(d.na)) return o;
  o.naCorr = has(d.glu) ? App.formulas.naCorregido(d.na, d.glu) : null;

  if (d.na > NA_CFG.hiper) {
    o.tipo = "hiper";
    o.nombre = "Hipernatremia";
    o.severidad = d.graves ? "grave" : null;
    o.destino = { nombre: "Hipernatremia", hash: "#/hidro/hipernatremia" };
    o.orienta.push(NA_TXT.hiper_causas);
  } else if (d.na < NA_CFG.normal_min) {
    o.tipo = "hipo";
    o.nombre = "Hiponatremia";
    o.gravBioq = d.na >= NA_CFG.hipo_leve_min ? "leve" : (d.na >= NA_CFG.hipo_mod_min ? "moderada" : "profunda");
    o.severidad = d.graves ? "grave" : "no-grave";
    o.destino = { nombre: "Hiponatremia", hash: "#/hidro/hiponatremia" };
    // Pseudohiponatremia / hiperglucemia
    if (has(d.glu) && d.glu > 200 && o.naCorr !== null && o.naCorr >= NA_CFG.normal_min) {
      o.avisos.push({ nivel: "amber", txt: "Hiponatremia por hiperglucemia: el Na corregido es " + fmt(o.naCorr, 0) + " mmol/l (normal). Corrige la glucemia; no es una hiponatremia verdadera." });
    } else if (has(d.glu) && o.naCorr !== null && o.naCorr - d.na >= 2) {
      o.avisos.push({ nivel: "amber", txt: "Hay hiperglucemia: el Na corregido es " + fmt(o.naCorr, 0) + " mmol/l. Interpreta la hiponatremia con el Na corregido." });
    }
    // Orientación por orina
    if (has(d.osmu)) {
      if (d.osmu <= 100) o.orienta.push(NA_TXT.orina_hipo.dilucion);
      else if (has(d.nau)) o.orienta.push(d.nau < 30 ? NA_TXT.orina_hipo.naBajo : NA_TXT.orina_hipo.naAlto);
    }
  } else {
    o.tipo = "normal";
    o.nombre = "Sodio normal";
  }
  return o;
}
function renderDN() {
  const d = leerDN();
  if (d.na === null) { toast("Introduce el sodio (Na⁺).", true); return; }
  const o = evaluarSodio(d);
  _ultimoDN = { d, o };
  const cont = document.getElementById("dn-resultado");

  const color = o.tipo === "hiper" ? "var(--c-ehh)" : (o.tipo === "hipo" ? "var(--c-hipo)" : "var(--text-2)");
  let sub = "";
  if (o.tipo === "hipo") sub = "Na " + fmt(d.na, 0) + " mmol/l · " + ({ leve: "leve (130-134)", moderada: "moderada (125-129)", profunda: "profunda (< 125)" }[o.gravBioq]) + (d.graves ? " · SÍNTOMAS GRAVES" : "");
  else if (o.tipo === "hiper") sub = "Na " + fmt(d.na, 0) + " mmol/l" + (d.graves ? " · SÍNTOMAS GRAVES" : "");
  else sub = "Na " + fmt(d.na, 0) + " mmol/l (135-145)";

  const avisos = o.avisos.map(a => '<div class="alert alert-' + a.nivel + '"><span>' + (a.nivel === "red" ? "⚠️" : "ℹ️") + "</span><span>" + escHtml(a.txt) + "</span></div>").join("");
  const orienta = o.orienta.length ? cardTrat("Orientación causal", null, null, o.orienta.map(escHtml), color) : "";

  let acciones = '<div class="acciones-result">';
  if (o.destino) acciones += '<button class="btn btn-primario" id="btn-dn-ir">Ir a ' + escHtml(o.destino.nombre) + " →</button>";
  acciones += '<button class="btn btn-secundario" id="btn-dn-recal">Recalcular</button></div>';

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:' + color + '">' +
      '<div class="result-kicker">Resultado</div>' +
      '<div class="result-dx" style="font-size:1.2rem">' + escHtml(o.nombre) + "</div>" +
      '<p class="result-explica">' + escHtml(sub) + "</p>" +
    "</div>" +
    avisos +
    (o.destino ? '<div class="result-reco"><span class="result-reco-ic">→</span><span>Módulo recomendado: <b>' + escHtml(o.destino.nombre) + "</b>" + (d.graves ? " — síntomas graves: trátalo como urgencia." : "") + "</span></div>" : "") +
    orienta +
    acciones +
    App.informe.bloque(informeDN());

  document.getElementById("btn-dn-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const ir = document.getElementById("btn-dn-ir");
  if (ir) ir.addEventListener("click", () => { App.estado.paciente = { na: d.na, peso: d.peso, graves: d.graves, volemia: d.volemia, agudo: d.agudo }; App.navegar(o.destino.hash); });
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeDN() {
  if (!_ultimoDN) return "";
  const { d, o } = _ultimoDN;
  let t = App.informe.cabecera("TRASTORNO DEL SODIO — VALORACIÓN") + "\n";
  t += "DATOS\n  - Sodio: " + fmt(d.na, 0) + " mmol/l\n";
  if (d.glu !== null) t += "  - Glucemia: " + fmt(d.glu, 0) + " mg/dl" + (o.naCorr !== null ? " (Na corregido " + fmt(o.naCorr, 0) + ")" : "") + "\n";
  if (d.osmu !== null) t += "  - Osmolalidad urinaria: " + fmt(d.osmu, 0) + " mOsm/kg\n";
  if (d.nau !== null) t += "  - Na urinario: " + fmt(d.nau, 0) + " mmol/l\n";
  if (d.volemia) t += "  - Estado de volumen: " + d.volemia + "\n";
  if (d.graves) t += "  - Síntomas graves\n";
  t += "\nRESULTADO\n  " + o.nombre + "\n";
  o.orienta.forEach(x => { t += "  - " + x + "\n"; });
  o.avisos.forEach(a => { t += "  ! " + a.txt + "\n"; });
  t += "\n" + App.informe.SEP + "\nApoyo clínico (guía europea 2014 / SEN-SEEN-SEMI). Verificar por el facultativo.\n";
  return t;
}

// ============================================================
//  2 · HIPONATREMIA (tratamiento)
// ============================================================
function prefillHipoNa() {
  const p = App.estado.paciente;
  if (!p) return;
  setVal("ho-na", p.na); setVal("ho-peso", p.peso);
  const g = document.getElementById("ho-graves"); if (g) g.checked = !!p.graves;
  const v = document.getElementById("ho-volemia"); if (v && p.volemia) v.value = p.volemia;
  const a = document.getElementById("ho-agudo"); if (a) a.checked = !!p.agudo;
  App.estado.paciente = null;
}
let _ultimoHO = null;
function leerHO() {
  return {
    na: parseNum("ho-na"), peso: parseNum("ho-peso"),
    graves: chkVal("ho-graves"), riesgo: chkVal("ho-riesgo"),
    volemia: document.getElementById("ho-volemia").value, agudo: chkVal("ho-agudo")
  };
}
function calcularHO(d) {
  const cfg = NA_CFG, has = v => v !== null && v !== undefined, o = {};
  o.gravBioq = d.na >= cfg.hipo_leve_min ? "leve" : (d.na >= cfg.hipo_mod_min ? "moderada" : "profunda");
  o.lim24 = d.riesgo ? cfg.limite_24h_riesgo : cfg.limite_24h;
  o.techo24 = has(d.na) ? d.na + o.lim24 : null;          // no superar este Na a las 24 h
  o.techo48 = has(d.na) ? d.na + o.lim24 + cfg.limite_48h : null;
  o.htsMlkg = has(d.peso) ? redNa(cfg.hts_mlkg * d.peso, 0) : null;
  o.causa = NA_TXT.causas_hipo[d.volemia] || null;
  // Ritmo SSF 0,9% si hipovolémica (ml/h) y déficit de Na (mEq) repartido a 12/24 h
  if (has(d.peso)) {
    o.ssfMlhMin = redNa(cfg.ssf_hipo_mlkgh_min * d.peso, 0);
    o.ssfMlhMax = redNa(cfg.ssf_hipo_mlkgh_max * d.peso, 0);
    // ACT (varón adulto 0,6 por defecto; orientativo)
    const act = App.formulas.aguaCorporalTotal(d.peso, cfg.act_varon);
    // Déficit de Na hasta el techo seguro (no hasta 140; nunca subir > lim24 en 24h)
    const naObj = Math.min(cfg.hipo_leve_min, d.na + o.lim24);
    o.defNa = Math.round((naObj - d.na) * act);
    o.defNaMitad = Math.round(o.defNa / 2);
    o.naObj = naObj;
    o.act = act;
    // SSH 3% (preparado casero) lleva ~514 mEq/l → ml/h para mitad en 12 h
    o.ssh3_mlh_12h = Math.round((o.defNaMitad / 514) * 1000 / 12);
    o.ssh3_mlh_24h = Math.round((o.defNaMitad / 514) * 1000 / 24);
  }
  return o;
}
function renderHO() {
  const d = leerHO();
  if (d.na === null) { toast("Introduce el sodio (Na⁺).", true); return; }
  const cfg = NA_CFG;
  const o = calcularHO(d);
  _ultimoHO = { d, o };
  const cont = document.getElementById("ho-resultado");

  // Tarjeta de urgencia (síntomas graves): salino hipertónico 3%
  let urgencia = "";
  let preparacion = "";
  if (d.graves) {
    urgencia = cardTrat("⚠️ Síntomas graves — salino hipertónico 3%", fmt(cfg.hts_ml, 0) + " ml", "en " + cfg.hts_min + " min" + (o.htsMlkg ? " (≈ " + fmt(o.htsMlkg, 0) + " ml = 2 ml/kg)" : ""), [
      "<b>Bolo de " + cfg.hts_ml + " ml de SSH 3% IV en " + cfg.hts_min + " min</b> (alternativa: 2 ml/kg). Puede repetirse hasta <b>2-3 veces</b>.",
      "<b>Objetivo:</b> subir el Na <b>+" + cfg.hts_objetivo_1h + " mmol/l</b> en la 1.ª hora o hasta que mejoren los síntomas; después, frenar.",
      "Control de Na <b>cada " + cfg.control_na_h + " h</b> mientras se administra."
    ], "var(--c-cad)");
    // Preparación casera del SSH 3% si no se dispone del comercial
    preparacion = cardTrat("Preparar SSH 3% (si no hay comercial)", null, null, [
      "<b>SSF 0,9% " + cfg.ssh3_ssf_ml + " ml + " + cfg.ssh3_clna_amp + " amp de ClNa 20% (" + cfg.ssh3_clna_ml + " ml/amp)</b> → <b>" + cfg.ssh3_total_ml + " ml ≈ " + cfg.ssh3_total_meq + " mEq de Na (≈ 3%)</b>.",
      "De ahí se extraen los " + cfg.hts_ml + " ml del bolo. La bolsa preparada cubre 2-3 bolos.",
      "Si se opta por perfusión lenta en lugar de bolos: ajustar el ritmo al ascenso objetivo de Na (no superar los límites de 24 h)."
    ], "var(--c-cad)");
  }

  // Límites de seguridad (siempre)
  const limites = cardTrat("Límites de seguridad (evitar mielinólisis)", null, null, [
    "No superar un ascenso de <b>+" + o.lim24 + " mmol/l en 24 h</b>" + (o.techo24 !== null ? " → no pasar de <b>Na " + fmt(o.techo24, 0) + " mmol/l</b> a las 24 h" : "") + ", ni <b>+" + cfg.limite_48h + " mmol/l</b> en cada 24 h siguientes" + (o.techo48 !== null ? " (≈ " + fmt(o.techo48, 0) + " mmol/l a las 48 h)" : "") + ".",
    "<b>Alto riesgo</b> de desmielinización (" + escHtml(cfg.riesgo_odso) + "): limitar a <b>+" + cfg.limite_24h_riesgo + " mmol/l/24 h</b>." + (d.riesgo ? " <b>(activado)</b>" : ""),
    "Si se sobrecorrige, <b>re-bajar el Na</b> con suero glucosado 5% ± desmopresina.",
    (d.agudo ? "Hiponatremia aguda (< 48 h): menor riesgo de mielinólisis, pero respeta los límites igualmente." : "Hiponatremia crónica o de tiempo desconocido: máxima cautela con la velocidad.")
  ], "var(--violet)");

  // Manejo por causa / volumen (mismo nivel que el tratamiento)
  let causa = "";
  if (o.causa) {
    const lineas = o.causa.manejo.map(escHtml);
    // Si es hipovolémica y hay peso: añadir ritmo SSF concreto en ml/h
    if (d.volemia === "hipovolemia" && o.ssfMlhMin) {
      lineas.unshift("<b>Ritmo orientativo de SSF 0,9%: " + o.ssfMlhMin + "-" + o.ssfMlhMax + " ml/h</b> (0,5-1 ml/kg/h, " + fmt(d.peso, 0) + " kg). Reevaluar el Na cada 4-6 h y bajar el ritmo en cuanto suba.");
    }
    causa = cardTrat("Manejo según la causa — " + o.causa.titulo, null, null, lineas, "var(--c-hipo)");
  } else {
    causa = cardTrat("Manejo según la causa", null, null, [
      "Selecciona el <b>estado de volumen</b> para ver el manejo dirigido.",
      "Orientación: osmolalidad y Na en orina + volemia clínica (ver módulo de Diagnóstico)."
    ], "var(--c-hipo)");
  }

  // Déficit de Na y ritmo de SSH 3% para perfusión lenta (si hay peso)
  let deficit = "";
  if (o.defNa) {
    deficit = cardTrat("Déficit de Na y ritmo de perfusión lenta", fmt(o.defNa, 0) + " mEq", "déficit hasta Na " + fmt(o.naObj, 0) + " (techo seguro 24 h)", [
      "Déficit de Na = (Na objetivo − Na actual) × ACT = (" + fmt(o.naObj, 0) + " − " + fmt(d.na, 0) + ") × " + fmt(o.act, 1) + " l = <b>" + fmt(o.defNa, 0) + " mEq</b>.",
      "Estrategia clásica: reponer la <b>mitad (" + fmt(o.defNaMitad, 0) + " mEq) en 12 h</b>, el resto en las siguientes 24 h.",
      "Con <b>SSH 3% casero</b> (≈ 514 mEq/l): ritmo ≈ <b>" + o.ssh3_mlh_12h + " ml/h en las primeras 12 h</b>, después ≈ <b>" + o.ssh3_mlh_24h + " ml/h</b> durante 24 h.",
      "Es una guía: el ritmo real se ajusta a los controles seriados de Na (cada " + cfg.control_na_h + " h) y a los límites de seguridad."
    ], "var(--brand)");
  }

  const etiqueta = { leve: "leve (130-134)", moderada: "moderada (125-129)", profunda: "profunda (< 125)" }[o.gravBioq];

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">Hiponatremia' + (d.graves ? " · urgencia" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Na ' + fmt(d.na, 0) + " mmol/l — " + etiqueta + "</div>" +
      '<p class="result-explica">' + (d.graves ? "Con síntomas graves prima el tratamiento urgente con salino hipertónico, respetando los límites de ascenso." : "Sin síntomas graves: corrección lenta y dirigida a la causa, respetando los límites de ascenso.") + "</p>" +
    "</div>" +
    urgencia + preparacion + deficit + limites + causa +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-ho-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHO());

  document.getElementById("btn-ho-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHO() {
  if (!_ultimoHO) return "";
  const { d, o } = _ultimoHO;
  const cfg = NA_CFG;
  let t = App.informe.cabecera("HIPONATREMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Sodio: " + fmt(d.na, 0) + " mmol/l (" + o.gravBioq + ")" + (d.peso !== null ? " · Peso: " + fmt(d.peso, 0) + " kg" : "") + "\n";
  t += "  - " + (d.graves ? "Síntomas graves" : "Sin síntomas graves") + (d.riesgo ? " · alto riesgo de mielinólisis" : "") + (d.agudo ? " · aguda (<48h)" : " · crónica/desconocida") + "\n";
  if (d.graves) {
    t += "\nURGENCIA — SALINO HIPERTÓNICO 3%\n";
    t += "  - Bolo de " + cfg.hts_ml + " ml SSH 3% IV en " + cfg.hts_min + " min" + (o.htsMlkg ? " (≈" + fmt(o.htsMlkg, 0) + " ml = 2 ml/kg)" : "") + ", repetible 2-3 veces.\n";
    t += "  - Objetivo: subir Na +" + cfg.hts_objetivo_1h + " mmol/l en la 1.ª hora o hasta mejorar. Control de Na cada " + cfg.control_na_h + " h.\n";
    t += "  - Preparación SSH 3% (si no hay comercial): SSF 0,9% " + cfg.ssh3_ssf_ml + " ml + " + cfg.ssh3_clna_amp + " amp ClNa 20% (" + cfg.ssh3_clna_ml + " ml) → " + cfg.ssh3_total_ml + " ml ≈ " + cfg.ssh3_total_meq + " mEq Na.\n";
  }
  if (o.defNa) {
    t += "\nDÉFICIT DE NA Y RITMO\n";
    t += "  - Déficit ≈ " + fmt(o.defNa, 0) + " mEq hasta Na " + fmt(o.naObj, 0) + " (techo seguro 24 h).\n";
    t += "  - Reponer la mitad (" + fmt(o.defNaMitad, 0) + " mEq) en 12 h y el resto en 24 h.\n";
    t += "  - Con SSH 3% (≈514 mEq/l): ~" + o.ssh3_mlh_12h + " ml/h x 12 h, luego ~" + o.ssh3_mlh_24h + " ml/h x 24 h.\n";
    if (d.volemia === "hipovolemia") t += "  - SSF 0,9% en hipovolémica: " + o.ssfMlhMin + "-" + o.ssfMlhMax + " ml/h (0,5-1 ml/kg/h).\n";
  }
  t += "\nLÍMITES DE SEGURIDAD\n";
  t += "  - Máximo +" + o.lim24 + " mmol/l/24 h" + (o.techo24 !== null ? " (no pasar de Na " + fmt(o.techo24, 0) + ")" : "") + " y +" + cfg.limite_48h + " mmol/l en cada 24 h siguientes.\n";
  t += "  - Si sobrecorrige: re-bajar con glucosado 5% ± desmopresina.\n";
  if (o.causa) { t += "\nMANEJO SEGÚN LA CAUSA — " + o.causa.titulo + "\n"; o.causa.manejo.forEach(x => { t += "  - " + x + "\n"; }); }
  t += "\n" + App.informe.SEP + "\nApoyo clínico (guía europea 2014 / SEN-SEEN-SEMI). Verificar por el facultativo.\n";
  return t;
}

// ============================================================
//  3 · HIPERNATREMIA (tratamiento)
// ============================================================
function prefillHiperNa() {
  const p = App.estado.paciente;
  if (!p) return;
  setVal("he-na", p.na); setVal("he-peso", p.peso);
  const a = document.getElementById("he-agudo"); if (a) a.checked = !!p.agudo;
  App.estado.paciente = null;
}
let _ultimoHE = null;
function leerHE() {
  return {
    na: parseNum("he-na"), peso: parseNum("he-peso"),
    sexo: document.getElementById("he-sexo").value, anciano: chkVal("he-anciano"),
    agudo: chkVal("he-agudo"), oral: chkVal("he-oral"), shock: chkVal("he-shock")
  };
}
function calcularHE(d) {
  const cfg = NA_CFG, has = v => v !== null && v !== undefined, o = {};
  o.factor = d.sexo === "mujer" ? (d.anciano ? cfg.act_anciano_mujer : cfg.act_mujer)
                                : (d.anciano ? cfg.act_anciano_varon : cfg.act_varon);
  o.act = has(d.peso) ? App.formulas.aguaCorporalTotal(d.peso, o.factor) : null;
  o.defAgua = (has(d.na) && o.act !== null) ? App.formulas.deficitAgua(d.na, cfg.na_deseado, o.act) : null;
  // Descenso máximo y tiempo de reposición
  o.descensoDia = cfg.hiper_limite_dia;
  o.diasReposicion = (has(d.na)) ? Math.max(1, Math.ceil((d.na - cfg.na_deseado) / cfg.hiper_limite_dia)) : null;
  // Adrogué-Madias: cambio de Na con 1 L de glucosado 5%
  o.deltaNaPorLitro = (o.act !== null && has(d.na)) ? (cfg.na_glucosado5 - d.na) / (o.act + 1) : null;
  // Volumen de agua/día orientativo: déficit repartido en 48-72 h + mantenimiento + pérdidas insensibles
  if (o.defAgua !== null && o.defAgua > 0) {
    const extra = cfg.mantenimiento_ml_dia + cfg.perdidas_insensibles_ml_dia;
    o.aguaDiaMin = redNa((o.defAgua * 1000) / (cfg.hiper_h_max / 24) + extra, 0); // 72 h
    o.aguaDiaMax = redNa((o.defAgua * 1000) / (cfg.hiper_h_min / 24) + extra, 0); // 48 h
    // Ritmos ml/h redondeados (estrategia mitad/mitad)
    o.mlh48 = redNa(o.aguaDiaMax / 24, 0);
    o.mlh72 = redNa(o.aguaDiaMin / 24, 0);
    o.mantTotal = extra;
  }
  return o;
}
function renderHE() {
  const d = leerHE();
  if (d.na === null) { toast("Introduce el sodio (Na⁺).", true); return; }
  if (d.peso === null) { toast("Introduce el peso.", true); return; }
  const cfg = NA_CFG;
  const o = calcularHE(d);
  _ultimoHE = { d, o };
  const cont = document.getElementById("he-resultado");

  // Datos calculados
  const datos = cardTrat("Cálculo del déficit de agua", o.defAgua !== null ? fmt(o.defAgua, 1) + " l" : "—", "déficit de agua libre", [
    "Agua corporal total ≈ <b>" + fmt(o.act, 1) + " l</b> (" + fmt(o.factor, 2) + " × peso" + (d.anciano ? ", anciano" : "") + ").",
    "Déficit de agua libre = ACT × (Na/140 − 1) = <b>" + fmt(o.defAgua, 1) + " l</b> (sin contar pérdidas en curso).",
    "Con 1 l de glucosado 5%, el Na baja ≈ <b>" + fmt(Math.abs(o.deltaNaPorLitro), 1) + " mmol/l</b> (Adrogué-Madias)."
  ], "var(--brand)");

  // Velocidad / objetivo
  const velocidad = cardTrat("Velocidad de corrección", null, null, [
    (d.agudo ? "Hipernatremia aguda (< 48 h): puede corregirse más rápido (hasta ~1 mmol/l/h)." : "Hipernatremia crónica o de tiempo desconocido: descenso máximo <b>" + cfg.hiper_limite_dia + " mmol/l/día</b> (~" + fmt(cfg.hiper_limite_h, 1) + " mmol/l/h) para evitar edema cerebral."),
    "Reponer el déficit en <b>" + cfg.hiper_h_min + "-" + cfg.hiper_h_max + " h</b>" + (o.diasReposicion ? " (≈ " + o.diasReposicion + " día(s) hasta Na 140)" : "") + ", sumando las pérdidas en curso y las necesidades basales.",
    "Controlar el Na cada <b>4-6 h</b> y ajustar el ritmo."
  ], "var(--violet)");

  // Fluidos
  const fluidoLineas = [];
  if (d.shock) fluidoLineas.push("⚠️ <b>Inestabilidad / hipovolemia:</b> corrige primero con <b>SSF 0,9%</b> hasta estabilizar; después pasa a reponer agua libre.");
  fluidoLineas.push(d.oral ? "<b>Vía oral / SNG con agua</b> es de elección si el paciente tolera (la más fisiológica)." : "Sin vía oral disponible: reponer por vía IV.");
  if (o.aguaDiaMin) {
    fluidoLineas.push("IV: <b>suero glucosado 5%</b> (aporta agua libre). Volumen total/día = déficit + mantenimiento (" + fmt(cfg.mantenimiento_ml_dia, 0) + " ml) + pérdidas insensibles (" + fmt(cfg.perdidas_insensibles_ml_dia, 0) + " ml) ≈ <b>" + fmt(o.aguaDiaMin, 0) + "-" + fmt(o.aguaDiaMax, 0) + " ml/día</b>.");
    fluidoLineas.push("<b>Ritmo concreto:</b> ≈ <b>" + o.mlh72 + " ml/h</b> (reposición en 72 h, crónica) ó ≈ <b>" + o.mlh48 + " ml/h</b> (reposición en 48 h, aguda). Reevaluar Na cada 4-6 h.");
  } else {
    fluidoLineas.push("IV: <b>suero glucosado 5%</b> (aporta agua libre).");
  }
  fluidoLineas.push("Si hay también pérdida de volumen, usar <b>salino 0,45%</b> (aporta agua y algo de Na).");
  fluidoLineas.push(NA_TXT.hiper_di);
  const fluidos = cardTrat("Fluidoterapia", null, null, fluidoLineas, "var(--c-hipo)");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-ehh)">' +
      '<div class="result-kicker">Hipernatremia · ' + fmt(d.peso, 0) + " kg</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Na ' + fmt(d.na, 0) + " mmol/l</div>" +
      '<p class="result-explica">Casi siempre déficit de agua. Reponer agua libre de forma controlada y tratar la causa. Verifica cada cálculo.</p>' +
    "</div>" +
    datos + velocidad + fluidos +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-he-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHE());

  document.getElementById("btn-he-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHE() {
  if (!_ultimoHE) return "";
  const { d, o } = _ultimoHE;
  const cfg = NA_CFG;
  let t = App.informe.cabecera("HIPERNATREMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Sodio: " + fmt(d.na, 0) + " mmol/l · Peso: " + fmt(d.peso, 0) + " kg · " + (d.sexo === "mujer" ? "mujer" : "varón") + (d.anciano ? ", anciano/a" : "") + "\n";
  t += "  - " + (d.agudo ? "Aguda (<48h)" : "Crónica/desconocida") + "\n";
  t += "\nCÁLCULO\n";
  t += "  - Agua corporal total: " + fmt(o.act, 1) + " l (" + fmt(o.factor, 2) + " x peso)\n";
  t += "  - Déficit de agua libre: " + fmt(o.defAgua, 1) + " l\n";
  t += "  - 1 l de glucosado 5% baja el Na ≈ " + fmt(Math.abs(o.deltaNaPorLitro), 1) + " mmol/l\n";
  t += "\nVELOCIDAD\n";
  t += "  - " + (d.agudo ? "Aguda: hasta ~1 mmol/l/h." : "Crónica: máx " + cfg.hiper_limite_dia + " mmol/l/día (~" + fmt(cfg.hiper_limite_h, 1) + "/h).") + " Reponer en " + cfg.hiper_h_min + "-" + cfg.hiper_h_max + " h. Control de Na cada 4-6 h.\n";
  t += "\nFLUIDOTERAPIA\n";
  if (d.shock) t += "  - Inestabilidad: SSF 0,9% primero hasta estabilizar.\n";
  t += "  - Agua oral/SNG de elección; IV glucosado 5%" + (o.aguaDiaMin ? " (~" + fmt(o.aguaDiaMin, 0) + "-" + fmt(o.aguaDiaMax, 0) + " ml/día = déficit + mantenimiento + pérdidas insensibles ~" + fmt(o.mantTotal, 0) + " ml)" : "") + "; salino 0,45% si además hipovolemia.\n";
  if (o.mlh48) t += "  - Ritmo: ~" + o.mlh72 + " ml/h (72 h, crónica) ó ~" + o.mlh48 + " ml/h (48 h, aguda).\n";
  t += "  - " + NA_TXT.hiper_di + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (StatPearls / EMCrit / guías). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  // Diagnóstico
  document.getElementById("btn-dn-calcular").addEventListener("click", renderDN);
  document.getElementById("btn-dn-limpiar").addEventListener("click", () => {
    ["dn-na", "dn-peso", "dn-glu", "dn-osmu", "dn-nau"].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("dn-volemia").value = "";
    ["dn-graves", "dn-agudo"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("dn-resultado").innerHTML = ""; _ultimoDN = null;
  });
  // Hiponatremia
  document.getElementById("btn-ho-calcular").addEventListener("click", renderHO);
  document.getElementById("btn-ho-limpiar").addEventListener("click", () => {
    ["ho-na", "ho-peso"].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("ho-volemia").value = "";
    ["ho-graves", "ho-riesgo", "ho-agudo"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("ho-resultado").innerHTML = ""; _ultimoHO = null;
  });
  // Hipernatremia
  document.getElementById("btn-he-calcular").addEventListener("click", renderHE);
  document.getElementById("btn-he-limpiar").addEventListener("click", () => {
    ["he-na", "he-peso"].forEach(id => { document.getElementById(id).value = ""; });
    document.getElementById("he-sexo").value = "varon";
    ["he-anciano", "he-agudo", "he-shock"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("he-oral").checked = true;
    document.getElementById("he-resultado").innerHTML = ""; _ultimoHE = null;
  });
});
