/* confirmacion.js — página de confirmación del registro a las masterclasses.
 *
 * - Un enlace de Google Calendar por sesión y un .ics con las tres (VALARM 1 h antes),
 *   ambos generados desde campana.json → sesiones.
 * - COPIAR ENLACE con navigator.clipboard y alternativa para navegadores viejos.
 * - Conversión única (generate_lead / Lead) vía medir.conversionUnica, solo si se llegó
 *   desde el formulario (?m=<interés>). No se repite al recargar.
 * Las funciones puras se exportan para probarlas con node.
 */
(function () {
  'use strict';

  const INTERESES = ['grasa', 'hormonas', 'rebote', 'todas'];
  const URL_REGISTRO = 'https://drmarcososa.com/masterclass.html';
  const DOMINIO_UID = 'drmarcososa.com';

  /* ---------- fechas ---------- */
  const pad = n => String(n).padStart(2, '0');
  // 2026-10-07T00:00:00Z → 20261007T000000Z
  const utcCompacta = d =>
    d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';

  const rango = s => {
    const ini = new Date(s.fecha);
    const fin = new Date(ini.getTime() + (Number(s.duracion_min) || 90) * 60000);
    return { ini, fin };
  };

  /* ---------- textos del evento ---------- */
  const tituloEvento = s => 'Masterclass en vivo: ' + s.titulo + ' · Dr. Marco Sosa';
  const detalleEvento = s =>
    'Masterclass gratuita en vivo con el Dr. Marco Sosa. ' +
    'El enlace para conectarte llega a tu correo con los recordatorios. ' +
    'Conéctate en vivo para enviar tus preguntas.\n\n' + URL_REGISTRO;
  const lugarEvento = s => (s.enlace_vivo && /^https:\/\//.test(s.enlace_vivo)) ? s.enlace_vivo : 'En línea';

  /* ---------- Google Calendar ---------- */
  const urlGoogle = s => {
    const { ini, fin } = rango(s);
    const q = new URLSearchParams({
      action: 'TEMPLATE',
      text: tituloEvento(s),
      dates: utcCompacta(ini) + '/' + utcCompacta(fin),
      details: detalleEvento(s),
      location: lugarEvento(s)
    });
    // la barra de dates se deja literal, como la documenta Google
    return 'https://calendar.google.com/calendar/render?' + q.toString().replace(/(dates=[^&]*?)%2F/, '$1/');
  };

  /* ---------- iCalendar (RFC 5545) ---------- */
  const escIcs = t => String(t)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  // pliega a 75 octetos sin partir caracteres multibyte
  const plegar = linea => {
    const bytes = c => {
      const p = c.codePointAt(0);
      return p < 0x80 ? 1 : p < 0x800 ? 2 : p < 0x10000 ? 3 : 4;
    };
    const partes = [];
    let actual = '';
    let n = 0;
    let limite = 75;
    for (const c of linea) {
      const b = bytes(c);
      if (n + b > limite) {
        partes.push(actual);
        actual = '';
        n = 0;
        limite = 74; // las continuaciones empiezan con un espacio
      }
      actual += c;
      n += b;
    }
    partes.push(actual);
    return partes.join('\r\n ');
  };

  const ics = (sesiones, ahora) => {
    const sello = utcCompacta(ahora || new Date());
    const l = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dr. Marco Sosa//Masterclasses//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Masterclasses Dr. Marco Sosa'
    ];
    sesiones.forEach(s => {
      const { ini, fin } = rango(s);
      l.push(
        'BEGIN:VEVENT',
        'UID:masterclass-' + s.id + '-' + ini.getUTCFullYear() + '@' + DOMINIO_UID,
        'DTSTAMP:' + sello,
        'DTSTART:' + utcCompacta(ini),
        'DTEND:' + utcCompacta(fin),
        'SUMMARY:' + escIcs(tituloEvento(s)),
        'DESCRIPTION:' + escIcs(detalleEvento(s)),
        'LOCATION:' + escIcs(lugarEvento(s)),
        'URL:' + URL_REGISTRO,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:' + escIcs('En una hora: ' + s.titulo),
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT'
      );
    });
    l.push('END:VCALENDAR');
    return l.map(plegar).join('\r\n') + '\r\n';
  };

  const api = { utcCompacta, urlGoogle, ics, plegar, escIcs, URL_REGISTRO };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  /* ================= navegador ================= */
  const medir = (ev, d) => { try { if (window.medir) window.medir(ev, d); } catch (e) { /* nada */ } };
  const campana = () => (window.leerCampana ? window.leerCampana()
    : fetch('campana.json').then(r => r.json()).catch(() => ({})));

  /* ---------- conversión única ---------- */
  try {
    const m = new URLSearchParams(location.search).get('m') || '';
    if (INTERESES.includes(m) && window.medir && window.medir.conversionUnica) {
      const o = window.medir.origen ? window.medir.origen() : {};
      window.medir.conversionUnica('registro-masterclasses', { interes: m, origen: o.origen || '' });
    }
  } catch (e) { /* nada */ }

  /* ---------- calendario ---------- */
  const lista = document.querySelector('[data-calendario]');
  const botonIcs = document.querySelector('[data-ics]');
  const avisoIcs = document.querySelector('[data-ics-estado]');

  campana().then(cfg => {
    const sesiones = (cfg && cfg.sesiones) || [];
    if (!sesiones.length) return;

    if (lista) {
      sesiones.forEach(s => {
        const li = lista.querySelector('[data-sesion="' + s.id + '"]');
        if (!li || li.querySelector('a')) return;
        const a = document.createElement('a');
        a.className = 'boton boton-terciario camp-cal-enlace';
        a.href = urlGoogle(s);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Añadir a Google Calendar';
        const titulo = li.querySelector('.camp-cal-titulo');
        if (titulo) {
          if (!titulo.id) titulo.id = 'cal-' + s.id;
          a.setAttribute('aria-describedby', titulo.id);
        }
        a.addEventListener('click', () => medir('calendario_google', { sesion: s.id }));
        li.appendChild(a);
      });
    }

    if (botonIcs) {
      botonIcs.hidden = false;
      botonIcs.addEventListener('click', () => {
        try {
          const blob = new Blob([ics(sesiones)], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'masterclasses-dr-marco-sosa.ics';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          if (avisoIcs) avisoIcs.textContent = 'Listo: abre el archivo descargado para añadir las tres fechas a tu calendario.';
          medir('calendario_ics', {});
        } catch (e) {
          if (avisoIcs) avisoIcs.textContent = 'No pudimos generar el archivo. Usa los enlaces de Google Calendar.';
        }
      });
    }
  });

  /* ---------- compartir ---------- */
  const campoEnlace = document.querySelector('[data-enlace-compartir]');
  const botonCopiar = document.querySelector('[data-copiar]');
  const avisoCopiar = document.querySelector('[data-copiar-estado]');

  const copiaVieja = texto => {
    const t = document.createElement('textarea');
    t.value = texto;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  };

  if (botonCopiar && campoEnlace) {
    botonCopiar.hidden = false;
    botonCopiar.addEventListener('click', async () => {
      const texto = campoEnlace.value;
      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(texto);
          ok = true;
        } else {
          ok = copiaVieja(texto);
        }
      } catch (e) { ok = copiaVieja(texto); }
      if (avisoCopiar) {
        avisoCopiar.textContent = ok
          ? 'Enlace copiado. Pégalo donde quieras compartirlo.'
          : 'No se pudo copiar. Selecciona el enlace y cópialo manualmente.';
      }
      if (!ok) { campoEnlace.focus(); campoEnlace.select(); }
      medir('compartir', { medio: 'copiar', ok: ok });
    });
  }

  const wa = document.querySelector('[data-compartir-whatsapp]');
  if (wa) wa.addEventListener('click', () => medir('compartir', { medio: 'whatsapp' }));
})();
