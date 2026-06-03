// ============================================================
//  protocolos.js — Datos clínicos (sin lógica)
//  Trastornos de la Glucemia · Diagnóstico y tratamiento
//
//  Fuentes:
//   · Consenso ADA/EASD/JBDS/AACE/DTS 2024 (Umpierrez et al,
//     Diabetes Care 2024;47:1257) — por defecto.
//   · SEEN — infografía CAD/EHH (Codina Marcet et al; algoritmos
//     JBDS/Dhatariya 2021-22).
//   · SAEDYN 2017 — folletos de insulinización IV y SC (variante
//     institucional, mostrada como nota donde difiere).
//
//  Apoyo clínico, NO sustituye el juicio del facultativo.
// ============================================================

// ── Umbrales diagnósticos (SEEN / ADA 2024) ───────────────
const UMBRAL = {
  glucosa_cad:     200,   // mg/dl — CAD (ojo: euglucémica posible con iSGLT2)
  glucosa_ehh:     600,   // mg/dl — EHH
  glucosa_hipo:    70,    // mg/dl — hipoglucemia
  ph_cad:          7.30,  // pH venoso < 7,30
  hco3_cad:        18,    // mEq/l — < 18 (acidosis); cetosis simple > 15
  hco3_ehh_min:    18,    // EHH conserva HCO3 (> 18) y pH (> 7,30)
  bhb_cetosis:     0.6,   // mmol/l — β-OHB normal < 0,6
  bhb_cad:         3.0,   // mmol/l — β-OHB > 3 apoya CAD
  osm_ehh:         320,   // mOsm/kg — osmolalidad efectiva (SEEN: >320; ADA 2024: >300)
  osm_ehh_ada:     300
};

// ── Gravedad de la CAD (consenso 2024 / SEEN) ─────────────
// Se evalúa por pH y bicarbonato; el peor de los dos manda.
const GRAVEDAD_CAD = [
  { nivel: "grave",    ph_max: 7.00, hco3_max: 10, etiqueta: "CAD grave" },
  { nivel: "moderada", ph_max: 7.24, hco3_max: 15, etiqueta: "CAD moderada" },
  { nivel: "leve",     ph_max: 7.30, hco3_max: 18, etiqueta: "CAD leve" }
];

// ── Definición de cada cuadro (para resultado e informe) ──
const CUADROS = {
  hiperglucemia: {
    id: "hiperglucemia",
    nombre: "Hiperglucemia simple",
    color: "var(--c-hiper)",
    explica: "Hiperglucemia sin cetosis significativa ni acidosis ni hiperosmolalidad. Requiere control y ajuste de tratamiento, pero no es una emergencia metabólica.",
    tratamiento: [
      { titulo: "Manejo", puntos: [
        "Ajustar el tratamiento: pauta basal-bolus-corrección (ver módulo de insulinización SC).",
        "Asegurar hidratación adecuada.",
        "Buscar y tratar el desencadenante: infección, corticoides, omisión de tratamiento, estrés." ] }
    ],
    modulo: "insulina-sc"
  },
  cetosis: {
    id: "cetosis",
    nombre: "Cetosis simple",
    color: "var(--c-cad)",
    explica: "Cetonemia/cetonuria con bicarbonato conservado (>15) y pH normal: aún no cumple criterios de cetoacidosis. Vigilar estrechamente — puede progresar a CAD. Asegurar hidratación e insulina; no omitir nunca la insulina.",
    tratamiento: [
      { titulo: "Manejo", puntos: [
        "Asegurar hidratación e insulina; NO omitir nunca la insulina.",
        "Repetir β-hidroxibutirato y gasometría: vigilar progresión a cetoacidosis.",
        "Buscar y tratar el desencadenante." ] }
    ],
    modulo: "cad"
  },
  cad: {
    id: "cad",
    nombre: "Cetoacidosis diabética (CAD)",
    color: "var(--c-cad)",
    explica: "Tríada: hiperglucemia (o glucemia variable), cetonemia y acidosis metabólica. Emergencia. Manejo en 3 ejes: fluidos, insulina y potasio.",
    tratamiento: [
      { titulo: "1 · Fluidos", puntos: [
        "SSF 0,9% 1000 ml en la 1ª hora (bolos de 500 ml en 10-15 min si TA sistólica < 90 mmHg).",
        "Continuar 0,9% según volemia y sodio corregido; cambiar a salino 0,45% si el sodio corregido es normal o alto.",
        "Cuando la glucemia baje a ~200-250 mg/dl, añadir suero glucosado 5-10% manteniendo glucemia 200-250 mg/dl." ] },
      { titulo: "2 · Insulina", puntos: [
        "Perfusión de insulina rápida 0,1 UI/kg/h SIN bolo inicial; mantener la insulina basal habitual (o iniciar 0,25 UI/kg si début).",
        "Objetivo: descenso de glucemia 50-75 mg/dl/h y de β-OHB ≥ 0,5 mmol/l/h.",
        "CAD leve-moderada no complicada: posible insulina rápida SC cada 1-2 h fuera de UCI (ADA 2024)." ] },
      { titulo: "3 · Potasio", puntos: [
        "Comprobar diuresis y función renal antes de reponer.",
        "K > 5,3: no reponer, revisar en 2 h. K 3,3-5,3: añadir 20-40 mEq/l. K < 3,3: RETRASAR la insulina y reponer primero.",
        "Objetivo K 4-5 mEq/l." ] },
      { titulo: "Monitorización y resolución", puntos: [
        "Glucemia horaria; β-OHB, pH/HCO₃, iones y función renal cada 2-4 h.",
        "Resolución: β-OHB < 0,6 mmol/l y pH > 7,3. Después, transición a insulina SC (basal-bolus-corrección), solapando la rápida SC 1-2 h antes de retirar la perfusión." ] }
    ],
    notas: ["insulina_cad", "bicarbonato_cad", "resolucion_cad"],
    modulo: "cad"
  },
  ehh: {
    id: "ehh",
    nombre: "Estado hiperglucémico hiperosmolar (EHH)",
    color: "var(--c-ehh)",
    explica: "Hiperglucemia extrema con hiperosmolalidad y deshidratación grave, sin cetoacidosis relevante. Corrección LENTA de la osmolalidad. Profilaxis de trombosis.",
    tratamiento: [
      { titulo: "1 · Fluidos (lento)", puntos: [
        "SSF 0,9% 1000 ml en la 1ª hora (bolos de 500 ml si TA sistólica < 90 mmHg).",
        "Objetivo: descenso LENTO de la osmolalidad 3-8 mOsm/kg/h y del sodio. Valorar salino 0,45% si el sodio es alto y el balance es correcto.",
        "Añadir glucosado cuando la glucemia baje a 250-300 mg/dl." ] },
      { titulo: "2 · Insulina", puntos: [
        "Solo si hay cetonemia significativa, o cuando la glucemia deja de bajar solo con fluidos: 0,05-0,1 UI/kg/h.",
        "Objetivo: glucemia 200-250 mg/dl hasta que se normalicen la osmolalidad y el nivel de consciencia." ] },
      { titulo: "3 · Potasio", puntos: [
        "Igual que en la CAD: vigilar K y función renal; K < 3,3 retrasar insulina y reponer primero; objetivo K 4-5 mEq/l." ] },
      { titulo: "Otros", puntos: [
        "Profilaxis de trombosis con HBPM salvo contraindicación (riesgo trombótico alto).",
        "Buscar y tratar el precipitante (infección frecuente). Resolución habitual en > 24 h." ] }
    ],
    modulo: "ehh"
  },
  mixto: {
    id: "mixto",
    nombre: "Presentación mixta CAD + EHH",
    color: "var(--c-ehh)",
    explica: "Solapamiento de cetoacidosis y estado hiperosmolar (≈1/3 de los casos). Mayor morbimortalidad. Tratar la CAD pero corrigiendo la osmolalidad de forma lenta y vigilando el sodio.",
    tratamiento: [
      { titulo: "Estrategia", puntos: [
        "Aplicar el protocolo de CAD (fluidos + insulina 0,1 UI/kg/h + potasio), pero corrigiendo la osmolalidad y el sodio de forma LENTA (3-8 mOsm/kg/h).",
        "Insulina rápida en perfusión 0,1 UI/kg/h; objetivo de resolución de la cetosis (β-OHB < 0,6) sin descenso brusco de la osmolalidad.",
        "Potasio: K < 3,3 retrasar insulina y reponer primero; objetivo 4-5 mEq/l.",
        "Profilaxis de trombosis con HBPM. Vigilancia estrecha (mayor morbimortalidad). Buscar el precipitante." ] }
    ],
    notas: ["insulina_cad", "bicarbonato_cad", "resolucion_cad"],
    modulo: "cad"
  },
  hipoglucemia: {
    id: "hipoglucemia",
    nombre: "Hipoglucemia",
    color: "var(--c-hipo)",
    explica: "Glucemia < 70 mg/dl. Tratamiento inmediato según nivel de consciencia y disponibilidad de vía venosa.",
    tratamiento: [
      { titulo: "Consciente y tolera vía oral", puntos: [
        "15 g de glucosa de absorción rápida: geles de glucosa, 2-3 sobres de azúcar, 175 ml de zumo o 300 ml de leche.",
        "Reevaluar a los 15 min y repetir si la glucemia sigue < 70 mg/dl." ] },
      { titulo: "Inconsciente o no puede ingerir", puntos: [
        "SIN vía venosa: glucagón 1 mg IM o SC.",
        "CON vía venosa: 30 ml de glucosa al 33% (o 20 ml al 50%) IV, seguir con suero glucosado 5%. Reevaluar a los 15 min." ] },
      { titulo: "Tras la recuperación", puntos: [
        "Tomar hidratos de absorción lenta y buscar la causa (insulina/sulfonilureas, ayuno, insuficiencia renal, alcohol).",
        "Vigilancia prolongada si la causa es una sulfonilurea o insulina de acción prolongada (riesgo de recaída)." ] }
    ],
    modulo: "hipoglucemia"
  }
};

// ── Discrepancias SAEDYN 2017 ↔ SEEN/ADA 2024 (modo híbrido) ──
// Texto que se muestra como "nota de fuente" en cada protocolo.
const NOTAS_FUENTE = {
  insulina_cad:
    "Por defecto (SEEN/ADA 2024): perfusión de insulina rápida a dosis fija " +
    "0,1 UI/kg/h SIN bolo inicial, manteniendo la insulina basal habitual " +
    "(o iniciar 0,25 UI/kg si début). Variante SAEDYN 2017: bolo IV 0,1 UI/kg " +
    "seguido de perfusión 0,1 UI/kg/h.",
  bicarbonato_cad:
    "Por defecto (ADA 2024/SEEN): NO se recomienda bicarbonato de rutina, " +
    "incluso con pH < 7,0 (sin beneficio demostrado y posibles riesgos). " +
    "Variante SAEDYN 2017: valorar bicarbonato 1 M si pH ≤ 7,0 (reponer la " +
    "mitad del déficit en 12 h, con ClK asociado, controlando el potasio).",
  resolucion_cad:
    "Resolución (SEEN/ADA 2024): β-OHB < 0,6 mmol/l y pH > 7,3 (o HCO3 ≥ 18 " +
    "y anión gap normalizado) — no basta con normalizar la glucemia."
};

// ── Parámetros de tratamiento de la CAD (auditables) ──────
// Por defecto SEEN/ADA 2024. La variante SAEDYN 2017 se muestra como nota.
const CAD_CFG = {
  insulina_uikgh: 0.1,            // perfusión inicial (UI/kg/h), SIN bolo por defecto
  insulina_uikgh_reducida: 0.05, // al alcanzar el objetivo de glucemia
  bolo_uikg_saedyn: 0.1,         // variante SAEDYN: bolo IV inicial
  basal_uikg_debut: 0.25,        // insulina basal si début (UI/kg/día)
  prep_ui: 50, prep_ml: 50,      // preparación: 50 UI en 50 ml SSF → 1 UI/ml (ml/h = UI/h)
  glu_objetivo_min: 200, glu_objetivo_max: 250,   // mg/dl
  glu_anadir_glucosa: 250,       // mg/dl: al bajar a este nivel, añadir glucosa
  fluido_1h_mlkg_min: 15, fluido_1h_mlkg_max: 20, // ml/kg en la 1ª hora
  fluido_1h_max_ml: 1500,        // tope razonable de la 1ª hora
  bolo_shock_ml: 500,            // bolo si TA sistólica < 90 mmHg
  descenso_glu_min: 50, descenso_glu_max: 75,     // mg/dl/h objetivo
  na_corr_umbral_045: 135,       // Na corregido ≥ → considerar salino 0,45%
  k_bajo: 3.3, k_alto: 5.3, k_obj_min: 4, k_obj_max: 5,
  kcl_por_litro_min: 20, kcl_por_litro_max: 40,        // mEq KCl por litro de suero
  kcl_reposicion_h_min: 10, kcl_reposicion_h_max: 20,  // mEq/h si K < 3,3
  bicarbonato_ph_umbral: 7.0,    // variante SAEDYN: bicarbonato solo si pH ≤ 7,0
  na_deseado: 140,               // Na objetivo para el déficit de agua (mEq/l)
  act_factor: 0.6,               // factor de agua corporal total (×peso)
  perdidas_mlkg: 25              // pérdidas diarias estimadas en CAD (ml/kg)
};

// Exponer como globales (sin módulos ES, igual que DosisPed)
window.CAD_CFG = CAD_CFG;
window.UMBRAL = UMBRAL;
window.GRAVEDAD_CAD = GRAVEDAD_CAD;
window.CUADROS = CUADROS;
window.NOTAS_FUENTE = NOTAS_FUENTE;
