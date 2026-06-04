// ============================================================
//  modulos/hidro/protocolos.js — Datos clínicos · Sodio
//  Hiponatremia e hipernatremia (sin lógica).
//
//  Fuentes:
//   · Guía europea 2014 (ESICM/ESE/ERA-EDTA) — Spasovski et al,
//     Nephrol Dial Transplant 2014;29(Suppl 2):i1.
//   · Guía española SEN-SEEN-SEMI (Nefrología 2017) y algoritmo
//     de tratamiento de la S.E.N.
//   · Society for Endocrinology Emergency Guidance 2022.
//   · Hipernatremia: StatPearls; EMCrit IBCC.
//
//  Apoyo clínico, NO sustituye el juicio del facultativo.
// ============================================================

const NA_CFG = {
  // Umbrales (mmol/l = mEq/l)
  normal_min: 135, normal_max: 145,
  hipo_leve_min: 130,   // 130-134 leve
  hipo_mod_min: 125,    // 125-129 moderada · < 125 profunda
  hiper: 145,
  agudo_h: 48,          // < 48 h = aguda

  // ── Hiponatremia grave: salino hipertónico al 3% ──
  hts_ml: 150,          // ml por bolo
  hts_min: 20,          // minutos por bolo
  hts_mlkg: 2,          // alternativa por peso (ml/kg)
  hts_repeticiones: 3,  // hasta 2-3 bolos
  hts_objetivo_1h: 5,   // subir Na +5 mmol/l en la 1ª hora / hasta mejorar
  limite_24h: 10,       // ascenso máximo en las primeras 24 h
  limite_24h_riesgo: 8, // alto riesgo de desmielinización osmótica
  limite_48h: 8,        // ascenso máximo en cada 24 h siguientes
  control_na_h: 4,      // controlar Na cada 4 h
  riesgo_odso: "Na ≤ 105 mmol/l, hipopotasemia, alcoholismo, desnutrición o hepatopatía avanzada",

  // ── Hipernatremia ──
  na_deseado: 140,
  act_varon: 0.6, act_mujer: 0.5, act_anciano_varon: 0.5, act_anciano_mujer: 0.45,
  hiper_limite_dia: 10, // descenso máximo de Na (mmol/l/día) si crónica
  hiper_limite_h: 0.5,  // mmol/l/h
  hiper_h_min: 48, hiper_h_max: 72, // reponer el déficit en 48-72 h
  mantenimiento_ml_dia: 1500,

  // Sodio de los fluidos (para Adrogué-Madias)
  na_glucosado5: 0, na_salino045: 77, na_ssf: 154
};

const NA_TXT = {
  sintomas_graves: ["Vómitos", "Convulsiones", "Somnolencia profunda / coma (Glasgow ≤ 8)", "Distrés cardiorrespiratorio"],
  sintomas_moderados: ["Náuseas sin vómitos", "Confusión", "Cefalea"],

  // Manejo de la hiponatremia NO grave, por estado de volumen
  causas_hipo: {
    hipovolemia: {
      titulo: "Hipovolémica (volumen circulante bajo)",
      manejo: [
        "Reponer volumen con SSF 0,9%: al expandir, se frena la ADH y el Na sube.",
        "Buscar la pérdida: digestiva, diuréticos (tiazidas), tercer espacio, nefropatía pierde-sal.",
        "Vigilar el ascenso del Na al expandir (riesgo de corrección rápida); controlar cada 4-6 h."
      ]
    },
    euvolemia: {
      titulo: "Euvolémica (SIADH, la causa más frecuente)",
      manejo: [
        "Restricción hídrica (orientativo < 1000 ml/día), ajustando a la respuesta.",
        "Descartar hipotiroidismo e insuficiencia suprarrenal; tratar la causa del SIADH.",
        "Si no responde, valorar opciones de 2.ª línea (p. ej. urea) con el especialista."
      ]
    },
    hipervolemia: {
      titulo: "Hipervolémica (insuf. cardíaca, cirrosis, s. nefrótico)",
      manejo: [
        "Restricción hídrica y de sodio; tratar la enfermedad de base.",
        "Diuréticos de asa; evitar el SSF 0,9% (empeora la sobrecarga).",
        "Corrección lenta del Na."
      ]
    }
  },

  // Manejo según hallazgos de orina (orientación causal)
  orina_hipo: {
    dilucion: "Osmolalidad urinaria ≤ 100 mOsm/kg → exceso de agua libre con ADH suprimida: polidipsia primaria, baja ingesta de solutos (\"tea and toast\", potomanía por cerveza). Manejo: reducir la ingesta de agua.",
    naBajo: "Na urinario < 30 mmol/l → volumen circulante eficaz bajo: hipovolemia real (pérdidas) o hipervolemia (IC, cirrosis, s. nefrótico). Distinguir por el estado de volumen.",
    naAlto: "Na urinario ≥ 30 mmol/l (con osm urinaria > 100) → SIADH si euvolémico; también diuréticos, insuficiencia suprarrenal, hipotiroidismo o nefropatía pierde-sal."
  },

  hiper_causas: "Pérdida de agua (fiebre, sudoración, diarrea osmótica), diabetes insípida (poliuria con orina diluida), pérdidas hipotónicas, falta de acceso al agua (ancianos, bajo nivel de consciencia) o aporte excesivo de sodio.",
  hiper_di: "Si hay poliuria con orina diluida pese a la hipernatremia, sospecha diabetes insípida: central → desmopresina; nefrogénica → corregir la causa y aportar agua."
};

// ============================================================
//  POTASIO
//  Fuentes: UK Kidney Association 2023 (hiperpotasemia aguda);
//  documento de consenso español (Nefrología 2023) y
//  recomendaciones multisociedad (Emergencias 2022, SEMES/SEN/
//  SEC/SEMI); Nefrología al día (S.E.N.); EMCrit; StatPearls.
// ============================================================
const K_CFG = {
  normal_min: 3.5, normal_max: 5.0,

  // ── Hiperpotasemia (mmol/l = mEq/l) ──
  hiper_leve: 5.5,   // 5,5-5,9 leve
  hiper_mod: 6.0,    // 6,0-6,4 moderada
  hiper_grave: 6.5,  // ≥ 6,5 grave
  ecg12_k: 6.0,      // ECG de 12 derivaciones si K ≥ 6,0
  monitor_k: 6.5,    // monitor continuo si K ≥ 6,5
  // Calcio (ampolla clásica española)
  gluconato_ml: 10, gluconato_g: 1, gluconato_min: "2-3", gluconato_repetir: "5-10",
  // Insulina-glucosa
  insulina_ui: 10, glucosa_g: 25, glucosa_umbral_mgdl: 126,
  glucosa_mant_ml_h: 50, glucosa_mant_h: 5,
  salbutamol_min: 10, salbutamol_max: 20,
  control_k: "1, 2, 4, 6 y 24 h",

  // ── Hipopotasemia ──
  hipo_leve: 3.0,    // 3,0-3,4 leve
  hipo_mod: 2.5,     // 2,5-2,9 moderada · < 2,5 grave
  objetivo: 3.5, objetivo_cardio: 4.5,
  kcl_oral_min: 40, kcl_oral_max: 60,
  kcl_iv_perif: 10, kcl_iv_central: 20, kcl_conc_perif: 40
};

const K_TXT = {
  ecg_hiper: "T picudas → PR largo y aplanamiento de la P → QRS ancho → onda sinusoidal/parada. Cualquier cambio ECG por hiperpotasemia es una emergencia.",
  ecg_hipo: "Aplanamiento de la T, onda U, descenso del ST, QT/QU largo, extrasístoles y arritmias.",
  hiper_general: [
    "Suspender los fármacos que elevan el K: IECA, ARA-II, antialdosterónicos (espironolactona/eplerenona), AINE, suplementos de K, heparina, trimetoprim.",
    "Descartar pseudohiperpotasemia (hemólisis, torniquete prolongado, trombocitosis/leucocitosis): repetir la muestra si la clínica no encaja.",
    "Dieta baja en potasio y tratar la causa (ERC, acidosis, lisis tisular, déficit de insulina)."
  ],
  hiper_eliminar: [
    "Quelantes del potasio: ciclosilicato de circonio sódico o patiromer (el resincalcio ya no se recomienda de rutina).",
    "Diuréticos de asa (furosemida) si la volemia y la diuresis lo permiten.",
    "Hemodiálisis urgente si es refractaria, hay ERC avanzada o el paciente ya está en diálisis."
  ],
  hipo_causas: "Pérdidas digestivas (vómitos, diarrea), diuréticos (tiazidas, asa), redistribución (insulina, β-agonistas, alcalosis), hiperaldosteronismo, hipomagnesemia.",
  hipo_mg: "Corrige el magnesio SIEMPRE: la hipomagnesemia provoca pérdida renal de potasio y hace la hipopotasemia refractaria. Sulfato de magnesio IV si está bajo.",
  hipo_via: "Diluir el KCl en SUERO FISIOLÓGICO, no en glucosado (la glucosa estimula la insulina y baja aún más el K)."
};

// ============================================================
//  CALCIO  (mg/dl; mmol/l ≈ mg/dl ÷ 4)
//  Fuentes: Endocrine Society 2023 (hipercalcemia de malignidad);
//  Merck/MSD; EMCrit; Nefrología al día (S.E.N.).
// ============================================================
const CA_CFG = {
  normal_min: 8.5, normal_max: 10.5,
  albumina_ref: 4, albumina_factor: 0.8,   // Ca corregido = Ca + 0,8×(4 − albúmina)
  // Hipercalcemia
  hiper_mod: 12, hiper_grave: 14,          // mg/dl
  ssf_mlh_min: 200, ssf_mlh_max: 300,
  calcitonina_uikg: 4, calcitonina_h: 12, calcitonina_max_h: 72,
  zoledronico_mg: 4, pamidronato_min: 60, pamidronato_max: 90, denosumab_mg: 120,
  // Hipocalcemia
  hipo_leve: 8.0, hipo_grave: 7.0,
  gluconato_ml_min: 10, gluconato_ml_max: 20, gluconato_g_min: 1, gluconato_g_max: 2,
  ca_oral_min: 1500, ca_oral_max: 2000, objetivo_min: 8, objetivo_max: 9
};
const CA_TXT = {
  hiper_causas: "La mayoría: hiperparatiroidismo primario y neoplasia. También inmovilización, vitamina D, granulomatosis, tiazidas o litio.",
  hipo_causas: "Hipoparatiroidismo (poscirugía cervical), déficit de vitamina D, hipomagnesemia, pancreatitis, insuficiencia renal, fármacos.",
  hipo_ecg: "QT largo; riesgo de arritmias, tetania (Chvostek/Trousseau), parestesias y convulsiones.",
  hipo_fosfato: "Si coexiste hiperfosfatemia grave, corrige primero el fósforo: el calcio IV puede precipitar (calcificación)."
};

// ============================================================
//  FÓSFORO  (mg/dl; mmol/l ≈ mg/dl ÷ 3,1)
//  Fuentes: Merck/MSD; EMCrit; Nefrología al día.
// ============================================================
const P_CFG = {
  normal_min: 2.5, normal_max: 4.5,
  hipo_leve: 2.0, hipo_grave: 1.0,         // <1,0 grave
  fosfato_mmolkg_min: 0.08, fosfato_mmolkg_max: 0.16, fosfato_h: 6,
  fosfato_mgkg_max: 7, ritmo_mmolh_min: 1, ritmo_mmolh_max: 7.5,
  hiper: 4.5
};
const P_TXT = {
  hipo_causas: "Realimentación, alcoholismo, cetoacidosis en tratamiento, sepsis, hiperparatiroidismo, diuréticos, antiácidos quelantes.",
  hipo_realim: "Síndrome de realimentación: al reiniciar la nutrición en desnutridos el fósforo cae bruscamente. Reponer P (y tiamina) y subir las calorías despacio.",
  hiper_causas: "Casi siempre ERC. También lisis tumoral, rabdomiólisis, aporte excesivo o hipoparatiroidismo.",
  hiper_manejo: [
    "Quelantes del fósforo con las comidas (carbonato/acetato cálcico, sevelámero, carbonato de lantano) y restricción dietética.",
    "Forma aguda (lisis tumoral/rabdomiólisis): suero salino y tratar la causa.",
    "Diálisis si es grave, sintomática o hay ERC avanzada. Vigilar el calcio (riesgo de precipitación)."
  ]
};

// ============================================================
//  MAGNESIO  (mg/dl; 1 mmol/l = 2 mEq/l ≈ 2,43 mg/dl)
//  Fuentes: Merck/MSD; EMCrit; SPS NHS; Nefrología al día.
// ============================================================
const MG_CFG = {
  normal_min: 1.7, normal_max: 2.2,
  hipo_grave: 1.25,                        // <1,25 mg/dl (< 0,5 mmol/l) o sintomática
  mgso4_g_min: 1, mgso4_g_max: 2, mgso4_torsades_g: 2,
  perfusion_g_min: 4, perfusion_g_max: 8, perfusion_h: "12-24",
  hiper: 2.2, hiper_sintomas: 4.8,         // ~4 mEq/l: hiporreflexia
  gluconato_ml_min: 10, gluconato_ml_max: 20
};
const MG_TXT = {
  hipo_causas: "Pérdidas digestivas (diarrea), alcoholismo, diuréticos, inhibidores de la bomba de protones, fármacos (aminoglucósidos, cisplatino). Suele asociar hipopotasemia e hipocalcemia.",
  hipo_ecg: "QT largo, riesgo de torsades de pointes y arritmias; tetania y convulsiones.",
  hiper_causas: "Casi siempre insuficiencia renal con aporte de magnesio (laxantes/antiácidos, sulfato de Mg). ",
  hiper_clinica: "Hiporreflexia (> 4 mEq/l), hipotensión, bradicardia/bloqueo, depresión respiratoria y parada en casos extremos."
};

window.NA_CFG = NA_CFG;
window.NA_TXT = NA_TXT;
window.K_CFG = K_CFG;
window.K_TXT = K_TXT;
window.CA_CFG = CA_CFG;
window.CA_TXT = CA_TXT;
window.P_CFG = P_CFG;
window.P_TXT = P_TXT;
window.MG_CFG = MG_CFG;
window.MG_TXT = MG_TXT;
