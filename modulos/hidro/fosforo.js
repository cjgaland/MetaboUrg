// ============================================================
//  modulos/hidro/fosforo.js — Trastornos del fósforo
//  Hipofosfatemia e hiperfosfatemia (mg/dl).
//  Fuentes: Merck/MSD; EMCrit; Nefrología al día.
//  Datos en P_CFG / P_TXT. Reutiliza cardTrat / chkVal (sodio.js).
// ============================================================

App.registrarRuta("/hidro/hipofosfatemia",  { view: "view-hipofosfatemia" });
App.registrarRuta("/hidro/hiperfosfatemia", { view: "view-hiperfosfatemia" });

// ── Hipofosfatemia ─────────────────────────────────────────
let _ultimoLF = null;
function renderLF() {
  const cfg = P_CFG;
  const p = parseNum("lf-p"), peso = parseNum("lf-peso");
  if (p === null) { toast("Introduce el fósforo.", true); return; }
  const sintomas = chkVal("lf-sintomas"), hipok = chkVal("lf-k"), oral = chkVal("lf-oral"), realim = chkVal("lf-realim");
  const grav = p < cfg.hipo_grave ? "grave" : (p < cfg.hipo_leve ? "moderada" : "leve");
  const iv = p < cfg.hipo_grave || sintomas || !oral;
  const mmolMin = peso !== null ? Math.round(cfg.fosfato_mmolkg_min * peso) : null;
  const mmolMax = peso !== null ? Math.round(cfg.fosfato_mmolkg_max * peso) : null;
  _ultimoLF = { p, peso, sintomas, hipok, oral, realim, grav, iv, mmolMin, mmolMax };
  const cont = document.getElementById("lf-resultado");

  let repo;
  if (iv) {
    repo = cardTrat("Reposición IV (grave / sintomática)", null, null, [
      "<b>" + (hipok ? "Fosfato potásico" : "Fosfato sódico") + " " + fmt(cfg.fosfato_mmolkg_min, 2) + "-" + fmt(cfg.fosfato_mmolkg_max, 2) + " mmol/kg" + (mmolMin ? " (≈ " + mmolMin + "-" + mmolMax + " mmol)" : "") + " en " + cfg.fosfato_h + " h</b> (no más de ~" + cfg.fosfato_mgkg_max + " mg/kg/6 h).",
      "Ritmo seguro <b>" + fmt(cfg.ritmo_mmolh_min, 0) + "-" + fmt(cfg.ritmo_mmolh_max, 1) + " mmol/h</b>. " + (hipok ? "Se usa fosfato potásico por la hipopotasemia asociada." : "Fosfato potásico si hay hipopotasemia; fosfato sódico si K > 4 o ERC."),
      "Vigilar calcio, potasio y función renal (riesgo de hipocalcemia y precipitación)."
    ], "var(--c-cad)");
  } else {
    repo = cardTrat("Reposición oral (leve-moderada)", null, null, [
      "<b>Fosfato oral</b> (sales de fósforo) o aumento del aporte (lácteos).",
      "Pasar a IV si baja de 1 mg/dl, hay síntomas o no se tolera la vía oral.",
      "Vigilar la tolerancia digestiva (diarrea)."
    ], "var(--c-insulina)");
  }

  const realimCard = cardTrat("Realimentación y causa", null, null, [
    (realim ? "<b>" : "") + escHtml(P_TXT.hipo_realim) + (realim ? "</b>" : ""),
    "Buscar la causa: " + escHtml(P_TXT.hipo_causas)
  ], "var(--brand)");

  const etiqueta = { leve: "leve", moderada: "moderada", grave: "grave (< 1)" }[grav];
  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">Hipofosfatemia' + (iv ? " · IV" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">P ' + fmt(p, 1) + " mg/dl — " + etiqueta + "</div>" +
      '<p class="result-explica">Repón el fósforo según la gravedad y vigila el calcio. Verifica la dosis y el ritmo.</p></div>' +
    repo + realimCard +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-lf-recal">Recalcular</button></div>' +
    App.informe.bloque(informeLF());
  document.getElementById("btn-lf-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeLF() {
  if (!_ultimoLF) return "";
  const o = _ultimoLF, cfg = P_CFG;
  let t = App.informe.cabecera("HIPOFOSFATEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Fósforo: " + fmt(o.p, 1) + " mg/dl · " + o.grav + (o.sintomas ? " · sintomática" : "") + (o.peso !== null ? " · " + fmt(o.peso, 0) + " kg" : "") + "\n";
  if (o.iv) t += "\nREPOSICIÓN IV\n  - " + (o.hipok ? "Fosfato potásico" : "Fosfato sódico") + " " + fmt(cfg.fosfato_mmolkg_min, 2) + "-" + fmt(cfg.fosfato_mmolkg_max, 2) + " mmol/kg" + (o.mmolMin ? " (~" + o.mmolMin + "-" + o.mmolMax + " mmol)" : "") + " en " + cfg.fosfato_h + " h; ritmo " + fmt(cfg.ritmo_mmolh_min, 0) + "-" + fmt(cfg.ritmo_mmolh_max, 1) + " mmol/h. Vigilar Ca/K/renal.\n";
  else t += "\nREPOSICIÓN ORAL\n  - Fosfato oral o lácteos; pasar a IV si <1 mg/dl, síntomas o intolerancia.\n";
  t += "\nREALIMENTACIÓN/CAUSA\n  - " + P_TXT.hipo_realim + "\n  - " + P_TXT.hipo_causas + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Merck / EMCrit). Verificar por el facultativo.\n";
  return t;
}

// ── Hiperfosfatemia ────────────────────────────────────────
let _ultimoHF = null;
function renderHF() {
  const p = parseNum("hf-p");
  if (p === null) { toast("Introduce el fósforo.", true); return; }
  const erc = chkVal("hf-erc"), agudo = chkVal("hf-agudo");
  _ultimoHF = { p, erc, agudo };
  const cont = document.getElementById("hf-resultado");

  const manejo = P_TXT.hiper_manejo.slice();
  const lineas = manejo.map(escHtml);
  if (agudo) lineas[1] = "<b>" + escHtml(P_TXT.hiper_manejo[1]) + "</b>";
  if (erc) lineas[2] = "<b>" + escHtml(P_TXT.hiper_manejo[2]) + "</b>";

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-ehh)">' +
      '<div class="result-kicker">Hiperfosfatemia</div>' +
      '<div class="result-dx" style="font-size:1.2rem">P ' + fmt(p, 1) + " mg/dl</div>" +
      '<p class="result-explica">Casi siempre por ERC. Quelantes con las comidas y tratar la causa. Vigila el calcio.</p></div>' +
    cardTrat("Manejo", null, null, lineas, "var(--violet)") +
    cardTrat("Causa", null, null, ["Buscar la causa: " + escHtml(P_TXT.hiper_causas)], "var(--brand)") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-hf-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHF());
  document.getElementById("btn-hf-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHF() {
  if (!_ultimoHF) return "";
  const o = _ultimoHF;
  let t = App.informe.cabecera("HIPERFOSFATEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Fósforo: " + fmt(o.p, 1) + " mg/dl" + (o.erc ? " · ERC" : "") + (o.agudo ? " · agudo (lisis/rabdomiólisis)" : "") + "\n";
  t += "\nMANEJO\n"; P_TXT.hiper_manejo.forEach(x => { t += "  - " + x + "\n"; });
  t += "\nCAUSA\n  - " + P_TXT.hiper_causas + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Merck / Nefrología al día). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-lf-calcular").addEventListener("click", renderLF);
  document.getElementById("btn-lf-limpiar").addEventListener("click", () => {
    ["lf-p", "lf-peso"].forEach(id => { document.getElementById(id).value = ""; });
    ["lf-sintomas", "lf-k", "lf-realim"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("lf-oral").checked = true;
    document.getElementById("lf-resultado").innerHTML = ""; _ultimoLF = null;
  });
  document.getElementById("btn-hf-calcular").addEventListener("click", renderHF);
  document.getElementById("btn-hf-limpiar").addEventListener("click", () => {
    document.getElementById("hf-p").value = "";
    ["hf-erc", "hf-agudo"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("hf-resultado").innerHTML = ""; _ultimoHF = null;
  });
});
