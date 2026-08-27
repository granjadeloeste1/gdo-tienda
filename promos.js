/* ====== GDO Tienda — carrusel de promos ======================================
   Las piezas VERTICALES (formato estado de WhatsApp, 9:16) que el admin sube
   desde rutas.granjadeloeste.com → "Promos de la tienda". Se guardan en la
   colección `promos` de Firestore con la imagen embebida como dataURL (el plan
   gratis de Firebase no incluye Storage), ya comprimidas a ~150 KB.

   Se muestran DE A DOS, se corren de derecha a izquierda (solas cada X segundos
   y también con las flechitas), y al tocar una se abre en PANTALLA COMPLETA,
   que es donde el texto de una pieza 9:16 se lee de verdad.

   Cuánto dura cada imagen lo define el admin: doc `promos/_config { segundos }`.
   Ese documento no tiene `img`, así que nunca se dibuja como una promo más.

   Si no hay promos activas, si no hay internet o si Firestore falla, esto no
   dibuja nada y la página queda exactamente como estaba. Nunca rompe la lista.
   Uso: dejar un <section id="gdoPromos" hidden></section> y llamar a
   GDO.Promos.init() (en páginas estáticas se llama solo).                   */
window.GDO = window.GDO || {};
(function () {
  var POR_PANTALLA = 2;     // cuántas promos se ven a la vez
  var SEG_DEF = 5;          // segundos por imagen si el admin no configuró nada
  var datos = null;         // cache en memoria: se pide a Firestore una sola vez
  var pidiendo = null;

  function db() { return (GDO.FB && GDO.FB.db) ? GDO.FB.db : null; }

  function traer() {
    if (datos) return Promise.resolve(datos);
    if (pidiendo) return pidiendo;
    var d = db();
    if (!d) return Promise.resolve({ lista: [], segundos: SEG_DEF });
    // Sin orderBy: el orden lo damos en memoria. Así no hace falta crear un
    // índice en Firestore ni depende de que todos los docs tengan el campo.
    pidiendo = d.collection('promos').get().then(function (snap) {
      var out = [], seg = SEG_DEF;
      snap.forEach(function (doc) {
        var p = doc.data() || {};
        if (doc.id === '_config') { if (p.segundos > 0) seg = p.segundos; return; }
        if (p.activo && p.img) out.push({ id: doc.id, img: p.img, link: p.link || '', titulo: p.titulo || '', orden: p.orden || 0 });
      });
      out.sort(function (a, b) { return a.orden - b.orden; });
      datos = { lista: out, segundos: seg };
      return datos;
    }).catch(function (e) {
      if (window.console) console.warn('[GDO] promos', e && e.code);
      datos = { lista: [], segundos: SEG_DEF };
      return datos;
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
  function montar(cont, d) {
    var lista = d.lista, seg = d.segundos;
    if (!lista.length) { cont.hidden = true; return; }
    cont.hidden = false;

    // Con 2 o menos no hay nada que correr: se muestran quietas y sin flechas.
    var mueve = lista.length > POR_PANTALLA;
    var maxIdx = Math.max(0, lista.length - POR_PANTALLA);

    cont.innerHTML =
      '<div class="gp-wrap' + (mueve ? '' : ' fija') + '">' +
        '<div class="gp-stage" id="gpStage">' +
          '<div class="gp-track" id="gpTrack">' +
            lista.map(function (p, k) {
              return '<div class="gp-slide" data-k="' + k + '">' +
                       '<img src="' + p.img + '" alt="' + (p.titulo || 'Promo Granja del Oeste').replace(/"/g, '') + '" loading="lazy">' +
                       '<span class="gp-hint">' + (p.link ? 'Abrir' : '🔍 Ampliar') + '</span>' +
                     '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
        (mueve ? '<button class="gp-nav prev" id="gpPrev" aria-label="Anterior">‹</button>' +
                 '<button class="gp-nav next" id="gpNext" aria-label="Siguiente">›</button>' : '') +
      '</div>' +
      (mueve ? '<div class="gp-dots" id="gpDots"></div>' : '');

    var track = cont.querySelector('#gpTrack');
    var dots = cont.querySelector('#gpDots');
    var i = 0, timer = null;

    function ir(x) {
      // Se corren de DERECHA A IZQUIERDA: la de más a la derecha entra y el
      // contenido se desplaza hacia la izquierda. Avanza de a UNA, no de a dos:
      // así la promo que estaba a la derecha queda a la vista un rato más.
      i = x < 0 ? maxIdx : (x > maxIdx ? 0 : x);
      track.style.transform = 'translateX(-' + (i * (100 / POR_PANTALLA)) + '%)';
      if (dots) Array.prototype.forEach.call(dots.children, function (c, k) { c.className = (k === i ? 'on' : ''); });
    }
    function arrancar() {
      if (!mueve) return;
      clearInterval(timer);
      timer = setInterval(function () { ir(i + 1); }, Math.max(2, seg) * 1000);
    }

    if (dots) {
      for (var k = 0; k <= maxIdx; k++) {
        var e = document.createElement('i');
        (function (idx) { e.onclick = function () { ir(idx); arrancar(); }; })(k);
        dots.appendChild(e);
      }
    }
    ir(0); arrancar();

    if (mueve) {
      // Las flechas cortan el automático y lo vuelven a arrancar, para que no
      // se mueva sola justo cuando la persona la está mirando.
      cont.querySelector('#gpPrev').onclick = function (ev) { ev.stopPropagation(); ir(i - 1); arrancar(); };
      cont.querySelector('#gpNext').onclick = function (ev) { ev.stopPropagation(); ir(i + 1); arrancar(); };

      // Deslizar con el dedo. 40 px de umbral y exigiendo que el movimiento sea
      // más horizontal que vertical, para no robarle el scroll a la página.
      var x0 = null, y0 = null;
      var stage = cont.querySelector('#gpStage');
      stage.addEventListener('touchstart', function (ev) {
        x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY;
      }, { passive: true });
      stage.addEventListener('touchend', function (ev) {
        if (x0 === null) return;
        var dx = ev.changedTouches[0].clientX - x0;
        var dy = ev.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { ir(i + (dx < 0 ? 1 : -1)); arrancar(); }
        x0 = y0 = null;
      }, { passive: true });
    }

    // Cada tarjeta abre SU promo (no la del índice), que es lo que el dedo tocó.
    cont.querySelectorAll('.gp-slide').forEach(function (s) {
      s.onclick = function () { abrir(lista[+s.getAttribute('data-k')]); };
    });
  }

  /* RESERVAR EL LUGAR ANTES DE TENER LAS IMÁGENES.
     Firestore tarda un segundo largo en responder. Si el carrusel aparece
     recién ahí, empuja el logo y los botones hacia abajo con la pantalla ya
     dibujada: se ve como si el logo se cortara al medio. Para evitarlo dejamos
     anotado en el navegador cuántas promos había la última vez y pintamos un
     esqueleto del MISMO tamaño desde el arranque. Las imágenes entran adentro
     del hueco que ya estaba hecho y no se mueve nada.
     La primera visita de todas no tiene con qué adivinar: ahí no reserva nada
     (mejor no dejar un hueco gris en una tienda que quizá no tiene promos). */
  var LS_N = 'gdoPromosN';
  function recordado() {
    try { return parseInt(localStorage.getItem(LS_N) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function recordar(n) { try { localStorage.setItem(LS_N, String(n)); } catch (e) {} }

  function esqueleto(cont) {
    var n = Math.min(recordado(), POR_PANTALLA);
    if (!n) return;
    cont.hidden = false;
    var s = '';
    for (var k = 0; k < n; k++) s += '<span></span>';
    cont.innerHTML = '<div class="gp-skel">' + s + '</div>';
  }

  function init() {
    var cont = document.getElementById('gdoPromos');
    if (!cont || cont.getAttribute('data-listo') === '1') return;
    cont.setAttribute('data-listo', '1');
    esqueleto(cont);
    // Firebase tarda un instante en levantar: si todavía no está, esperamos su
    // promesa `ready` en vez de asumir que no hay promos.
    var esperar = (GDO.FB && GDO.FB.ready && GDO.FB.ready.then) ? GDO.FB.ready : Promise.resolve(true);
    esperar.then(function () {
      traer().then(function (d) {
        recordar(d.lista.length);
        montar(cont, d);
      });
    });
  }

  // Volver a montar (por si la pantalla se redibuja al navegar).
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
