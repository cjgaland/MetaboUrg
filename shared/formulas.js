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

// Osmolaridad plasmática total (mOsm/l) = 2·Na + glucosa/18 + urea/6
function osmolaridadTotal(na, glu, urea) {
  if (na === null || na === undefined || glu === null || glu === undefined || urea === null || urea === undefined) return null;
  return 2 * na + glu / 18 + urea / 6;
}

// Agua corporal total (litros) = peso × factor (0,6 varón adulto; 0,5 mujer/anciano)
function aguaCorporalTotal(peso, factor) {
  if (peso === null || peso === undefined) return null;
  return peso * (factor || 0.6);
}

// Déficit de agua libre (litros) = ((Na/Na deseado) − 1) × ACT
function deficitAgua(na, naDeseado, act) {
  if (na === null || na === undefined || !naDeseado || act === null || act === undefined) return null;
  return (na / naDeseado) * act - act;
}

// Pérdidas insensibles/diarias estimadas (litros) = mlkg × peso / 1000
function perdidasEstimadas(peso, mlkg) {
  if (peso === null || peso === undefined) return null;
  return (mlkg * peso) / 1000;
}

// Fracción de excreción de Na (%) = (NaOrina·CreaSuero)/(NaSuero·CreaOrina)·100
function fena(naOrina, creaSuero, naSuero, creaOrina) {
  if ([naOrina, creaSuero, naSuero, creaOrina].some(v => v === null || v === undefined) || naSuero === 0 || creaOrina === 0) return null;
  return (naOrina * creaSuero) / (naSuero * creaOrina) * 100;
}

// Déficit de bicarbonato (mEq) = 0,3 × peso × exceso de bases (EB suele ser negativo)
function deficitHCO3(peso, eb) {
  if (peso === null || peso === undefined || eb === null || eb === undefined) return null;
  return 0.3 * peso * eb;
}

App.formulas = { osmolalidadEfectiva, naCorregido, osmolaridadTotal, aguaCorporalTotal, deficitAgua, perdidasEstimadas, fena, deficitHCO3 };
