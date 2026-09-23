/* Verificación de certificados. Todo ocurre en el navegador contra
   certificados.json, que genera Web/generar_red.py. */
(() => {
  'use strict';
  const forma = document.getElementById('forma-certificado');
  if (!forma) return;

  const campo = document.getElementById('codigo');
  const zona = document.getElementById('resultado');
  let registro = null;

  const limpio = t => (t || '').trim().toUpperCase().replace(/\s+/g, '');

  const fecha = iso => {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio',
                   'agosto','septiembre','octubre','noviembre','diciembre'];
    return `${Number(d)} de ${meses[Number(m) - 1]} de ${a}`;
  };

  const noExiste = codigo => `
    <div class="cert-resultado cert-no">
      <p class="cert-estado">No encontrado</p>
      <h2>No hay ningún certificado con el código ${codigo}</h2>
      <p>
        Revisa que lo hayas copiado completo, con el guion. Si lo tienes en papel y aun así no
        aparece, escríbenos a <a href="mailto:por-definir">por-definir</a> antes
        de darlo por válido.
      </p>
    </div>`;

  const existe = c => {
    const modulos = (c.modulos || []).map(m => `<li>${m}</li>`).join('');
    const vigente = c.estado === 'vigente';
    const url = `${location.origin}${location.pathname}?codigo=${encodeURIComponent(c.codigo)}`;
    // La insignia se pega en sitios ajenos, donde tokens.css no existe: por eso
    // lleva los colores escritos. Son verde bosque y verde profundo de la paleta.
    const insignia =
`<a href="${url}" style="display:inline-flex;align-items:center;gap:.6rem;padding:.7rem 1rem;border:1px solid #1F5142;border-radius:4px;text-decoration:none;font-family:system-ui,sans-serif;color:#173F33">
  <img src="https://drmarcososa.com/assets/sello-redondo.png" width="34" height="34" alt="">
  <span><strong>Certificado por el Dr. Marco Sosa</strong><br><small>Verificar · ${c.codigo}</small></span>
</a>`;

    return `
    <div class="cert-resultado ${vigente ? 'cert-si' : 'cert-revocado'}">
      ${c.es_ejemplo ? '<p class="miembro-ejemplo">Certificado de demostración</p>' : ''}
      <p class="cert-estado">${vigente ? 'Certificado válido' : 'Certificado no vigente'}</p>
      <h2>${c.nombre}</h2>
      <dl class="cert-datos">
        <div><dt>Programa</dt><dd>${c.programa}</dd></div>
        <div><dt>Intensidad</dt><dd>${c.horas} horas</dd></div>
        <div><dt>Emitido</dt><dd>${fecha(c.emitido)}</dd></div>
        <div><dt>Cohorte</dt><dd>${c.cohorte || '—'}</dd></div>
        <div><dt>Código</dt><dd>${c.codigo}</dd></div>
        <div><dt>Documento</dt><dd>${c.documento || '—'}</dd></div>
      </dl>
      <h3>Módulos aprobados</h3>
      <ul class="cert-modulos">${modulos}</ul>

      <p class="cert-alcance">
        <strong>Qué acredita y qué no.</strong> Este certificado acredita formación continua en
        los protocolos del Dr. Marco Sosa. No es un título de educación formal, no otorga
        especialidad y <strong>no habilita por sí mismo para prestar un servicio de salud</strong>:
        la habilitación la tramita cada prestador ante su autoridad territorial y es su
        responsabilidad exclusiva.
      </p>

      <details class="cert-insignia">
        <summary>Insignia para tu sitio</summary>
        <p>Pega este bloque en tu página o en tu perfil. Enlaza a esta misma verificación.</p>
        <textarea readonly rows="7" aria-label="Código de la insignia">${insignia.replace(/</g, '&lt;')}</textarea>
      </details>
    </div>`;
  };

  const buscar = codigo => {
    if (!codigo) { zona.innerHTML = ''; return; }
    const hallado = (registro || []).find(c => limpio(c.codigo) === limpio(codigo));
    zona.innerHTML = hallado ? existe(hallado) : noExiste(codigo);
    zona.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  fetch('certificados.json')
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(d => {
      registro = d.certificados || [];
      const inicial = new URLSearchParams(location.search).get('codigo');
      if (inicial) { campo.value = inicial; buscar(inicial); }
    })
    .catch(() => {
      zona.innerHTML = '<div class="cert-resultado cert-no"><p class="cert-estado">No disponible</p>' +
        '<h2>El registro no se pudo consultar</h2><p>Intenta en un momento, o escríbenos.</p></div>';
    });

  forma.addEventListener('submit', e => {
    e.preventDefault();
    buscar(campo.value);
  });
})();
