/* Filtros del catálogo de recursos. Se arman con los tipos que existen:
   un filtro sin nada detrás es una promesa vacía. */
(() => {
  'use strict';
  const NOMBRES = {
    guia: 'Guías', cuestionario: 'Cuestionarios', seguimiento: 'Hojas de seguimiento',
    lista: 'Listas', cuaderno: 'Cuadernos', libro: 'Libros', clase: 'Materiales de clase',
    plantilla: 'Plantillas', herramienta: 'Herramientas', curso: 'Cursos'
  };
  const caja = document.querySelector('.filtros');
  const items = [...document.querySelectorAll('.catalogo [data-tipo]')];
  const tipos = [...new Set(items.map(i => i.dataset.tipo))];
  if (!caja || tipos.length < 2) return;

  const boton = (valor, texto) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro';
    b.dataset.valor = valor;
    b.textContent = texto;
    b.setAttribute('aria-pressed', valor === 'todos' ? 'true' : 'false');
    return b;
  };
  caja.append(boton('todos', 'Todos'), ...tipos.map(t => boton(t, NOMBRES[t] || t)));
  caja.hidden = false;
  caja.addEventListener('click', e => {
    const b = e.target.closest('.filtro');
    if (!b) return;
    caja.querySelectorAll('.filtro').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    items.forEach(i => { i.hidden = b.dataset.valor !== 'todos' && i.dataset.tipo !== b.dataset.valor; });
  });
})();
