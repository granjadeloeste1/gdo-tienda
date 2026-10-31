// Guarda en el sitio una copia de la lista minorista. La usa combo.html cuando no puede traer la lista
// en vivo (la vista previa de los anuncios de Instagram no la deja traer). Solo escribe si cambió algo o
// si la copia tiene más de 6 horas: combo.html no acepta copias de más de 24 horas.
const fs = require('fs');
const API = 'https://script.google.com/macros/s/AKfycbwH6JW35BRYcBk958OEr4sEvfVIfzgqzQeGwvz63xZYgukwxik8EsIego4d9O456bHURg/exec?lista=minorista';
const ARCHIVO = 'lista-minorista.json';
(async () => {
  const r = await fetch(API);
  if (!r.ok) throw new Error('la lista respondió ' + r.status);
  const d = await r.json();
  if (!Array.isArray(d.productos) || !d.productos.some((p) => /COMBO/i.test(p.cat))) throw new Error('lista sin combos');
  let vieja = null;
  try { vieja = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch (e) {}
  const generado = vieja && vieja.generado;
  if (vieja) delete vieja.generado;
  if (vieja && JSON.stringify(vieja) === JSON.stringify(d) && Date.now() - generado < 6 * 3600e3) return console.log('sin cambios');
  fs.writeFileSync(ARCHIVO, JSON.stringify({ ...d, generado: Date.now() }));
  console.log('copia actualizada');
})().catch((e) => { console.error(e.message); process.exit(1); });
