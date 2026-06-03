# Trastornos de la Glucemia

Utilidad clínica (PWA) de apoyo al **diagnóstico y tratamiento de los trastornos agudos de la glucemia** en el adulto hospitalizado: hiperglucemia simple, cetosis, cetoacidosis diabética (CAD), estado hiperglucémico hiperosmolar (EHH) e hipoglucemia.

Forma parte de un portal de utilidades de **Endocrinología y Metabolismo** (a futuro: sodio, potasio, calcio, fósforo y magnesio).

🔗 **App:** https://cjgaland.github.io/Glucemia/

## Características

- **Triaje diagnóstico**: introduce los datos del paciente y la herramienta identifica el cuadro y su gravedad.
- Cálculo automático de **osmolalidad efectiva** y **sodio corregido**.
- **Protocolos de tratamiento** en 3 ejes (fluidos, insulina, potasio) con la variante actual (SEEN / ADA-EASD 2024) y nota de la institucional (SAEDYN 2017).
- **Informe copiable** para pegar en la historia clínica.
- PWA instalable y **offline**; modo claro/oscuro; aviso de **nueva versión** al actualizar.

## Tecnología

HTML, CSS y JavaScript puro (sin frameworks ni dependencias). PWA con Service Worker (network-first). Se sirve como sitio estático en GitHub Pages.

```
index.html      Estructura + modales
styles.css      Estilos (tokens claro/oscuro, responsive)
app.js          Lógica: enrutado, motor diagnóstico, informe, PWA
protocolos.js   Datos clínicos (umbrales, gravedad, tratamientos)
sw.js           Service Worker
manifest.json   Manifest PWA
```

## Fuentes

- Consenso **ADA/EASD/JBDS/AACE/DTS 2024** — Hyperglycemic Crises in Adults (Diabetes Care 2024;47:1257).
- **SEEN** — Sociedad Española de Endocrinología y Nutrición.
- **SAEDYN** — Sociedad Andaluza de Endocrinología, Diabetes y Nutrición (folletos de insulinización IV y SC, 2017).

## Aviso

Herramienta de **apoyo a la decisión clínica**. No sustituye el juicio del profesional ni los protocolos del centro. Verifique siempre dosis y pautas.

---

Diseñada y desarrollada por **Carlos J. Galán Doval**.
