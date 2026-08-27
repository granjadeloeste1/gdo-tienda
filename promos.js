/* ====== GDO Tienda — carrusel de promos ======================================
   Las piezas VERTICALES (formato estado de WhatsApp, 9:16) que el admin sube
   desde rutas.granjadeloeste.com → "Promos de la tienda". Se guardan en la
   colección `promos` de Firestore con la imagen embebida como dataURL (el plan
   gratis de Firebase no incluye Storage), ya comprimidas.

   Se muestran DE A DOS, se corren de derecha a izquierda (solas cada X segundos
   y también con las flechitas), y al tocar una se abre en PANTALLA COMPLETA,
   que es donde el texto de una pieza 9:16 se lee de verdad.

   ─── POR QUÉ NO USA EL SDK DE FIREBASE ───────────────────────────────────
   Antes esperaba a `GDO.FB.ready` y tardaba ~10 segundos en mostrar algo. Esa
   promesa recién resuelve después de: bajar 4 archivos del SDK (~500 KB),
   arrancar Firebase, activar App Check, abrir IndexedDB y hacer un LOGIN
   ANÓNIMO contra los servidores de Google. Cinco esperas encadenadas antes de
   pedir la primera imagen.

   Nada de eso hace falta acá: la regla de `/promos` es `allow read: if true`.
   Son piezas de publicidad, se leen sin login. Así que vamos derecho por la
   API REST de Firestore con un solo `fetch`, que arranca apenas carga la
   página y corre en paralelo con todo lo demás. El SDK queda solo como
   respaldo por si el fetch falla.

   ─── Y POR QUÉ IGUAL APARECEN AL INSTANTE ────────────────────────────────
   Aunque el fetch sea rápido, sigue siendo red. Por eso guardamos las promos
   (imágenes incluidas) en el navegador: al abrir la página se pintan de ahí
   SIN TOCAR LA RED, y después se refresca en segundo plano. De la segunda
   visita en adelante el carrusel está antes de que el ojo lo registre.

   Si no hay promos activas, si no hay internet o si Firestore falla, esto no
   dibuja nada y la página queda exactamente como estaba. Nunca la rompe.  */
window.GDO = window.GDO || {};
(function () {
  var POR_PANTALLA = 2;     // cuántas promos se ven a la vez
  var SEG_DEF = 5;          // segundos por imagen si el admin no configuró nada

  // Mismos datos públicos que ya están en el HTML de esta página. Se leen de
  // GDO.FB.cfg si está, y si no se usan estos (la clave del navegador es
  // pública por diseño; quien manda es la regla de Firestore).
  var PROJECT = 'ruteogdo';
  var API_KEY = 'AIzaSyDljWSSEDrZylMxgYCPaqaqU2x-3QYvZaM';

  var LS_DATOS = 'gdoPromosCache1';   // promos completas (con imágenes)
  var LS_N = 'gdoPromosN';            // solo la cantidad, para reservar el lugar
  var MAX_CACHE = 3 * 1024 * 1024;    // no llenar el almacenamiento del cliente

  var datos = null;
  var pidiendo = null;

  /* ─────────────── almacenamiento local (tolerante a fallos) ─────────────── */
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribirLS(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function leerCache() {
    var raw = leerLS(LS_DATOS);
    if (!raw) return null;
    try {
      var d = JSON.parse(raw);
      return (d && d.lista && d.lista.length) ? d : null;
    } catch (e) { return null; }
  }
  function guardarCache(d) {
    escribirLS(LS_N, String(d.lista.length));
    var txt = JSON.stringify(d);
    // Si las imágenes no entran, al menos queda la cantidad para reservar el
    // lugar y que no salte la pantalla cuando lleguen.
    if (txt.length > MAX_CACHE) { try { localStorage.removeItem(LS_DATOS); } catch (e) {} return; }
    escribirLS(LS_DATOS, txt);
  }

  /* ─────────────── traer las promos ─────────────── */

  // Formato de la API REST de Firestore: cada campo viene envuelto en su tipo.
  function parseRest(j) {
    var out = [], seg = SEG_DEF;
    (j.documents || []).forEach(function (d) {
      var id = String(d.name || '').split('/').pop();
      var f = d.fields || {};
      var num = function (c) { return c ? Number(c.integerValue != null ? c.integerValue : c.doubleValue) : 0; };
      if (id === '_config') { var s = num(f.segundos); if (s > 0) seg = s; return; }
      var img = f.img && f.img.stringValue;
      if (!(f.activo && f.activo.booleanValue) || !img) return;
      out.push({
        id: id, img: img,
        link: (f.link && f.link.stringValue) || '',
        titulo: (f.titulo && f.titulo.stringValue) || '',
        orden: num(f.orden),
      });
    });
    out.sort(function (a, b) { return a.orden - b.orden; });
    return { lista: out, segundos: seg };
  }

  function traerRest() {
    var cfg = (GDO.FB && GDO.FB.cfg) || {};
    var proj = cfg.projectId || PROJECT;
    var key = cfg.apiKey || API_KEY;
    var url = 'https://firestore.googleapis.com/v1/projects/' + proj +
              '/databases/(default)/documents/promos?pageSize=50&key=' + key;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(parseRest);
  }

  /* Camino por el SDK. La clave está acá: espera SOLO a que exista la base
     (`GDO.FB.db`), NO a `GDO.FB.ready`. Esa promesa recién resuelve después del
     LOGIN ANÓNIMO, que es un viaje entero a los servidores de Google — y para
     leer promos no hace falta ninguna sesión. Esperarla era la mitad de los 10
     segundos que tardaba en aparecer el carrusel. */
  function baseLista() {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function mirar() {
        if (GDO.FB && GDO.FB.db) return res(GDO.FB.db);
        if (Date.now() - t0 > 8000) return res(null);   // el SDK no cargó nunca
        setTimeout(mirar, 60);
      })();
    });
  }

  function consultar(d) {
    return d.collection('promos').get().then(function (snap) {
      var out = [], seg = SEG_DEF;
      snap.forEach(function (doc) {
        var p = doc.data() || {};
        if (doc.id === '_config') { if (p.segundos > 0) seg = p.segundos; return; }
        if (p.activo && p.img) out.push({ id: doc.id, img: p.img, link: p.link || '', titulo: p.titulo || '', orden: p.orden || 0 });
      });
      out.sort(function (a, b) { return a.orden - b.orden; });
      return { lista: out, segundos: seg };
    });
  }

  function traerSdk() {
    return baseLista().then(function (d) {
      if (!d) return { lista: [], segundos: SEG_DEF };
      return consultar(d).catch(function () {
        // Si falló, puede ser que hayamos llegado antes que el login y la regla
        // sí pida sesión. Un solo reintento cuando la sesión esté lista.
        var esperar = (GDO.FB && GDO.FB.ready && GDO.FB.ready.then) ? GDO.FB.ready : Promise.resolve(true);
        return esperar.then(function () { return consultar(d); });
      });
    });
  }

  /* El camino por REST es el más rápido (arranca sin esperar a que baje el SDK),
     pero depende de que `/promos` permita lectura sin sesión y de que App Check
     no esté exigiendo token. Hoy Firestore lo rechaza. Así que se intenta UNA
     vez, y si no anda queda anotado para no perder tiempo en cada visita; se
     vuelve a probar una vez por semana, por si algún día se habilita. */
  var LS_NOREST = 'gdoPromosSinRest';
  var REINTENTO_REST = 7 * 24 * 3600 * 1000;

  function restDescartado() {
    var t = parseInt(leerLS(LS_NOREST) || '0', 10);
    return t > 0 && (Date.now() - t) < REINTENTO_REST;
  }

  function traer() {
    if (pidiendo) return pidiendo;
    var intento = restDescartado()
      ? traerSdk()
      : traerRest().catch(function (e) {
          escribirLS(LS_NOREST, String(Date.now()));
          if (window.console) console.warn('[GDO] promos: REST no disponible, uso el SDK.', e && e.message);
          return traerSdk();
        });
    pidiendo = intento.catch(function (e) {
      if (window.console) console.warn('[GDO] promos', e && (e.code || e.message));
      return { lista: [], segundos: SEG_DEF };
    }).then(function (d) {
      datos = d;
      guardarCache(d);
      return d;
    });
    return pidiendo;
  }

  /* ─────────────── visor a pantalla completa ─────────────── */
  function abrir(p) {
    if (p.link) { window.open(p.link, '_blank', 'noopener'); return; }
    var ov = document.createElement('div');
    ov.className = 'gp-full';
    ov.innerHTML = '<button class="gp-x" aria-label="Cerrar">&times;</button><img src="' + p.img + '" alt="">';
    ov.onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }

  /* ─────────────── montaje ─────────────── */
  var montadoCon = '';   // huella de lo dibujado, para no redibujar al pedazo

  function huella(d) {
    return d.segundos + '|' + d.lista.map(function (p) { return p.id + ':' + p.orden; }).join(',');
  }

  function montar(cont, d) {
    var lista = d.lista, seg = d.segundos;
    if (!lista.length) { cont.hidden = true; cont.innerHTML = ''; montadoCon = ''; return; }
    var hu = huella(d);
    if (hu === montadoCon) return;      // ya está dibujado esto mismo: no tocar
    montadoCon = hu;
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
                       '<img src="' + p.img + '" alt="' + (p.titulo || 'Promo Granja del Oeste').replace(/"/g, '') + '"' +
                       // Las dos primeras son las que se ven: que las decodifique
                       // ya. El resto puede esperar sin frenar el dibujado.
                       (k < POR_PANTALLA ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"') + '>' +
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

  /* Mientras no haya NADA que mostrar (primera visita), reservamos el lugar con
     un esqueleto del mismo tamaño: si el carrusel apareciera después, empujaría
     el logo y los botones con la pantalla ya dibujada. */
  function esqueleto(cont) {
    var n = Math.min(parseInt(leerLS(LS_N) || '0', 10) || 0, POR_PANTALLA);
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

    // 1) De entrada, lo que ya tenemos guardado: sin red, sin esperar nada.
    var cache = leerCache();
    if (cache) montar(cont, cache); else esqueleto(cont);

    // 2) En paralelo, la versión al día. Solo redibuja si de verdad cambió.
    traer().then(function (d) { montar(cont, d); });
  }

  // Volver a montar (por si la pantalla se redibuja al navegar).
  function refrescar() {
    var cont = document.getElementById('gdoPromos');
    if (!cont) return;
    cont.removeAttribute('data-listo');
    montadoCon = '';
    init();
  }

  GDO.Promos = { init: init, refrescar: refrescar };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
