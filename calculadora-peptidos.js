/* Calculadora de dilución y dosis. Cuentas de la hoja del Dr. Marco Sosa:
   concentración = mg / mL de agua; 1 unidad de jeringa de 100 = 0,01 mL;
   unidades = dosis / (concentración / 100); dosis por vial = (mL × 100) / unidades.
   Se entra con nombre y correo (acceso.js); el catálogo se carga después del registro. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const num = v => { const x = parseFloat(String(v).trim().replace(/\./g, m => (/^\d{1,3}(\.\d{3})+(,|$)/.test(v) ? '' : m)).replace(',', '.')); return isFinite(x) ? x : NaN; };
  const fmt = (x, d = 3) => { let t = x.toFixed(d); if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, ''); return t.replace('.', ','); };
  let catalogo = null;

  function cargarCatalogo() {
    if (catalogo) return Promise.resolve(catalogo);
    return new Promise((ok, mal) => {
      const sc = document.createElement('script'); sc.src = 'calculadora-peptidos-protegido.js';
      sc.onload = () => { catalogo = window.CALC_DATOS; window.CALC_DATOS = null; catalogo ? ok(catalogo) : mal(); };
      sc.onerror = mal; document.head.append(sc);
    });
  }
  function llenarSelect() {
    const s = $('#c-pept'); s.disabled = false; s.replaceChildren(new Option('Elige una presentación…', ''));
    catalogo.forEach((g, gi) => {
      const og = document.createElement('optgroup'); og.label = g.titulo;
      g.filas.forEach((f, fi) => og.append(new Option(f.n, gi + ':' + fi)));
      s.append(og);
    });
    pintarTabla();
  }
  function usar(gi, fi) {
    const f = catalogo[gi].filas[fi];
    $('#c-pept').value = gi + ':' + fi; $('#c-mg').value = fmt(f.mg); $('#c-bac').value = fmt(f.bac);
    const ref = $('#c-ref');
    if (f.dosis) { $('#c-dosis').value = fmt(f.dosis); $('#c-unidad').value = 'mg'; ref.textContent = `Dosis inicial de referencia del Dr. Marco Sosa para esta presentación: ${fmt(f.dosis)} mg. Puedes cambiarla.`; ref.hidden = false; }
    else { $('#c-dosis').value = ''; ref.textContent = 'La hoja del Dr. Marco no trae dosis de referencia para esta presentación: la define el médico.'; ref.hidden = false; }
    $('#calculadora').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function pintarTabla() {
    const cont = $('#c-tabla'); cont.replaceChildren();
    catalogo.forEach((g, gi) => {
      const t = document.createElement('div'); t.className = 'calc-tabla-envol';
      let h = `<h3>${g.titulo}</h3><table class="calc-tabla"><thead><tr><th>Péptido</th><th>Vial (mg)</th><th>BAC (mL)</th><th>mg/mL</th><th>mcg/unidad</th><th>Dosis ref. (mg)</th><th>Unidades</th><th>Dosis por vial</th><th></th></tr></thead><tbody>`;
      g.filas.forEach((f, fi) => {
        const c = f.mg / f.bac, u = f.dosis ? f.dosis / (c / 100) : null;
        h += `<tr><td>${f.n}</td><td>${fmt(f.mg)}</td><td>${fmt(f.bac)}</td><td>${fmt(c, 1)}</td><td>${fmt(c * 10, 0)}</td><td>${f.dosis ? fmt(f.dosis, 2) : '—'}</td><td>${u ? fmt(u, 1) : '—'}</td><td>${u ? fmt(f.bac * 100 / u, 0) : '—'}</td><td><button class="herr-btn" type="button" data-g="${gi}" data-f="${fi}">Usar</button></td></tr>`;
      });
      t.innerHTML = h + '</tbody></table>'; cont.append(t);
    });
    cont.querySelectorAll('button[data-g]').forEach(b => b.addEventListener('click', () => usar(+b.dataset.g, +b.dataset.f)));
  }

  function jeringa(u) {
    const x0 = 10, x1 = 410, w = x1 - x0, lleno = Math.min(u, 100) / 100 * w;
    let s = `<rect x="${x0}" y="8" width="${w}" height="30" rx="5" fill="#FFF9EE" stroke="#1F5142" stroke-width="2"/><rect x="${x0}" y="8" width="${lleno}" height="30" rx="5" fill="#E4AA18"/>`;
    for (let k = 0; k <= 100; k += 10) { const x = x0 + w * k / 100; s += `<line x1="${x}" y1="38" x2="${x}" y2="46" stroke="#1F5142" stroke-width="1.5"/><text x="${x}" y="62" text-anchor="middle" font-size="11" font-weight="700" fill="#1F5142">${k}</text>`; }
    $('#r-jer').innerHTML = s;
  }

  function calcular() {
    const err = $('#c-error'); err.hidden = true;
    const mg = num($('#c-mg').value), bac = num($('#c-bac').value); let dosis = num($('#c-dosis').value);
    const fallo = t => { err.textContent = t; err.hidden = false; $('#c-salida').hidden = true; $('#c-vacio').hidden = false; };
    if (!(mg > 0) || !(bac > 0) || !(dosis > 0)) return fallo('Completa el péptido del vial, el agua y la dosis con números mayores que cero.');
    const unidadDosis = $('#c-unidad').value; if (unidadDosis === 'mcg') dosis = dosis / 1000;
    if (dosis > mg) return fallo('La dosis es mayor que todo el péptido del vial. Revisa los números y las unidades (mg o mcg).');
    const conc = mg / bac, porUnid = conc / 100, unid = dosis / porUnid, ml = unid / 100, vial = bac * 100 / unid;
    $('#c-vacio').hidden = true; $('#c-salida').hidden = false;
    $('#r-unid').textContent = fmt(unid, 2);
    $('#r-conc').textContent = `${fmt(conc, 2)} mg/mL`;
    $('#r-mcgu').textContent = `${fmt(porUnid * 1000, 2)} mcg (${fmt(porUnid, 4)} mg)`;
    $('#r-ml').textContent = `${fmt(ml, 3)} mL`;
    $('#r-vial').textContent = `${fmt(vial, 1)} dosis`;
    jeringa(unid);
    $('#r-pasos').innerHTML = [
      `Concentración: ${fmt(mg)} mg ÷ ${fmt(bac)} mL = <b>${fmt(conc, 2)} mg/mL</b>`,
      `Por unidad (100 unidades = 1 mL): ${fmt(conc, 2)} ÷ 100 = <b>${fmt(porUnid, 4)} mg = ${fmt(porUnid * 1000, 2)} mcg</b>`,
      `Unidades: ${fmt(dosis, 4)} mg ÷ ${fmt(porUnid, 4)} mg = <b>${fmt(unid, 2)} unidades</b> (${fmt(ml, 3)} mL)`,
      `Dosis por vial: ${fmt(bac * 100)} unidades ÷ ${fmt(unid, 2)} = <b>${fmt(vial, 1)}</b>`].map(t => `<li>${t}</li>`).join('');
    const av = $('#r-aviso'); av.hidden = true;
    if (unid > 100) { av.textContent = 'Esta dosis supera 1 mL y no cabe en una jeringa de 100 unidades. Revisa la dilución con el médico.'; av.hidden = false; }
    else if (unid < 2) { av.textContent = 'Son menos de 2 unidades: es difícil medirlas con precisión. Conviene diluir con más agua; consúltalo con el médico.'; av.hidden = false; }
    const nombre = $('#c-pept').selectedOptions[0] && $('#c-pept').value ? $('#c-pept').selectedOptions[0].text : 'datos propios';
    Acceso.evento('calculadora_uso', `${nombre} · ${fmt(mg)} mg + ${fmt(bac)} mL · dosis ${fmt(dosis, 4)} mg → ${fmt(unid, 2)} unidades`);
  }

  function iniciarSesion() { cargarCatalogo().then(llenarSelect).catch(() => {}); }
  $('#calc-form').addEventListener('submit', e => {
    e.preventDefault();
    Acceso.pedir({ origen: 'calculadora-peptidos', motivo: 'Para ver el resultado de la calculadora, deja tu nombre y correo. Es gratis y solo se pide una vez.' })
      .then(() => { iniciarSesion(); calcular(); }).catch(() => {});
  });
  $('#c-pept').addEventListener('change', e => { const v = e.target.value; if (v) { const [g, f] = v.split(':').map(Number); usar(g, f); } });
  $('#c-abrir').addEventListener('click', () => Acceso.pedir({ origen: 'calculadora-peptidos', motivo: 'Para ver la tabla de presentaciones, deja tu nombre y correo. Es gratis y solo se pide una vez.' }).then(iniciarSesion).catch(() => {}));
  if (Acceso.cliente()) iniciarSesion();
})();
