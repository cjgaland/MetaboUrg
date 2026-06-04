// ============================================================
//  modulos/glucemia/glucemia.js — Módulo Trastornos de la Glucemia
//  Registra rutas, sub-hub y la lógica del triaje diagnóstico.
//  Usa App (core), App.formulas, App.informe y los datos de
//  protocolos.js (UMBRAL, GRAVEDAD_CAD, CUADROS, NOTAS_FUENTE).
// ============================================================

// ── Rutas del módulo (el sub-hub se pinta desde AREAS en core.js) ──
App.registrarRuta("/glucemia", { view: "view-glucemia" });
App.registrarRuta("/glucemia/diagnostico", { view: "view-triaje" });

// Módulo de tratamiento recomendado según el cuadro (cuadro.modulo)
const DESTINO = {
  cad:            { nombre: "Cetoacidosis (CAD)",   hash: "#/glucemia/cad" },
  ehh:            { nombre: "Estado hiperosmolar",  hash: "#/glucemia/ehh" },
  hipoglucemia:   { nombre: "Hipoglucemia",         hash: "#/glucemia/hipoglucemia" },
  "insulina-sc":  { nombre: "Insulinización SC",    hash: "#/glucemia/insulina-sc" }
};

// ============================================================
//  MOTOR DIAGNÓSTICO
// ============================================================
function evaluarDiagnostico(d) {
  const has = v => v !== null && v !== undefined;
  const osm = App.formulas.osmolalidadEfectiva(d.na, d.glu);
  const naCorr = App.formulas.naCorregido(d.na, d.glu);

  const cetosis    = (has(d.bhb) && d.bhb >= UMBRAL.bhb_cetosis) || d.cetonuria;
  const acidosis   = (has(d.ph) && d.ph < UMBRAL.ph_cad) || (has(d.hco3) && d.hco3 < UMBRAL.hco3_cad);
  const puedeValorarAcidosis = has(d.ph) || has(d.hco3);
  const hiperosm   = osm !== null && osm > UMBRAL.osm_ehh;

  const criterios = [];
  const avisos = [];
  let cuadroId = null, gravedad = null;

  if (has(d.glu) && d.glu < UMBRAL.glucosa_hipo) {
    cuadroId = "hipoglucemia";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl (< 70)"]);
  } else if (cetosis && acidosis) {
    cuadroId = (hiperosm || (has(d.glu) && d.glu >= UMBRAL.glucosa_ehh)) ? "mixto" : "cad";
    gravedad = gravedadCAD(d);
    if (has(d.glu)) criterios.push([d.glu >= UMBRAL.glucosa_cad || d.isglt2, "Glucemia " + fmt(d.glu, 0) + " mg/dl"]);
    criterios.push([true, "Cetosis" + (has(d.bhb) ? " (β-OHB " + fmt(d.bhb, 1) + " mmol/l)" : d.cetonuria ? " (cetonuria ≥ 2+)" : "")]);
    criterios.push([true, "Acidosis metabólica" + (has(d.ph) ? " (pH " + fmt(d.ph, 2) + ")" : "") + (has(d.hco3) ? " · HCO₃ " + fmt(d.hco3, 0) : "")]);
    if (cuadroId === "mixto") criterios.push([true, "Componente hiperosmolar (osm " + fmt(osm, 0) + " mOsm/kg)"]);
  } else if (has(d.glu) && d.glu >= UMBRAL.glucosa_ehh && hiperosm && !acidosis && (!has(d.bhb) || d.bhb < UMBRAL.bhb_cad)) {
    cuadroId = "ehh";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl (≥ 600)"]);
    criterios.push([true, "Osmolalidad efectiva " + fmt(osm, 0) + " mOsm/kg (> 320)"]);
    criterios.push([true, "Sin cetoacidosis relevante (pH > 7,3, HCO₃ conservado)"]);
  } else if (cetosis && !acidosis && puedeValorarAcidosis) {
    cuadroId = "cetosis";
    criterios.push([true, "Cetosis presente" + (has(d.bhb) ? " (β-OHB " + fmt(d.bhb, 1) + ")" : "")]);
    criterios.push([true, "Sin acidosis (HCO₃ conservado, pH normal)"]);
  } else if (has(d.glu) && d.glu >= UMBRAL.glucosa_cad && !cetosis && !acidosis) {
    cuadroId = "hiperglucemia";
    criterios.push([true, "Glucemia " + fmt(d.glu, 0) + " mg/dl, sin cetosis ni acidosis"]);
  }

  if (cetosis && !puedeValorarAcidosis) {
    avisos.push({ nivel: "amber", txt: "Hay cetosis pero faltan pH y bicarbonato para confirmar o descartar cetoacidosis. Solicítalos." });
  }
  if (d.isglt2 && cetosis) {
    avisos.push({ nivel: "red", txt: "Paciente con iSGLT2: la CAD puede ser EUGLUCÉMICA (glucemia normal o poco elevada). No descartes CAD por una glucemia baja si hay cetosis y acidosis." });
  }
  if (d.consciencia && (cuadroId === "ehh" || cuadroId === "mixto" || cuadroId === "cad")) {
    avisos.push({ nivel: "red", txt: "Alteración de la consciencia: criterio de gravedad. Valora UCI y vía aérea." });
  }
  if (cuadroId && cuadroId !== "hipoglucemia" && !has(d.k)) {
    avisos.push({ nivel: "amber", txt: "Falta el potasio (K⁺): es imprescindible antes de iniciar insulina (si K < 3,3 mEq/l, reponer primero)." });
  }

  // Avisos derivados de antecedentes y tratamiento previo
  const a = d.ant || {};
  const ados = a.ados || {};
  const agudo = cuadroId === "cad" || cuadroId === "mixto" || cuadroId === "ehh";
  if (a.tipoDM === "dm1") {
    avisos.push({ nivel: "amber", txt: "DM tipo 1: no suspender NUNCA la insulina basal (riesgo de CAD), aunque el paciente esté en ayunas o normoglucémico." });
  }
  if (a.erc && agudo) {
    avisos.push({ nivel: "amber", txt: "Enfermedad renal crónica: fluidoterapia más prudente y especial cautela con el potasio (mayor riesgo de hiperpotasemia); reponer K con umbrales conservadores." });
  }
  if (a.ic && agudo) {
    avisos.push({ nivel: "amber", txt: "Insuficiencia cardíaca: ritmo de fluidos más prudente; vigilar sobrecarga de volumen / edema agudo de pulmón." });
  }
  if (ados.pioglitazona && a.ic) {
    avisos.push({ nivel: "red", txt: "Pioglitazona en paciente con insuficiencia cardíaca: provoca retención hídrica; suspender." });
  }
  if (ados.metformina && (agudo || acidosis)) {
    avisos.push({ nivel: "amber", txt: "Suspender metformina: riesgo de acidosis láctica en situación aguda / acidosis / deterioro de la función renal." });
  }
  if (ados.sulfonilurea && cuadroId === "hipoglucemia") {
    avisos.push({ nivel: "red", txt: "Hipoglucemia por sulfonilurea: riesgo de recaída prolongada; vigilancia ≥ 24-48 h y considerar perfusión de glucosa." });
  }

  return { cuadroId, gravedad, criterios, avisos, osm, naCorr };
}

function gravedadCAD(d) {
  const has = v => v !== null && v !== undefined;
  if (d.consciencia) return "grave";
  if ((has(d.ph) && d.ph < 7.00) || (has(d.hco3) && d.hco3 < 10)) return "grave";
  if ((has(d.ph) && d.ph < 7.24) || (has(d.hco3) && d.hco3 < 15)) return "moderada";
  return "leve";
}

// ── Lectura de datos del formulario ────────────────────────
function chk(id) { const e = document.getElementById(id); return e ? e.checked : false; }
function val(id) { const e = document.getElementById(id); return e ? e.value : ""; }

function leerAntecedentes() {
  return {
    ic: chk("t-ic"),
    erc: chk("t-erc"),
    fge: parseNum("t-fge"),
    ercEstadio: val("t-erc-estadio"),
    tipoDM: val("t-tipodm"),
    ados: {
      metformina:   chk("t-ado-metformina"),
      sulfonilurea: chk("t-ado-sulfonilurea"),
      idpp4:        chk("t-ado-idpp4"),
      arglp1:       chk("t-ado-arglp1"),
      dual:         chk("t-ado-dual"),
      isglt2:       chk("t-ado-isglt2"),
      pioglitazona: chk("t-ado-pio"),
      otros:        chk("t-ado-otros")
    },
    insulina: {
      dtd:    parseNum("t-ins-dtd"),
      rapida: parseNum("t-ins-rapida"),
      lenta:  parseNum("t-ins-lenta"),
      ultra:  parseNum("t-ins-ultra")
    }
  };
}

function leerDatosTriaje() {
  return {
    peso: parseNum("t-peso"), glu: parseNum("t-glucosa"), ph: parseNum("t-ph"),
    hco3: parseNum("t-hco3"), bhb: parseNum("t-bhb"), na: parseNum("t-na"), k: parseNum("t-k"),
    cetonuria: chk("t-cetonuria"),
    consciencia: chk("t-consciencia"),
    isglt2: chk("t-ado-isglt2"),
    ant: leerAntecedentes()
  };
}
function datosSuficientes(d) { return d.glu !== null || d.bhb !== null || d.cetonuria; }

// ── Render del resultado ───────────────────────────────────
let _ultimoDx = null;
function renderResultadoTriaje() {
  const d = leerDatosTriaje();
  if (!datosSuficientes(d)) { toast("Introduce al menos la glucemia.", true); return; }
  const res = evaluarDiagnostico(d);
  const cont = document.getElementById("triaje-resultado");

  if (!res.cuadroId) {
    _ultimoDx = null;
    cont.innerHTML =
      '<div class="result-card" style="--dx-color:var(--text-2)">' +
        '<div class="result-kicker">Resultado</div>' +
        '<div class="result-dx" style="font-size:1.15rem">Sin criterios de descompensación aguda</div>' +
        '<p class="result-explica">Con los datos introducidos no se cumplen criterios de hiperglucemia significativa, cetosis, cetoacidosis, estado hiperosmolar ni hipoglucemia. Reevalúa según la evolución clínica.</p></div>';
    cont.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const cuadro = CUADROS[res.cuadroId];
  const etiquetaGrav = res.gravedad ? ({ leve: "Leve", moderada: "Moderada", grave: "Grave" }[res.gravedad]) : null;
  _ultimoDx = { d, res, cuadro, etiquetaGrav };

  const crit = res.criterios.map(c =>
    '<li class="' + (c[0] ? "ok" : "no") + '"><span class="mk">' + (c[0] ? "✓" : "·") + "</span><span>" + escHtml(c[1]) + "</span></li>"
  ).join("");

  let calc = "";
  if (res.osm !== null) calc += '<div class="result-row"><span class="label">Osmolalidad efectiva</span><span class="value">' + fmt(res.osm, 0) + " mOsm/kg</span></div>";
  if (res.naCorr !== null) calc += '<div class="result-row"><span class="label">Sodio corregido</span><span class="value">' + fmt(res.naCorr, 0) + " mEq/l</span></div>";

  const avisos = res.avisos.map(a =>
    '<div class="alert alert-' + a.nivel + '"><span>' + (a.nivel === "red" ? "⚠️" : "ℹ️") + "</span><span>" + escHtml(a.txt) + "</span></div>"
  ).join("");

  let trat = "";
  if (cuadro.tratamiento) {
    trat = '<div class="result-divider"></div><h4 style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-2);margin-bottom:8px;">Tratamiento — pasos clave</h4>';
    trat += cuadro.tratamiento.map(b =>
      '<div style="margin-bottom:10px;"><b style="font-size:0.88rem;">' + escHtml(b.titulo) + "</b><ul style='margin:4px 0 0 17px;font-size:0.86rem;color:var(--text-2);'>" +
      b.puntos.map(p => "<li style='margin-bottom:3px;'>" + escHtml(p) + "</li>").join("") + "</ul></div>"
    ).join("");
  }
  let nota = "";
  if (cuadro.notas) nota = cuadro.notas.map(k => '<div class="nota-fuente">' + escHtml(NOTAS_FUENTE[k]) + "</div>").join("");

  cont.innerHTML =
    '<div class="result-card" style="--dx-color:' + cuadro.color + '">' +
      '<div class="result-kicker">Diagnóstico orientativo</div>' +
      (etiquetaGrav ? '<span class="severity-badge">' + etiquetaGrav + "</span><br>" : "") +
      '<div class="result-dx">' + escHtml(cuadro.nombre) + "</div>" +
      '<p class="result-explica">' + escHtml(cuadro.explica) + "</p>" +
      '<div class="result-divider"></div>' +
      '<ul class="criterio-list">' + crit + "</ul>" +
      calc + avisos + trat + nota +
      (DESTINO[cuadro.modulo] ? '<div class="result-reco"><span class="result-reco-ic">→</span><span>Módulo recomendado según los datos: <b>' + escHtml(DESTINO[cuadro.modulo].nombre) + "</b></span></div>" : "") +
      '<div class="acciones-result">' +
        (DESTINO[cuadro.modulo] ? '<button class="btn btn-primario" id="btn-ir-modulo">Ir a ' + escHtml(DESTINO[cuadro.modulo].nombre) + " →</button>" : "") +
        '<button class="btn btn-secundario" id="btn-recalcular">Recalcular</button>' +
      "</div>" +
    "</div>" +
    App.informe.bloque(construirInforme());

  document.getElementById("btn-recalcular").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const btnMod = document.getElementById("btn-ir-modulo");
  if (btnMod && DESTINO[cuadro.modulo]) btnMod.addEventListener("click", () => { App.estado.paciente = d; App.navegar(DESTINO[cuadro.modulo].hash); });
  App.informe.bind();
  cont.scrollIntoView({ behavior: "smooth", block: "start" });
}

function construirInforme() {
  if (!_ultimoDx) return "";
  const { d, res, cuadro, etiquetaGrav } = _ultimoDx;
  let t = App.informe.cabecera("TRASTORNO DE LA GLUCEMIA — VALORACIÓN") + "\n";
  t += "DATOS\n";
  if (d.peso !== null) t += "  - Peso: " + fmt(d.peso) + " kg\n";
  if (d.glu !== null) t += "  - Glucemia: " + fmt(d.glu, 0) + " mg/dl\n";
  if (d.ph !== null) t += "  - pH venoso: " + fmt(d.ph, 2) + "\n";
  if (d.hco3 !== null) t += "  - Bicarbonato: " + fmt(d.hco3, 0) + " mEq/l\n";
  if (d.bhb !== null) t += "  - β-hidroxibutirato: " + fmt(d.bhb, 1) + " mmol/l\n";
  if (d.cetonuria) t += "  - Cetonuria: ≥ 2+\n";
  if (d.na !== null) t += "  - Sodio: " + fmt(d.na, 0) + " mEq/l\n";
  if (d.k !== null) t += "  - Potasio: " + fmt(d.k, 1) + " mEq/l\n";
  if (res.osm !== null) t += "  - Osmolalidad efectiva: " + fmt(res.osm, 0) + " mOsm/kg\n";
  if (res.naCorr !== null) t += "  - Sodio corregido: " + fmt(res.naCorr, 0) + " mEq/l\n";
  if (d.consciencia) t += "  - Alteración del nivel de consciencia\n";

  const a = d.ant || {};
  const ados = a.ados || {};
  const ins = a.insulina || {};
  const adoMap = { metformina: "metformina", sulfonilurea: "sulfonilurea", idpp4: "iDPP-4", arglp1: "arGLP-1", dual: "dual GIP/GLP-1", isglt2: "iSGLT2", pioglitazona: "pioglitazona", otros: "otros" };
  const adoList = Object.keys(adoMap).filter(k => ados[k]).map(k => adoMap[k]);
  const insVals = [ins.dtd, ins.rapida, ins.lenta, ins.ultra];
  const tieneAnt = a.ic || a.erc || a.tipoDM || adoList.length || insVals.some(v => v !== null && v !== undefined);
  if (tieneAnt) {
    const tipos = { no: "No diabético conocido", dm1: "DM tipo 1", dm2ins: "DM tipo 2 con insulina", dm2noins: "DM tipo 2 sin insulina" };
    t += "\nANTECEDENTES Y TRATAMIENTO PREVIO\n";
    if (a.tipoDM && tipos[a.tipoDM]) t += "  - " + tipos[a.tipoDM] + "\n";
    if (a.ic) t += "  - Insuficiencia cardíaca\n";
    if (a.erc) t += "  - Enfermedad renal crónica" + (a.fge !== null && a.fge !== undefined ? " (FGe " + fmt(a.fge, 0) + " ml/min)" : "") + (a.ercEstadio ? " — " + a.ercEstadio : "") + "\n";
    if (adoList.length) t += "  - Tratamiento no insulínico: " + adoList.join(", ") + "\n";
    if (ins.dtd !== null && ins.dtd !== undefined) t += "  - Insulina previa: " + fmt(ins.dtd, 0) + " UI/día (DTD)\n";
    const desg = [];
    if (ins.rapida !== null && ins.rapida !== undefined) desg.push("rápida " + fmt(ins.rapida, 0));
    if (ins.lenta !== null && ins.lenta !== undefined) desg.push("lenta " + fmt(ins.lenta, 0));
    if (ins.ultra !== null && ins.ultra !== undefined) desg.push("ultralenta " + fmt(ins.ultra, 0));
    if (desg.length) t += "    · " + desg.join(" · ") + " UI/día\n";
  }

  t += "\nDIAGNÓSTICO ORIENTATIVO\n  " + cuadro.nombre + (etiquetaGrav ? " — " + etiquetaGrav : "") + "\n  " + cuadro.explica + "\n";
  if (res.criterios.length) {
    t += "\nCRITERIOS\n";
    res.criterios.forEach(c => { t += "  " + (c[0] ? "[x] " : "[ ] ") + c[1] + "\n"; });
  }
  if (cuadro.tratamiento) {
    t += "\nTRATAMIENTO — PASOS CLAVE\n";
    cuadro.tratamiento.forEach(b => { t += "  " + b.titulo + ":\n"; b.puntos.forEach(p => { t += "    - " + p + "\n"; }); });
  }
  if (res.avisos.length) { t += "\nAVISOS\n"; res.avisos.forEach(a => { t += "  ! " + a.txt + "\n"; }); }
  t += "\n" + App.informe.SEP + "\nApoyo clínico (SEEN / ADA-EASD 2024 / SAEDYN). Verificar por el facultativo.\n";
  return t;
}

// ── Inicialización del módulo ──────────────────────────────
const TRIAJE_INPUTS = ["t-peso", "t-glucosa", "t-ph", "t-hco3", "t-bhb", "t-na", "t-k", "t-fge", "t-ins-dtd", "t-ins-rapida", "t-ins-lenta", "t-ins-ultra"];
const TRIAJE_CHECKS = ["t-cetonuria", "t-consciencia", "t-ic", "t-erc", "t-ado-metformina", "t-ado-sulfonilurea", "t-ado-idpp4", "t-ado-arglp1", "t-ado-dual", "t-ado-isglt2", "t-ado-pio", "t-ado-otros"];
const TRIAJE_SELECTS = ["t-erc-estadio", "t-tipodm"];

App.alIniciar(function () {
  document.getElementById("btn-diagnosticar").addEventListener("click", renderResultadoTriaje);

  // Campos condicionales: FGe/estadio al marcar ERC; desglose de insulina según tipo de DM
  const ercToggle = document.getElementById("t-erc");
  const ercExtra = document.getElementById("t-erc-extra");
  ercToggle.addEventListener("change", () => { ercExtra.hidden = !ercToggle.checked; });
  const tipoDM = document.getElementById("t-tipodm");
  const insBloque = document.getElementById("t-ins-bloque");
  tipoDM.addEventListener("change", () => {
    insBloque.hidden = !(tipoDM.value === "dm1" || tipoDM.value === "dm2ins");
  });

  document.getElementById("btn-limpiar-triaje").addEventListener("click", () => {
    TRIAJE_INPUTS.forEach(id => { document.getElementById(id).value = ""; });
    TRIAJE_CHECKS.forEach(id => { document.getElementById(id).checked = false; });
    TRIAJE_SELECTS.forEach(id => { document.getElementById(id).value = ""; });
    ercExtra.hidden = true;
    insBloque.hidden = true;
    document.getElementById("triaje-resultado").innerHTML = "";
    _ultimoDx = null;
  });
});
