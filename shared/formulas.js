// ============================================================
//  shared/formulas.js — Fórmulas clínicas reutilizables
//  Expuestas en App.formulas (las usan los módulos).
// ============================================================

// Osmolalidad efectiva (mOsm/kg) = 2·Na + glucosa/18
function osmolalidadEfectiva(na, glu) {
  if (na === null || na === undefined || glu === null || glu === undefined) return null;
  return 2 * na + glu / 18;
}

// Sodio corregido por hiperglucemia = Na + 1,6·((glu−100)/100)
function naCorregido(na, glu) {
  if (na === null || na === undefined || glu === null || glu === undefined) return null;
  return na + 1.6 * ((glu - 100) / 100);
}

App.formulas = { osmolalidadEfectiva, naCorregido };
