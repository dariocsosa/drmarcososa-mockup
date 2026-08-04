/* ============================================================
   El Mapa 3R — instrumento funcional.

   Siete roles × tres dimensiones (Recursos, Recompensas, Reflejos),
   escala de 1 a 5. La rueda se construye mientras se responde: el
   radio de cada segmento es proporcional al puntaje, así que una
   vida equilibrada dibuja un círculo y una desequilibrada, no.

   Nada sale del navegador hasta que la persona pida el informe.
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 210, CY = 210;

  const ANILLOS = [
    { clave: 'recursos',    r0: 68,  r1: 108, nombre: 'Recursos',    opacidad: 0.94 },
    { clave: 'recompensas', r0: 112, r1: 152, nombre: 'Recompensas', opacidad: 0.64 },
    { clave: 'reflejos',    r0: 156, r1: 196, nombre: 'Reflejos',    opacidad: 0.36 }
  ];

  const ROLES = [
    { id: 'yo',        corto: 'Contigo mismo', largo: 'la relación contigo mismo',        grupo: 'íntimo' },
    { id: 'pareja',    corto: 'Pareja',        largo: 'tu relación de pareja',            grupo: 'íntimo' },
    { id: 'familia',   corto: 'Familia',       largo: 'tu familia',                       grupo: 'íntimo' },
    { id: 'amigos',    corto: 'Amigos',        largo: 'tus amigos',                       grupo: 'entorno' },
    { id: 'trabajo',   corto: 'Trabajo',       largo: 'tu trabajo y tus fuentes económicas', grupo: 'entorno' },
    { id: 'comunidad', corto: 'Comunidad',     largo: 'la sociedad y tu entorno',         grupo: 'entorno' },
    { id: 'sentido',   corto: 'Sentido',       largo: 'tus creencias y tu dimensión espiritual', grupo: 'trascendencia' }
  ];

  const PREGUNTAS = [
    { clave: 'recursos',    texto: '¿Cuánto tiempo, energía y atención le dedicas?', bajo: 'Casi nada', alto: 'Casi todo lo mío' },
    { clave: 'recompensas', texto: '¿Cuánto recibes de vuelta?',                     bajo: 'Muy poco',  alto: 'Muchísimo' },
    { clave: 'reflejos',    texto: '¿Qué tanto te identifican los demás desde acá?',  bajo: 'Nada',      alto: 'Es como me ven' }
  ];

  const PASO = 360 / ROLES.length;
  const HUECO = 1.7;
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const polar = (r, g) => {
    const a = (g - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };
  const sectorAnular = (r0, r1, a0, a1) => {
    const [x0, y0] = polar(r1, a0), [x1, y1] = polar(r1, a1);
    const [x2, y2] = polar(r0, a1), [x3, y3] = polar(r0, a0);
    return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3} Z`;
  };
  const el = (t, a) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) n.setAttribute(k, a[k]);
    return n;
  };

  /* ---------- estado ---------- */
  const respuestas = {};              // respuestas[rolId][clave] = 1..5
  ROLES.forEach(r => { respuestas[r.id] = {}; });
  let paso = 0;                       // 0..6 = roles, 7 = resultado

  /* ---------- referencias del DOM ---------- */
  const svg        = document.getElementById('mapa-svg');
  const zonaIntro  = document.getElementById('intro');
  const zonaTest   = document.getElementById('test');
  const zonaResult = document.getElementById('resultado');
  const contenedor = document.getElementById('preguntas');
  const progreso   = document.getElementById('progreso');
  const rotuloRol  = document.getElementById('rol-actual');
  const btnAtras   = document.getElementById('atras');
  const btnSigue   = document.getElementById('sigue');
  if (!svg) return;

  /* ---------- la rueda ---------- */
  const capas = {};   // capas[rolId][clave] = <path>

  function dibujarRueda() {
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: 203, fill: 'none',
      stroke: 'var(--dorado)', 'stroke-width': 0.7, opacity: 0.4
    }));

    // guías: el contorno completo de cada anillo, tenue
    ROLES.forEach((rol, i) => {
      const a0 = i * PASO + HUECO / 2, a1 = (i + 1) * PASO - HUECO / 2;
      ANILLOS.forEach(an => {
        svg.appendChild(el('path', {
          d: sectorAnular(an.r0, an.r1, a0, a1),
          fill: 'none', stroke: 'var(--verde-salvia)',
          'stroke-width': 0.6, 'stroke-dasharray': '2 3', opacity: 0.45
        }));
      });
    });

    // segmentos que crecen con el puntaje
    ROLES.forEach((rol, i) => {
      const a0 = i * PASO + HUECO / 2, a1 = (i + 1) * PASO - HUECO / 2;
      capas[rol.id] = {};
      ANILLOS.forEach(an => {
        const p = el('path', {
          d: sectorAnular(an.r0, an.r0, a0, a1),
          fill: 'var(--verde-salvia)', 'fill-opacity': an.opacidad,
          stroke: 'var(--hueso)', 'stroke-width': 1.2
        });
        if (!sinMovimiento) p.style.transition = 'd 520ms cubic-bezier(0.16,1,0.3,1)';
        capas[rol.id][an.clave] = p;
        svg.appendChild(p);
      });
      svg.appendChild(el('path', {
        d: sectorAnular(196, 198.8, a0, a1),
        fill: 'var(--dorado)', opacity: 0.28,
        class: 'filete-' + rol.id
      }));
    });

    ANILLOS.forEach(an => {
      const t = el('text', { x: CX, y: CY - (an.r0 + an.r1) / 2 + 3, class: 'rueda-anillo-etq' });
      t.textContent = an.nombre.toUpperCase();
      svg.appendChild(t);
    });

    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 62, fill: 'var(--hueso)' }));
    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 62, fill: 'none', stroke: 'var(--dorado)', 'stroke-width': 0.9 }));

    const centro = el('text', { x: CX, y: CY + 3, class: 'rueda-centro-rol', id: 'mapa-centro' });
    centro.textContent = 'Mapa 3R';
    svg.appendChild(centro);
  }

  function pintar(rolId) {
    const i = ROLES.findIndex(r => r.id === rolId);
    const a0 = i * PASO + HUECO / 2, a1 = (i + 1) * PASO - HUECO / 2;
    ANILLOS.forEach(an => {
      const v = respuestas[rolId][an.clave] || 0;
      const r1 = an.r0 + (an.r1 - an.r0) * (v / 5);
      capas[rolId][an.clave].setAttribute('d', sectorAnular(an.r0, r1, a0, a1));
    });
    const filete = svg.querySelector('.filete-' + rolId);
    if (filete) filete.setAttribute('opacity', Object.keys(respuestas[rolId]).length === 3 ? 1 : 0.28);
  }

  /* ---------- las preguntas ---------- */
  function render() {
    const rol = ROLES[paso];
    rotuloRol.textContent = `Rol ${paso + 1} de 7`;
    contenedor.innerHTML = '';

    const titulo = document.createElement('h2');
    titulo.className = 't-grande';
    titulo.textContent = rol.corto;
    contenedor.appendChild(titulo);

    const sub = document.createElement('p');
    sub.className = 'suave';
    sub.style.marginBottom = '2rem';
    sub.textContent = `Piensa en ${rol.largo}.`;
    contenedor.appendChild(sub);

    PREGUNTAS.forEach(preg => {
      const bloque = document.createElement('div');
      bloque.className = 'pregunta-bloque';

      const etq = document.createElement('p');
      etq.className = 'pregunta-etq';
      etq.textContent = preg.clave;
      bloque.appendChild(etq);

      const txt = document.createElement('h3');
      txt.textContent = preg.texto;
      bloque.appendChild(txt);

      const escala = document.createElement('div');
      escala.className = 'escala';
      escala.setAttribute('role', 'radiogroup');
      escala.setAttribute('aria-label', `${preg.texto} — ${rol.corto}`);

      for (let v = 1; v <= 5; v++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'punto';
        b.textContent = v;
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', respuestas[rol.id][preg.clave] === v ? 'true' : 'false');
        if (respuestas[rol.id][preg.clave] === v) b.classList.add('activo');
        b.addEventListener('click', () => {
          respuestas[rol.id][preg.clave] = v;
          escala.querySelectorAll('.punto').forEach(o => {
            o.classList.remove('activo');
            o.setAttribute('aria-checked', 'false');
          });
          b.classList.add('activo');
          b.setAttribute('aria-checked', 'true');
          pintar(rol.id);
          actualizarBotones();
        });
        escala.appendChild(b);
      }
      bloque.appendChild(escala);

      const extremos = document.createElement('div');
      extremos.className = 'escala-extremos';
      extremos.innerHTML = `<span>${preg.bajo}</span><span>${preg.alto}</span>`;
      bloque.appendChild(extremos);

      contenedor.appendChild(bloque);
    });

    progreso.style.setProperty('--avance', ((paso) / 7 * 100) + '%');
    actualizarBotones();
    document.getElementById('mapa-centro').textContent = rol.corto;
  }

  function completo(rolId) { return Object.keys(respuestas[rolId]).length === 3; }

  function actualizarBotones() {
    btnAtras.disabled = paso === 0;
    btnSigue.disabled = !completo(ROLES[paso].id);
    btnSigue.textContent = paso === 6 ? 'Ver mi Mapa' : 'Siguiente';
  }

  /* ---------- resultado ---------- */
  function calcular() {
    const filas = ROLES.map(r => {
      const rec = respuestas[r.id].recursos;
      const rew = respuestas[r.id].recompensas;
      const ref = respuestas[r.id].reflejos;
      return { rol: r, rec, rew, ref, brecha: rec - rew, total: rec + rew + ref };
    });
    const mayorBrecha = filas.slice().sort((a, b) => b.brecha - a.brecha)[0];
    const masDesatendido = filas.slice().sort((a, b) => a.total - b.total)[0];
    const masCargado = filas.slice().sort((a, b) => b.rec - a.rec)[0];
    return { filas, mayorBrecha, masDesatendido, masCargado };
  }

  function mostrarResultado() {
    const r = calcular();
    zonaTest.hidden = true;
    zonaResult.hidden = false;
    document.getElementById('mapa-centro').textContent = 'Tu Mapa';
    progreso.style.setProperty('--avance', '100%');

    const lectura = document.getElementById('lectura');
    lectura.innerHTML = '';

    const bloques = [];

    if (r.mayorBrecha.brecha >= 2) {
      // El matiz solo aplica donde dar más de lo que se recibe es esperable.
      const asimetriaEsperable = ['familia', 'pareja', 'comunidad'].includes(r.mayorBrecha.rol.id);
      const matiz = asimetriaEsperable
        ? 'Eso no siempre es un problema —con los hijos o con quien uno cuida casi nunca lo es—, pero'
        : 'Eso puede ser una decisión consciente, y está bien que lo sea. Pero';
      bloques.push({
        etq: 'Lo que más pesa',
        txt: `Estás invirtiendo mucho más de lo que recibes en <strong>${r.mayorBrecha.rol.corto.toLowerCase()}</strong>.
              ${matiz} cuando se sostiene en el tiempo sin que nadie lo haya decidido, suele ser el
              primer lugar donde el cuerpo empieza a cobrar.`
      });
    } else {
      bloques.push({
        etq: 'Lo que más pesa',
        txt: `No hay una brecha grande entre lo que inviertes y lo que recibes. Es una señal buena, y
              menos común de lo que parece.`
      });
    }

    bloques.push({
      etq: 'Lo más desatendido',
      txt: `<strong>${r.masDesatendido.rol.corto}</strong> es el rol que hoy tiene menos de ti.
            Vale la pena preguntarte si es una decisión o si simplemente se fue quedando atrás.`
    });

    bloques.push({
      etq: 'Dónde está tu energía',
      txt: `La mayor parte de tus recursos está en <strong>${r.masCargado.rol.corto.toLowerCase()}</strong>.
            Los recursos son limitados: lo que entra ahí, sale de los otros seis.`
    });

    bloques.forEach(b => {
      const d = document.createElement('div');
      d.className = 'lectura-bloque';
      d.innerHTML = `<p class="pregunta-etq">${b.etq}</p><p>${b.txt}</p>`;
      lectura.appendChild(d);
    });

    // etiqueta que viajaría a la plataforma de correo
    const campo = document.getElementById('segmento');
    if (campo) campo.value = `rol:${r.masCargado.rol.id}|brecha:${r.mayorBrecha.rol.id}|desatendido:${r.masDesatendido.rol.id}`;

    zonaResult.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- navegación ---------- */
  document.getElementById('empezar').addEventListener('click', () => {
    zonaIntro.hidden = true;
    zonaTest.hidden = false;
    render();
    zonaTest.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
  });

  btnSigue.addEventListener('click', () => {
    if (paso === 6) { mostrarResultado(); return; }
    paso++;
    render();
  });
  btnAtras.addEventListener('click', () => {
    if (paso > 0) { paso--; render(); }
  });

  document.getElementById('reiniciar').addEventListener('click', () => {
    ROLES.forEach(r => { respuestas[r.id] = {}; pintar(r.id); });
    paso = 0;
    zonaResult.hidden = true;
    zonaTest.hidden = false;
    render();
    zonaTest.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
  });

  const forma = document.getElementById('forma-informe');
  if (forma) {
    forma.addEventListener('submit', e => {
      e.preventDefault();
      forma.innerHTML = '<p class="confirmado">Listo. Te llega el informe ampliado en unos minutos.</p>';
    });
  }

  dibujarRueda();
})();
