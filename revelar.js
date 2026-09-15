/* Comportamiento compartido por todas las páginas:
   el revelado al hacer scroll y el menú en pantalla angosta.
   Vivía dentro de rueda.js, donde no tenía nada que hacer. */
(() => {
  'use strict';
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- revelado de secciones ---------- */
  const aRevelar = document.querySelectorAll('.revelar');
  const revelarTodo = () => aRevelar.forEach(n => n.classList.add('visible'));

  if (aRevelar.length && 'IntersectionObserver' in window && !sinMovimiento) {
    const io = new IntersectionObserver((entradas, obs) => {
      entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
    aRevelar.forEach(n => io.observe(n));
    // Red de seguridad: si algo no se reveló en 4 s, se muestra igual.
    setTimeout(revelarTodo, 4000);
  } else {
    revelarTodo();
  }

  /* ---------- menú en pantalla angosta ---------- */
  const boton = document.querySelector('.nav-boton');
  const menu = document.getElementById('nav-menu');
  if (boton && menu) {
    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      document.documentElement.classList.toggle('menu-abierto', !abierto);
    });
    // Al elegir algo, el menú se cierra solo.
    menu.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        boton.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('menu-abierto');
      }
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        boton.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('menu-abierto');
        boton.focus();
      }
    });
  }
})();
