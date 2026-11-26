/* Herramientas del libro «Péptidos: descifra tu cuerpo».
   Autoevaluación por capítulo, perlas en tarjetas y esquemas. Todo se calcula en el navegador;
   solo al pedirlo se envía el resultado, por el mismo destino del registro (sitio.json → formularios.masterclass).
   Los datos los genera Libro_Marco/Produccion/peptidos/nueva_edicion/exportar_web.py. */
(() => {
  'use strict';
  const D = window.HERR_DATOS;
  if (!D) return;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...hijos) => {
    const n = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    hijos.flat().filter(h => h != null && h !== false).forEach(h => n.append(h instanceof Node ? h : document.createTextNode(h)));
    return n;
  };
  const CLAVE = 'herr-peptidos-v1';
  const guardado = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (_) { return {}; } };
  const guardar = obj => { try { localStorage.setItem(CLAVE, JSON.stringify(obj)); } catch (_) {} };
  let memoria = guardado(); memoria.mejor = memoria.mejor || {}; memoria.perlas = memoria.perlas || {};
  const LETRAS = ['A', 'B', 'C', 'D'];
  const barajar = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* ---------- pestañas ---------- */
  const pestanas = [...document.querySelectorAll('.herr-pestanas [role="tab"]')];
  function abrir(panel) {
    pestanas.forEach(t => t.setAttribute('aria-selected', t.dataset.panel === panel ? 'true' : 'false'));
    document.querySelectorAll('.herr-panel').forEach(p => { p.hidden = p.id !== 'p-' + panel; });
  }
  pestanas.forEach(t => t.addEventListener('click', () => { abrir(t.dataset.panel); history.replaceState(null, '', '#' + t.dataset.panel); }));
  pestanas.forEach((t, i) => t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const s = pestanas[(i + (e.key === 'ArrowRight' ? 1 : pestanas.length - 1)) % pestanas.length]; s.focus(); s.click();
  }));

  /* ---------- autoevaluación ---------- */
  const zona = $('#auto-zona'), capsEl = $('#caps');
  let capActual = null, est = null;
  const total = c => c.preguntas.length;

  function pintarCaps() {
    capsEl.replaceChildren(...D.caps.map(c => {
      const mejor = memoria.mejor[c.n];
      return el('button', { class: 'herr-cap', type: 'button', 'aria-pressed': capActual === c.n ? 'true' : 'false', onclick: () => iniciar(c.n) },
        el('b', {}, 'Capítulo ' + c.n), el('span', {}, c.corto),
        el('small', {}, mejor != null ? `Tu mejor resultado: ${mejor} de ${total(c)}` : `${total(c)} preguntas`));
    }));
  }
  function iniciar(n) {
    capActual = n;
    const c = D.caps.find(x => x.n === n);
    est = { c, i: 0, aciertos: [], orden: c.preguntas.map(q => barajar(q.op.map((_, k) => k))) };
    pintarCaps(); pregunta();
    zona.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }
  function pregunta() {
    const { c, i, orden } = est, q = c.preguntas[i];
    const lista = el('ul', { class: 'herr-ops' });
    const fb = el('div', { 'aria-live': 'polite' });
    const siguiente = el('button', { class: 'boton boton-lleno', type: 'button', hidden: true, onclick: () => { est.i++; est.i < total(c) ? pregunta() : resultado(); } }, i + 1 < total(c) ? 'Siguiente pregunta' : 'Ver mi resultado');
    orden[i].forEach((k, pos) => {
      const b = el('button', { class: 'herr-op', type: 'button', 'data-k': k, onclick: () => responder(k, lista, fb, siguiente) },
        el('b', {}, LETRAS[pos]), el('span', {}, q.op[k]));
      lista.append(el('li', {}, b));
    });
    zona.replaceChildren(el('div', { class: 'herr-tarjeta' },
      el('p', { class: 'herr-meta' }, `Capítulo ${c.n} · pregunta ${i + 1} de ${total(c)}`),
      el('div', { class: 'herr-barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total(c), 'aria-valuenow': i }, el('i', { style: `width:${(i / total(c)) * 100}%` })),
      el('h2', { class: 'herr-q' }, q.q), lista, fb, el('div', { class: 'herr-acciones' }, siguiente)));
  }
  function responder(k, lista, fb, siguiente) {
    const { c, i } = est, q = c.preguntas[i], bien = k === q.ok;
    est.aciertos[i] = bien;
    lista.querySelectorAll('.herr-op').forEach(b => {
      const kk = +b.dataset.k; b.disabled = true;
      if (kk === q.ok) b.classList.add('ok'); else if (kk === k) b.classList.add('no'); else b.classList.add('apag');
    });
    const ref = `Repásalo en el capítulo ${c.n}, sección ${q.ref}${q.refTitulo ? ': ' + q.refTitulo : ''}.`;
    fb.replaceChildren(el('div', { class: 'herr-fb ' + (bien ? 'bien' : '') },
      el('b', {}, bien ? 'Correcto.' : 'No es esa. La respuesta correcta está marcada en verde.'),
      el('small', {}, ref)));
    siguiente.hidden = false; siguiente.focus({ preventScroll: true });
  }
  function anillo(p) {
    const r = 58, c = 2 * Math.PI * r, f = c * p;
    return `<svg class="herr-anillo" viewBox="0 0 150 150" role="img" aria-label="${Math.round(p * 100)} por ciento"><circle cx="75" cy="75" r="${r}" fill="none" stroke="#E4EDE7" stroke-width="14"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="#1F5142" stroke-width="14" stroke-linecap="round" stroke-dasharray="${f} ${c}" transform="rotate(-90 75 75)"/><text x="75" y="82" text-anchor="middle" font-size="30" font-weight="700" fill="#173F33">${Math.round(p * 100)}%</text></svg>`;
  }
  function resultado() {
    const { c, aciertos } = est, n = aciertos.filter(Boolean).length, t = total(c);
    if (memoria.mejor[c.n] == null || n > memoria.mejor[c.n]) memoria.mejor[c.n] = n;
    memoria.ultimo = memoria.ultimo || {}; memoria.ultimo[c.n] = n; guardar(memoria);
    const msg = n === t ? 'Dominas este capítulo.' : n >= Math.ceil(t * .6) ? 'Vas bien. Repasa las preguntas que fallaste.' : 'Conviene releer el capítulo y volver a intentarlo.';
    const detalle = el('ul', { class: 'herr-detalle' }, c.preguntas.map((q, i) => el('li', {},
      el('span', { class: aciertos[i] ? 'v' : 'x', 'aria-label': aciertos[i] ? 'acertada' : 'fallada' }, aciertos[i] ? '✓' : '✗'),
      el('span', {}, `${q.q.length > 110 ? q.q.slice(0, 108) + '…' : q.q} `, el('small', {}, `(sección ${q.ref})`)))));
    const sig = c.n < D.caps.length ? el('button', { class: 'boton boton-suave', type: 'button', onclick: () => iniciar(c.n + 1) }, 'Siguiente capítulo') : null;
    zona.replaceChildren(el('div', { class: 'herr-tarjeta' },
      el('p', { class: 'herr-meta' }, `Capítulo ${c.n} · resultado`),
      el('div', { class: 'herr-res' }, el('div', { html: anillo(n / t) }), el('div', {}, el('h2', { class: 'herr-q', style: 'margin-top:0' }, `${n} de ${t} respuestas correctas`), el('p', {}, msg))),
      detalle,
      el('div', { class: 'herr-acciones' },
        el('button', { class: 'boton boton-lleno', type: 'button', onclick: () => { mostrarEnvio(); } }, 'Enviar mi resultado'),
        el('button', { class: 'boton boton-suave', type: 'button', onclick: () => iniciar(c.n) }, 'Repetir el capítulo'), sig)));
    pintarCaps(); prepararEnvio();
  }

  /* ---------- perlas ---------- */
  let filtro = 0;
  const filtrosEl = $('#perlas-filtros'), perlasEl = $('#perlas-zona'), contEl = $('#perlas-cont');
  function pintarPerlas() {
    filtrosEl.replaceChildren(...[0, 1, 2, 3, 4, 5, 6].map(n => el('button', { type: 'button', 'aria-pressed': filtro === n ? 'true' : 'false', onclick: () => { filtro = n; pintarPerlas(); } }, n === 0 ? 'Todas' : 'Capítulo ' + n)));
    const sab = Object.keys(memoria.perlas).filter(k => memoria.perlas[k]).length;
    contEl.textContent = `Dominas ${sab} de ${D.perlas.length} perlas.`;
    perlasEl.replaceChildren(...D.perlas.filter(p => !filtro || p.cap === filtro).map(p => {
      const abierta = !!p._abierta, sabida = !!memoria.perlas[p.n];
      const ic = el('div', { class: 'ic', html: D.iconos[p.icono] || '' });
      const card = el('article', { class: 'herr-perla' + (sabida ? ' sabida' : '') },
        ic, el('b', {}, `Cap. ${p.cap} · perla ${p.n}`), el('h3', {}, p.titulo),
        abierta ? el('p', {}, p.texto) : null,
        el('div', { class: 'herr-pie' },
          el('button', { class: 'herr-btn', type: 'button', 'aria-expanded': abierta ? 'true' : 'false', onclick: () => { p._abierta = !p._abierta; pintarPerlas(); } }, abierta ? 'Ocultar' : 'Ver texto'),
          el('button', { class: 'herr-btn', type: 'button', 'aria-pressed': sabida ? 'true' : 'false', onclick: () => { memoria.perlas[p.n] = !memoria.perlas[p.n]; guardar(memoria); pintarPerlas(); } }, sabida ? '✓ La sé' : 'La sé')));
      return card;
    }));
  }

  /* ---------- esquemas ---------- */
  $('#figuras-zona').replaceChildren(...D.figuras.map(f => el('figure', { class: 'herr-fig', style: 'margin:0' }, el('h3', {}, f.titulo), el('div', { html: f.svg }), el('p', {}, f.pie))));

  /* ---------- enviar resultado ---------- */
  const seccionEnvio = $('#enviar'), forma = $('#herr-form'), estadoEl = $('#h-estado'), wa = $('#h-wa');
  function resumenTexto() {
    const filas = Object.keys(memoria.ultimo || {}).sort().map(k => `Capítulo ${k}: ${memoria.ultimo[k]} de ${D.caps[k - 1].preguntas.length}`);
    const sab = Object.keys(memoria.perlas).filter(k => memoria.perlas[k]).length;
    return ['Autoevaluación del libro Péptidos: descifra tu cuerpo', ...(filas.length ? filas : ['Sin capítulos completados']), `Perlas que dice dominar: ${sab} de ${D.perlas.length}`].join('\n');
  }
  function prepararEnvio() {
    const t = resumenTexto(); $('#h-resumen').textContent = t; $('#h-interes').value = t.replace(/\n/g, ' · ');
    const base = wa.getAttribute('href') || '';
    if (base && base !== '#') wa.href = base + (base.includes('?') ? '&' : '?') + 'text=' + encodeURIComponent('Hola, hice las herramientas del libro Péptidos: descifra tu cuerpo.\n' + t);
    else wa.hidden = true;
  }
  function mostrarEnvio() { seccionEnvio.hidden = false; prepararEnvio(); seccionEnvio.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#h-nombre').focus({ preventScroll: true }); }
  const params = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => { const i = forma.elements[k]; if (i) i.value = params.get(k) || ''; });
  const destino = (forma.getAttribute('action') || '').trim();
  forma.addEventListener('submit', async e => {
    e.preventDefault();
    const boton = forma.querySelector('button[type="submit"]');
    prepararEnvio();
    if (!destino || destino.startsWith('{{')) { estadoEl.textContent = 'El envío no está disponible ahora. Puedes mandar tu resultado por WhatsApp.'; estadoEl.className = 'formulario-estado error'; return; }
    boton.disabled = true; estadoEl.textContent = 'Enviando…'; estadoEl.className = 'formulario-estado';
    try {
      await fetch(destino, { method: 'POST', body: new FormData(forma), mode: 'no-cors' });
      estadoEl.textContent = 'Listo, recibimos tu resultado. Gracias por practicar.'; estadoEl.className = 'formulario-estado ok';
    } catch (_) {
      boton.disabled = false; estadoEl.textContent = 'No pudimos enviar. Revisa tu conexión e inténtalo de nuevo.'; estadoEl.className = 'formulario-estado error';
    }
  });

  /* ---------- arranque ---------- */
  pintarCaps(); pintarPerlas();
  const cap = parseInt(params.get('cap'), 10), hash = location.hash.replace('#', '');
  if (['perlas', 'esquemas', 'clases', 'auto'].includes(hash)) abrir(hash);
  if (cap >= 1 && cap <= D.caps.length) { abrir('auto'); iniciar(cap); }
  else zona.replaceChildren(el('p', { class: 'herr-guia' }, 'Elige un capítulo para empezar.'));
})();
