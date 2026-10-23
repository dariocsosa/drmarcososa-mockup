/* Registro a las masterclasses.
   El sitio es estático: el formulario envía a un destino externo que se
   configura en Web/sitio.json → formularios.masterclass. Si ese destino está
   vacío, el formulario no finge que registró a nadie: avisa y se queda.

   Además guarda de dónde vino la persona —la tarjeta, el botón o la página—
   para que cada registro lleve su fuente de conversión. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const CLAVE = 'mc-origen';
  const guardar = v => { try { sessionStorage.setItem(CLAVE, v); } catch (_) {} };
  const leer = () => { try { return sessionStorage.getItem(CLAVE); } catch (_) { return null; } };

  if (params.get('origen')) guardar(params.get('origen'));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-origen]');
    if (a) guardar(a.dataset.origen);
  });

  const forma = document.getElementById('registro-masterclass');
  if (!forma) return;
  const estado = forma.querySelector('.formulario-estado');
  const boton = forma.querySelector('button[type="submit"]');
  const decir = (texto, clase) => { estado.textContent = texto; estado.className = 'formulario-estado ' + (clase || ''); };

  const destinoInicial = (forma.getAttribute('action') || '').trim();

  forma.addEventListener('submit', async e => {
    e.preventDefault();
    const destino = destinoInicial;
    const origen = leer() || 'directo';
    forma.elements.origen.value = origen;
    forma.elements.pagina.value = location.pathname.split('/').pop() || 'index.html';
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => { forma.elements[k].value = params.get(k) || ''; });

    if (!destino) {
      decir('El registro no está disponible en este momento. Inténtalo de nuevo más tarde.', 'error');
      return;
    }
    boton.disabled = true;
    decir('Enviando…');
    try {
      // no-cors: sirve para cualquier proveedor que reciba un POST de formulario.
      // La respuesta es opaca; lo que sí se detecta es la falta de conexión.
      await fetch(destino, { method: 'POST', body: new FormData(forma), mode: 'no-cors' });
      decir('Listo, quedaste registrado. Revisa tu correo.', 'ok');
      setTimeout(() => {
        location.href = 'gracias.html?de=masterclass&origen=' + encodeURIComponent(origen);
      }, 1200);
    } catch (_) {
      boton.disabled = false;
      decir('No pudimos enviar tu registro. Revisa tu conexión e inténtalo de nuevo.', 'error');
    }
  });
})();
