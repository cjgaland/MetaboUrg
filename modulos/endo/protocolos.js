// ============================================================
//  modulos/endo/protocolos.js — Datos clínicos
//  Patología tiroidea y trastornos suprarrenales (sin lógica).
//  Fuentes: JCEM 2025 (tormenta tiroidea) y Burch-Wartofsky;
//  EMCrit; StatPearls; NICE NG243 y Society for Endocrinology
//  (crisis suprarrenal); Endocrine Society (hiperaldosteronismo);
//  Merck/MSD (feocromocitoma, Cushing, Addison).
//  Apoyo clínico, NO sustituye el juicio del facultativo.
// ============================================================

// ── Escala de Burch-Wartofsky (tormenta tiroidea) ─────────
const BWPS = {
  // [umbral inferior °C, puntos]; por debajo del primero = 0
  temp: [[37.2, 5], [37.8, 10], [38.3, 15], [38.9, 20], [39.4, 25], [40, 30]],
  // [umbral inferior lpm, puntos]
  fc: [[90, 5], [110, 10], [120, 15], [130, 20], [140, 25]],
  snc: { ausente: 0, leve: 10, moderado: 20, grave: 30 },
  gi: { ausente: 0, moderado: 10, grave: 20 },
  ic: { ausente: 0, leve: 5, moderada: 10, grave: 15 },
  fa_pts: 10, precipitante_pts: 10,
  umbral_tormenta: 45, umbral_inminente: 25
};

const TIRO = {
  tormenta_tto: [
    { titulo: "1 · β-bloqueante", color: "var(--c-cad)", puntos: [
      "<b>Propranolol 60-80 mg VO cada 4-6 h</b> (o 0,5-1 mg IV lento, repetible); esmolol en perfusión en UCI.",
      "Controla los síntomas adrenérgicos y, además, bloquea la conversión de T4 a T3.",
      "Si broncoespasmo/asma: β1-selectivo (esmolol) o diltiazem para la frecuencia." ] },
    { titulo: "2 · Tionamida (antitiroideo)", color: "var(--c-insulina)", puntos: [
      "<b>Propiltiouracilo (PTU): carga 500-1000 mg VO, luego 250 mg cada 4 h</b> (preferido: bloquea también la conversión T4→T3).",
      "Alternativa: metimazol 20 mg cada 4-6 h (tras estabilizar suele pasarse a metimazol)." ] },
    { titulo: "3 · Yodo (≥ 1 h DESPUÉS de la tionamida)", color: "var(--violet)", puntos: [
      "<b>Solución de Lugol o yoduro potásico (SSKI) 5 gotas cada 6 h</b>, siempre <b>1 hora después</b> de la tionamida.",
      "Bloquea la liberación de hormona (efecto Wolff-Chaikoff).",
      "Nunca antes de la tionamida: el yodo podría agravar el hipertiroidismo (fenómeno de Jod-Basedow)." ] },
    { titulo: "4 · Hidrocortisona", color: "var(--c-ehh)", puntos: [
      "<b>Hidrocortisona 300 mg IV en bolo, luego 100 mg cada 8 h.</b>",
      "Bloquea la conversión T4→T3 y cubre una posible insuficiencia suprarrenal asociada." ] },
    { titulo: "5 · Soporte y precipitante", color: "var(--brand)", puntos: [
      "Enfriamiento físico y paracetamol (NUNCA aspirina: desplaza la T4 de sus proteínas y empeora el cuadro).",
      "Fluidos, glucosa y electrolitos; tratar la fibrilación auricular y la insuficiencia cardíaca.",
      "Buscar y tratar el factor precipitante (infección, cirugía, contraste yodado, suspensión del antitiroideo).",
      "Ingreso en UCI: la tormenta tiroidea tiene una mortalidad alta." ] }
  ],
  mixedema_dx: [
    "Hipotiroidismo grave descompensado: hipotermia, bradicardia e hipotensión.",
    "Alteración del nivel de consciencia (letargia → coma) y, a veces, convulsiones.",
    "Hiponatremia, hipoglucemia e hipoventilación (hipercapnia).",
    "Suele haber un precipitante: infección, frío, sedantes/opioides, suspensión de la levotiroxina o IAM."
  ],
  mixedema_tto: [
    { titulo: "1 · Hidrocortisona (primero)", color: "var(--c-ehh)", puntos: [
      "<b>Hidrocortisona 100 mg IV cada 8 h ANTES de la hormona tiroidea</b> (hasta excluir insuficiencia suprarrenal).",
      "La levotiroxina puede desencadenar una crisis suprarrenal si hay insuficiencia asociada." ] },
    { titulo: "2 · Hormona tiroidea", color: "var(--c-insulina)", puntos: [
      "<b>Levotiroxina (T4) IV: carga 300-500 µg, luego 50-100 µg/día.</b>",
      "Puede asociarse liotironina (T3) 5-20 µg en shock o falta de respuesta, con cautela (riesgo de arritmia en ancianos/cardiópatas)." ] },
    { titulo: "3 · Soporte y precipitante", color: "var(--brand)", puntos: [
      "Recalentamiento PASIVO (mantas); evitar el activo (vasodilatación e hipotensión).",
      "Ventilación si hipoventilación; corregir hipoglucemia e hiponatremia con cautela.",
      "Cubrir infección con antibiótico empírico y tratar el precipitante. Ingreso en UCI." ] }
  ]
};

const SUPRA = {
  crisis_dx: [
    "Sospéchala y trátala SIN esperar a las pruebas: el retraso es mortal.",
    "Hipotensión/shock que no responde a fluidos ni vasopresores, náuseas, vómitos y dolor abdominal.",
    "Hiponatremia, hiperpotasemia e hipoglucemia; a veces fiebre.",
    "Contexto: insuficiencia suprarrenal conocida, suspensión de corticoides, estrés (infección, cirugía) o apoplejía suprarrenal."
  ],
  crisis_tto: [
    { titulo: "1 · Hidrocortisona", color: "var(--c-cad)", puntos: [
      "<b>Hidrocortisona 100 mg IV en bolo INMEDIATO</b>, después <b>200 mg/24 h</b> (en perfusión continua o 50 mg cada 6 h)." ] },
    { titulo: "2 · Fluidos y glucosa", color: "var(--c-hipo)", puntos: [
      "<b>Suero salino 0,9%: 1 litro en la 1ª hora</b>; continuar según la volemia.",
      "Glucosa IV si hay hipoglucemia." ] },
    { titulo: "3 · Causa y seguimiento", color: "var(--brand)", puntos: [
      "Tratar el factor precipitante (antibiótico si infección). Extraer cortisol y ACTH antes del corticoide si es posible, sin retrasar el tratamiento.",
      "Al mejorar, reducir la hidrocortisona y reintroducir la fludrocortisona en la insuficiencia primaria." ] }
  ],
  apoplejia_dx: [
    "Hemorragia o infarto de las glándulas suprarrenales; confirmación por TC abdominal (con frecuencia bilateral).",
    "Sospecha: sepsis (síndrome de Waterhouse-Friderichsen en la meningococemia), anticoagulación o coagulopatía, síndrome antifosfolípido, postoperatorio o traumatismo.",
    "Cursa como una insuficiencia suprarrenal aguda: hipotensión, dolor en flanco/abdomen y fiebre."
  ],
  apoplejia_tto: [
    { titulo: "Manejo", color: "var(--c-cad)", puntos: [
      "Tratar como una <b>crisis suprarrenal</b>: hidrocortisona 100 mg IV → 200 mg/24 h + suero salino 0,9%.",
      "Tratar la causa: antibióticos en la sepsis, revisar/ajustar la anticoagulación.",
      "Soporte hemodinámico en UCI; valorar imagen y estudio de coagulación." ] }
  ],
  addison_dx: [
    "Insuficiencia suprarrenal primaria crónica. Clínica: astenia, pérdida de peso, hipotensión, hiperpigmentación y avidez por la sal.",
    "Analítica: hiponatremia, hiperpotasemia y, a veces, hipoglucemia.",
    "<b>Cortisol matutino bajo con ACTH elevada.</b>",
    "Confirmación: test de estimulación con cosintropina (ACTH 250 µg) → cortisol < 18 µg/dl a los 30-60 min."
  ],
  addison_tto: [
    { titulo: "Tratamiento sustitutivo", color: "var(--c-ehh)", puntos: [
      "Glucocorticoide: <b>hidrocortisona 15-25 mg/día</b> repartida (mayor dosis por la mañana).",
      "Mineralocorticoide: <b>fludrocortisona 50-200 µg/día</b>." ] },
    { titulo: "Educación y prevención de la crisis", color: "var(--brand)", puntos: [
      "Reglas de los días de enfermedad: doblar o triplicar la dosis ante fiebre/estrés.",
      "Tarjeta de emergencia y kit de hidrocortisona inyectable; aumentar la dosis en cirugía.",
      "Si vómitos o crisis: hidrocortisona parenteral inmediata." ] }
  ],
  cushing_dx: [
    "Sospecha clínica: obesidad central, cara de luna llena, estrías rojo-vinosas, debilidad proximal, HTA, diabetes, osteoporosis y hematomas fáciles.",
    "Cribado (≥ 2 pruebas alteradas): supresión con 1 mg de dexametasona nocturna, cortisol salival nocturno y cortisol libre en orina de 24 h.",
    "Confirmado el hipercortisolismo, medir ACTH: dependiente de ACTH (hipófisis = enfermedad de Cushing, o ectópico) vs independiente (suprarrenal).",
    "Localización con imagen (RM hipofisaria, TC suprarrenal) ± cateterismo de senos petrosos."
  ],
  cushing_tto: [
    { titulo: "Manejo", color: "var(--c-hiper)", puntos: [
      "Tratar la causa: cirugía transesfenoidal (enfermedad de Cushing), adrenalectomía (tumor suprarrenal) o resección del tumor ectópico.",
      "Fármacos que reducen el cortisol (ketoconazol, metirapona, osilodrostat) como puente o si no es operable.",
      "Controlar las comorbilidades: HTA, diabetes, osteoporosis, riesgo trombótico e infecciones.",
      "Si es iatrogénico (corticoides exógenos, la causa más frecuente): retirar el corticoide de forma gradual." ] }
  ],
  feo_dx: [
    "Clínica: crisis de cefalea, sudoración y palpitaciones, con HTA paroxística o mantenida.",
    "Bioquímica: <b>metanefrinas libres en plasma</b> (en decúbito) o metanefrinas fraccionadas en orina de 24 h.",
    "Localización: TC o RM abdominal; gammagrafía con MIBG o PET en casos seleccionados."
  ],
  feo_tto: [
    { titulo: "Preparación y cirugía", color: "var(--violet)", puntos: [
      "<b>Bloqueo ALFA primero</b> (fenoxibenzamina o doxazosina) 10-14 días, con expansión de volumen y sal.",
      "Añadir β-bloqueante DESPUÉS, solo tras el bloqueo alfa, para la taquicardia.",
      "<b>NUNCA β-bloqueante antes del alfa</b>: riesgo de crisis hipertensiva por estímulo alfa sin oposición.",
      "Cirugía (adrenalectomía) tras la preparación, con vigilancia anestésica." ] }
  ],
  feo_crisis: { titulo: "⚠️ Crisis hipertensiva", color: "var(--c-cad)", puntos: [
    "<b>Fentolamina IV en bolos</b> (o nitroprusiato/nicardipino IV); sulfato de magnesio.",
    "NUNCA β-bloqueante sin alfa-bloqueo previo." ] },
  conn_dx: [
    "Sospecha: HTA con hipopotasemia, HTA resistente o incidentaloma suprarrenal.",
    "Cribado: <b>cociente aldosterona/renina (ARR)</b> — aldosterona > 15 ng/dl con renina suprimida y ARR elevado (> 20-30).",
    "Confirmación: prueba de sobrecarga salina u otra. Corregir la hipopotasemia y ajustar los fármacos interferentes antes de medir.",
    "Subtipo: TC suprarrenal y cateterismo de venas suprarrenales (unilateral vs bilateral)."
  ],
  conn_tto: [
    { titulo: "Manejo", color: "var(--c-insulina)", puntos: [
      "Unilateral (adenoma productor): adrenalectomía laparoscópica.",
      "Bilateral o no quirúrgico: antagonista del receptor mineralocorticoide — <b>espironolactona</b> (1ª línea) o eplerenona.",
      "Corregir la hipopotasemia y controlar la HTA." ] }
  ]
};

window.BWPS = BWPS;
window.TIRO = TIRO;
window.SUPRA = SUPRA;
