# Video del club de socios (Remotion)

Video institucional para la sección de alta de la página del Club (la gente ya está ahí para asociarse):
qué es, cómo se completa el formulario, la credencial, cómo se suman y se canjean los puntos. 16:9 (1280x720, el recuadro de video de la página), ~42 s.
No nombra la lista ni "GDO Club": el que lo mira ya está adentro.

Diseño: fondo oscuro de marca, titulares en Roboto Slab + Inter, el formulario real ampliado con un
recuadro que marca cada dato cuando la voz lo nombra, credencial de socio animada. Texto a la izquierda y lo visual a la derecha; pensado para celular (el recuadro mide ~360 px):
una idea grande por pantalla, sin letra chica ni subtítulos.

En `public/` va, sin subir al repo, `voz.wav` (Valeria, ElevenLabs **eleven_v4**).
Sí están en el repo: `fonts/`, `fotos/` y las capturas del sitio (`a_publica.png` … `f_voucher.png`).

Los tiempos de las escenas (`T`) y de cada marca están en `src/Club.tsx`, en segundos de la locución
(las frases clave están anotadas arriba). Si cambia la voz o el formulario, hay que ajustarlos.

```
npm install
npm run studio   # para ver y ajustar
npm run render   # genera out/gdo-club.mp4
```
