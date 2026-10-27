/* Descarga de recursos gratis. La URL trae el recurso (?r=...) y, si viene de un video o
   de una publicación, su origen (?origen=...). Al terminar el registro, registro.js manda a
   la persona a esta misma página con ok=1 y aquí se muestra la descarga.
   Nota: el PDF es público si alguien conoce su dirección; el formulario es una cortesía a
   cambio del material, no un control de acceso. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  // los enlaces con el nombre anterior siguen funcionando
  const alias = { 'dieta-antiinflamatoria': 'plan-antiinflamatorio', 'dieta-disbiosis': 'plan-disbiosis' };  // y 'guias' es el enlace de las dos guías
  const r0 = params.get('r') || '';
  const r = alias[r0] || r0;
  const ok = params.get('ok') === '1';
  const hallado = document.querySelector('[data-recurso="' + r + '"]');
  const mostrar = (id, si) => { const e = document.getElementById(id); if (e) e.hidden = !si; };

  if (!hallado) {
    document.getElementById('recurso-info').hidden = true;
    mostrar('paso-elige', true);
    return;
  }
  hallado.hidden = false;
  const botones = document.querySelectorAll('[data-descarga="' + r + '"]');

  if (ok) {
    mostrar('paso-listo', true);
    botones.forEach(b => { b.hidden = false; });
    // con un solo archivo la descarga arranca sola; con varios quedan los botones,
    // porque el navegador pide permiso para bajar varios a la vez
    if (botones.length === 1) setTimeout(() => botones[0].click(), 600);
    return;
  }

  mostrar('paso-datos', true);
  const forma = document.getElementById('registro-masterclass');
  if (!forma) return;
  forma.dataset.exito = 'descarga.html?r=' + encodeURIComponent(r) + '&ok=1';
  // la fuente de conversión lleva el recurso: "youtube-mc1 · plan-antiinflamatorio"
  try { sessionStorage.setItem('mc-origen', (params.get('origen') || 'directo') + ' · ' + r); } catch (_) {}
})();
