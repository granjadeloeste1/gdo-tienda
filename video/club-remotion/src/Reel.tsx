import React from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, continueRender, delayRender, Easing,
} from 'remotion';

// Video explicador del GDO CLUB (qué es, para qué sirve, cómo te asociás).
// REEL para redes (9:16, ~20 s): cierra pidiendo comentar CLUB; ManyChat responde con el video y el link.
// Locución: public/voz-reel.wav (Valeria, ElevenLabs eleven_v4). Presentadora: host_intro.mp4 / host_cta.mp4.

const FPS = 30;
const O = '#F58220';
const AM = '#FBC02D';
const BG = '#0d0e0e';
const SLAB = '"Roboto Slab GDO", "Roboto Slab", Rockwell, serif';
const SANS = '"Inter GDO", Inter, Arial, sans-serif';

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

// Tiempo de la locución → tiempo del video (la voz va entera, sin cortes).
const m = (t: number) => t;
const f = (t: number) => Math.round(t * FPS);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

// Frases de la locución (s) para los subtítulos.
const FRASES: [number, number, string][] = [
  [0.07, 1.43, '¿Qué es el GDO Club?'],
  [1.73, 2.70, 'Te lo cuento rápido.'],
  [3.03, 4.50, 'Es nuestro club de beneficios:'],
  [4.77, 5.84, 'comprás como siempre…'],
  [6.09, 8.16, 'y cada cien pesos te suman un punto.'],
  [8.57, 12.67, 'Con tus puntos canjeás productos de regalo y descuentos para tus próximas compras.'],
  [13.11, 14.22, 'Asociarte es gratis:'],
  [14.60, 17.35, 'entrás a lista.granjadeloeste.com,'],
  [17.68, 18.34, 'tocás Club,'],
  [18.63, 20.31, 'y ya tenés tu credencial digital.'],
  [20.72, 22.15, 'Cuando comprás, la mostrás…'],
  [22.45, 23.97, 'y los puntos se cargan solos.'],
  [24.36, 25.35, 'Hacete socio hoy.'],
];

// Escenas (s): presentadora, qué es, beneficios, asociate, credencial, cierre.
const T = {intro: 4.4, quees: 8.2, benef: 11.5, cta: 15.0};

// ───────────────────────── piezas ─────────────────────────

// Aparición con desenfoque y subida suave (d = demora en frames).
const useEntrada = (d = 0, dist = 40) => {
  const fr = useCurrentFrame();
  const k = interpolate(fr - d, [0, 16], [0, 1], {...clamp, easing: ease});
  return {opacity: k, transform: `translateY(${(1 - k) * dist}px)`, filter: `blur(${(1 - k) * 10}px)`} as React.CSSProperties;
};

const Fondo: React.FC = () => {
  const fr = useCurrentFrame();
  const x = 50 + Math.sin(fr / 90) * 8, y = 18 + Math.cos(fr / 110) * 5;
  return (
    <AbsoluteFill style={{background: BG}}>
      <AbsoluteFill style={{background: `radial-gradient(900px 900px at ${x}% ${y}%, rgba(245,130,32,.20), transparent 62%), radial-gradient(700px 700px at 0% 100%, rgba(245,130,32,.08), transparent 60%)`}} />
      <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1.2px, transparent 1.2px)', backgroundSize: '36px 36px',
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,.9), transparent 70%)', WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,.9), transparent 70%)'}} />
    </AbsoluteFill>
  );
};

const Marca: React.FC<{d?: number}> = ({d = 0}) => (
  <div style={{position: 'absolute', left: 72, top: 120, display: 'flex', alignItems: 'center', gap: 20, ...useEntrada(d, 16)}}>
    <Img src={staticFile('isotipo-blanco.svg')} style={{height: 70}} />
    <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 38, letterSpacing: 7, color: '#fff'}}>GDO <span style={{color: O}}>CLUB</span></div>
  </div>
);

const Eyebrow: React.FC<{txt: string; top?: number; d?: number}> = ({txt, top = 290, d = 2}) => (
  <div style={{position: 'absolute', left: 72, top, fontFamily: SANS, fontWeight: 700, fontSize: 26, letterSpacing: 7,
    color: AM, textTransform: 'uppercase', ...useEntrada(d, 16)}}>{txt}</div>
);

const Titulo: React.FC<{a: string; b: string; top?: number; size?: number; d?: number}> = ({a, b, top = 300, size = 128, d = 5}) => {
  const e1 = useEntrada(d, 50), e2 = useEntrada(d + 5, 50);
  return (
    <div style={{position: 'absolute', left: 68, right: 68, top, fontFamily: SLAB, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -1.5, color: '#fff'}}>
      <div style={e1}>{a}</div>
      <div style={{...e2, color: O}}>{b}</div>
    </div>
  );
};

// Escena con fundido de entrada y salida.
const Fundido: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const fr = useCurrentFrame();
  const op = interpolate(fr, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const sc = interpolate(fr, [0, dur], [1.02, 1], clamp);
  return <AbsoluteFill style={{opacity: op, transform: `scale(${sc})`}}>{children}</AbsoluteFill>;
};
const Escena: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const dur = f(m(b)) - f(m(a));
  return (
    <Sequence from={f(m(a))} durationInFrames={dur}>
      <Fundido dur={dur}>{children}</Fundido>
    </Sequence>
  );
};

// Íconos de línea (en vez de emojis).
const Icono: React.FC<{tipo: 'regalo' | 'descuento' | 'check' | 'qr'; size?: number; color?: string}> = ({tipo, size = 64, color = O}) => {
  const p = {fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {tipo === 'regalo' && <g {...p}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12M12 8S10.5 3.5 8 4.2 7.5 8 12 8zM12 8s1.5-4.5 4-3.8S16.5 8 12 8z" /></g>}
      {tipo === 'descuento' && <g {...p}><path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="8.5" r="1.4" /><path d="M10 16l6-6" /></g>}
      {tipo === 'check' && <g {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></g>}
      {tipo === 'qr' && <g {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4M20 17v3" /></g>}
    </svg>
  );
};

// Celular con pantallas reales del Club. pantallas: [desde (s, relativo a la escena), imagen]
const Celular: React.FC<{pantallas: [number, string][]; top: number; w: number; d?: number; scroll?: number}> = ({pantallas, top, w, d = 0, scroll = 0}) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const k = spring({frame: fr - d, fps: FPS, config: {damping: 18, mass: 0.9}});
  const h = w * 2.1;
  return (
    <div style={{position: 'absolute', left: (1080 - w) / 2, top, width: w, height: h}}>
      <div style={{width: '100%', height: '100%', borderRadius: w * 0.14, background: '#0a0a0a', padding: w * 0.03,
        border: '3px solid #2c2f2e', boxShadow: '0 60px 120px rgba(0,0,0,.65), 0 0 120px rgba(245,130,32,.18)',
        opacity: k, transform: `translateY(${(1 - k) * 260}px)`}}>
        <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: w * 0.115, overflow: 'hidden', background: '#000'}}>
          {pantallas.map(([desde, img], i) => {
            const sig = pantallas[i + 1]?.[0] ?? 999;
            const op = t >= desde && t < sig + 0.35 ? interpolate(t - desde, [0, 0.35], [0, 1], clamp) : 0;
            const y = i === pantallas.length - 1 ? -interpolate(t - desde, [0.6, 4], [0, scroll], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
            return <Img key={i} src={staticFile(img)} style={{position: 'absolute', left: 0, top: 0, width: '100%', opacity: op, transform: `translateY(${y}px)`}} />;
          })}
          <div style={{position: 'absolute', left: '50%', top: w * 0.025, width: w * 0.28, height: w * 0.06, marginLeft: -w * 0.14, borderRadius: 99, background: '#000'}} />
        </div>
      </div>
    </div>
  );
};

// Credencial de socio (como la real del Club), con brillo que la recorre.
const Credencial: React.FC<{d?: number; puntos: number; ry?: number; rx?: number; w?: number}> = ({d = 0, puntos, ry = 0, rx = 0, w = 860}) => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - d, fps: FPS, config: {damping: 16}});
  const brillo = interpolate((fr - d) % 110, [10, 50], [-60, 160], clamp);
  const s = w / 860;
  return (
    <div style={{width: w, height: w * 0.6, perspective: 2000, opacity: k}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 44 * s, overflow: 'hidden',
        background: 'linear-gradient(135deg, #1d1f1e 0%, #121313 55%, #1a1410 100%)', border: '2px solid rgba(245,130,32,.55)',
        boxShadow: '0 50px 110px rgba(0,0,0,.7), 0 0 90px rgba(245,130,32,.22)',
        transform: `rotateY(${ry + (1 - k) * -35}deg) rotateX(${rx + (1 - k) * 12}deg) scale(${0.85 + 0.15 * k})`}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 12 * s, background: O}} />
        <div style={{position: 'absolute', left: 56 * s, top: 46 * s, fontFamily: SANS, fontWeight: 700, fontSize: 40 * s, letterSpacing: 5 * s, color: '#fff'}}>GDO <span style={{color: O}}>CLUB</span></div>
        <div style={{position: 'absolute', right: 46 * s, top: 46 * s, border: `2px solid ${O}`, color: O, borderRadius: 99, padding: `${6 * s}px ${20 * s}px`,
          fontFamily: SANS, fontWeight: 700, fontSize: 22 * s, letterSpacing: 4 * s}}>MIEMBRO</div>
        <Img src={staticFile('isotipo-blanco.svg')} style={{position: 'absolute', left: 60 * s, top: 118 * s, height: 150 * s,
          filter: 'drop-shadow(0 0 22px rgba(245,130,32,.9))'}} />
        <div style={{position: 'absolute', left: 56 * s, bottom: 52 * s, fontFamily: SANS}}>
          <div style={{fontWeight: 600, fontSize: 20 * s, letterSpacing: 4 * s, color: 'rgba(255,255,255,.55)'}}>SOCIO N°</div>
          <div style={{fontWeight: 700, fontSize: 44 * s, letterSpacing: 2 * s, color: O}}>0000 1234</div>
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

// Tarjeta con ícono y texto (beneficios, pasos).
const Ficha: React.FC<{icono: React.ReactNode; t: string; on: number; activo?: boolean; top: number}> = ({icono, t, on, activo = true, top}) => {
  const fr = useCurrentFrame();
  const k = interpolate(fr - f(on), [0, 14], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{position: 'absolute', left: 68, right: 68, top, height: 156, borderRadius: 36, display: 'flex', alignItems: 'center', gap: 32, padding: '0 38px',
      background: activo ? 'linear-gradient(90deg, rgba(245,130,32,.16), rgba(245,130,32,.04))' : 'rgba(255,255,255,.035)',
      border: `2px solid ${activo ? 'rgba(245,130,32,.7)' : 'rgba(255,255,255,.08)'}`,
      opacity: 0.25 + 0.75 * k, transform: `translateX(${(1 - k) * -50}px)`}}>
      <div style={{width: 92, height: 92, borderRadius: 26, background: activo ? 'rgba(245,130,32,.14)' : 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{icono}</div>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 56, color: '#fff', lineHeight: 1.05}}>{t}</div>
    </div>
  );
};

// Paso actual de "Asociate", en grande, con los tres puntitos de avance.
const Paso: React.FC<{n: number; txt: string; desde: number}> = ({n, txt, desde}) => {
  const fr = useCurrentFrame();
  const k = interpolate(fr - f(desde), [0, 12], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{position: 'absolute', left: 68, right: 68, top: 600, height: 170, borderRadius: 40, display: 'flex', alignItems: 'center', gap: 34, padding: '0 40px',
      background: 'linear-gradient(90deg, rgba(245,130,32,.18), rgba(245,130,32,.05))', border: '2px solid rgba(245,130,32,.75)'}}>
      <div style={{width: 110, height: 110, borderRadius: '50%', background: O, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SLAB, fontWeight: 800, fontSize: 68, color: '#111', transform: `scale(${0.8 + 0.2 * k})`}}>{n + 1}</div>
      <div style={{flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: 62, color: '#fff', opacity: k, transform: `translateY(${(1 - k) * 20}px)`}}>{txt}</div>
      <div style={{display: 'flex', gap: 12}}>{[0, 1, 2].map((i) => <div key={i} style={{width: 16, height: 16, borderRadius: 99, background: i <= n ? O : 'rgba(255,255,255,.2)'}} />)}</div>
    </div>
  );
};

const Subtitulos: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const fr0 = FRASES.find(([a, b]) => t >= m(a) - 0.05 && t < m(b) + 0.25);
  if (!fr0) return null;
  const [a, b, txt] = fr0;
  const op = interpolate(t, [m(a) - 0.05, m(a) + 0.12, m(b) + 0.1, m(b) + 0.25], [0, 1, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 1600, display: 'flex', justifyContent: 'center', opacity: op}}>
      <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: '#fff', textAlign: 'center',
        background: 'rgba(10,11,11,.62)', backdropFilter: 'blur(10px)', borderRadius: 22, padding: '14px 28px', textShadow: '0 2px 10px rgba(0,0,0,.5)'}}>{txt}</div>
    </div>
  );
};

const Presentadora: React.FC<{src: string}> = ({src}) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(8,9,9,.88) 0%, rgba(8,9,9,.55) 26%, rgba(8,9,9,0) 44%, rgba(8,9,9,0) 70%, rgba(8,9,9,.6) 100%)'}} />
  </AbsoluteFill>
);

// ───────────────────────── escenas ─────────────────────────

const Intro: React.FC = () => (
  <>
    <Presentadora src="host_intro.mp4" />
    <Marca d={4} />
    <Titulo a="¿Ya sos del" b="GDO Club?" top={250} size={136} d={10} />
  </>
);

const QueEs: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const t100 = m(5.93) - m(T.intro);
  const sube = interpolate(t, [t100 - 0.1, t100 + 0.5], [0, 1], {...clamp, easing: ease});
  const fotos: [string, string][] = [['milanesas.jpg', 'Milanesas'], ['trozado.jpg', 'Pollo'], ['huevos.jpg', 'Huevos']];
  const k100 = spring({frame: fr - f(t100) - 6, fps: FPS, config: {damping: 13}});
  const v = Math.round(interpolate(fr - f(t100) - 6, [0, 22], [0, 100], {...clamp, easing: Easing.out(Easing.cubic)}));
  const giro = interpolate(fr - f(t100) - 18, [0, 18], [90, 0], {...clamp, easing: ease});
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Comprás" b="como siempre…" />
      <div style={{position: 'absolute', left: 68, right: 68, top: 640, display: 'flex', gap: 26,
        transform: `translateY(${sube * -40}px) scale(${1 - sube * 0.08})`, opacity: 1 - sube * 0.75}}>
        {fotos.map(([img, txt], i) => {
          const k = interpolate(fr - 10 - i * 5, [0, 16], [0, 1], {...clamp, easing: ease});
          return (
            <div key={i} style={{flex: 1, height: 540, borderRadius: 34, overflow: 'hidden', position: 'relative', opacity: k,
              transform: `translateY(${(1 - k) * 80}px)`, boxShadow: '0 30px 60px rgba(0,0,0,.5)', border: '2px solid rgba(255,255,255,.08)'}}>
              <Img src={staticFile(`fotos/${img}`)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.12 - k * 0.08})`}} />
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.75))'}} />
            </div>
          );
        })}
      </div>
      {t >= t100 - 0.1 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
          opacity: k100, transform: `scale(${0.8 + 0.2 * k100})`}}>
          <div style={{fontFamily: SLAB, fontWeight: 800, fontSize: 250, color: '#fff', letterSpacing: -6, textShadow: '0 20px 60px rgba(0,0,0,.6)'}}>${v}</div>
          <svg width="90" height="60" viewBox="0 0 90 60"><path d="M4 30h72M56 10l22 20-22 20" fill="none" stroke={O} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div style={{width: 250, height: 250, borderRadius: '50%', perspective: 800}}>
            <div style={{width: '100%', height: '100%', borderRadius: '50%', transform: `rotateY(${giro}deg)`,
              background: `radial-gradient(circle at 35% 30%, #ffb15c, ${O} 55%, #c25e0b)`, boxShadow: '0 25px 70px rgba(245,130,32,.55), inset 0 -10px 30px rgba(0,0,0,.25)',
              border: '6px solid rgba(255,255,255,.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontFamily: SLAB, fontWeight: 800, fontSize: 104, color: '#fff', lineHeight: 0.9}}>1</div>
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: '#fff'}}>PUNTO GDO</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Beneficios: React.FC = () => {
  const r = (t: number) => m(t) - m(T.quees);
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Los canjeás" b="por premios" />
      <Ficha icono={<Icono tipo="regalo" />} t="Productos de regalo" on={r(9.4)} top={600} />
      <Ficha icono={<Icono tipo="descuento" />} t="Descuentos" on={r(10.5)} top={782} />
      <Celular pantallas={[[0, 'e_premios.png']]} top={1000} w={380} d={f(r(8.4))} scroll={30} />
    </>
  );
};

const Asociate: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const r = (x: number) => m(x) - m(T.benef);
  const tCred = r(13.1);
  return (
    <>
      <Fondo />
      <Marca />
      <Titulo a="Te asociás" b="en un minuto" />
      <Ficha icono={<Icono tipo="check" />} t="Gratis" on={r(11.8)} top={600} />
      <Ficha icono={<Icono tipo="qr" />} t="Credencial digital" on={tCred} top={782} activo={t >= tCred} />
      {t >= tCred - 0.2 && (
        <div style={{position: 'absolute', left: 110, top: 1030}}>
          <Credencial d={f(tCred - 0.2)} puntos={0} w={860} ry={interpolate(t, [tCred, tCred + 2], [-8, 6], clamp)} rx={4} />
        </div>
      )}
    </>
  );
};

const Cierre: React.FC = () => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - 18, fps: FPS, config: {damping: 13}});
  const late = 1 + 0.04 * Math.sin(fr / 5);
  return (
    <>
      <Presentadora src="host_cta.mp4" />
      <Marca d={2} />
      <Titulo a="Comentá" b="CLUB" top={250} size={150} d={6} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1290, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px) scale(${late})`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, background: O, borderRadius: 99, padding: '24px 46px', boxShadow: '0 20px 60px rgba(245,130,32,.5)'}}>
          <svg width="52" height="52" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z" fill="none" stroke="#111" strokeWidth="2.4" strokeLinejoin="round" /></svg>
          <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 52, color: '#111'}}>Te mandamos el link</div>
        </div>
      </div>
    </>
  );
};

export const Reel: React.FC = () => {
  useFuentes();
  return (
  <AbsoluteFill style={{background: BG}}>
    <Audio src={staticFile('voz-reel.wav')} />
    <Sequence from={0} durationInFrames={f(m(T.intro)) + 8}><Fundido dur={f(m(T.intro)) + 8}><Intro /></Fundido></Sequence>
    <Escena a={T.intro} b={T.quees + 0.25}><QueEs /></Escena>
    <Escena a={T.quees} b={T.benef + 0.25}><Beneficios /></Escena>
    <Escena a={T.benef} b={T.cta + 0.25}><Asociate /></Escena>
    <Sequence from={f(m(T.cta))}><Cierre /></Sequence>
  </AbsoluteFill>
  );
};
