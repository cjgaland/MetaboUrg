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
  fluido_1h_mlkg_cauto_min: 5, fluido_1h_mlkg_cauto_max: 10, // IC/ERC/oliguria: 1ª hora más prudente
  ritmo_mlh_min: 250, ritmo_mlh_max: 500,             // ritmo 2ª-6ª h estándar
  ritmo_mlh_cauto_min: 125, ritmo_mlh_cauto_max: 250, // IC/ERC/oliguria: ritmo reducido
  descenso_glu_min: 50, descenso_glu_max: 75,     // mg/dl/h objetivo
  na_corr_umbral_045: 135,       // Na corregido ≥ → considerar salino 0,45%
  k_bajo: 3.3, k_alto: 5.3, k_obj_min: 4, k_obj_max: 5,
  kcl_por_litro_min: 20, kcl_por_litro_max: 40,        // mEq KCl por litro de suero
  kcl_por_litro_erc_min: 10, kcl_por_litro_erc_max: 20, // ERC/oliguria: KCl reducido y vigilancia estrecha
  kcl_reposicion_h_min: 10, kcl_reposicion_h_max: 20,  // mEq/h si K < 3,3
  basal_frac_dtd: 0.5,           // basal ≈ 50% de la dosis total diaria previa
  bicarbonato_ph_umbral: 7.0,    // variante SAEDYN: bicarbonato solo si pH ≤ 7,0
  na_deseado: 140,               // Na objetivo para el déficit de agua (mEq/l)
  act_factor: 0.6,               // factor de agua corporal total (×peso)
  perdidas_mlkg: 25              // pérdidas diarias estimadas en CAD (ml/kg)
};

// ── Insulinización SC: pauta basal-bolo-corrección (SAEDYN 2017) ──
// Cartel "Insulinización hospitalaria subcutánea para el paciente NO crítico".
const INSULINA_SC = {
  // 1 · Cálculo de la dosis total diaria (DTD) de novo, por peso y glucemia de ingreso
  dtd_uikg_bajo: 0.3,   // glucemia < 150 mg/dl
  dtd_uikg_medio: 0.4,  // glucemia 150-200 mg/dl
  dtd_uikg_alto: 0.5,   // glucemia > 200 mg/dl
  dtd_glu_bajo: 150, dtd_glu_alto: 200,
  recargo_ins_ado: 0.20, // insulina + terapias no insulínicas: DTD domiciliaria + 20%

  // 2 · Distribución de la dosis
  basal_frac: 0.50,      // 50% de la DTD
  bolo_frac: 0.50,       // 50% de la DTD (solo si come)
  bolo_desayuno: 0.30, bolo_comida: 0.40, bolo_cena: 0.30,

  // 3 · Pauta de corrección A/B/C (UI a sumar/restar según glucemia capilar)
  pauta_dtd_AB: 40, pauta_dtd_BC: 80,   // por DTD (U/día)
  pauta_kg_AB: 60, pauta_kg_BC: 90,     // por peso (kg)
  pautas_corr: {
    A: "< 40 U/día o < 60 kg",
    B: "40-80 U/día o 60-90 kg",
    C: "> 80 U/día o > 90 kg"
  },
  corr_filas: [
    { rango: "< 80",    A: -1, B: -1, C: -2 },
    { rango: "80-129",  A: 0,  B: 0,  C: 0 },
    { rango: "130-149", A: 0,  B: 1,  C: 1 },
    { rango: "150-199", A: 1,  B: 1,  C: 2 },
    { rango: "200-249", A: 2,  B: 3,  C: 4 },
    { rango: "250-299", A: 3,  B: 5,  C: 7 },
    { rango: "300-349", A: 4,  B: 7,  C: 10 },
    { rango: "> 349",   A: 5,  B: 8,  C: 12 }
  ],

  insulinas_basal: "Glargina (Lantus®/Abasaglar®): 1 dosis · Detemir (Levemir®): 1-2 dosis · NPH (Insulatard®): 2-3 dosis.",
  insulinas_bolo: "Lispro (Humalog®), Aspart (Novorapid®) o Glulisina (Apidra®). Regular (Actrapid®/Humulina Regular®) solo si NO come (cada 6 h).",
  objetivos: "Objetivos de control: glucemia basal/preprandial 100-140 mg/dl; 2 h posprandial < 180 mg/dl.",
  ajustes_hiper: [
    "Basal o en ayunas (> 140 mg/dl) sin hipoglucemia nocturna: aumentar 20% la insulina basal.",
    "Preprandial sin hipoglucemia desde la toma previa: aumentar 10-20% la prandial de la toma anterior (almuerzo→desayuno; cena→comida; post-cena/acostarse→cena)."
  ],
  ajustes_hipo: [
    "Nocturna o basal: reducir 10-20% la insulina basal.",
    "Durante la mañana: reducir 10-20% la prandial del desayuno.",
    "Durante la tarde: reducir 10-20% la prandial de la comida.",
    "Post-cena o al acostarse: reducir 10-20% la prandial de la cena."
  ],
  alta: [
    { hba1c_max: 8,        txt: "HbA1c < 8%: mantener el tratamiento previo del paciente." },
    { hba1c_max: 10,       txt: "HbA1c 8-10%: si venía con terapias no insulínicas, mantenerlas y añadir insulina basal; si venía con insulina, mantener la pauta basal-bolo hospitalaria." },
    { hba1c_max: Infinity, txt: "HbA1c > 10%: sospechar DM tipo 1/LADA, corticoides, insuficiencia pancreática o paciente semiestabilizado; mantener la pauta basal-bolo hospitalaria." }
  ]
};

// ── Insulinización IV en perfusión (SAEDYN 2017) ──────────
// Folleto "Protocolo de insulinización intravenosa para pacientes
// hospitalizados" — pauta en 2 líneas separadas (Y).
const INSULINA_IV = {
  objetivo_min: 140, objetivo_max: 180,   // mg/dl
  glu_inicio: 180,                         // iniciar si glucemia > 180 mg/dl
  req_alto_uidia: 80,                      // > 80 UI/día previo → iniciar por pauta 2
  hipo_umbral: 70,
  transicion_factor: 4,                    // últimas 6 h × 4 ≈ DTD de 24 h

  prep_insulina: "100 UI de insulina regular (Actrapid®/Humulina Regular®) en 100 ml de SSF 0,9% → 1 UI/ml (ml/h = UI/h).",
  prep_liquidos: "Línea de líquidos en Y: suero glucosado 5% a 100 ml/h (o glucosado 10% a 50 ml/h), ajustando a otros aportes (nutrición, etc.).",

  // Tabla de pautas (UI/hora) por tramo de glucemia
  pautas_filas: [
    { rango: "70-139",  min: 70,  max: 139, p: [0, 0, 0, 0] },
    { rango: "140-179", min: 140, max: 179, p: [1, 1, 2, 2] },
    { rango: "180-209", min: 180, max: 209, p: [1, 2, 3, 4] },
    { rango: "210-239", min: 210, max: 239, p: [2, 4, 6, 8] },
    { rango: "240-269", min: 240, max: 269, p: [3, 5, 7, 10] },
    { rango: "270-299", min: 270, max: 299, p: [3, 6, 8, 14] },
    { rango: "300-329", min: 300, max: 329, p: [4, 7, 10, 18] },
    { rango: "330-359", min: 330, max: 359, p: [4, 8, 12, 20] },
    { rango: "> 360",   min: 360, max: Infinity, p: [6, 10, 14, 24] }
  ],

  // Criterios para INICIAR por pauta 2 (si ninguno → pauta 1)
  pauta2_criterios: {
    nocontrol:   "No controlado con la Pauta 1",
    cardio:      "Cirugía cardiovascular",
    trasplante:  "Trasplante de órgano sólido o de islotes",
    corticoides: "Altas dosis de corticoides",
    altorreq:    "Requerimientos previos > 80 UI/día"
  },

  monitor: [
    "Glucemia capilar cada hora hasta mantenerse en rango durante 4 h consecutivas.",
    "Después cada 2 h; si sigue en rango, cada 4 h.",
    "En pacientes críticos puede ser necesaria cada hora aunque estén estables."
  ],
  cambio: [
    "A pauta SUPERIOR: glucemias por encima del objetivo durante > 2 h, o que no bajan > 60 mg/dl en una hora.",
    "A pauta INFERIOR: glucemias < 140 mg/dl durante > 2 h.",
    "Si el paciente realiza ingesta oral: subir a la pauta superior durante las 4 h posteriores a la ingesta."
  ],
  hipo: [
    "PARAR la infusión de insulina y administrar glucosa IV.",
    "Consciente: 10 g de glucosa (30 ml de glucosa al 33% o 20 ml al 50%).",
    "Inconsciente: 20 g de glucosa (60 ml al 33% o 40 ml al 50%).",
    "Medir glucemia capilar cada 15 min; repetir 30 ml de glucosa al 33% si sigue < 70 mg/dl.",
    "Reinstaurar la perfusión cuando la glucemia sea ≥ 140 mg/dl en dos determinaciones, empezando por la Pauta 1."
  ],
  avisar: [
    "Cambio (↑ o ↓) de la glucemia > 100 mg/dl en una hora.",
    "Glucemia > 360 mg/dl.",
    "Hipoglucemia que no se resuelve con el protocolo."
  ],
  transicion: [
    "1 · Cálculo de la dosis total: requerimientos de insulina de las 24 h previas (o las últimas 6 h en pacientes estables, extrapolando a 24 h).",
    "2 · Distribución: aplicar la pauta basal-bolo-corrección del paciente no crítico.",
    "3 · Solapamiento: mantener la perfusión IV hasta 2 h después de la primera insulina rápida SC (o 4 h si es de acción prolongada)."
  ],
  indicaciones: [
    "Adultos ingresados en UCI y Reanimación.",
    "Perioperatorio de cirugía mayor (especialmente cardiaca y trasplante de órganos).",
    "Hiperglucemia exacerbada por altas dosis de corticoides.",
    "Hiperglucemia en nutrición parenteral."
  ]
};

// ── Estado hiperglucémico hiperosmolar (EHH) ──────────────
// Por defecto SEEN/ADA 2024 (corrección LENTA; insulina a dosis baja
// y solo si cetonemia o la glucemia deja de bajar con fluidos).
const EHH_CFG = {
  osm_descenso_min: 3, osm_descenso_max: 8,   // mOsm/kg/h — descenso LENTO
  osm_resolucion: 315,                         // osmolalidad objetivo / paciente alerta
  na_descenso_max: 10,                         // mEq/l por 24 h (descenso prudente del Na)
  glu_objetivo_min: 250, glu_objetivo_max: 300,
  glu_anadir_glucosa: 300,                     // mg/dl: añadir glucosa al bajar a este nivel
  insulina_uikgh_min: 0.05, insulina_uikgh_max: 0.1
};

// ── Hipoglucemia: árbol de decisión y tratamiento ─────────
const HIPO_CFG = {
  umbral: 70,
  consciente: {
    titulo: "Consciente y tolera la vía oral",
    pasos: [
      "Administrar 15 g de hidratos de absorción rápida: geles de glucosa, 2-3 sobres de azúcar, 175 ml de zumo o 300 ml de leche.",
      "Reevaluar la glucemia a los 15 min y repetir la toma si sigue < 70 mg/dl.",
      "Al recuperar, tomar hidratos de absorción lenta."
    ]
  },
  inconsciente_sinvia: {
    titulo: "Inconsciente o no tolera vía oral — SIN vía venosa",
    pasos: [
      "Glucagón 1 mg IM o SC.",
      "Conseguir una vía venosa cuanto antes y administrar glucosa IV.",
      "Reevaluar la glucemia a los 15 min."
    ]
  },
  inconsciente_convia: {
    titulo: "Inconsciente o no tolera vía oral — CON vía venosa",
    pasos: [
      "30 ml de glucosa al 33% (o 20 ml al 50%) IV en bolo.",
      "Continuar con suero glucosado al 5%.",
      "Reevaluar a los 15 min y repetir el bolo si sigue < 70 mg/dl."
    ]
  },
  tras: [
    "Tomar hidratos de absorción lenta tras la recuperación.",
    "Buscar y tratar la causa: insulina o sulfonilureas, ayuno, insuficiencia renal, alcohol, sepsis."
  ],
  vigilancia_prolongada: "Causa por SULFONILUREA o INSULINA de acción prolongada: riesgo de recaída. Vigilancia prolongada ≥ 24-48 h y considerar perfusión de suero glucosado al 10%.",
  glucagon_inutil: "El glucagón puede ser ineficaz en ayuno prolongado, hepatopatía o alcoholismo (depósitos de glucógeno agotados): prioriza la glucosa IV."
};

// Exponer como globales (sin módulos ES, igual que DosisPed)
window.INSULINA_SC = INSULINA_SC;
window.INSULINA_IV = INSULINA_IV;
window.EHH_CFG = EHH_CFG;
window.HIPO_CFG = HIPO_CFG;
window.CAD_CFG = CAD_CFG;
window.UMBRAL = UMBRAL;
window.GRAVEDAD_CAD = GRAVEDAD_CAD;
window.CUADROS = CUADROS;
window.NOTAS_FUENTE = NOTAS_FUENTE;
