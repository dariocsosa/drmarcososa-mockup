/* Acceso a las herramientas del Dr. Marco Sosa.
   Pide nombre, correo y consentimiento UNA vez (se recuerda en este navegador) y registra cada interacción
   del cliente en el mismo destino del registro (sitio.json → formularios.masterclass).
   El script que recibe esos datos es Operacion/script_crm_marco.gs (ver Operacion/CRM_clientes.md).
   CRM_ACTIVO: ponerlo en true SOLO después de desplegar ese script; mientras tanto solo se envía el registro
   y los resultados que el lector pide enviar (el script anterior guarda una fila y un aviso por cada envío). */
(() => {
  'use strict';
  const CRM_ACTIVO = false;
  const CLAVE = 'marco-cliente-v1';
  const $ = s => document.querySelector(s);
  const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)); } catch (_) { return null; } };
  const escribir = c => { try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch (_) {} };
  let dlg, forma, pendiente = null, contexto = { origen: 'sitio', motivo: '' };

  const params = new URLSearchParams(location.search);
  const utm = () => ({ utm_source: params.get('utm_source') || '', utm_medium: params.get('utm_medium') || '', utm_campaign: params.get('utm_campaign') || '' });
  const destino = () => ((forma && forma.getAttribute('action')) || '').trim();
  const disponible = () => { const d = destino(); return !!d && !d.startsWith('{{') && !d.startsWith('https://wa.me'); };

  function enviar(datos) {
    if (!disponible()) return Promise.resolve(false);
    const f = new FormData();
    Object.keys(datos).forEach(k => f.append(k, datos[k] == null ? '' : datos[k]));
    return fetch(destino(), { method: 'POST', body: f, mode: 'no-cors' }).then(() => true).catch(() => false);
  }
  const base = c => Object.assign({
    nombre: c.nombre, correo: c.correo, whatsapp: c.whatsapp || '', pais: c.pais || '', perfil: c.perfil || '',
    autorizacion: 'si', comunicaciones: c.comunicaciones ? 'si' : '', pagina: location.pathname.split('/').pop() || 'index.html'
  }, utm());

  /* Registra una interacción. `fuerza` = el lector pidió enviarla (se manda aunque el CRM no esté activo). */
  function evento(nombre, detalle, fuerza) {
    const c = leer(); if (!c) return Promise.resolve(false);
    if (!CRM_ACTIVO && !fuerza) return Promise.resolve(false);
    return enviar(Object.assign(base(c), { evento: nombre, interes: detalle || '', origen: `${contexto.origen}|${nombre}|${c.perfil || ''}` }));
  }

  function montar() {
    dlg = $('#acceso'); if (!dlg) return false;
    forma = $('#acc-form');
    $('#acc-cerrar').addEventListener('click', () => { dlg.close(); });
    dlg.addEventListener('close', () => { if (pendiente && !leer()) { pendiente.rechazar(); } pendiente = null; });
    forma.addEventListener('submit', async e => {
      e.preventDefault();
      const estado = $('#acc-estado'), boton = forma.querySelector('button[type="submit"]');
      const f = new FormData(forma);
      const c = { nombre: String(f.get('nombre') || '').trim(), correo: String(f.get('correo') || '').trim().toLowerCase(), whatsapp: String(f.get('whatsapp') || '').trim(), pais: String(f.get('pais') || '').trim(), perfil: String(f.get('perfil') || ''), comunicaciones: !!f.get('comunicaciones'), desde: new Date().toISOString() };
      if (!disponible()) { estado.textContent = 'El registro no está disponible ahora. Escríbenos por WhatsApp y te damos acceso.'; estado.className = 'formulario-estado error'; return; }
      boton.disabled = true; estado.textContent = 'Un momento…'; estado.className = 'formulario-estado';
      f.set('origen', `${contexto.origen}|registro|${c.perfil}`); f.set('pagina', location.pathname.split('/').pop() || 'index.html');
      ['utm_source', 'utm_medium', 'utm_campaign'].forEach(k => f.set(k, utm()[k]));
      let ok = true;
      try { await fetch(destino(), { method: 'POST', body: f, mode: 'no-cors' }); } catch (_) { ok = false; }
      boton.disabled = false;
      if (!ok) { estado.textContent = 'No pudimos registrarte. Revisa tu conexión e inténtalo de nuevo.'; estado.className = 'formulario-estado error'; return; }
      escribir(c); estado.textContent = ''; dlg.close();
      if (pendiente) { const p = pendiente; pendiente = null; p.resolver(c); }
    });
    return true;
  }

  /* Devuelve una promesa con el cliente; si no está registrado, abre la ventana. */
  function pedir(ctx) {
    const c = leer(); if (c) return Promise.resolve(c);
    if (!dlg && !montar()) return Promise.reject(new Error('sin ventana'));
    contexto = Object.assign({ origen: 'sitio', motivo: '' }, ctx || {});
    if (contexto.motivo) $('#acc-motivo').textContent = contexto.motivo;
    return new Promise((resolver, rechazar) => {
      pendiente = { resolver, rechazar };
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      $('#acc-nombre').focus();
    });
  }

  function salir() { try { localStorage.removeItem(CLAVE); } catch (_) {} }
  function fijarContexto(ctx) { contexto = Object.assign(contexto, ctx || {}); }

  window.Acceso = { cliente: leer, pedir, evento, salir, fijarContexto, crmActivo: () => CRM_ACTIVO, montar };
  document.addEventListener('DOMContentLoaded', montar);
})();
