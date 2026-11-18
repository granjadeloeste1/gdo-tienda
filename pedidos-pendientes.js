/* PEDIDOS PENDIENTES DE GUARDAR
   ---------------------------------------------------------------------------
   Cada página de pedido (lista mayorista, lista minorista, combo, suprema) deja
   el pedido en una cola local ('gdo_reparto_inbox') ANTES de mandarlo a Rutas, y
   lo saca de la cola cuando Firestore confirma. Si el guardado se corta —el
   celular salta a WhatsApp y congela la página, el navegador de Instagram la
   cierra, se cae la señal— el pedido quedaba en esa cola PARA SIEMPRE: nadie la
   volvía a leer. El cliente mandaba su WhatsApp y el pedido no aparecía en Rutas.

   Este archivo es el que vuelve a leerla. Reintenta:
     · al abrir cualquiera de las páginas de pedido,
     · cuando el cliente VUELVE a la pestaña (típico: vuelve de WhatsApp),
     · cuando vuelve la conexión,
     · y cada 20 s mientras quede algo sin guardar.

   Reglas:
     · Nunca pisa un pedido que ya está en Rutas: primero mira si existe
       (las reglas dejan leer un pedido por su id) y, si existe, lo saca de la
       cola sin escribir. Además las reglas no dejan MODIFICAR a un cliente,
       así que un pedido ya armado o entregado no se puede volver a "pendiente".
     · Un pedido de más de 1 día ya no se reintenta (quedó viejo, o se canceló y
       se borró de Rutas y no hay que revivirlo: mejor que lo
       vea una persona) y se saca de la cola.
     · No muestra nada al cliente y no cambia cómo se arma ni se manda el pedido. */
(function () {
  'use strict';
  var INBOX = 'gdo_reparto_inbox';
  var MAX_EDAD = 24 * 60 * 60 * 1000;       // 1 día
  var MIN_EDAD = 20 * 1000;                 // deja terminar al guardado normal de la página
  var corriendo = false;

  function leer() {
    try { var a = JSON.parse(localStorage.getItem(INBOX) || '[]'); return Array.isArray(a) ? a.filter(function (x) { return x && x.id; }) : []; }
    catch (e) { return []; }
  }
  function sacar(id) {
    try { localStorage.setItem(INBOX, JSON.stringify(leer().filter(function (x) { return x.id !== id; }))); } catch (e) {}
  }
  function edad(p) { return Date.now() - (Number(p.creado || p.ts) || 0); }

  // Espera a que la página termine de armar Firebase (cada una lo arma a su tiempo).
  function firebaseListo() {
    return new Promise(function (res) {
      var n = 0;
      (function mirar() {
        var FB = window.GDO && window.GDO.FB;
        if (FB && FB.ready) { FB.ready.then(function (en) { res(en && FB.db ? FB : null); }, function () { res(null); }); return; }
        if (++n > 60) { res(null); return; }
        setTimeout(mirar, 500);
      })();
    });
  }
  // Las reglas piden sesión (anónima alcanza) para crear el pedido.
  function sesion(FB) {
    var au = FB.auth;
    if (!au || au.currentUser) return Promise.resolve();
    return new Promise(function (res) {
      var listo = false, un = null;
      function fin() { if (listo) return; listo = true; try { if (un) un(); } catch (e) {} res(); }
      try { un = au.onAuthStateChanged(function (u) { if (u) fin(); }); } catch (e) {}
      try { au.signInAnonymously().catch(function () {}); } catch (e) {}
      setTimeout(fin, 6000);
    });
  }
  function conLimite(promesa, ms) {
    return Promise.race([promesa, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('tiempo')); }, ms); })]);
  }
  function guardarUno(FB, p) {
    var ref = FB.db.collection('pedidos').doc(p.id);
    // source:'server' para no creer en una copia local: queremos saber si de verdad está en Rutas.
    return conLimite(ref.get({ source: 'server' }), 12000).then(function (doc) {
      if (doc.exists) { sacar(p.id); return; }
      return conLimite(ref.set(p), 15000).then(function () { sacar(p.id); });
    });
  }

  function pasada() {
    if (corriendo) return;
    var cola = leer();
    // Lo viejo se saca sin reintentar.
    cola.forEach(function (p) { if (edad(p) > MAX_EDAD) sacar(p.id); });
    cola = leer().filter(function (p) { return edad(p) >= MIN_EDAD; });
    if (!cola.length) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    corriendo = true;
    firebaseListo().then(function (FB) {
      if (!FB) return;
      return sesion(FB).then(function () {
        // De a uno, para no amontonar escrituras con mala señal.
        return cola.reduce(function (antes, p) {
          return antes.then(function () { return guardarUno(FB, p).catch(function () {}); });
        }, Promise.resolve());
      });
    }).catch(function () {}).then(function () { corriendo = false; });
  }
  window.addEventListener('online', pasada);
  window.addEventListener('pageshow', pasada);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pasada(); });
  // Cada 20 s mira la cola (si está vacía no hace nada): así también reintenta el
  // pedido que la página acaba de dejar, sin esperar a que se recargue.
  setInterval(pasada, 20000);
  setTimeout(pasada, 1500);
  // Para pruebas y para mirar desde la consola.
  window.GDO = window.GDO || {};
  window.GDO.Pendientes = { revisar: pasada, cola: leer };
})();
