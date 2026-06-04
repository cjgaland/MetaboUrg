// ============================================================
//  modulos/sintomas.js — Recordatorio de síntomas y signos
//  Tarjeta plegable que se inserta bajo el formulario de cada
//  módulo de tratamiento. Contenido basado en la literatura
//  (Merck/MSD, EMCrit y las guías usadas en cada módulo).
//  Escalable: añadir una clave (id de la vista) → lista.
// ============================================================
(function () {
  const SINTOMAS = {
    // ── Glucemia ──
    "view-cad": [
      "Poliuria, polidipsia y pérdida de peso.",
      "Náuseas, vómitos y dolor abdominal.",
      "<b>Respiración de Kussmaul</b> (rápida y profunda) y aliento cetósico (afrutado).",
      "Deshidratación, taquicardia e hipotensión.",
      "Somnolencia, estupor o coma en los casos graves."
    ],
    "view-ehh": [
      "Deshidratación intensa (mucosas secas, hipotensión, taquicardia).",
      "Alteración del nivel de consciencia, hasta el coma.",
      "Focalidad neurológica o convulsiones.",
      "Poliuria inicial que evoluciona a oliguria.",
      "Sin respiración de Kussmaul ni aliento cetósico (a diferencia de la CAD)."
    ],
    "view-hipoglucemia": [
      "<b>Adrenérgicos</b> (precoces): sudoración, temblor, palpitaciones, ansiedad y hambre.",
      "<b>Neuroglucopénicos</b>: confusión, alteración del comportamiento, visión borrosa, focalidad.",
      "Casos graves: convulsiones, disminución de la consciencia y coma.",
      "Pueden faltar los síntomas adrenérgicos en la diabetes de larga evolución o con betabloqueantes."
    ],

    // ── Sodio ──
    "view-hiponatremia": [
      "Leve: náuseas, cefalea y dificultad de concentración.",
      "Moderada: confusión, desorientación, inestabilidad y caídas.",
      "Grave: vómitos, somnolencia profunda, convulsiones y coma.",
      "La gravedad depende sobre todo de la <b>rapidez de instauración</b>, más que de la cifra."
    ],
    "view-hipernatremia": [
      "Sed intensa (si el mecanismo de la sed está conservado).",
      "Debilidad, irritabilidad y letargia.",
      "Confusión, espasmos musculares e hiperreflexia.",
      "Convulsiones y coma en los casos graves.",
      "Signos de deshidratación."
    ],

    // ── Potasio ──
    "view-hiperpotasemia": [
      "A menudo asintomática hasta que es grave.",
      "Debilidad muscular, parestesias y palpitaciones.",
      "<b>ECG</b>: T picudas → PR largo y P aplanada → QRS ancho → onda sinusoidal/arritmia o parada.",
      "Cualquier cambio en el ECG es una emergencia."
    ],
    "view-hipopotasemia": [
      "Debilidad muscular, calambres y mialgias.",
      "Estreñimiento o íleo paralítico.",
      "Poliuria y polidipsia.",
      "<b>ECG</b>: aplanamiento de la T, onda U, descenso del ST y QT largo; arritmias."
    ],

    // ── Calcio ──
    "view-hipercalcemia": [
      "Renales: poliuria, polidipsia, deshidratación y litiasis ('stones').",
      "Digestivos: náuseas, vómitos, estreñimiento y dolor abdominal ('groans').",
      "Óseos: dolor óseo ('bones').",
      "Neuropsíquicos: astenia, letargia y confusión ('psychic moans').",
      "<b>ECG</b>: acortamiento del QT."
    ],
    "view-hipocalcemia": [
      "Parestesias peribucales y en manos y pies.",
      "Tetania, espasmo carpopedal y calambres.",
      "<b>Signos de Chvostek y de Trousseau</b>.",
      "Laringoespasmo y convulsiones en los casos graves.",
      "<b>ECG</b>: alargamiento del QT."
    ],

    // ── Fósforo ──
    "view-hiperfosfatemia": [
      "Suele ser asintomática.",
      "Síntomas derivados de la <b>hipocalcemia</b> secundaria (tetania, parestesias).",
      "A largo plazo: prurito y calcificaciones (vasculares y de partes blandas)."
    ],
    "view-hipofosfatemia": [
      "Debilidad muscular, incluida la <b>musculatura respiratoria</b> (insuficiencia respiratoria).",
      "Rabdomiólisis.",
      "Parestesias, irritabilidad y confusión.",
      "Casos graves: disfunción cardíaca y hemólisis.",
      "Sospéchala en el <b>síndrome de realimentación</b>."
    ],

    // ── Magnesio ──
    "view-hipermagnesemia": [
      "<b>Hiporreflexia</b> (signo precoz).",
      "Náuseas, rubor facial e hipotensión.",
      "Letargia y debilidad.",
      "Graves: depresión respiratoria, bradicardia/bloqueo y parada cardíaca."
    ],
    "view-hipomagnesemia": [
      "Temblor, tetania e hiperreflexia.",
      "Convulsiones.",
      "Arritmias, incluida la <b>torsade de pointes</b>.",
      "Suele asociar hipopotasemia e hipocalcemia refractarias."
    ]
  };

  App.alIniciar(function () {
    Object.keys(SINTOMAS).forEach(viewId => App.ui.insertarSintomas(viewId, SINTOMAS[viewId]));
  });
})();
