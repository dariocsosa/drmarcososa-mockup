/* ============================================================
   El Mapa 3R — el elemento distintivo de la marca.

   Siete sectores (los roles del capítulo 1 de "Vive tus emociones")
   por tres anillos concéntricos: Recursos, Recompensas, Reflejos.
   Es, al tiempo, el instrumento clínico y el sello visual.

   Inicializa cualquier <svg class="rueda-lienzo">. Con la clase
   "mini" se dibuja reducida, para la composición del hero.
   ============================================================ */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 210, CY = 210;

  const ANILLOS = [
    { r0: 68,  r1: 108, nombre: 'Recursos',    opacidad: 0.94 },
    { r0: 112, r1: 152, nombre: 'Recompensas', opacidad: 0.64 },
    { r0: 156, r1: 196, nombre: 'Reflejos',    opacidad: 0.36 }
  ];

  // Textual del capítulo 1. El agrupamiento también es del autor:
  // los tres primeros son los más íntimos, del cuarto al sexto el
  // entorno, y el séptimo la dimensión de sentido.
  const ROLES = [
    { corto: 'Contigo mismo', grupo: 'íntimo' },
    { corto: 'Pareja',        grupo: 'íntimo' },
    { corto: 'Familia',       grupo: 'íntimo' },
    { corto: 'Amigos',        grupo: 'entorno' },
    { corto: 'Trabajo',       grupo: 'entorno' },
    { corto: 'Comunidad',     grupo: 'entorno' },
    { corto: 'Sentido',       grupo: 'trascendencia' }
  ];

  const PASO = 360 / ROLES.length;
  const HUECO = 1.7;

  const polar = (r, g) => {
    const a = (g - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };

  function sectorAnular(r0, r1, a0, a1) {
    const [x0, y0] = polar(r1, a0), [x1, y1] = polar(r1, a1);
    const [x2, y2] = polar(r0, a1), [x3, y3] = polar(r0, a0);
    return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3} Z`;
  }

  const el = (t, a) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) n.setAttribute(k, a[k]);
    return n;
  };

  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function construir(svg) {
    const mini = svg.classList.contains('mini');
    const trazo = mini ? 'var(--verde-profundo)' : 'var(--crema-calido)';
    const fondoCentro = mini ? 'var(--verde-profundo)' : 'var(--crema-calido)';

    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: 203, fill: 'none',
      stroke: 'var(--mostaza)', 'stroke-width': 0.7, opacity: 0.45
    }));

    const rotuloCentro = el('text', { x: CX, y: CY + (mini ? 8 : 2), class: 'rueda-centro-rol' });
    const pieCentro    = el('text', { x: CX, y: CY + 20, class: 'rueda-centro-pie' });

    const reposar = () => {
      svg.classList.remove('tocada');
      svg.querySelectorAll('.sector').forEach(s => s.classList.remove('viva'));
      rotuloCentro.textContent = mini ? '3R' : 'Siete roles';
      pieCentro.textContent = 'PASA EL CURSOR';
    };

    ROLES.forEach((rol, i) => {
      const a0 = i * PASO + HUECO / 2;
      const a1 = (i + 1) * PASO - HUECO / 2;

      const grupo = el('g', { class: 'sector' });
      if (!mini) {
        grupo.setAttribute('tabindex', '0');
        grupo.setAttribute('role', 'button');
        grupo.setAttribute('aria-label', `${rol.corto} — rol ${rol.grupo}`);
      }

      ANILLOS.forEach(an => {
        grupo.appendChild(el('path', {
          d: sectorAnular(an.r0, an.r1, a0, a1),
          fill: 'var(--verde-eucalipto)',
          'fill-opacity': an.opacidad,
          stroke: trazo,
          'stroke-width': 1.3
        }));
      });

      // Filete dorado en el borde exterior: el metal de la marca, con avaricia.
      grupo.appendChild(el('path', {
        d: sectorAnular(196, 198.8, a0, a1),
        fill: 'var(--mostaza)'
      }));

      if (!mini) {
        const activar = () => {
          svg.classList.add('tocada');
          svg.querySelectorAll('.sector').forEach(s => s.classList.remove('viva'));
          grupo.classList.add('viva');
          rotuloCentro.textContent = rol.corto;
          pieCentro.textContent = rol.grupo.toUpperCase();
        };
        grupo.addEventListener('mouseenter', activar);
        grupo.addEventListener('focus', activar);
        grupo.addEventListener('blur', reposar);
      }

      // Entrada escalonada: la rueda se dibuja sector por sector.
      if (!sinMovimiento) {
        grupo.style.opacity = '0';
        grupo.style.transform = 'rotate(-8deg) scale(0.94)';
        grupo.style.transformOrigin = '210px 210px';
        grupo.style.transition = `opacity 620ms ease ${i * 80}ms, transform 760ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`;
      }

      svg.appendChild(grupo);
    });

    if (!mini) {
      ANILLOS.forEach(an => {
        const t = el('text', {
          x: CX, y: CY - (an.r0 + an.r1) / 2 + 3, class: 'rueda-anillo-etq'
        });
        t.textContent = an.nombre.toUpperCase();
        svg.appendChild(t);
      });
    }

    svg.appendChild(el('circle', { cx: CX, cy: CY, r: 62, fill: fondoCentro }));
    svg.appendChild(el('circle', {
      cx: CX, cy: CY, r: 62, fill: 'none', stroke: 'var(--mostaza)', 'stroke-width': 0.9
    }));
    svg.appendChild(rotuloCentro);
    if (!mini) svg.appendChild(pieCentro);

    reposar();
    if (!mini) svg.addEventListener('mouseleave', reposar);

    // Dispara la entrada cuando la rueda aparece en pantalla.
    const animar = () => {
      svg.querySelectorAll('.sector').forEach(s => {
        s.style.opacity = '';
        s.style.transform = '';
      });
    };
    if (sinMovimiento) {
      animar();
    } else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entradas) => {
        entradas.forEach(e => { if (e.isIntersecting) { animar(); io.disconnect(); } });
      }, { threshold: 0.25 });
      io.observe(svg);
    } else {
      animar();
    }
  }

  document.querySelectorAll('.rueda-lienzo').forEach(construir);

})();
