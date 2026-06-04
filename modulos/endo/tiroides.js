// ============================================================
//  modulos/endo/tiroides.js — Patología tiroidea
//  Tormenta tiroidea (Burch-Wartofsky) y coma mixedematoso.
//  Reutiliza cardTrat / chkVal (sodio.js). Datos en BWPS / TIRO.
// ============================================================

App.registrarRuta("/tiroides/tormenta", { view: "view-tormenta" });
App.registrarRuta("/tiroides/mixedema", { view: "view-mixedema" });

// Helper compartido: convierte un array de {titulo,puntos,color} en tarjetas
function manejoCards(manejo) {
  return manejo.map(m => cardTrat(m.titulo, null, null, m.puntos, m.color)).join("");
}
function listaCard(titulo, items, color) { return cardTrat(titulo, null, null, items, color); }

// ── Tormenta tiroidea ──────────────────────────────────────
let _ultimoTT = null;
function calcularBWPS(d) {
  const cfg = BWPS, o = {};
  let tp = 0; if (d.temp !== null) cfg.temp.forEach(([u, p]) => { if (d.temp >= u) tp = p; });
  let fp = 0; if (d.fc !== null) cfg.fc.forEach(([u, p]) => { if (d.fc >= u) fp = p; });
  o.tp = tp; o.fp = fp;
  o.sp = cfg.snc[d.snc] || 0; o.gp = cfg.gi[d.gi] || 0; o.ip = cfg.ic[d.ic] || 0;
  o.ap = d.fa ? cfg.fa_pts : 0; o.pp = d.prec ? cfg.precipitante_pts : 0;
  o.total = tp + fp + o.sp + o.gp + o.ip + o.ap + o.pp;
  o.clase = o.total >= cfg.umbral_tormenta ? "tormenta" : (o.total >= cfg.umbral_inminente ? "inminente" : "improbable");
  return o;
}
function renderTT() {
  const d = {
    temp: parseNum("tt-temp"), fc: parseNum("tt-fc"),
    snc: document.getElementById("tt-snc").value, gi: document.getElementById("tt-gi").value,
    ic: document.getElementById("tt-ic").value, fa: chkVal("tt-fa"), prec: chkVal("tt-prec")
  };
  const o = calcularBWPS(d);
  _ultimoTT = { d, o };
  const cont = document.getElementById("tt-resultado");
  const etiqueta = { tormenta: "Tormenta tiroidea probable (≥ 45)", inminente: "Tormenta inminente (25-44)", improbable: "Improbable (< 25)" }[o.clase];
  const color = o.clase === "improbable" ? "var(--text-2)" : "var(--c-cad)";

  const desglose = listaCard("Diagnóstico — Burch-Wartofsky", [
    "Temperatura: <b>" + o.tp + "</b> · Frecuencia cardíaca: <b>" + o.fp + "</b> · SNC: <b>" + o.sp + "</b>",
    "Gastrointestinal/hepático: <b>" + o.gp + "</b> · Insuf. cardíaca: <b>" + o.ip + "</b> · Fibrilación auricular: <b>" + o.ap + "</b> · Precipitante: <b>" + o.pp + "</b>",
    "<b>Total " + o.total + " puntos</b>: ≥ 45 muy sugestivo de tormenta; 25-44 inminente; < 25 improbable. No sustituye el juicio clínico."
  ], "var(--brand)");

  const trat = (o.clase === "improbable")
    ? listaCard("Tratamiento", ["Puntuación baja: vigila y reevalúa. Si la sospecha es alta pese a la puntuación, trata como tormenta."], "var(--c-cad)") + manejoCards(TIRO.tormenta_tto)
    : manejoCards(TIRO.tormenta_tto);

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:' + color + '">' +
      '<div class="result-kicker">Burch-Wartofsky · ' + o.total + " puntos</div>" +
      '<div class="result-dx" style="font-size:1.2rem">' + escHtml(etiqueta) + "</div>" +
      '<p class="result-explica">Secuencia: β-bloqueante → tionamida → yodo (1 h después) → hidrocortisona + soporte. Verifica cada dosis.</p></div>' +
    desglose + trat +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-tt-recal">Recalcular</button></div>' +
    App.informe.bloque(informeTT());
  document.getElementById("btn-tt-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeTT() {
  if (!_ultimoTT) return "";
  const { o } = _ultimoTT;
  let t = App.informe.cabecera("TORMENTA TIROIDEA — VALORACIÓN Y TRATAMIENTO") + "\n";
  t += "BURCH-WARTOFSKY: " + o.total + " puntos (" + o.clase + ")\n";
  t += "  - Temp " + o.tp + " · FC " + o.fp + " · SNC " + o.sp + " · GI " + o.gp + " · IC " + o.ip + " · FA " + o.ap + " · Precipitante " + o.pp + "\n";
  t += "\nTRATAMIENTO (en orden)\n";
  TIRO.tormenta_tto.forEach(m => { t += "  " + m.titulo + ":\n"; m.puntos.forEach(p => { t += "    - " + p.replace(/<\/?b>/g, "") + "\n"; }); });
  t += "\n" + App.informe.SEP + "\nApoyo clínico (JCEM 2025 / EMCrit / StatPearls). Verificar por el facultativo.\n";
  return t;
}

// ── Coma mixedematoso ──────────────────────────────────────
let _ultimoMX = null;
function renderMX() {
  _ultimoMX = true;
  const cont = document.getElementById("mx-resultado");
  cont.innerHTML =
    '<div class="result-card" style="--dx-color:var(--c-hipo)">' +
      '<div class="result-kicker">Coma mixedematoso</div>' +
      '<div class="result-dx" style="font-size:1.2rem">Hipotiroidismo descompensado</div>' +
      '<p class="result-explica">Emergencia. Hidrocortisona ANTES de la hormona tiroidea, levotiroxina IV y soporte. Verifica cada dosis.</p></div>' +
    listaCard("Diagnóstico", TIRO.mixedema_dx, "var(--brand)") +
    manejoCards(TIRO.mixedema_tto) +
    '<div class="acciones-result"><button class="btn btn-secundario" id="btn-mx-recal">Recalcular</button></div>' +
    App.informe.bloque(informeMX());
  document.getElementById("btn-mx-recal").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}
function informeMX() {
  let t = App.informe.cabecera("COMA MIXEDEMATOSO — MANEJO") + "\nDIAGNÓSTICO\n";
  TIRO.mixedema_dx.forEach(x => { t += "  - " + x.replace(/<\/?b>/g, "") + "\n"; });
  t += "\nTRATAMIENTO\n";
  TIRO.mixedema_tto.forEach(m => { t += "  " + m.titulo + ":\n"; m.puntos.forEach(p => { t += "    - " + p.replace(/<\/?b>/g, "") + "\n"; }); });
  t += "\n" + App.informe.SEP + "\nApoyo clínico (EMCrit / StatPearls). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización ─────────────────────────────────────────
App.alIniciar(function () {
  document.getElementById("btn-tt-calcular").addEventListener("click", renderTT);
  document.getElementById("btn-tt-limpiar").addEventListener("click", () => {
    ["tt-temp", "tt-fc"].forEach(id => { document.getElementById(id).value = ""; });
    ["tt-snc", "tt-gi", "tt-ic"].forEach(id => { document.getElementById(id).value = "ausente"; });
    ["tt-fa", "tt-prec"].forEach(id => { document.getElementById(id).checked = false; });
    document.getElementById("tt-resultado").innerHTML = ""; _ultimoTT = null;
  });
  document.getElementById("btn-mx-calcular").addEventListener("click", renderMX);
  document.getElementById("btn-mx-limpiar").addEventListener("click", () => { document.getElementById("mx-resultado").innerHTML = ""; _ultimoMX = null; });
});
