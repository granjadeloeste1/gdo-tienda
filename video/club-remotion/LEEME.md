# Video GDO CLUB (Remotion)

Gráficos tipo tutorial del video del Club: pasos numerados, pantallas reales del Club (datos de ejemplo) y subtítulos grandes.

Faltan en `public/` (no se suben al repo):
- `voz.wav`: locución completa.
- `host_intro.mp4` y `host_cta.mp4`: tomas de la presentadora (apertura y cierre).

Los tiempos de cada escena y de los subtítulos están en `src/Club.tsx` (`FRASES` y la función `m()`): si cambia la locución, hay que ajustarlos.

```
npm install
npm run studio   # para ver y ajustar
npm run render   # genera out/gdo-club.mp4
```
