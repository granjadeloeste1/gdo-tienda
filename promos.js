/* ====== GDO Tienda — carrusel de promos ======================================
   Las piezas VERTICALES (formato estado de WhatsApp, 9:16) que el admin sube
   desde rutas.granjadeloeste.com → "Promos de la tienda". Se guardan en la
   colección `promos` de Firestore con la imagen embebida como dataURL (el plan
   gratis de Firebase no incluye Storage), ya comprimidas a ~150 KB.

   POR QUÉ NO OCUPAN TODA LA PANTALLA: una imagen 9:16 a ancho completo se come
   el celular entero y empuja la lista de precios abajo de todo, que es a lo que
   el cliente viene. Así que se muestran en una tarjeta alta pero acotada
   (nunca más de 42% de la altura de la pantalla), y al tocarla se abre en
   PANTALLA COMPLETA, que es donde el texto de la promo se lee de verdad.

   Si no hay promos activas, si no hay internet o si Firestore falla, esto no
   dibuja nada y la página queda exactamente como estaba. Nunca rompe la lista.
   Uso: dejar un <section id="gdoPromos" hidden></section> y llamar a
   GDO.Promos.init() (en páginas estáticas se llama solo).                   */
window.GDO = window.GDO || {};
(function () {
  var CADENCIA = 5000;      // ms entre promo y promo
  var promos = null;        // cache en memoria: se pide a Firestore una sola vez
  var pidiendo = null;

  function db() { return (GDO.FB && GDO.FB.db) ? GDO.FB.db : null; }

  function traer() {
    if (promos) return Promise.resolve(promos);
    if (pidiendo) return pidiendo;
    var d = db();
    if (!d) return Promise.resolve([]);
    // Sin orderBy: el orden lo damos en memoria. Así no hace falta crear un
    // índice en Firestore ni depende de que todos los docs tengan el campo.
    pidiendo = d.collection('promos').get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) {
        var p = doc.data() || {};
        if (p.activo && p.img) out.push({ id: doc.id, img: p.img, link: p.link || '', titulo: p.titulo || '', orden: p.orden || 0 });
      });
      out.sort(function (a, b) { return a.orden - b.orden; });
      promos = out;
      return out;
    }).catch(function (e) {
      if (window.console) console.warn('[GDO] promos', e && e.code);
      promos = [];
      return promos;
    });
    return pidiendo;
  }

  /* ---------- visor a pantalla completa ---------- */
  function abrir(p) {
    if (p.link) { window.open(p.link, '_blank', 'noopener'); return; }
    var ov = document.createElement('div');
    ov.className = 'gp-full';
    ov.innerHTML = '<button class="gp-x" aria-label="Cerrar">&times;</button><img src="' + p.img + '" alt="">';
    ov.onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }

  /* ---------- montaje ---------- */
  function montar(cont, lista) {
    if (!lista.length) { cont.hidden = true; return; }
    cont.hidden = false;
    cont.innerHTML =
      '<div class="gp-stage" id="gpStage">' +
        '<div class="gp-track" id="gpTrack">' +
          lista.map(function (p) {
            return '<div class="gp-slide">' +
                     '<img src="' + p.img + '" alt="' + (p.titulo || 'Promo Granja del Oeste').replace(/"/g, '') + '" loading="lazy">' +
                   '</div>';
          }).join('') +
        '</div>' +
        (lista.length > 1 ? '<div class="gp-dots" id="gpDots"></div>' : '') +
        // Sin este cartelito nadie descubre que la promo se puede agrandar, y
        // el texto de una pieza 9:16 achicada no se termina de leer.
        '<span class="gp-hint">' + (lista.some(function (p) { return p.link; }) ? 'Abrir' : '🔍 Ampliar') + '</span>' +
      '</div>';

    var track = cont.querySelector('#gpTrack');
    var dots = cont.querySelector('#gpDots');
    var i = 0, timer = null;

    function ir(x) {
      i = (x + lista.length) % lista.length;
      // VERTICAL: la promo siguiente entra desde abajo, como un estado de WhatsApp.
      track.style.transform = 'translateY(-' + (i * 100) + '%)';
      if (dots) Array.prototype.forEach.call(dots.children, function (c, k) { c.className = (k === i ? 'on' : ''); });
    }
    function arrancar() { if (lista.length > 1) { clearInterval(timer); timer = setInterval(function () { ir(i + 1); }, CADENCIA); } }

    if (dots) {
      for (var k = 0; k < lista.length; k++) {
        var d = document.createElement('i');
        (function (idx) { d.onclick = function () { ir(idx); arrancar(); }; })(k);
        dots.appendChild(d);
      }
    }
    ir(0); arrancar();

    /* Deslizar con el dedo, HACIA EL COSTADO, aunque la animación sea vertical.
       Parece contradictorio pero es a propósito: un swipe vertical sobre la
       tarjeta es indistinguible del scroll de la página, y para cambiar de
       promo habría que bloquearle al cliente el gesto con el que baja a ver los
       precios. El costado es inequívoco. Igual la mayoría solo mira cómo rotan
       solas o toca los puntitos. 40 px de umbral. */
    var x0 = null, y0 = null;
    var stage = cont.querySelector('#gpStage');
    stage.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { ir(i + (dx < 0 ? 1 : -1)); arrancar(); }
      x0 = y0 = null;
    }, { passive: true });

    stage.addEventListener('click', function () { abrir(lista[i]); });
  }

  function init() {
    var cont = document.getElementById('gdoPromos');
    if (!cont || cont.getAttribute('data-listo') === '1') return;
    cont.setAttribute('data-listo', '1');
    // Firebase tarda un instante en levantar: si todavía no está, esperamos su
    // promesa `ready` en vez de asumir que no hay promos.
    var esperar = (GDO.FB && GDO.FB.ready && GDO.FB.ready.then) ? GDO.FB.ready : Promise.resolve(true);
    esperar.then(function () {
      traer().then(function (l) { montar(cont, l); });
    });
  }

  // Volver a montar (la minorista redibuja su pantalla al navegar).
  function refrescar() {
    var cont = document.getElementById('gdoPromos');
    if (!cont) return;
    cont.removeAttribute('data-listo');
    init();
  }

  GDO.Promos = { init: init, refrescar: refrescar };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
