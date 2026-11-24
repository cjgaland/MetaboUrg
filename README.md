# MetaboUrg · Urgencias endocrino-metabólicas

Portal de utilidades clínicas (PWA) de apoyo al **diagnóstico y tratamiento de las urgencias endocrino-metabólicas** en el adulto hospitalizado.

🔗 **App:** https://cjgaland.github.io/MetaboUrg/

## Áreas

- **Trastornos de la Glucemia**: diagnóstico (hiperglucemia simple, cetosis, cetoacidosis diabética/CAD, estado hiperglucémico hiperosmolar/EHH e hipoglucemia), calculadoras de CAD y EHH, árbol de la hipoglucemia e insulinización subcutánea e intravenosa.
- **Trastornos Hidroelectrolíticos**: sodio y potasio (cada uno con su diagnóstico y dos tratamientos), calcio, fósforo y magnesio.
- **Patología Tiroidea**: tormenta tiroidea (escala de Burch-Wartofsky) y coma mixedematoso.
- **Trastornos Suprarrenales**: crisis suprarrenal, apoplejía, Addison, Cushing, feocromocitoma e hiperaldosteronismo primario (Conn).

## Características

- **Diagnóstico guiado**: introduce los datos del paciente y la herramienta identifica el cuadro, su gravedad y el módulo de tratamiento recomendado.
- **Cálculos automáticos**: osmolalidad efectiva, sodio corregido, déficit de agua y de sodio, calcio corregido por albúmina, ritmos de perfusión en ml/h…
- **Protocolos de tratamiento** con dosis por peso y analítica; en Glucemia, la pauta actual (SEEN / ADA-EASD 2024) con nota de la variante institucional (SAEDYN 2017).
- **Síntomas y signos** plegables y **glosario** con explicación de epónimos y tecnicismos.
- **Informe copiable** para pegar en la historia clínica.
- PWA instalable y **offline**; modo claro/oscuro; aviso de **nueva versión** al actualizar.

## Arquitectura

SPA única (un `index.html`, un Service Worker, una caché → navegación instantánea sin saltos), con el código organizado en módulos. HTML/CSS/JS puro, sin frameworks ni dependencias.

```
index.html                    Shell + vistas + modales
styles.css                    Estilos (tokens claro/oscuro, responsive)
shared/
  core.js                     Enrutado, temas, portal y áreas, glosario, novedades, PWA/actualización
  formulas.js                 Fórmulas clínicas (osmolalidad, Na corregido, déficit de agua, …)
  informe.js                  Generador de informe copiable
modulos/
  glucemia/                   protocolos.js (datos) + diagnóstico, CAD, EHH, hipoglucemia,
                              insulinización SC e IV
  hidro/                      protocolos.js (datos) + sodio, potasio, calcio, fósforo, magnesio
  endo/                       protocolos.js (datos) + tiroides, suprarrenal
  sintomas.js                 Tarjetas de síntomas y signos de cada vista
sw.js · manifest.json · icon-*.svg
```

Los valores clínicos (umbrales, dosis, ritmos) viven en los `protocolos.js` de cada área, separados de la lógica, para que sean auditables.

## Fuentes

**Glucemia**
- Consenso **ADA/EASD/JBDS/AACE/DTS 2024** — Hyperglycemic Crises in Adults (Diabetes Care 2024;47:1257).
- **SEEN** — Sociedad Española de Endocrinología y Nutrición.
- **SAEDYN** — Sociedad Andaluza de Endocrinología, Diabetes y Nutrición (insulinización IV y SC, 2017).

**Trastornos hidroelectrolíticos**
- Guía europea de hiponatremia 2014 (ESICM/ESE/ERA-EDTA) y guía española SEN-SEEN-SEMI.
- UK Kidney Association 2023 — hiperpotasemia aguda.
- Endocrine Society 2023 — hipercalcemia de malignidad.
- Nefrología al día (S.E.N.), Merck/MSD y EMCrit.

**Tiroides y suprarrenales**
- JCEM 2025 — Approach to the patient with thyroid storm y escala de Burch-Wartofsky.
- NICE NG243 (2024) y Society for Endocrinology — insuficiencia y crisis suprarrenal.
- Endocrine Society — hiperaldosteronismo primario (2025).
- Merck/MSD (feocromocitoma, Cushing, Addison) y EMCrit.

## Aviso

Herramienta de **apoyo a la decisión clínica**. No sustituye el juicio del profesional ni los protocolos del centro. Verifique siempre dosis y pautas.

---

Diseñada y desarrollada por **Carlos J. Galán Doval**.
