# Video GDO CLUB (Remotion)

Video explicador del Club (qué es, para qué sirven los puntos, cómo te asociás), 9:16, ~28 s.
Diseño: fondo oscuro de marca, titulares en Roboto Slab + Inter, pantallas reales del Club en un celular,
credencial de socio animada y subtítulos discretos. La presentadora abre y cierra (tomas generadas en el local).

En `public/` van, sin subir al repo:
- `voz.wav`: locución (Valeria, ElevenLabs **eleven_v4**; "Club" se escribe "Clúb" para que no diga "clab").
- `host_intro.mp4` y `host_cta.mp4`: tomas de la presentadora (apertura y cierre).

Sí están en el repo: `fonts/`, `fotos/` y las pantallas del Club (`a_publica.png` … `f_voucher.png`).

Los tiempos de los subtítulos (`FRASES`) y de las escenas (`T`) están en `src/Club.tsx`, en segundos de la locución:
si cambia la voz, hay que ajustarlos.

```
npm install
npm run studio   # para ver y ajustar
npm run render   # genera out/gdo-club.mp4
```
