/* promos.js — bloques de promoción con fecha de vencimiento.
   Lee promos.json, que el build publica solo con las promociones cuya hora de inicio
   ya pasó (Web/promos.json es interno). Para cada <div data-promo="id" hidden>:
   si la promo está vigente (desde <= ahora < hasta, reloj del navegador), la pinta
   con sus ofertas y un contador hasta el cierre; al llegar el cierre la oculta.
   Sin promos.json, vacío o sin red: no hace nada y el bloque sigue oculto.
   Opcional en el contenedor: data-promo-ofertas="diplomatura,sueroterapia" limita
   las ofertas que se muestran; data-promo-nivel="3" es el nivel del título (h2–h4).
   El cierre real lo hace la pasarela: esto solo evita mostrar un precio vencido. */
(function (raiz) {
  "use strict";

  var MINUTO = 60000;

  function vigente(promo, ahora) {
    var desde = Date.parse(promo && promo.desde);
    var hasta = Date.parse(promo && promo.hasta);
    if (isNaN(desde) || isNaN(hasta)) return false;
    return desde <= ahora && ahora < hasta;
  }

  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }

  /* "2 días, 3 horas y 5 minutos". Redondea hacia arriba al minuto: nunca dice
     "0 minutos" mientras la oferta sigue abierta. */
  function restante(ms) {
    var min = Math.max(1, Math.ceil(ms / MINUTO));
    var d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    var partes = [];
    if (d) partes.push(plural(d, "día", "días"));
    if (h) partes.push(plural(h, "hora", "horas"));
    if (m) partes.push(plural(m, "minuto", "minutos"));
    if (partes.length === 1) return partes[0];
    return partes.slice(0, -1).join(", ") + " y " + partes[partes.length - 1];
  }

  function precio(valor, moneda) {
    var n = Number(valor);
    var cifra = isFinite(n) ? n.toLocaleString("en-US") : String(valor);
    return (moneda || "USD") + " " + cifra;
  }

  function el(doc, etiqueta, clase, texto) {
    var e = doc.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function pintar(doc, cont, promo) {
    var filtro = (cont.getAttribute("data-promo-ofertas") || "")
      .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var nivel = parseInt(cont.getAttribute("data-promo-nivel"), 10);
    if (!(nivel >= 2 && nivel <= 4)) nivel = 3;

    var ofertas = (promo.ofertas || []).filter(function (o) {
      return !filtro.length || filtro.indexOf(o.id) !== -1;
    });
    if (!ofertas.length) return null;

    while (cont.firstChild) cont.removeChild(cont.firstChild);
    cont.classList && cont.classList.add("fo-promo");

    cont.appendChild(el(doc, "h" + nivel, "fo-promo-titulo", promo.titulo || ""));

    var reloj = el(doc, "p", "fo-promo-reloj");
    reloj.setAttribute("role", "status");
    reloj.setAttribute("aria-live", "polite");
    reloj.setAttribute("aria-atomic", "true");
    cont.appendChild(reloj);

    var lista = el(doc, "ul", "fo-promo-ofertas");
    ofertas.forEach(function (o) {
      var li = el(doc, "li", "fo-promo-oferta");
      li.appendChild(el(doc, "p", "fo-promo-nombre", o.nombre || ""));

      var precios = el(doc, "p", "fo-promo-precios");
      var antes = el(doc, "s", "fo-promo-antes");
      antes.appendChild(el(doc, "span", "solo-lectores", "Precio habitual: "));
      antes.appendChild(doc.createTextNode(precio(o.habitual, o.moneda)));
      precios.appendChild(antes);
      precios.appendChild(doc.createTextNode(" "));
      var ahora = el(doc, "strong", "fo-promo-ahora");
      ahora.appendChild(el(doc, "span", "solo-lectores", "Precio de la promoción: "));
      ahora.appendChild(doc.createTextNode(precio(o.promo, o.moneda)));
      precios.appendChild(ahora);
      if (o.descuento) {
        precios.appendChild(doc.createTextNode(" "));
        precios.appendChild(el(doc, "span", "etiqueta", o.descuento + " % de descuento"));
      }
      li.appendChild(precios);

      if (o.enlace) {
        var a = el(doc, "a", "boton " + (o.id === "diplomatura" ? "boton-lleno" : "boton-secundario"),
                   "Comprar " + (o.nombre || ""));
        a.setAttribute("href", o.enlace);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        a.setAttribute("data-origen", "promo-" + promo.id + "-" + o.id);
        li.appendChild(a);
      }
      lista.appendChild(li);
    });
    cont.appendChild(lista);
    return reloj;
  }

  /* Deja el bloque vivo: contador por minuto y cierre exacto al llegar "hasta".
     reloj() es inyectable para las pruebas. */
  function animar(cont, rotulo, promo, reloj, programar, cancelar) {
    reloj = reloj || Date.now;
    programar = programar || function (f, ms) { return setTimeout(f, ms); };
    cancelar = cancelar || function (h) { clearTimeout(h); };
    var hasta = Date.parse(promo.hasta);
    var cerrado = false, turno = null;

    function cerrar() {
      if (cerrado) return;
      cerrado = true;
      cont.hidden = true;
      while (cont.firstChild) cont.removeChild(cont.firstChild);
    }

    function tic() {
      if (turno !== null) { cancelar(turno); turno = null; }
      if (cerrado) return;
      var falta = hasta - reloj();
      if (falta <= 0) { cerrar(); return; }
      rotulo.textContent = "La oferta termina en " + restante(falta) + ".";
      // el próximo tic cae en el cambio de minuto, o justo en el cierre si está más cerca
      var siguiente = falta % MINUTO || MINUTO;
      turno = programar(tic, Math.min(siguiente, falta));
    }

    cont.hidden = false;
    tic();
    return { tic: tic, cerrar: cerrar, cerrado: function () { return cerrado; } };
  }

  function iniciar(doc, datos, reloj, programar, cancelar) {
    reloj = reloj || Date.now;
    var promos = (datos && datos.promos) || [];
    var vivos = [];
    if (!promos.length) return vivos;
    var conts = doc.querySelectorAll("[data-promo]");
    Array.prototype.forEach.call(conts, function (cont) {
      var id = cont.getAttribute("data-promo");
      var promo = promos.filter(function (p) { return p.id === id; })[0];
      if (!promo || !vigente(promo, reloj())) return;
      var rotulo = pintar(doc, cont, promo);
      if (rotulo) vivos.push(animar(cont, rotulo, promo, reloj, programar, cancelar));
    });
    return vivos;
  }

  var api = { vigente: vigente, restante: restante, precio: precio, iniciar: iniciar };

  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  var doc = raiz.document;
  if (!doc || !doc.querySelector("[data-promo]") || !raiz.fetch) return;
  raiz.fetch("promos.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (datos) {
      var vivos = iniciar(doc, datos);
      // una pestaña en segundo plano frena los temporizadores: al volver, se recalcula
      if (vivos.length) doc.addEventListener("visibilitychange", function () {
        if (!doc.hidden) vivos.forEach(function (v) { v.tic(); });
      });
    })
    .catch(function () { /* sin promociones: el bloque sigue oculto */ });
})(typeof window !== "undefined" ? window : this);
