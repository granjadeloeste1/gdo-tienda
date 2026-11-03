import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, continueRender, delayRender, Easing,
} from 'remotion';

// Video institucional del club de socios, para la sección de alta de la página:
// qué es, cómo se completa el formulario, la credencial, cómo se suman y se canjean los puntos.
// 16:9 (1280x720), el formato del recuadro de video de la página: texto a la izquierda, lo visual a la derecha.
// En el celular el recuadro mide ~360 px de ancho, por eso los textos son grandes y pocos.
// Locución: public/voz.wav (Valeria, ElevenLabs eleven_v4).

const FPS = 30;
const O = '#F58220';
const BG = '#0d0e0e';
const SLAB = '"Roboto Slab GDO", "Roboto Slab", Rockwell, serif';
const SANS = '"Inter GDO", Inter, Arial, sans-serif';

// Columnas: texto (izquierda) y visual (derecha).
const IZQ = 64, ANCHO_IZQ = 560, DER = 680, ANCHO_DER = 540;

// Fuentes de marca (slab para titulares, Inter para textos), cargadas antes de renderizar.
const FUENTES: [string, string, string][] = [
  ['Roboto Slab GDO', 'fonts/RobotoSlab-ExtraBold.ttf', '800'],
  ['Inter GDO', 'fonts/Inter-Medium.otf', '500'],
  ['Inter GDO', 'fonts/Inter-SemiBold.otf', '600'],
  ['Inter GDO', 'fonts/Inter-Bold.otf', '700'],
];
const useFuentes = () => {
  const [h] = React.useState(() => delayRender('fuentes'));
  React.useEffect(() => {
    Promise.all(FUENTES.map(([fam, src, w]) => new FontFace(fam, `url(${staticFile(src)})`, {weight: w}).load().then((ff) => document.fonts.add(ff))))
      .then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const f = (t: number) => Math.round(t * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Escenas, en segundos de la locución (la voz va entera, sin cortes).
const T = {intro: 3.7, puntos: 10.1, form: 24.2, cred: 28.0, mostras: 32.9, canje: 37.9};

// Frases clave de la locución (s), para sincronizar.
// 0.13 Ser socio es gratis · 1.45 cada compra te devuelve algo · 3.83 por cada cien pesos, un punto
// 6.72 canjeás productos de regalo y descuentos · 10.23 asociarte lleva un minuto · 12.21 tocás "Quiero asociarme"
// 13.75 completás tus datos · 15.24 nombre, DNI, dirección, teléfono y mail · 19.10 contraseña · 20.59 términos
// 21.90 tocás "Crear mi cuenta de socio" · 24.34 credencial digital · 28.20 cuando comprás… · 30.75 te cargamos los puntos
// 33.10 para canjear, entrás a Premios · 35.25 elegís · 36.53 te llega tu voucher · 38.02 Asociate ahora. Es gratis.

// ───────────────────────── piezas ─────────────────────────

const useEntrada = (d = 0, dist = 30) => {
  const fr = useCurrentFrame();
  const k = interpolate(fr - d, [0, 16], [0, 1], {...clamp, easing: ease});
  return {opacity: k, transform: `translateY(${(1 - k) * dist}px)`, filter: `blur(${(1 - k) * 8}px)`} as React.CSSProperties;
};

const Fondo: React.FC = () => {
  const fr = useCurrentFrame();
  const x = 75 + Math.sin(fr / 90) * 6, y = 40 + Math.cos(fr / 110) * 8;
  return (
    <AbsoluteFill style={{background: BG}}>
      <AbsoluteFill style={{background: `radial-gradient(700px 600px at ${x}% ${y}%, rgba(245,130,32,.20), transparent 62%), radial-gradient(600px 500px at 0% 100%, rgba(245,130,32,.08), transparent 60%)`}} />
      <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(90deg, transparent, rgba(0,0,0,.8) 60%)', WebkitMaskImage: 'linear-gradient(90deg, transparent, rgba(0,0,0,.8) 60%)'}} />
    </AbsoluteFill>
  );
};

const Marca: React.FC = () => (
  <div style={{position: 'absolute', left: IZQ, top: 40, display: 'flex', alignItems: 'center', gap: 16, ...useEntrada(0, 12)}}>
    <Img src={staticFile('isotipo-blanco.svg')} style={{height: 52}} />
    <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: '#fff'}}>GDO <span style={{color: O}}>CLUB</span></div>
  </div>
);

const Titulo: React.FC<{a: string; b: string; top?: number; size?: number; d?: number; left?: number}> = ({a, b, top = 130, size = 82, d = 5, left = IZQ}) => {
  const e1 = useEntrada(d, 40), e2 = useEntrada(d + 5, 40);
  return (
    <div style={{position: 'absolute', left, width: ANCHO_IZQ + 40, top, fontFamily: SLAB, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -1, color: '#fff'}}>
      <div style={e1}>{a}</div>
      <div style={{...e2, color: O}}>{b}</div>
    </div>
  );
};

const Fundido: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const fr = useCurrentFrame();
  const op = interpolate(fr, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const sc = interpolate(fr, [0, dur], [1.02, 1], clamp);
  return <AbsoluteFill style={{opacity: op, transform: `scale(${sc})`}}>{children}</AbsoluteFill>;
};
const Escena: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const dur = f(b) - f(a);
  return (
    <Sequence from={f(a)} durationInFrames={dur}>
      <Fundido dur={dur}>{children}</Fundido>
    </Sequence>
  );
};

const Icono: React.FC<{tipo: 'regalo' | 'descuento' | 'check' | 'tienda'; size?: number; color?: string}> = ({tipo, size = 46, color = O}) => {
  const p = {fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {tipo === 'regalo' && <g {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2 7.5 8 12 8zM12 8s1.5-4.5 4-3.8S16.5 8 12 8z" /></g>}
      {tipo === 'descuento' && <g {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.4" /><path d="M10 16l6-6" /></g>}
      {tipo === 'check' && <g {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></g>}
      {tipo === 'tienda' && <g {...p}><path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6" /></g>}
    </svg>
  );
};

// Tarjeta con ícono y una sola frase grande (columna izquierda).
const Ficha: React.FC<{icono: React.ReactNode; t: string; on: number; top: number}> = ({icono, t, on, top}) => {
  const fr = useCurrentFrame();
  const k = interpolate(fr - f(on), [0, 14], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{position: 'absolute', left: IZQ, width: ANCHO_IZQ, top, height: 108, borderRadius: 28, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px',
      background: 'linear-gradient(90deg, rgba(245,130,32,.16), rgba(245,130,32,.04))', border: '2px solid rgba(245,130,32,.7)',
      opacity: k, transform: `translateX(${(1 - k) * -40}px)`}}>
      <div style={{width: 68, height: 68, borderRadius: 20, background: 'rgba(245,130,32,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{icono}</div>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 40, color: '#fff', lineHeight: 1.08}}>{t}</div>
    </div>
  );
};

// Cartel grande con el paso actual (cambia con la voz). pasos: [desde (s, relativo), texto]
const Cartel: React.FC<{pasos: [number, string][]; top: number}> = ({pasos, top}) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  let i = 0; while (i < pasos.length - 1 && t >= pasos[i + 1][0]) i++;
  const k = interpolate(fr - f(pasos[i][0]), [0, 12], [0, 1], {...clamp, easing: ease});
  const kIn = interpolate(fr - f(pasos[0][0]), [0, 14], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{position: 'absolute', left: IZQ, width: ANCHO_IZQ, top, minHeight: 124, borderRadius: 32, display: 'flex', alignItems: 'center', gap: 24, padding: '14px 28px',
      background: 'linear-gradient(90deg, rgba(245,130,32,.2), rgba(245,130,32,.06))', border: '2px solid rgba(245,130,32,.8)', opacity: kIn}}>
      <div style={{width: 76, height: 76, borderRadius: '50%', background: O, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        transform: `scale(${0.8 + 0.2 * k})`}}><Icono tipo="check" size={46} color="#111" /></div>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 44, color: '#fff', lineHeight: 1.08, opacity: k, transform: `translateY(${(1 - k) * 16}px)`}}>{pasos[i][1]}</div>
    </div>
  );
};

// Pantalla real del sitio, ampliada, con un recuadro que marca lo que dice la voz (columna derecha).
// tomas: [desde (s), imagen, desplazamiento en px de la captura (1170 de ancho)]
// marcas: [desde (s), [x0, y0, x1, y1] en px de la captura, toque?]
type Marcado = [number, [number, number, number, number], boolean?];
const Pantalla: React.FC<{tomas: [number, string, number][]; marcas: Marcado[]; d?: number}> = ({tomas, marcas, d = 0}) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const W = ANCHO_DER, s = W / 1170, top = 36, h = 720 - 36 * 2;
  const k = spring({frame: fr - d, fps: FPS, config: {damping: 18}});
  let ti = 0; while (ti < tomas.length - 1 && t >= tomas[ti + 1][0]) ti++;
  const pan = ti > 0 && tomas[ti][1] === tomas[ti - 1][1]
    ? interpolate(t, [tomas[ti][0], tomas[ti][0] + 0.6], [tomas[ti - 1][2], tomas[ti][2]], {...clamp, easing: Easing.inOut(Easing.cubic)})
    : tomas[ti][2];
  let mi = -1; for (let j = 0; j < marcas.length; j++) if (t >= marcas[j][0]) mi = j;
  return (
    <div style={{position: 'absolute', left: DER, top, width: W, height: h, borderRadius: 34, overflow: 'hidden', background: '#000',
      border: '3px solid #2c2f2e', boxShadow: '0 40px 90px rgba(0,0,0,.65), 0 0 90px rgba(245,130,32,.16)',
      opacity: k, transform: `translateX(${(1 - k) * 120}px)`}}>
      {tomas.map(([, img], j) => {
        if (j > 0 && img === tomas[j - 1][1]) return null;
        const usada = tomas[ti][1] === img;
        const primera = tomas.findIndex((x) => x[1] === img);
        const op = usada ? interpolate(t - tomas[primera][0], [0, 0.35], [0, 1], clamp) : 0;
        return <Img key={j} src={staticFile(img)} style={{position: 'absolute', left: 0, top: 0, width: W, opacity: op, transform: `translateY(${-(usada ? pan : 0) * s}px)`}} />;
      })}
      {mi >= 0 && (() => {
        const [desde, [x0, y0, x1, y1], toque] = marcas[mi];
        const km = interpolate(t - desde, [0, 0.3], [0, 1], {...clamp, easing: ease});
        const tq = interpolate(t - desde, [0.35, 0.85], [0, 1], clamp);
        return (
          <>
            <div style={{position: 'absolute', left: x0 * s - 6, top: (y0 - pan) * s - 6, width: (x1 - x0) * s + 12, height: (y1 - y0) * s + 12, borderRadius: 16,
              border: `5px solid ${O}`, boxShadow: '0 0 30px rgba(245,130,32,.7)', opacity: km, transform: `scale(${1.06 - 0.06 * km})`}} />
            {toque && tq > 0 && tq < 1 && (
              <div style={{position: 'absolute', left: ((x0 + x1) / 2) * s - 30, top: ((y0 + y1) / 2 - pan) * s - 30, width: 60, height: 60, borderRadius: '50%',
                border: '5px solid #fff', opacity: 1 - tq, transform: `scale(${0.5 + tq * 1.5})`}} />
            )}
          </>
        );
      })()}
    </div>
  );
};

// Credencial de socio (como la real), con brillo que la recorre.
const Credencial: React.FC<{d?: number; puntos: number; ry?: number; rx?: number; w?: number; destacaNumero?: number}> = ({d = 0, puntos, ry = 0, rx = 0, w = 860, destacaNumero = 0}) => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - d, fps: FPS, config: {damping: 16}});
  const brillo = interpolate((fr - d) % 110, [10, 50], [-60, 160], clamp);
  const s = w / 860;
  return (
    <div style={{width: w, height: w * 0.6, perspective: 2000, opacity: k}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 44 * s, overflow: 'hidden',
        background: 'linear-gradient(135deg, #1d1f1e 0%, #121313 55%, #1a1410 100%)', border: '2px solid rgba(245,130,32,.55)',
        boxShadow: '0 40px 90px rgba(0,0,0,.7), 0 0 80px rgba(245,130,32,.22)',
        transform: `rotateY(${ry + (1 - k) * -35}deg) rotateX(${rx + (1 - k) * 12}deg) scale(${0.85 + 0.15 * k})`}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 12 * s, background: O}} />
        <div style={{position: 'absolute', left: 56 * s, top: 46 * s, fontFamily: SANS, fontWeight: 700, fontSize: 40 * s, letterSpacing: 5 * s, color: '#fff'}}>GDO <span style={{color: O}}>CLUB</span></div>
        <div style={{position: 'absolute', right: 46 * s, top: 46 * s, border: `2px solid ${O}`, color: O, borderRadius: 99, padding: `${6 * s}px ${20 * s}px`,
          fontFamily: SANS, fontWeight: 700, fontSize: 22 * s, letterSpacing: 4 * s}}>MIEMBRO</div>
        <Img src={staticFile('isotipo-blanco.svg')} style={{position: 'absolute', left: 60 * s, top: 118 * s, height: 150 * s,
          filter: 'drop-shadow(0 0 22px rgba(245,130,32,.9))'}} />
        <div style={{position: 'absolute', left: 56 * s, bottom: 52 * s, fontFamily: SANS}}>
          <div style={{fontWeight: 600, fontSize: 20 * s, letterSpacing: 4 * s, color: 'rgba(255,255,255,.55)'}}>SOCIO N°</div>
          <div style={{fontWeight: 700, fontSize: 44 * s, letterSpacing: 2 * s, color: O, display: 'inline-block', borderRadius: 12 * s, padding: `0 ${8 * s}px`, marginLeft: -8 * s,
            boxShadow: `0 0 0 ${4 * s * destacaNumero}px rgba(245,130,32,${0.9 * destacaNumero})`}}>0000 1234</div>
          <div style={{fontWeight: 700, fontSize: 32 * s, letterSpacing: 2 * s, color: '#fff', marginTop: 2 * s}}>LAURA GÓMEZ</div>
        </div>
        <div style={{position: 'absolute', right: 52 * s, bottom: 52 * s, textAlign: 'right', fontFamily: SANS}}>
          <div style={{fontFamily: SLAB, fontWeight: 800, fontSize: 76 * s, color: O, lineHeight: 1}}>{puntos.toLocaleString('es-AR')}</div>
          <div style={{fontWeight: 600, fontSize: 20 * s, letterSpacing: 4 * s, color: 'rgba(255,255,255,.55)', marginTop: 6 * s}}>PUNTOS GDO</div>
        </div>
        <div style={{position: 'absolute', top: -40, bottom: -40, width: 140 * s, left: `${brillo}%`, transform: 'skewX(-18deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)'}} />
      </div>
    </div>
  );
};

// Gallo de la marca iluminado (columna derecha).
const Gallo: React.FC<{h: number; left: number; top: number}> = ({h, left, top}) => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - 2, fps: FPS, config: {damping: 14}});
  const glow = 0.6 + 0.4 * Math.sin(fr / 12);
  return (
    <div style={{position: 'absolute', left, top, opacity: k, transform: `scale(${0.7 + 0.3 * k})`}}>
      <Img src={staticFile('isotipo-blanco.svg')} style={{height: h, filter: `drop-shadow(0 0 ${30 + 25 * glow}px rgba(245,130,32,.85))`}} />
    </div>
  );
};

// ───────────────────────── escenas ─────────────────────────

const Intro: React.FC = () => (
  <>
    <Fondo />
    <Marca />
    <Gallo h={440} left={790} top={130} />
    <Titulo a="Ser socio" b="es gratis" top={210} size={112} d={6} />
  </>
);

const Puntos: React.FC = () => {
  const fr = useCurrentFrame();
  const r = (x: number) => x - T.intro;
  const k100 = spring({frame: fr - f(r(3.83)), fps: FPS, config: {damping: 13}});
  const v = Math.round(interpolate(fr - f(r(3.83)), [0, 22], [0, 100], {...clamp, easing: Easing.out(Easing.cubic)}));
  const giro = interpolate(fr - f(r(3.83)) - 14, [0, 18], [90, 0], {...clamp, easing: ease});
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Cada compra" b="suma puntos" />
      <Ficha icono={<Icono tipo="regalo" />} t="Productos de regalo" on={r(7.9)} top={400} />
      <Ficha icono={<Icono tipo="descuento" />} t="Descuentos" on={r(9.1)} top={530} />
      <div style={{position: 'absolute', left: DER, width: ANCHO_DER, top: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        opacity: k100, transform: `scale(${0.8 + 0.2 * k100})`}}>
        <div style={{fontFamily: SLAB, fontWeight: 800, fontSize: 124, color: '#fff', letterSpacing: -4}}>${v}</div>
        <svg width="54" height="36" viewBox="0 0 90 60" style={{flexShrink: 0}}><path d="M4 30h72M56 10l22 20-22 20" fill="none" stroke={O} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{width: 190, height: 190, borderRadius: '50%', perspective: 800, flexShrink: 0}}>
          <div style={{width: '100%', height: '100%', borderRadius: '50%', transform: `rotateY(${giro}deg)`,
            background: `radial-gradient(circle at 35% 30%, #ffb15c, ${O} 55%, #c25e0b)`, boxShadow: '0 20px 60px rgba(245,130,32,.55), inset 0 -8px 24px rgba(0,0,0,.25)',
            border: '5px solid rgba(255,255,255,.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontFamily: SLAB, fontWeight: 800, fontSize: 86, color: '#fff', lineHeight: 0.9}}>1</div>
            <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: '#fff'}}>PUNTO</div>
          </div>
        </div>
      </div>
    </>
  );
};

const Formulario: React.FC = () => {
  const r = (x: number) => x - T.puntos;
  // Coordenadas en px de las capturas (1170 de ancho): pestaña "Quiero asociarme" en a_publica; campos en b_alta.
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Asociarte" b="en un minuto" />
      <Cartel top={420} pasos={[
        [r(10.4), 'Tocás “Quiero asociarme”'],
        [r(15.24), 'Nombre y DNI'],
        [r(16.6), 'Dirección y teléfono'],
        [r(17.97), 'Tu mail'],
        [r(19.1), 'Una contraseña'],
        [r(20.59), 'Aceptás los términos'],
        [r(21.9), 'Crear mi cuenta'],
      ]} />
      <Pantalla d={f(r(10.4))}
        tomas={[[0, 'a_publica.png', 560], [r(14.6), 'b_alta.png', 160], [r(17.6), 'b_alta.png', 700], [r(20.4), 'b_alta.png', 1300]]}
        marcas={[
          [r(12.2), [594, 975, 1066, 1080], true],
          [r(15.24), [60, 200, 1110, 620]],
          [r(16.6), [60, 640, 1110, 1060]],
          [r(17.97), [60, 1090, 1110, 1290]],
          [r(19.1), [60, 1300, 1110, 1500]],
          [r(20.59), [40, 1985, 1130, 2095], true],
          [r(22.4), [60, 2150, 1110, 2275], true],
        ]} />
    </>
  );
};

const Lista: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const r = (x: number) => x - T.form;
  const destaca = interpolate(t, [r(26.3), r(26.7)], [0, 1], clamp);
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Tu credencial," b="al instante" />
      <Ficha icono={<Icono tipo="check" />} t="Número de socio" on={r(26.3)} top={420} />
      <div style={{position: 'absolute', left: DER, top: 200}}>
        <Credencial d={6} puntos={0} w={ANCHO_DER} ry={interpolate(t, [0, 3.8], [-10, 6], clamp)} rx={4} destacaNumero={destaca} />
      </div>
    </>
  );
};

const Mostras: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const r = (x: number) => x - T.cred;
  const tCarga = r(30.9);
  const pts = Math.round(interpolate(t, [tCarga, tCarga + 1.1], [1250, 2480], {...clamp, easing: Easing.out(Easing.cubic)}));
  const kb = spring({frame: fr - f(tCarga), fps: FPS, config: {damping: 10}});
  const sube = interpolate(t, [tCarga, tCarga + 1.4], [0, -50], clamp);
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Cuando" b="comprás" />
      <Ficha icono={<Icono tipo="tienda" />} t="Local o envío" on={r(28.3)} top={400} />
      <Ficha icono={<Icono tipo="check" />} t="Sumás tus puntos" on={tCarga} top={530} />
      <div style={{position: 'absolute', left: DER, top: 200}}>
        <Credencial d={4} puntos={pts} w={ANCHO_DER} ry={interpolate(t, [0, 4.9], [6, -8], clamp)} rx={3} />
      </div>
      {t >= tCarga && (
        <div style={{position: 'absolute', left: DER + ANCHO_DER - 210, top: 150 + sube, background: O, color: '#111', fontFamily: SANS, fontWeight: 700, fontSize: 44,
          borderRadius: 99, padding: '10px 26px', boxShadow: '0 14px 40px rgba(245,130,32,.55)', transform: `scale(${kb})`,
          opacity: interpolate(t, [tCarga + 1.6, tCarga + 2.2], [1, 0], clamp)}}>+1.230</div>
      )}
    </>
  );
};

const Canje: React.FC = () => {
  const r = (x: number) => x - T.mostras;
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Canjeás" b="tus premios" />
      <Cartel top={420} pasos={[[r(33.1), 'Entrás a Premios'], [r(35.25), 'Elegís el que quieras'], [r(36.53), 'Te llega tu voucher']]} />
      <Pantalla d={f(r(33.2))}
        tomas={[[0, 'e_premios.png', 0], [r(36.5), 'f_voucher.png', 60]]}
        marcas={[[r(35.25), [20, 30, 1150, 320]], [r(35.6), [860, 70, 1130, 190], true]]} />
    </>
  );
};

const Cierre: React.FC = () => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - 16, fps: FPS, config: {damping: 15}});
  const flecha = Math.sin(fr / 6) * 8;
  return (
    <>
      <Fondo />
      <Marca />
      <Gallo h={400} left={800} top={150} />
      <Titulo a="Asociate" b="ahora" top={170} size={112} d={4} />
      <div style={{position: 'absolute', left: IZQ, top: 470, opacity: k, transform: `translateY(${(1 - k) * 24}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, background: O, borderRadius: 99, padding: '18px 38px', boxShadow: '0 16px 50px rgba(245,130,32,.45)'}}>
          <svg width="38" height="38" viewBox="0 0 24 24" style={{transform: `translateY(${flecha}px)`}}><path d="M12 20V5M5 11l7-7 7 7" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 46, color: '#111'}}>Es gratis</div>
        </div>
      </div>
    </>
  );
};

export const Club: React.FC = () => {
  useFuentes();
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('voz.wav')} />
      <Escena a={0} b={T.intro + 0.25}><Intro /></Escena>
      <Escena a={T.intro} b={T.puntos + 0.25}><Puntos /></Escena>
      <Escena a={T.puntos} b={T.form + 0.25}><Formulario /></Escena>
      <Escena a={T.form} b={T.cred + 0.25}><Lista /></Escena>
      <Escena a={T.cred} b={T.mostras + 0.25}><Mostras /></Escena>
      <Escena a={T.mostras} b={T.canje + 0.25}><Canje /></Escena>
      <Sequence from={f(T.canje)}><Cierre /></Sequence>
    </AbsoluteFill>
  );
};
