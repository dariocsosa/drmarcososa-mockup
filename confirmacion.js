/* Página de confirmación: una sola página para tres finales (?de=).
   En el de las masterclasses, además: el enlace para compartir apunta a la
   página de registro —nunca a esta— y la conversión se reporta una sola
   vez aunque la persona recargue. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const de = params.get('de') || 'compra';
  const bloques = document.querySelectorAll('.gracias-bloque');
  let encontrado = false;
  bloques.forEach(b => {
    const suyo = b.dataset.de === de;
    b.hidden = !suyo;
    if (suyo) encontrado = true;
  });
  if (!encontrado) document.querySelector('[data-de="compra"]').hidden = false;
  if (de !== 'masterclass') return;

  // Conversión: una vez por navegador. Si hay etiqueta de medición instalada
  // (dataLayer de Google Tag Manager), la recibe; si no, no pasa nada.
  const CLAVE = 'mc-conversion-registrada';
  let ya = false;
  try { ya = localStorage.getItem(CLAVE) === '1'; } catch (_) {}
  if (!ya) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'registro_masterclass', origen: params.get('origen') || 'directo' });
    try { localStorage.setItem(CLAVE, '1'); } catch (_) {}
  }
  // quitar el origen de la barra: si comparten esta URL por error, no hereda la fuente
  history.replaceState(null, '', location.pathname + '?de=masterclass');

  // enlaces para compartir: siempre a la página de registro del mismo sitio
  const registro = new URL('masterclass.html', location.href);
  const conOrigen = o => { const u = new URL(registro); u.searchParams.set('origen', o); return u.href; };
  const wa = document.getElementById('compartir-whatsapp');
  if (wa) {
    const texto = 'Te invito a las tres masterclasses gratuitas en vivo del Dr. Marco Sosa sobre ' +
      'obesidad y metabolismo: 6, 7 y 8 de octubre, 7:00 p. m. hora Colombia. Regístrate aquí: ' +
      conOrigen('compartido-whatsapp');
    wa.href = 'https://wa.me/?text=' + encodeURIComponent(texto);
  }
  const copiar = document.getElementById('copiar-enlace');
  const aviso = document.querySelector('.copiado');
  if (copiar) {
    copiar.addEventListener('click', async () => {
      const url = conOrigen('compartido-enlace');
      try {
        await navigator.clipboard.writeText(url);
        aviso.textContent = 'Enlace copiado. Pégalo donde quieras compartirlo.';
      } catch (_) {
        aviso.textContent = url;
      }
    });
  }
})();
