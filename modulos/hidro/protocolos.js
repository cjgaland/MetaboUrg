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

window.NA_CFG = NA_CFG;
window.NA_TXT = NA_TXT;
