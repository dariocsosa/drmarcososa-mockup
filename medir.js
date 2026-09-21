/* medir.js — medición de la campaña. Va en TODAS las páginas.
 *
 * - Lee campana.json (lo publica el build desde Web/sitio.json).
 * - Carga GA4 y/o Meta Pixel SOLO si medicion.ga4 / medicion.meta_pixel traen valor.
 *   Vacíos: no se carga nada de terceros y los eventos se descartan en silencio.
 * - Guarda el origen de la conversión: cualquier clic en [data-origen] deja ese valor
 *   en sessionStorage.origen; ?origen= y los utm_* de la URL de entrada también se guardan.
 * - Expone:
 *     window.medir(evento, datos)             evento propio (GA4 con su nombre; Meta como trackCustom)
 *     window.medir.conversionUnica(clave, d)  generate_lead / Lead una sola vez por navegador
 *     window.medir.origen()                   { origen, origen_entrada, utm_* }
 *     window.leerCampana()                    promesa con campana.json (una sola descarga)
 * Todo en try/catch: la medición nunca rompe la página.
 */
(() => {
  'use strict';

  const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

  const guardar = (almacen, clave, valor) => {
    try { window[almacen].setItem(clave, valor); return true; } catch (e) { return false; }
  };
  const leer = (almacen, clave) => {
    try { return window[almacen].getItem(clave); } catch (e) { return null; }
  };

  /* ---------- campana.json, una sola vez ---------- */
  let promesaCampana = null;
  window.leerCampana = () => {
    if (!promesaCampana) {
      promesaCampana = fetch('campana.json', { cache: 'no-cache' })
        .then(r => { if (!r.ok) throw new Error('campana.json ' + r.status); return r.json(); })
        .catch(e => { console.warn('[medir] no se pudo leer campana.json:', e); return {}; });
    }
    return promesaCampana;
  };

  /* ---------- origen de entrada (?origen=, utm_*) ---------- */
  try {
    const q = new URLSearchParams(location.search);
    const entrada = (q.get('origen') || '').trim().slice(0, 80);
    if (entrada) {
      guardar('sessionStorage', 'origen_entrada', entrada);
      // si todavía no hubo clic en un CTA, la entrada es el origen
      if (!leer('sessionStorage', 'origen')) guardar('sessionStorage', 'origen', entrada);
    }
    UTM.forEach(k => {
      const v = (q.get(k) || '').trim().slice(0, 120);
      if (v) guardar('sessionStorage', k, v);
    });
  } catch (e) { /* URL rara: se sigue sin origen */ }

  /* ---------- cola de eventos hasta saber qué proveedores hay ---------- */
  let listo = false;
  let ga4 = '';
  let pixel = '';
  const cola = [];

  const enviar = (evento, datos, meta) => {
    try {
      if (ga4 && typeof window.gtag === 'function') window.gtag('event', evento, datos || {});
      if (pixel && typeof window.fbq === 'function') {
        if (meta) window.fbq('track', meta, datos || {});
        else window.fbq('trackCustom', evento, datos || {});
      }
    } catch (e) { console.warn('[medir]', e); }
  };

  const medir = (evento, datos, meta) => {
    try {
      if (!evento) return;
      if (listo) enviar(evento, datos, meta);
      else cola.push([evento, datos, meta]);
    } catch (e) { /* nada */ }
  };

  medir.origen = () => {
    const o = {
      origen: leer('sessionStorage', 'origen') || '',
      origen_entrada: leer('sessionStorage', 'origen_entrada') || ''
    };
    UTM.forEach(k => { o[k] = leer('sessionStorage', k) || ''; });
    return o;
  };

  /* Conversión que no se repite al recargar: la marca vive en localStorage.
     Si el almacenamiento está bloqueado, se marca en memoria (una vez por carga). */
  const yaMarcadas = new Set();
  medir.conversionUnica = (clave, datos) => {
    try {
      const k = 'conversion:' + clave;
      if (yaMarcadas.has(k) || leer('localStorage', k) || leer('sessionStorage', k)) return false;
      yaMarcadas.add(k);
      if (!guardar('localStorage', k, new Date().toISOString())) guardar('sessionStorage', k, '1');
      medir('generate_lead', datos, 'Lead');
      return true;
    } catch (e) { return false; }
  };

  window.medir = medir;

  /* ---------- clics en CTA con data-origen ---------- */
  document.addEventListener('click', ev => {
    try {
      const el = ev.target && ev.target.closest ? ev.target.closest('[data-origen]') : null;
      if (!el) return;
      // el contenedor del formulario lleva data-origen como valor por defecto, no es un CTA
      if (el.hasAttribute('data-formulario-registro')) return;
      const origen = (el.getAttribute('data-origen') || '').trim().slice(0, 80);
      if (!origen) return;
      guardar('sessionStorage', 'origen', origen);
      medir('cta_clic', {
        origen: origen,
        destino: el.getAttribute('href') || '',
        pagina: location.pathname
      });
    } catch (e) { /* nada */ }
  }, true);

  /* ---------- carga de terceros, solo con identificador ---------- */
  const inyectar = src => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  };

  window.leerCampana().then(cfg => {
    try {
      const m = (cfg && cfg.medicion) || {};
      ga4 = String(m.ga4 || '').trim();
      pixel = String(m.meta_pixel || '').trim();

      if (ga4 && /^G-[A-Z0-9]+$/i.test(ga4)) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', ga4);
        inyectar('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4));
      } else if (ga4) {
        console.warn('[medir] medicion.ga4 no parece un ID de GA4 (G-XXXX):', ga4);
        ga4 = '';
      }

      if (pixel && /^\d{6,20}$/.test(pixel)) {
        /* stub oficial de Meta, sin el snippet minificado */
        const fbq = function () {
          fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
        };
        if (!window._fbq) window._fbq = fbq;
        fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
        window.fbq = window.fbq || fbq;
        window.fbq('init', pixel);
        window.fbq('track', 'PageView');
        inyectar('https://connect.facebook.net/en_US/fbevents.js');
      } else if (pixel) {
        console.warn('[medir] medicion.meta_pixel no parece un ID de píxel:', pixel);
        pixel = '';
      }
    } catch (e) {
      console.warn('[medir]', e);
    } finally {
      listo = true;
      cola.splice(0).forEach(a => enviar(a[0], a[1], a[2]));
    }
  });
})();
