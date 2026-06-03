# MetaboUrg · Urgencias endocrino-metabólicas

Portal de utilidades clínicas (PWA) de apoyo al **diagnóstico y tratamiento de las urgencias endocrino-metabólicas** en el adulto hospitalizado.

Primer módulo: **Trastornos de la Glucemia** (hiperglucemia simple, cetosis, cetoacidosis diabética/CAD, estado hiperglucémico hiperosmolar/EHH e hipoglucemia). A futuro: trastornos hidroelectrolíticos (sodio, potasio, calcio, fósforo y magnesio).

🔗 **App:** https://cjgaland.github.io/MetaboUrg/

## Características

- **Triaje diagnóstico**: introduce los datos del paciente y la herramienta identifica el cuadro y su gravedad.
- Cálculo automático de **osmolalidad efectiva** y **sodio corregido**.
- **Protocolos de tratamiento** en 3 ejes (fluidos, insulina, potasio) con la variante actual (SEEN / ADA-EASD 2024) y nota de la institucional (SAEDYN 2017).
- **Informe copiable** para pegar en la historia clínica.
- PWA instalable y **offline**; modo claro/oscuro; aviso de **nueva versión** al actualizar.

## Arquitectura

SPA única (un `index.html`, un Service Worker, una caché → navegación instantánea sin saltos), con el código organizado en módulos. HTML/CSS/JS puro, sin frameworks ni dependencias.

```
index.html                    Shell + vistas + modales
styles.css                    Estilos (tokens claro/oscuro, responsive)
shared/
  core.js                     Enrutado, temas, portal, novedades, PWA/actualización
  formulas.js                 Fórmulas clínicas (osmolalidad, Na corregido, …)
  informe.js                  Generador de informe copiable
modulos/
  glucemia/
    protocolos.js             Datos clínicos (umbrales, gravedad, tratamientos)
    glucemia.js               Vistas y lógica del módulo (triaje, …)
sw.js · manifest.json · icon-*.svg
```

## Fuentes

- Consenso **ADA/EASD/JBDS/AACE/DTS 2024** — Hyperglycemic Crises in Adults (Diabetes Care 2024;47:1257).
- **SEEN** — Sociedad Española de Endocrinología y Nutrición.
- **SAEDYN** — Sociedad Andaluza de Endocrinología, Diabetes y Nutrición (insulinización IV y SC, 2017).

## Aviso

Herramienta de **apoyo a la decisión clínica**. No sustituye el juicio del profesional ni los protocolos del centro. Verifique siempre dosis y pautas.

---

Diseñada y desarrollada por **Carlos J. Galán Doval**.
