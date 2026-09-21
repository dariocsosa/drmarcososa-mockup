/* registro.js — formulario de registro a las masterclasses y hora local.
 *
 * Dibuja el formulario dentro de cada [data-formulario-registro] (masterclass.html y,
 * si el home lo quiere, un <div data-formulario-registro data-origen="home"></div>).
 * El marcado vive solo aquí: una fuente, dos páginas.
 *
 * Configuración: campana.json → formulario (lo publica el build desde Web/sitio.json):
 *   endpoint     URL https del proveedor. Vacío = el formulario no envía y lo dice.
 *   proveedor    "mailerlite" | "brevo" | … (solo informativo; decide los extra por defecto)
 *   campos       { nombre_interno: "nombre_en_el_proveedor" }. Lo que no está mapeado no viaja.
 *   extra        { nombre: valor } fijos que el proveedor exige (MailerLite: ml-submit, anticsrf).
 *   confirmacion página de destino tras el éxito (por defecto confirmacion.html).
 *
 * Además rellena cada [data-hora-local="<id de sesión>"] con «En tu hora local: …»
 * cuando la zona del navegador no es la de Colombia.
 */
(() => {
  'use strict';

  const INTERESES = ['grasa', 'hormonas', 'rebote', 'todas'];

  /* Mapeo por defecto: formulario embebido de MailerLite. Los campos personalizados
     (perfil, interes, origen, utm…) hay que crearlos en MailerLite con estos nombres. */
  const CAMPOS_MAILERLITE = {
    nombre: 'fields[name]',
    correo: 'fields[email]',
    whatsapp: 'fields[phone]',
    pais: 'fields[country]',
    ciudad: 'fields[city]',
    perfil: 'fields[perfil]',
    interes: 'fields[interes]',
    autorizacion: 'fields[autorizacion]',
    origen: 'fields[origen]',
    origen_entrada: 'fields[origen_entrada]',
    utm_source: 'fields[utm_source]',
    utm_medium: 'fields[utm_medium]',
    utm_campaign: 'fields[utm_campaign]',
    utm_content: 'fields[utm_content]',
    pagina: 'fields[pagina]',
    fecha: 'fields[fecha_registro]'
  };
  const EXTRA_MAILERLITE = { 'ml-submit': '1', anticsrf: 'true' };

  const CODIGOS = [
    ['CO', '+57', 'Colombia'],
    ['DO', '+1', 'República Dominicana'],
    ['US', '+1', 'Estados Unidos'],
    ['VE', '+58', 'Venezuela'],
    ['EC', '+593', 'Ecuador'],
    ['PE', '+51', 'Perú'],
    ['PA', '+507', 'Panamá'],
    ['MX', '+52', 'México'],
    ['ES', '+34', 'España'],
    ['XX', '', 'Otro país']
  ];

  const leerSesion = k => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const guardarSesion = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const medir = (ev, d) => { try { if (window.medir) window.medir(ev, d); } catch (e) { /* nada */ } };
  const campana = () => (window.leerCampana ? window.leerCampana()
    : fetch('campana.json').then(r => r.json()).catch(() => ({})));

  /* ================= hora local ================= */
  const ZONA_CO = 'America/Bogota';
  const mismaHora = (fecha, zona) => {
    try {
      const o = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
      return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: zona }, o)).format(fecha) ===
             new Intl.DateTimeFormat('en-US', o).format(fecha);
    } catch (e) { return true; }
  };

  const pintarHoraLocal = cfg => {
    const nodos = document.querySelectorAll('[data-hora-local]');
    if (!nodos.length || !cfg.sesiones) return;
    const zona = cfg.zona || ZONA_CO;
    nodos.forEach(n => {
      try {
        const s = cfg.sesiones.find(x => x.id === n.getAttribute('data-hora-local'));
        if (!s) return;
        const f = new Date(s.fecha);
        if (isNaN(f) || mismaHora(f, zona)) return; // ya está en hora Colombia
        const soloHora = n.getAttribute('data-hora-formato') === 'hora';
        const opciones = soloHora
          ? { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
          : { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
        n.textContent = 'En tu hora local: ' + new Intl.DateTimeFormat('es-CO', opciones).format(f);
        n.hidden = false;
      } catch (e) { /* sin Intl: queda la hora de Colombia */ }
    });
  };

  /* ================= marcado del formulario ================= */
  let contador = 0;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const campoTexto = (p, nombre, etiqueta, tipo, extra) => `
    <div class="camp-campo">
      <label for="${p}-${nombre}">${etiqueta}</label>
      <input id="${p}-${nombre}" name="${nombre}" type="${tipo}" ${extra || ''}
             required aria-required="true" aria-describedby="${p}-${nombre}-error">
      <p class="camp-error" id="${p}-${nombre}-error" hidden></p>
    </div>`;

  const grupo = (p, nombre, leyenda, opciones) => `
    <fieldset class="camp-campo camp-opciones" id="${p}-${nombre}" aria-describedby="${p}-${nombre}-error">
      <legend>${leyenda}</legend>
      ${opciones.map(([v, t]) => `
      <label class="camp-opcion">
        <input type="radio" name="${nombre}" value="${v}" required>
        <span>${t}</span>
      </label>`).join('')}
      <p class="camp-error" id="${p}-${nombre}-error" hidden></p>
    </fieldset>`;

  const marcado = p => `
  <form class="camp-form" novalidate data-registro>
    <p class="camp-estado" id="${p}-estado" role="status" aria-live="polite" hidden></p>
    <p class="camp-obligatorios">Todos los campos son obligatorios.</p>

    ${campoTexto(p, 'nombre', 'Nombre completo', 'text', 'autocomplete="name" maxlength="120"')}
    ${campoTexto(p, 'correo', 'Correo electrónico', 'email', 'autocomplete="email" inputmode="email" maxlength="160"')}

    <div class="camp-campo">
      <label for="${p}-whatsapp">WhatsApp con código de país</label>
      <div class="camp-tel">
        <label class="solo-lectores" for="${p}-codigo">Código de país</label>
        <select id="${p}-codigo" name="codigo">
          ${CODIGOS.map(([iso, cod, pais]) =>
            `<option value="${iso}" data-codigo="${cod}" data-pais="${iso === 'XX' ? '' : esc(pais)}">${esc(pais)}${cod ? ' (' + cod + ')' : ''}</option>`).join('')}
        </select>
        <input id="${p}-whatsapp" name="whatsapp" type="tel" autocomplete="tel-national" inputmode="tel"
               maxlength="24" required aria-required="true"
               aria-describedby="${p}-whatsapp-ayuda ${p}-whatsapp-error">
      </div>
      <p class="camp-ayuda" id="${p}-whatsapp-ayuda">Elige tu país y escribe el número. Si tu país no está en la lista, escríbelo completo con el signo +, por ejemplo +54 9 11 1234 5678.</p>
      <p class="camp-error" id="${p}-whatsapp-error" hidden></p>
    </div>

    <div class="camp-fila">
      ${campoTexto(p, 'pais', 'País', 'text', 'autocomplete="country-name" maxlength="60"')}
      ${campoTexto(p, 'ciudad', 'Ciudad', 'text', 'autocomplete="address-level2" maxlength="80"')}
    </div>

    ${grupo(p, 'perfil', 'Perfil', [
      ['salud-personal', 'Salud personal'],
      ['profesional', 'Profesional de la salud'],
      ['otro', 'Otro']
    ])}

    ${grupo(p, 'interes', 'Masterclass de mayor interés', [
      ['grasa', 'Distribución de grasa'],
      ['hormonas', 'Hormonas'],
      ['rebote', 'Efecto rebote'],
      ['todas', 'Las tres']
    ])}

    <div class="camp-campo camp-autorizacion">
      <label class="consentimiento" for="${p}-autorizacion">
        <input id="${p}-autorizacion" type="checkbox" name="autorizacion" value="si" required
               aria-required="true" aria-describedby="${p}-autorizacion-error">
        <span>Autorizo el tratamiento de mis datos personales para gestionar mi registro a las
          masterclasses y recibir los enlaces y recordatorios de cada transmisión, según la
          <a href="privacidad.html">política de privacidad</a> y la
          <a href="datos.html">política de tratamiento de datos</a>.</span>
      </label>
      <p class="camp-error" id="${p}-autorizacion-error" hidden></p>
    </div>

    <div class="camp-trampa" aria-hidden="true">
      <label for="${p}-sitio">No llenes este campo</label>
      <input id="${p}-sitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
    </div>

    <input type="hidden" name="origen">
    <input type="hidden" name="origen_entrada">
    <input type="hidden" name="utm_source">
    <input type="hidden" name="utm_medium">
    <input type="hidden" name="utm_campaign">
    <input type="hidden" name="utm_content">
    <input type="hidden" name="pagina">
    <input type="hidden" name="fecha">

    <button class="boton boton-lleno boton-grande camp-enviar" id="${p}-boton" type="submit">QUIERO REGISTRARME GRATIS</button>
  </form>`;

  /* ================= validación ================= */
  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const telefonoCompleto = form => {
    const crudo = (form.whatsapp.value || '').trim();
    const limpio = crudo.replace(/[^\d+]/g, '');
    if (limpio.startsWith('+')) return '+' + limpio.slice(1).replace(/\+/g, '');
    if (limpio.startsWith('00')) return '+' + limpio.slice(2);
    const op = form.codigo.selectedOptions[0];
    const cod = op ? op.getAttribute('data-codigo') : '';
    if (!cod) return limpio; // «Otro país» sin +: inválido abajo
    return cod + limpio.replace(/^0+/, '');
  };

  const reglas = {
    nombre: f => /\p{L}.*\p{L}/u.test(f.nombre.value.trim()) && f.nombre.value.trim().length >= 3
      ? '' : 'Escribe tu nombre completo.',
    correo: f => RE_CORREO.test(f.correo.value.trim())
      ? '' : 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    whatsapp: f => /^\+\d{8,15}$/.test(telefonoCompleto(f))
      ? '' : 'Escribe tu número de WhatsApp con el código de país.',
    pais: f => f.pais.value.trim().length >= 2 ? '' : 'Escribe tu país.',
    ciudad: f => f.ciudad.value.trim().length >= 2 ? '' : 'Escribe tu ciudad.',
    perfil: f => f.querySelector('[name="perfil"]:checked') ? '' : 'Elige tu perfil.',
    interes: f => f.querySelector('[name="interes"]:checked') ? '' : 'Elige la masterclass que más te interesa.',
    autorizacion: f => f.autorizacion.checked
      ? '' : 'Para registrarte necesitas autorizar el tratamiento de tus datos.'
  };

  const marcarCampo = (form, p, nombre, mensaje) => {
    const err = form.querySelector('#' + p + '-' + nombre + '-error');
    const grupoRadio = form.querySelector('fieldset#' + p + '-' + nombre);
    const controles = grupoRadio ? grupoRadio.querySelectorAll('input') : [form.querySelector('#' + p + '-' + nombre)];
    controles.forEach(c => c && (mensaje ? c.setAttribute('aria-invalid', 'true') : c.removeAttribute('aria-invalid')));
    if (grupoRadio) grupoRadio.classList.toggle('camp-invalido', !!mensaje);
    if (err) { err.textContent = mensaje; err.hidden = !mensaje; }
  };

  const validar = (form, p) => {
    const errores = [];
    Object.keys(reglas).forEach(nombre => {
      const m = reglas[nombre](form);
      marcarCampo(form, p, nombre, m);
      if (m) errores.push(nombre);
    });
    return errores;
  };

  const enfocar = (form, p, nombre) => {
    const grupoRadio = form.querySelector('fieldset#' + p + '-' + nombre);
    const el = grupoRadio ? grupoRadio.querySelector('input') : form.querySelector('#' + p + '-' + nombre);
    if (el) el.focus();
  };

  const estado = (form, texto, tipo) => {
    const n = form.querySelector('.camp-estado');
    if (!n) return;
    n.textContent = texto || '';
    n.hidden = !texto;
    n.className = 'camp-estado' + (tipo ? ' camp-estado-' + tipo : '');
  };

  /* ================= envío ================= */
  const AVISO_SIN_ENDPOINT = 'El registro abre muy pronto. Estamos terminando de conectarlo: vuelve en unos días y reserva tu lugar.';

  const datosInternos = (form, contenedor) => {
    const o = window.medir && window.medir.origen ? window.medir.origen() : {};
    const q = new URLSearchParams(location.search);
    const ahora = new Date();
    const d = {
      nombre: form.nombre.value.trim(),
      correo: form.correo.value.trim().toLowerCase(),
      whatsapp: telefonoCompleto(form),
      pais: form.pais.value.trim(),
      ciudad: form.ciudad.value.trim(),
      perfil: form.querySelector('[name="perfil"]:checked').value,
      interes: form.querySelector('[name="interes"]:checked').value,
      autorizacion: 'si ' + ahora.toISOString(),
      origen: o.origen || leerSesion('origen') || q.get('origen') || contenedor.getAttribute('data-origen') || '',
      origen_entrada: o.origen_entrada || leerSesion('origen_entrada') || '',
      utm_source: o.utm_source || q.get('utm_source') || '',
      utm_medium: o.utm_medium || q.get('utm_medium') || '',
      utm_campaign: o.utm_campaign || q.get('utm_campaign') || '',
      utm_content: o.utm_content || q.get('utm_content') || '',
      pagina: location.pathname,
      fecha: ahora.toISOString()
    };
    // los ocultos quedan a la vista en el DOM: útil para depurar
    ['origen', 'origen_entrada', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'pagina', 'fecha']
      .forEach(k => { if (form[k]) form[k].value = d[k]; });
    return d;
  };

  const cuerpo = (datos, fcfg) => {
    const mapa = fcfg.campos && typeof fcfg.campos === 'object' && Object.keys(fcfg.campos).length
      ? fcfg.campos : CAMPOS_MAILERLITE;
    const extra = fcfg.extra && typeof fcfg.extra === 'object'
      ? fcfg.extra
      : ((fcfg.proveedor || 'mailerlite').toLowerCase() === 'mailerlite' ? EXTRA_MAILERLITE : {});
    const b = new URLSearchParams();
    Object.keys(mapa).forEach(interno => {
      const externo = mapa[interno];
      if (externo && datos[interno] !== undefined && datos[interno] !== '') b.append(externo, datos[interno]);
    });
    Object.keys(extra).forEach(k => b.append(k, extra[k]));
    return b;
  };

  const enviar = async (url, body) => {
    const ctl = 'AbortController' in window ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 15000) : null;
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: body, // URLSearchParams → application/x-www-form-urlencoded, sin preflight
        headers: { Accept: 'application/json' },
        signal: ctl ? ctl.signal : undefined
      });
      if (!r.ok) return false;
      let j = null;
      try { j = await r.json(); } catch (e) { return true; } // 2xx sin JSON: aceptado
      return !(j && (j.success === false || j.error || j.errors));
    } finally {
      if (t) clearTimeout(t);
    }
  };

  const montar = (contenedor, cfg) => {
    if (contenedor.querySelector('form[data-registro]')) return;
    const p = 'reg' + (++contador);
    contenedor.innerHTML = marcado(p);
    const form = contenedor.querySelector('form');
    const fcfg = cfg.formulario || {};
    const endpoint = String(fcfg.endpoint || '').trim();
    // https obligatorio; localhost se admite solo para pruebas locales
    const activo = /^https:\/\//.test(endpoint) || /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(endpoint);

    if (!activo) {
      console.warn('[registro] campana.json → formulario.endpoint está vacío o no es https: el formulario no envía.');
      estado(form, AVISO_SIN_ENDPOINT, 'aviso');
    }

    // el código de país sugiere el país si todavía está vacío
    form.codigo.addEventListener('change', () => {
      const op = form.codigo.selectedOptions[0];
      const pais = op ? op.getAttribute('data-pais') : '';
      if (pais && !form.pais.value.trim()) form.pais.value = pais;
    });

    // limpiar el error de un campo apenas se corrige
    form.addEventListener('change', ev => {
      const n = ev.target && ev.target.name;
      if (n && reglas[n] && form.querySelector('[aria-invalid="true"][name="' + n + '"]')) {
        marcarCampo(form, p, n, reglas[n](form));
      }
    });

    // interés preseleccionado: por el CTA clicado o por el ancla (#grasa…)
    const pre = leerSesion('interes') || location.hash.replace('#', '');
    if (INTERESES.includes(pre)) {
      const r = form.querySelector('[name="interes"][value="' + pre + '"]');
      if (r) r.checked = true;
    }

    let enviando = false;
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (enviando) return;

      const errores = validar(form, p);
      if (errores.length) {
        estado(form, errores.length === 1
          ? 'Revisa el campo marcado.'
          : 'Revisa los ' + errores.length + ' campos marcados.', 'error');
        enfocar(form, p, errores[0]);
        medir('registro_error_validacion', { campos: errores.join(',') });
        return;
      }

      if (!activo) {
        estado(form, AVISO_SIN_ENDPOINT, 'aviso');
        console.warn('[registro] envío omitido: no hay formulario.endpoint en campana.json.');
        medir('registro_sin_endpoint', {});
        return;
      }

      const datos = datosInternos(form, contenedor);
      if (form.sitio_web && form.sitio_web.value) { // trampa para robots: se finge éxito
        estado(form, 'Gracias.', 'ok');
        return;
      }

      enviando = true;
      const boton = form.querySelector('.camp-enviar');
      boton.disabled = true;
      form.setAttribute('aria-busy', 'true');
      estado(form, 'Enviando tu registro…');

      let ok = false;
      try { ok = await enviar(endpoint, cuerpo(datos, fcfg)); } catch (e) { ok = false; }

      if (ok) {
        guardarSesion('registro_interes', datos.interes);
        medir('registro_enviado', { interes: datos.interes, origen: datos.origen, perfil: datos.perfil });
        estado(form, 'Tu registro está listo. Revisa tu correo para confirmar tu acceso a las tres masterclasses.', 'ok');
        const destino = String(fcfg.confirmacion || 'confirmacion.html');
        location.href = destino + (destino.includes('?') ? '&' : '?') + 'm=' + encodeURIComponent(datos.interes);
        return;
      }

      enviando = false;
      boton.disabled = false;
      form.removeAttribute('aria-busy');
      estado(form, 'No pudimos completar tu registro. Revisa tu conexión e inténtalo de nuevo en un momento.', 'error');
      medir('registro_fallido', { interes: datos.interes });
    });
  };

  /* ================= arranque ================= */
  // un CTA con data-interes deja elegida esa masterclass en el formulario
  document.addEventListener('click', ev => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-interes]') : null;
    if (!el) return;
    const v = el.getAttribute('data-interes');
    if (!INTERESES.includes(v)) return;
    guardarSesion('interes', v);
    const r = document.querySelector('form[data-registro] [name="interes"][value="' + v + '"]');
    if (r) { r.checked = true; marcarCampoSiHaceFalta(r); }
  });
  const marcarCampoSiHaceFalta = r => {
    const fs = r.closest('fieldset');
    if (fs && fs.classList.contains('camp-invalido')) {
      fs.classList.remove('camp-invalido');
      fs.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
      const e = fs.querySelector('.camp-error');
      if (e) e.hidden = true;
    }
  };

  const contenedores = document.querySelectorAll('[data-formulario-registro]');
  const horas = document.querySelectorAll('[data-hora-local]');
  if (!contenedores.length && !horas.length) return;

  campana().then(cfg => {
    cfg = cfg || {};
    try { pintarHoraLocal(cfg); } catch (e) { console.warn('[registro]', e); }
    contenedores.forEach(c => {
      try { montar(c, cfg); } catch (e) { console.warn('[registro]', e); }
    });
  });
})();
