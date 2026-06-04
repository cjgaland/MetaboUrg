// ============================================================
//  modulos/hidro/calcio.js — Trastornos del calcio
//  Hipercalcemia e hipocalcemia (mg/dl).
//  Fuentes: Endocrine Society 2023; Merck/MSD; EMCrit.
//  Datos en CA_CFG / CA_TXT. Reutiliza cardTrat / chkVal (sodio.js).
//  Usa App, App.informe.
// ============================================================

App.registrarRuta("/hidro/hipercalcemia", { view: "view-hipercalcemia" });
App.registrarRuta("/hidro/hipocalcemia",  { view: "view-hipocalcemia" });

function caCorregido(ca, alb) {
  if (ca === null || ca === undefined) return null;
  if (alb === null || alb === undefined) return ca;
  return ca + CA_CFG.albumina_factor * (CA_CFG.albumina_ref - alb);
}

// ── Hipercalcemia ──────────────────────────────────────────
let _ultimoHC = null;
function renderHC() {
  const cfg = CA_CFG;
  const ca = parseNum("hc-ca"), alb = parseNum("hc-alb");
  if (ca === null) { toast("Introduce el calcio.", true); return; }
  const sintomas = chkVal("hc-sintomas"), erc = chkVal("hc-erc"), vitd = chkVal("hc-vitd");
  const caC = caCorregido(ca, alb);
  const grav = caC > cfg.hiper_grave ? "grave" : (caC >= cfg.hiper_mod ? "moderada" : "leve");
  const urgente = grav === "grave" || sintomas;
  _ultimoHC = { ca, alb, caC, sintomas, erc, vitd, grav, urgente };
  const cont = document.getElementById("hc-resultado");

  const hidratacion = cardTrat("1 · Hidratación", null, null, [
    "<b>Suero salino 0,9% " + cfg.ssf_mlh_min + "-" + cfg.ssf_mlh_max + " ml/h</b> (3-4 l/día) según la función cardíaca y renal: restaura el volumen y la calciuria.",
    "Diuréticos de asa solo si hay sobrecarga de volumen (no de rutina)."
  ], "var(--c-hipo)");

  const calcitonina = urgente ? cardTrat("2 · Calcitonina (efecto rápido)", null, null, [
    "<b>Calcitonina " + cfg.calcitonina_uikg + " UI/kg SC/IM cada " + cfg.calcitonina_h + " h</b>: baja el calcio en horas.",
    "Pierde eficacia a las " + cfg.calcitonina_max_h + " h (taquifilaxia): es un puente hasta el bifosfonato."
  ], "var(--c-insulina)") : "";

  const antirresortivo = cardTrat((urgente ? "3" : "2") + " · Antirresortivo (efecto sostenido)", null, null, [
    erc
      ? "Insuficiencia renal: <b>denosumab " + cfg.denosumab_mg + " mg SC</b> (los bifosfonatos están limitados por el filtrado)."
      : "<b>Ácido zoledrónico " + cfg.zoledronico_mg + " mg IV</b> (preferido) o pamidronato " + cfg.pamidronato_min + "-" + cfg.pamidronato_max + " mg IV.",
    "Efecto máximo en 2-4 días (bifosfonato) o más tarde (denosumab); no es para la urgencia inmediata.",
    "Denosumab " + cfg.denosumab_mg + " mg SC también si es refractaria a bifosfonatos."
  ], "var(--violet)");

  const otros = cardTrat("Otras medidas", null, null, [
    vitd ? "<b>Glucocorticoides</b> (hipercalcemia mediada por vitamina D: granulomatosis, linfoma)." : "Glucocorticoides solo si está mediada por vitamina D (granulomatosis, linfoma).",
    (grav === "grave" && erc) ? "<b>Hemodiálisis</b> con baño bajo en calcio si es grave y hay insuficiencia renal o es refractaria." : "Hemodiálisis si es grave con insuficiencia renal o refractaria.",
    "Tratar la causa: " + escHtml(CA_TXT.hiper_causas),
    "Suspender calcio, vitamina D, tiazidas y litio; movilizar al paciente."
  ], "var(--brand)");

  const etiqueta = { leve: "leve (< 12)", moderada: "moderada (12-14)", grave: "grave (> 14)" }[grav];
  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hiper)">' +
      '<div class="result-kicker">Hipercalcemia' + (urgente ? " · urgencia" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Ca ' + fmt(caC, 1) + " mg/dl — " + etiqueta + "</div>" +
      '<p class="result-explica">' + (alb !== null ? "Calcio corregido por albúmina (" + fmt(alb, 1) + " g/dl). " : "") + "Pilares: hidratar, frenar la resorción ósea y tratar la causa.</p></div>" +
    hidratacion + calcitonina + antirresortivo + otros +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-hc-recal">Recalcular</button></div>' +
    App.informe.bloque(informeHC());
  document.getElementById("btn-hc-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeHC() {
  if (!_ultimoHC) return "";
  const o = _ultimoHC, cfg = CA_CFG;
  let t = App.informe.cabecera("HIPERCALCEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Calcio: " + fmt(o.ca, 1) + " mg/dl" + (o.alb !== null ? " (corregido " + fmt(o.caC, 1) + ", albúmina " + fmt(o.alb, 1) + ")" : "") + " · " + o.grav + (o.sintomas ? " · sintomática" : "") + "\n";
  t += "\n1) HIDRATACIÓN\n  - SSF 0,9% " + cfg.ssf_mlh_min + "-" + cfg.ssf_mlh_max + " ml/h (3-4 l/día). Diuréticos de asa solo si sobrecarga.\n";
  if (o.urgente) t += "\n2) CALCITONINA\n  - " + cfg.calcitonina_uikg + " UI/kg SC/IM cada " + cfg.calcitonina_h + " h (efecto rápido, máx " + cfg.calcitonina_max_h + " h).\n";
  t += "\n" + (o.urgente ? "3" : "2") + ") ANTIRRESORTIVO\n  - " + (o.erc ? "Denosumab " + cfg.denosumab_mg + " mg SC (ERC)." : "Ácido zoledrónico " + cfg.zoledronico_mg + " mg IV o pamidronato " + cfg.pamidronato_min + "-" + cfg.pamidronato_max + " mg.") + " Efecto en 2-4 días.\n";
  t += "\nOTRAS\n  - " + (o.vitd ? "Glucocorticoides (mediada por vit. D). " : "") + "Diálisis si grave+renal. Tratar la causa; suspender Ca/vit.D/tiazidas/litio.\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Endocrine Society 2023 / Merck). Verificar por el facultativo.\n";
  return t;
}

// ── Hipocalcemia ───────────────────────────────────────────
let _ultimoLC = null;
function renderLC() {
  const cfg = CA_CFG;
  const ca = parseNum("lc-ca"), alb = parseNum("lc-alb");
  if (ca === null) { toast("Introduce el calcio.", true); return; }
  const sintomas = chkVal("lc-sintomas"), mg = chkVal("lc-mg"), oral = chkVal("lc-oral");
  const caC = caCorregido(ca, alb);
  const iv = sintomas || caC < cfg.hipo_grave;
  const grav = caC < cfg.hipo_grave ? "grave" : (caC < cfg.hipo_leve ? "moderada" : "leve");
  _ultimoLC = { ca, alb, caC, sintomas, mg, oral, iv, grav };
  const cont = document.getElementById("lc-resultado");

  const ivCard = iv ? cardTrat("Calcio IV (sintomática / grave)", null, null, [
    "<b>Gluconato cálcico 10% " + cfg.gluconato_ml_min + "-" + cfg.gluconato_ml_max + " ml (" + cfg.gluconato_g_min + "-" + cfg.gluconato_g_max + " g)</b> diluido en 50-100 ml de glucosado 5%, IV en 10-20 min, con monitorización ECG.",
    "Continuar con <b>perfusión</b> (p. ej. 10 g de gluconato cálcico en 1 l de glucosado 5% a 50-100 ml/h) y ajustar por controles.",
    "No mezclar con bicarbonato ni fosfato (precipitan)."
  ], "var(--c-cad)") : "";

  const oralCard = (!iv || true) ? cardTrat(iv ? "Mantenimiento / paso a oral" : "Tratamiento oral", null, null, [
    "<b>Calcio oral " + cfg.ca_oral_min + "-" + cfg.ca_oral_max + " mg de calcio elemental/día</b>, repartido en 2-3 tomas.",
    "Asociar <b>vitamina D</b> activa (calcitriol/alfacalcidol) para mejorar la absorción.",
    "Objetivo de calcio " + cfg.objetivo_min + "-" + cfg.objetivo_max + " mg/dl; controlar cada 4-6 h en la fase aguda."
  ], "var(--c-insulina)") : "";

  const mgCard = cardTrat("Magnesio y causa", null, null, [
    "Corrige el <b>magnesio</b> si está bajo: la hipomagnesemia causa hipocalcemia refractaria." + (mg ? " <b>(magnesio bajo: corrígelo)</b>" : ""),
    escHtml(CA_TXT.hipo_fosfato),
    "Buscar la causa: " + escHtml(CA_TXT.hipo_causas)
  ], "var(--violet)");

  const etiqueta = { leve: "leve", moderada: "moderada", grave: "grave (< 7)" }[grav];
  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">Hipocalcemia' + (iv ? " · IV" : "") + "</div>" +
      '<div class="result-dx" style="font-size:1.2rem">Ca ' + fmt(caC, 1) + " mg/dl — " + etiqueta + "</div>" +
      '<p class="result-explica">' + (alb !== null ? "Calcio corregido por albúmina (" + fmt(alb, 1) + " g/dl). " : "") + (sintomas ? "Síntomas: calcio IV." : "Sin síntomas: vía oral.") + "</p></div>" +
    (sintomas ? '<div class="alert alert-red"><span>⚠️</span><span>' + escHtml(CA_TXT.hipo_ecg) + "</span></div>" : "") +
    ivCard + oralCard + mgCard +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-lc-recal">Recalcular</button></div>' +
    App.informe.bloque(informeLC());
  document.getElementById("btn-lc-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeLC() {
  if (!_ultimoLC) return "";
  const o = _ultimoLC, cfg = CA_CFG;
  let t = App.informe.cabecera("HIPOCALCEMIA — TRATAMIENTO") + "\n";
  t += "PACIENTE\n  - Calcio: " + fmt(o.ca, 1) + " mg/dl" + (o.alb !== null ? " (corregido " + fmt(o.caC, 1) + ")" : "") + " · " + o.grav + (o.sintomas ? " · sintomática" : "") + "\n";
  if (o.iv) t += "\nCALCIO IV\n  - Gluconato cálcico 10% " + cfg.gluconato_ml_min + "-" + cfg.gluconato_ml_max + " ml (" + cfg.gluconato_g_min + "-" + cfg.gluconato_g_max + " g) en glucosado 5% en 10-20 min, con monitor ECG; seguir con perfusión.\n";
  t += "\nORAL / MANTENIMIENTO\n  - Calcio oral " + cfg.ca_oral_min + "-" + cfg.ca_oral_max + " mg/día + vitamina D activa. Objetivo " + cfg.objetivo_min + "-" + cfg.objetivo_max + " mg/dl.\n";
  t += "\nMAGNESIO Y CAUSA\n  - Corregir el Mg si está bajo (hipocalcemia refractaria). " + CA_TXT.hipo_causas + "\n";
  t += "\n" + App.informe.SEP + "\nApoyo clínico (Merck / EMCrit). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-hc-calcular").addEventListener("click", renderHC);
  document.getElementById("btn-hc-limpiar").addEventListener("click", () => {
    ["hc-ca", "hc-alb"].forEach(id => { document.getElementById(id).value = ""; });
    ["hc-sintomas", "hc-erc", "hc-vitd"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("hc-resultado").innerHTML = ""; _ultimoHC = null;
  });
  document.getElementById("btn-lc-calcular").addEventListener("click", renderLC);
  document.getElementById("btn-lc-limpiar").addEventListener("click", () => {
    ["lc-ca", "lc-alb"].forEach(id => { document.getElementById(id).value = ""; });
    ["lc-sintomas", "lc-mg"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("lc-oral").checked = true;
    document.getElementById("lc-resultado").innerHTML = ""; _ultimoLC = null;
  });
});
