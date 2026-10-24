/* Descarga de recursos gratis. La URL trae el recurso (?r=...) y, si viene de un video o
   de una publicación, su origen (?origen=...). Al terminar el registro, registro.js manda a
   la persona a esta misma página con ok=1 y aquí se muestra la descarga.
   Nota: el PDF es público si alguien conoce su dirección; el formulario es una cortesía a
   cambio del material, no un control de acceso. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const r = params.get('r') || '';
  const ok = params.get('ok') === '1';
  const hallado = document.querySelector('[data-recurso="' + r + '"]');
  const mostrar = (id, si) => { const e = document.getElementById(id); if (e) e.hidden = !si; };

  if (!hallado) {
    document.getElementById('recurso-info').hidden = true;
    mostrar('paso-elige', true);
    return;
  }
  hallado.hidden = false;
  const boton = document.querySelector('[data-descarga="' + r + '"]');

  if (ok) {
    mostrar('paso-listo', true);
    if (boton) {
      boton.hidden = false;
      // la descarga arranca sola; el botón queda por si el navegador la bloquea
      setTimeout(() => boton.click(), 600);
    }
    return;
  }

  mostrar('paso-datos', true);
  const forma = document.getElementById('registro-masterclass');
  if (!forma) return;
  forma.dataset.exito = 'descarga.html?r=' + encodeURIComponent(r) + '&ok=1';
  // la fuente de conversión lleva el recurso: "youtube-mc1 · dieta-antiinflamatoria"
  try { sessionStorage.setItem('mc-origen', (params.get('origen') || 'directo') + ' · ' + r); } catch (_) {}
})();
