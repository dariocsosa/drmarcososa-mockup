/* El directorio de la Red: filtra en el navegador, sin servidor.
   Los datos salen de red.json, que genera Web/generar_red.py. */
(() => {
  'use strict';
  const zona = document.getElementById('directorio');
  if (!zona) return;

  const listado = document.getElementById('directorio-lista');
  const vacio = document.getElementById('directorio-vacio');
  const buscador = document.getElementById('directorio-busqueda');
  const filtroCiudad = document.getElementById('filtro-ciudad');
  const filtroTecnica = document.getElementById('filtro-tecnica');
  const cuenta = document.getElementById('directorio-cuenta');

  let miembros = [];

  const normal = t => (t || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  const opciones = (select, valores, etiqueta) => {
    select.innerHTML = `<option value="">${etiqueta}</option>` +
      [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'))
        .map(v => `<option value="${v}">${v}</option>`).join('');
  };

  const tarjeta = m => {
    const tecnicas = (m.tecnicas || []).map(t => `<li>${t}</li>`).join('');
    const donde = [m.sede, m.ciudad, m.pais].filter(Boolean).join(' · ');
    const marca = m.es_ejemplo
      ? '<span class="miembro-ejemplo">Perfil de demostración</span>' : '';
    const enlace = m.certificado
      ? `<a class="miembro-cert" href="certificado.html?codigo=${encodeURIComponent(m.certificado)}">Verificar certificado</a>`
      : '';
    return `<article class="miembro${m.es_ejemplo ? ' es-ejemplo' : ''}">
      ${marca}
      <h3>${m.nombre}</h3>
      <p class="miembro-titulo">${m.titulo || ''}</p>
      <p class="miembro-donde">${donde}</p>
      <ul class="miembro-tecnicas">${tecnicas}</ul>
      <p class="miembro-desde">En la Red desde ${m.desde || '—'}</p>
      ${enlace}
    </article>`;
  };

  const pintar = () => {
    const q = normal(buscador.value);
    const ciudad = filtroCiudad.value;
    const tecnica = filtroTecnica.value;

    const vistos = miembros.filter(m => {
      if (ciudad && m.ciudad !== ciudad) return false;
      if (tecnica && !(m.tecnicas || []).includes(tecnica)) return false;
      if (!q) return true;
      return normal([m.nombre, m.sede, m.ciudad, (m.tecnicas || []).join(' ')].join(' ')).includes(q);
    });

    listado.innerHTML = vistos.map(tarjeta).join('');
    listado.hidden = vistos.length === 0;
    vacio.hidden = vistos.length > 0;
    cuenta.textContent = vistos.length === 1
      ? '1 profesional' : `${vistos.length} profesionales`;
  };

  fetch('red.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(datos => {
      miembros = datos.miembros || [];
      opciones(filtroCiudad, miembros.map(m => m.ciudad).filter(Boolean), 'Toda ciudad');
      opciones(filtroTecnica, miembros.flatMap(m => m.tecnicas || []), 'Toda técnica');
      [buscador, filtroCiudad, filtroTecnica].forEach(c => c.addEventListener('input', pintar));
      pintar();
    })
    .catch(() => {
      // Sin datos el directorio no desaparece: dice qué pasó.
      listado.hidden = true;
      vacio.hidden = false;
      vacio.innerHTML = '<p>El directorio no se pudo cargar en este momento. Escribe y te respondo yo.</p>';
    });
})();
