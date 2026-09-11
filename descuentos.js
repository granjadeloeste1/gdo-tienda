/* ====== Tienda GDO — Código de descuento ======
   Lo usan las dos listas: index.html (mayorista) y vista-minorista.html
   (minorista). El cliente escribe el código ANTES de mandar el pedido.

   El código se busca en Firestore: colección `descuentos`, un documento por
   código. La regla deja LEER uno sabiendo su nombre, pero no listarlos. Desde
   el navegador se revisa lo que se puede revisar: que exista, que esté activo,
   que no esté vencido, que valga para la modalidad (los "solo envío" no valen
   para retirar) y, si es PERSONAL, que el teléfono sea el de su dueño. Si el
   cliente ya lo había usado, lo detecta el panel al recibir el pedido.

   El descuento es un % sobre los PRODUCTOS, no sobre el envío. El pedido viaja
   con `descuento: {codigo, pct, tipo, nombre, subtotal, monto}` y
   `totalEstimado` = lo que se cobra de productos. Es la MISMA forma que usa el
   panel (gdo-reparto/js/descuentos.js): si se toca una, tocar la otra. */
(function () {
  var G = window.GDO = window.GDO || {};

  // "volve 10" → "VOLVE10": igual que el panel (es el id del documento).
  function norm(s) {
    return String(s == null ? '' : s).toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9-]+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  }
  function tel8(t) { var d = String(t || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-8) : ''; }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fmtDia(s) { if (!s) return ''; var p = String(s).split('-'); return p[2] + '/' + p[1]; }
  function peso(n) { return '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Busca el código en el SERVIDOR (no en la copia offline): un código pausado
     o vencido no tiene que valer por haber quedado guardado en el celular. */
  function buscar(codigo) {
    var k = norm(codigo);
    return new Promise(function (res, rej) {
      if (!k) { res(null); return; }
      var t = setTimeout(function () { rej(new Error('timeout')); }, 9000);
      var go = function () {
        if (!(G.FB && G.FB.db)) { clearTimeout(t); rej(new Error('sin-firebase')); return; }
        G.FB.db.collection('descuentos').doc(k).get({ source: 'server' }).then(function (d) {
          clearTimeout(t);
          res(d.exists ? Object.assign({ id: d.id }, d.data()) : null);
        }, function (e) { clearTimeout(t); rej(e); });
      };
      if (G.FB && G.FB.ready) G.FB.ready.then(go, go); else go();
    });
  }

  /* ctx = { telefono, modalidad ('envio'|'retiro'), soloRetiro (la lista es
     solo de retiro: la mayorista) }. Devuelve { ok, error }. */
  function validar(d, ctx) {
    ctx = ctx || {};
    if (!d) return { ok: false, error: 'Ese código no existe. Revisá que esté bien escrito.' };
    if (d.activo === false) return { ok: false, error: 'Ese código no está activo en este momento.' };
    if (d.vence && d.vence < hoyISO()) return { ok: false, error: 'Ese código venció el ' + fmtDia(d.vence) + '.' };
    if (d.soloEnvio && ctx.modalidad === 'retiro') {
      return { ok: false, error: ctx.soloRetiro
        ? 'Este código es para pedidos con envío a domicilio: usalo en la lista minorista 🏠'
        : 'Este código es solo para envío a domicilio. Elegí “Envío a domicilio” para usarlo.' };
    }
    if (d.tipo === 'personal' && d.tel8) {
      var t = tel8(ctx.telefono);
      if (!t) return { ok: false, error: 'Es un código personal: completá primero tu teléfono.' };
      if (t !== d.tel8) return { ok: false, error: 'Este código es personal y no corresponde a este teléfono.' };
    }
    return { ok: true };
  }

  /* El cuadro del código, listo para meter en el checkout.
     opts = { box, subtotal() → número, ctx() → {telefono, modalidad, soloRetiro}, onCambio() }
     Devuelve un control con: monto(), aplicado(), valido(), codigo(), pct(),
     resumen(subtotal), refrescar(), limpiar(). */
  function montar(opts) {
    var st = { d: null };
    var ctx = function () { return (opts.ctx && opts.ctx()) || {}; };
    var valido = function () { return !!(st.d && validar(st.d, ctx()).ok); };
    var monto = function () { return valido() ? Math.round((Number(opts.subtotal()) || 0) * st.d.pct / 100) : 0; };
    var avisar = function () { if (opts.onCambio) opts.onCambio(); };

    function dibujar(msg, err, escrito) {
      var b = opts.box;
      if (!b) return;
      if (st.d) {
        var v = validar(st.d, ctx());
        b.innerHTML = '<div class="cup-ok' + (v.ok ? '' : ' mal') + '">' +
          '<div class="cup-tk"><b>' + (v.ok ? esc(st.d.pct) + '%' : '!') + '</b><span>' + (v.ok ? 'OFF' : '') + '</span></div>' +
          '<div class="cup-tx"><b>' + esc(st.d.id) + '</b><span>' +
            (v.ok ? '¡Listo! Te descontamos <b>' + peso(monto()) + '</b>' + (st.d.vence ? ' · válido hasta el ' + fmtDia(st.d.vence) : '') : esc(v.error)) +
          '</span></div>' +
          '<button type="button" class="cup-x">Quitar</button></div>';
        b.querySelector('.cup-x').onclick = function () { st.d = null; dibujar(); avisar(); };
        return;
      }
      b.innerHTML = '<div class="cup"><label class="cup-lbl">🎟️ ¿Tenés un código de descuento?</label>' +
        '<div class="cup-in"><input class="cup-inp" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="30" placeholder="Escribilo acá" value="' + esc(escrito || '') + '">' +
        '<button type="button" class="cup-ap">Aplicar</button></div>' +
        '<div class="cup-msg' + (err ? ' err' : '') + '">' + esc(msg || '') + '</div></div>';
      var inp = b.querySelector('.cup-inp'), ap = b.querySelector('.cup-ap');
      function aplicar() {
        var k = norm(inp.value);
        if (!k) { dibujar('Escribí el código.', true); return; }
        ap.disabled = true; ap.textContent = '…';
        // Por G.Cupon (y no la función local) para poder probarlo sin Firestore.
        G.Cupon.buscar(k).then(function (d) {
          var v = validar(d, ctx());
          if (!v.ok) { dibujar(v.error, true, k); return; }
          st.d = d; dibujar(); avisar();
        }, function () {
          dibujar('No pudimos revisar el código ahora (¿sin conexión?). Probá de nuevo en un momento.', true, k);
        });
      }
      ap.onclick = aplicar;
      inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); aplicar(); } };
    }
    dibujar();

    return {
      monto: monto,
      aplicado: function () { return !!st.d; },
      valido: valido,
      codigo: function () { return st.d ? st.d.id : ''; },
      pct: function () { return st.d ? st.d.pct : 0; },
      // Lo que queda guardado en el pedido (misma forma que el panel).
      resumen: function (subtotal) {
        if (!valido()) return null;
        var s = Math.round(Number(subtotal) || 0), m = Math.round(s * st.d.pct / 100);
        return { codigo: st.d.id, pct: st.d.pct, tipo: st.d.tipo || 'campana', nombre: st.d.nombre || '', subtotal: s, monto: m };
      },
      // Redibuja SOLO si hay un código aplicado (para actualizar el monto o
      // avisar que dejó de valer); si no, respeta lo que el cliente está tipeando.
      refrescar: function () { if (st.d) dibujar(); },
      limpiar: function () { st.d = null; dibujar(); },
    };
  }

  // Estilos del cuadro: tema claro, naranja GDO, con forma de cupón al aplicarse.
  (function estilos() {
    if (document.getElementById('cup-css')) return;
    var s = document.createElement('style'); s.id = 'cup-css';
    s.textContent =
      '.cup{margin:14px 0 6px}' +
      '.cup-lbl{display:block;font-size:13px;font-weight:700;color:#5b6470;margin-bottom:6px}' +
      '.cup-in{display:flex;gap:8px;background:#fff7ef;border:1.5px dashed #f3b574;border-radius:12px;padding:6px}' +
      '.cup-inp{flex:1;min-width:0;border:0;background:transparent;font:800 16px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#1e1e1e;padding:8px 6px;outline:0}' +
      '.cup-inp::placeholder{font:500 15px system-ui,"Segoe UI",Arial,sans-serif;letter-spacing:0;text-transform:none;color:#b08f6a}' +
      '.cup-ap{background:#1e1e1e;color:#fff;border:0;border-radius:9px;padding:0 18px;font:800 14px system-ui,"Segoe UI",Arial,sans-serif;cursor:pointer}' +
      '.cup-ap:disabled{opacity:.6;cursor:default}' +
      '.cup-msg{font-size:12.5px;margin-top:6px;color:#5b6470;line-height:1.4}' +
      '.cup-msg:empty{display:none}' +
      '.cup-msg.err{color:#d9534f;font-weight:700}' +
      '.cup-ok{display:flex;align-items:center;gap:12px;margin:14px 0 6px;background:linear-gradient(120deg,#fff1e0,#fffaf4);border:1.5px dashed #F58220;border-radius:14px;padding:10px 12px;animation:cupPop .35s ease}' +
      '.cup-tk{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:60px;padding:8px 10px;border-radius:10px;color:#fff;background:linear-gradient(165deg,#ffa24d 0%,#F58220 55%,#e0650a 100%)}' +
      '.cup-tk b{font:800 21px/1 Georgia,"Zilla Slab",serif}' +
      '.cup-tk span{font-size:10px;letter-spacing:2px;font-weight:800;margin-top:3px}' +
      '.cup-tk span:empty{display:none}' +
      '.cup-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.cup-tx>b{font:800 15px ui-monospace,Menlo,Consolas,monospace;letter-spacing:1.5px;color:#1e1e1e;word-break:break-all}' +
      '.cup-tx span{font-size:13px;color:#8a4a00;line-height:1.35}' +
      '.cup-x{flex:0 0 auto;background:#fff;border:1px solid #e4e6ea;border-radius:9px;padding:8px 11px;font:700 12.5px system-ui,"Segoe UI",Arial,sans-serif;color:#5b6470;cursor:pointer}' +
      '.cup-ok.mal{border-color:#d9534f;background:#fff5f5}' +
      '.cup-ok.mal .cup-tk{background:#d9534f}' +
      '.cup-ok.mal .cup-tx span{color:#d9534f;font-weight:700}' +
      '@keyframes cupPop{0%{transform:scale(.96)}60%{transform:scale(1.02)}100%{transform:scale(1)}}';
    (document.head || document.documentElement).appendChild(s);
  })();

  G.Cupon = { norm: norm, buscar: buscar, validar: validar, montar: montar, tel8: tel8 };
})();
