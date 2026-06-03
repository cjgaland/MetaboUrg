// ============================================================
//  shared/informe.js — Generador de informe copiable
//  Reutilizable por todos los módulos. Expuesto en App.informe.
//  Uso:
//    cont.innerHTML = ... + App.informe.bloque(textoPlano);
//    App.informe.bind();   // tras inyectar el HTML
// ============================================================

function bloqueInforme(texto) {
  return '<div class="report-card">' +
    '<div class="report-head"><h3>Texto para el informe</h3>' +
    '<button class="btn-copy" id="btn-copiar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copiar</span></button></div>' +
    '<textarea class="report-textarea" id="report-text" spellcheck="false">' + escHtml(texto) + "</textarea>" +
    '<p class="report-hint">Puedes editar el texto antes de copiarlo y pegarlo en la historia clínica.</p></div>';
}

function bindInforme() {
  const btn = document.getElementById("btn-copiar");
  if (btn) btn.addEventListener("click", copiarInforme);
}

function copiarInforme() {
  const ta = document.getElementById("report-text");
  const texto = ta ? ta.value : "";
  const ok = () => {
    const btn = document.getElementById("btn-copiar");
    if (btn) {
      btn.classList.add("copied");
      btn.querySelector("span").textContent = "Copiado";
      setTimeout(() => { btn.classList.remove("copied"); btn.querySelector("span").textContent = "Copiar"; }, 2000);
    }
    toast("Copiado al portapapeles");
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(ok, () => fallbackCopy(ta));
  } else fallbackCopy(ta);
}

function fallbackCopy(ta) {
  if (!ta) { toast("Selecciona y copia manualmente", true); return; }
  ta.focus(); ta.select(); ta.setSelectionRange(0, 99999);
  try {
    const okc = document.execCommand("copy");
    if (window.getSelection) window.getSelection().removeAllRanges();
    toast(okc ? "Copiado al portapapeles" : "Selecciona y copia manualmente", !okc);
  } catch (e) { toast("Selecciona y copia manualmente", true); }
}

// Cabecera estándar para los informes (título + fecha/hora).
function cabeceraInforme(titulo) {
  const sep = "----------------------------------------------";
  const fecha = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return titulo + "\n" + sep + "\nFecha: " + fecha + "\n";
}

App.informe = { bloque: bloqueInforme, bind: bindInforme, cabecera: cabeceraInforme, SEP: "----------------------------------------------" };
