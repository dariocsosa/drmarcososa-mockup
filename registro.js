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

  // Modo WhatsApp: sin destino de formulario pero con número. Se ocultan y
  // desactivan correo, teléfono y autorización —no se guarda nada acá— y el
  // botón arma el mensaje con lo que la persona llenó.
  const destinoInicial = (forma.getAttribute('action') || '').trim();
  const numero = (forma.dataset.whatsapp || '').replace(/\D/g, '');
  const modoWhatsapp = !destinoInicial && numero.length > 0;
  if (modoWhatsapp) {
    forma.querySelectorAll('[data-modo="formulario"]').forEach(n => {
      n.hidden = true;
      n.querySelectorAll('input, select').forEach(c => { c.disabled = true; });
    });
    forma.querySelectorAll('[data-modo="whatsapp"]').forEach(n => { n.hidden = false; });
    boton.textContent = 'Registrarme por WhatsApp';
  }
  const textoDe = nombre => {
    const c = forma.elements[nombre];
    return c.tagName === 'SELECT' ? c.options[c.selectedIndex].text : c.value.trim();
  };

  forma.addEventListener('submit', async e => {
    e.preventDefault();
    if (modoWhatsapp) {
      const mensaje =
        'Hola, quiero registrarme a la masterclass gratuita en vivo del Dr. Marco Sosa ' +
        '(6, 7 y 8 de octubre, 7:00 p. m. hora Colombia). ' +
        'Mi nombre es: ' + textoDe('nombre') +
        ' · País y ciudad: ' + textoDe('pais') + ', ' + textoDe('ciudad') +
        ' · Perfil: ' + textoDe('perfil') +
        ' · Me interesa: ' + textoDe('interes');
      const url = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
      // sin 'noopener' en los rasgos: con él, window.open siempre devuelve null
      // y no se podría saber si el navegador bloqueó la pestaña nueva
      const ventana = window.open(url, '_blank');
      if (ventana) ventana.opener = null;
      else location.href = url;
      decir('Se abrió WhatsApp con tu mensaje. Envíalo y te respondemos con los enlaces.', 'ok');
      return;
    }
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
    decir('Enviando tu registro…');
    try {
      // no-cors: sirve para cualquier proveedor que reciba un POST de formulario.
      // La respuesta es opaca; lo que sí se detecta es la falta de conexión.
      await fetch(destino, { method: 'POST', body: new FormData(forma), mode: 'no-cors' });
      decir('Tu registro está listo. Revisa tu correo para confirmar tu acceso a las tres masterclasses.', 'ok');
      setTimeout(() => {
        location.href = 'gracias.html?de=masterclass&origen=' + encodeURIComponent(origen);
      }, 1200);
    } catch (_) {
      boton.disabled = false;
      decir('No pudimos enviar tu registro. Revisa tu conexión e inténtalo de nuevo.', 'error');
    }
  });
})();
