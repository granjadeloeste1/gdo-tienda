/* ====== GDO — Preparaciones (cómo quiere el cliente el corte) ======
   Hay productos donde la mitad del pedido es CÓMO se prepara: la suprema puede
   ir entera, fileteada para milanesa, en churrasquitos o en cubos; el cuarto
   trasero entero, trozado en dos o sin piel. Si eso viaja como texto libre,
   producción recibe un párrafo que alguien tiene que interpretar. Como opción
   elegible, en cambio, la comanda del día lo puede SUMAR:
       SUPREMAS — 10 kg
         · fileteada para milanesa … 3 kg
         · en cubos ……………… 3 kg
         · entera ………………… 4 kg

   Solo llevan opciones los productos donde el corte cambia de verdad. El resto
   se resuelve con la aclaración libre, que va aparte y también llega a la
   comanda.

   OJO: este archivo está DUPLICADO en gdo-reparto/js/lista.js (el panel arma
   pedidos por teléfono y tiene que ofrecer exactamente las mismas opciones).
   Si se toca acá, hay que tocarlo allá. */
window.GDO = window.GDO || {};
(function () {
  var PREPS = [
    {
      id: 'suprema',
      // La SUPREMA FRESCA se corta. La congelada viene en caja cerrada de 12 kg
      // (no se toca), y "hamburguesa 100% suprema" o una milanesa ya elaborada
      // tampoco: por eso las exclusiones.
      re: /SUPREMA/i,
      no: /CONGELAD|HAMBURG|MEDALL|MILANES|NUGGET|ARROLL|MATAMBRE/i,
      titulo: '¿Cómo la querés?',
      opciones: ['Entera', 'Fileteada para milanesa', 'Para churrasquitos', 'En cubos'],
    },
    {
      id: 'cuarto',
      // En la lista mayorista se llama CUARTO TRASERO; en la minorista, "Pata y Muslo".
      re: /CUARTO\s*TRASERO|PATA\s*Y\s*MUSLO/i,
      no: /CONGELAD|DESHUES|MILANES/i,
      titulo: '¿Cómo lo querés?',
      opciones: ['Entero', 'Trozado en dos (pata y muslo)', 'Sin piel', 'Trozado y sin piel'],
    },
  ];

  /* RECARGO POR PREPARACIÓN (lista MAYORISTA).
     Filetear, cubetear o trozar es trabajo de gente: cuesta $500 por kilo, en
     todas las versiones. El producto TAL CUAL —la primera opción, "Entera" /
     "Entero"— no lleva recargo: es el producto sin tocar. */
  var RECARGO_KG = 500;

  /* Devuelve la definición de preparaciones de un producto, o null si ese
     producto no lleva. Se mira SOLO el nombre: la descripción puede nombrar
     otro producto (un combo que dice "3 kg de cuarto trasero" no es un cuarto
     trasero). */
  function de(nombre) {
    var n = String(nombre == null ? '' : nombre);
    for (var i = 0; i < PREPS.length; i++) {
      var p = PREPS[i];
      if (p.re.test(n) && !(p.no && p.no.test(n))) return p;
    }
    return null;
  }
  // La opción por defecto es la primera: el producto tal cual, sin trabajo extra.
  function porDefecto(nombre) { var p = de(nombre); return p ? p.opciones[0] : ''; }
  // ¿Ese corte lleva trabajo (y por lo tanto recargo)? Todo menos el tal cual.
  function conTrabajo(nombre, corte) {
    var d = de(nombre);
    return !!(d && corte && corte !== d.opciones[0]);
  }
  // Recargo por kilo de ese corte. 0 si el producto va tal cual.
  function recargo(nombre, corte) { return conTrabajo(nombre, corte) ? RECARGO_KG : 0; }

  GDO.Prep = { de: de, porDefecto: porDefecto, conTrabajo: conTrabajo, recargo: recargo,
               RECARGO_KG: RECARGO_KG, lista: PREPS };
})();
