// ============================================================
//  modulos/endo/suprarrenal.js — Trastornos suprarrenales
//  Crisis suprarrenal, apoplejía, Addison, Cushing,
//  feocromocitoma e hiperaldosteronismo (Conn).
//  Reutiliza cardTrat / manejoCards / listaCard (tiroides.js).
//  Datos en SUPRA (protocolos.js).
// ============================================================

App.registrarRuta("/suprarrenal/crisis",          { view: "view-crisis-sr" });
App.registrarRuta("/suprarrenal/apoplejia",        { view: "view-apoplejia" });
App.registrarRuta("/suprarrenal/addison",          { view: "view-addison" });
App.registrarRuta("/suprarrenal/cushing",          { view: "view-cushing" });
App.registrarRuta("/suprarrenal/feocromocitoma",   { view: "view-feocromocitoma" });
App.registrarRuta("/suprarrenal/conn",             { view: "view-conn" });

// Informe genérico de protocolo (diagnóstico + manejo)
function informeProto(titulo, dxList, manejo, fuente, extra) {
  let t = App.informe.cabecera(titulo) + "\nDIAGNÓSTICO\n";
  dxList.forEach(x => { t += "  - " + x.replace(/<\/?b>/g, "") + "\n"; });
  t += "\nMANEJO\n";
  manejo.forEach(m => { t += "  " + m.titulo + ":\n"; m.puntos.forEach(p => { t += "    - " + p.replace(/<\/?b>/g, "") + "\n"; }); });
  if (extra) { t += "\n" + extra.titulo.replace(/[⚠️ ]+/, "") + "\n"; extra.puntos.forEach(p => { t += "  - " + p.replace(/<\/?b>/g, "") + "\n"; }); }
  t += "\n" + App.informe.SEP + "\nApoyo clínico (" + fuente + "). Verificar por el facultativo.\n";
  return t;
}

// Render genérico de un protocolo (diagnóstico + manejo + extra opcional)
function renderProto(o) {
  const c = document.getElementById(o.cont);
  c.innerHTML =
    '<div class="result-card" style="--dx-color:' + o.color + '">' +
      '<div class="result-kicker">' + escHtml(o.kicker) + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">' + escHtml(o.titulo) + "</div>" +
      '<p class="result-explica">' + escHtml(o.explica) + "</p></div>" +
    listaCard("Diagnóstico", o.dxList, "var(--brand)") +
    manejoCards(o.manejo) + (o.extra ? cardTrat(o.extra.titulo, null, null, o.extra.puntos, o.extra.color) : "") +
    '<div class="acciones-result"><button class="btn btn-secundario" id="' + o.btn + '">Recalcular</button></div>' +
    App.informe.bloque(informeProto(o.tituloInf, o.dxList, o.manejo, o.fuente, o.extra));
  document.getElementById(o.btn).addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  c.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Crisis suprarrenal aguda ───────────────────────────────
function renderCR() {
  renderProto({
    cont: "cr-resultado", btn: "btn-cr-recal", color: "var(--c-cad)",
    kicker: "Crisis suprarrenal aguda", titulo: "Insuficiencia suprarrenal aguda",
    explica: "Emergencia: hidrocortisona y fluidos sin esperar a las pruebas. Verifica cada dosis.",
    dxList: SUPRA.crisis_dx, manejo: SUPRA.crisis_tto,
    tituloInf: "CRISIS SUPRARRENAL AGUDA — MANEJO", fuente: "NICE NG243 / Society for Endocrinology"
  });
}
// ── Apoplejía suprarrenal ──────────────────────────────────
function renderAP() {
  renderProto({
    cont: "ap-resultado", btn: "btn-ap-recal", color: "var(--c-cad)",
    kicker: "Apoplejía suprarrenal", titulo: "Hemorragia/infarto suprarrenal",
    explica: "Cursa como una insuficiencia suprarrenal aguda. Hidrocortisona + fluidos y tratar la causa.",
    dxList: SUPRA.apoplejia_dx, manejo: SUPRA.apoplejia_tto,
    tituloInf: "APOPLEJÍA SUPRARRENAL — MANEJO", fuente: "StatPearls / Society for Endocrinology"
  });
}
// ── Síndrome de Addison ────────────────────────────────────
function renderAD() {
  renderProto({
    cont: "ad-resultado", btn: "btn-ad-recal", color: "var(--c-ehh)",
    kicker: "Síndrome de Addison", titulo: "Insuficiencia suprarrenal primaria crónica",
    explica: "Diagnóstico con cortisol/ACTH y cosintropina; sustitución con hidrocortisona y fludrocortisona.",
    dxList: SUPRA.addison_dx, manejo: SUPRA.addison_tto,
    tituloInf: "SÍNDROME DE ADDISON — DIAGNÓSTICO Y MANEJO", fuente: "Merck/MSD / Endocrine Society"
  });
}
// ── Síndrome de Cushing ────────────────────────────────────
function renderCU() {
  renderProto({
    cont: "cu-resultado", btn: "btn-cu-recal", color: "var(--c-hiper)",
    kicker: "Síndrome de Cushing", titulo: "Hipercortisolismo",
    explica: "Cribado con dexametasona, cortisol salival nocturno y CLU; luego ACTH y localización.",
    dxList: SUPRA.cushing_dx, manejo: SUPRA.cushing_tto,
    tituloInf: "SÍNDROME DE CUSHING — DIAGNÓSTICO Y MANEJO", fuente: "Endocrine Society / Merck"
  });
}
// ── Feocromocitoma ─────────────────────────────────────────
function renderFE() {
  const crisis = chkVal("fe-crisis");
  renderProto({
    cont: "fe-resultado", btn: "btn-fe-recal", color: "var(--violet)",
    kicker: "Feocromocitoma", titulo: "Tumor productor de catecolaminas",
    explica: "Diagnóstico con metanefrinas; bloqueo alfa ANTES que beta. Verifica cada fármaco.",
    dxList: SUPRA.feo_dx, manejo: SUPRA.feo_tto,
    extra: crisis ? SUPRA.feo_crisis : null,
    tituloInf: "FEOCROMOCITOMA — DIAGNÓSTICO Y MANEJO", fuente: "Merck/MSD / Endocrine Society"
  });
}
// ── Hiperaldosteronismo primario (Conn) ────────────────────
function renderCO() {
  renderProto({
    cont: "co-resultado", btn: "btn-co-recal", color: "var(--c-insulina)",
    kicker: "Hiperaldosteronismo primario", titulo: "Síndrome de Conn",
    explica: "Cribado con el cociente aldosterona/renina; manejo con espironolactona o adrenalectomía.",
    dxList: SUPRA.conn_dx, manejo: SUPRA.conn_tto,
    tituloInf: "HIPERALDOSTERONISMO PRIMARIO (CONN) — DIAGNÓSTICO Y MANEJO", fuente: "Endocrine Society 2025"
  });
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  const bind = (btn, fn, limpiar) => {
    document.getElementById(btn).addEventListener("click", fn);
    if (limpiar) document.getElementById(limpiar.btn).addEventListener("click", () => {
      document.getElementById(limpiar.cont).innerHTML = "";
      if (limpiar.chk) limpiar.chk.forEach(id => { const e = document.getElementById(id); if (e) e.checked = false; });
    });
  };
  bind("btn-cr-calcular", renderCR, { btn: "btn-cr-limpiar", cont: "cr-resultado" });
  bind("btn-ap-calcular", renderAP, { btn: "btn-ap-limpiar", cont: "ap-resultado" });
  bind("btn-ad-calcular", renderAD, { btn: "btn-ad-limpiar", cont: "ad-resultado" });
  bind("btn-cu-calcular", renderCU, { btn: "btn-cu-limpiar", cont: "cu-resultado" });
  bind("btn-fe-calcular", renderFE, { btn: "btn-fe-limpiar", cont: "fe-resultado", chk: ["fe-crisis"] });
  bind("btn-co-calcular", renderCO, { btn: "btn-co-limpiar", cont: "co-resultado" });
});
