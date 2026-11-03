import React from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

const FPS = 30;
const O = '#F58220';
const BG = '#0b0d0c';
const SANS = '"Inter Display", Inter, Arial, sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';

// La locución (voz.wav) va entera y sin cortes: el tiempo de la voz es el tiempo del video.
// m() queda por si se vuelve a editar la locución (pasa un tiempo de la voz al del video).
const m = (t: number) => t;
const f = (t: number) => Math.round(t * FPS);

// Frases de la locución (tiempos de la voz original) para los subtítulos.
const FRASES: [number, number, string][] = [
  [0.10, 1.46, '¿Ya sos del GDO Club?'],
  [1.79, 2.38, 'Es gratis,'],
  [2.61, 4.06, 'y cada compra te suma.'],
  [4.37, 7.14, 'Entrás a lista.granjadeloeste.com,'],
  [7.37, 8.11, 'tocás Club,'],
  [8.34, 9.38, 'completás tus datos…'],
  [9.69, 11.02, 'y ya tenés tu credencial.'],
  [11.43, 13.37, 'Por cada cien pesos, un punto:'],
  [13.62, 16.58, 'mostrás la credencial cuando comprás y se cargan al toque.'],
  [16.94, 19.27, 'Después, en Premios, elegís el que quieras…'],
  [19.56, 20.54, 'y te llega el voucher.'],
  [20.86, 21.91, 'Hacete socio hoy.'],
];

// Parte cada frase en golpes de 2-3 palabras, repartidos según su largo.
type Golpe = {a: number; b: number; txt: string};
const GOLPES: Golpe[] = (() => {
  const out: Golpe[] = [];
  for (const [a0, b0, txt] of FRASES) {
    const a = m(a0), b = m(b0);
    const w = txt.split(' ');
    const chunks: string[] = [];
    for (let i = 0; i < w.length; ) {
      if (w[i].length > 14) { chunks.push(w[i]); i += 1; continue; }
      let n = w.length - i === 4 ? 2 : Math.min(3, w.length - i);
      while (n > 1 && w.slice(i, i + n).some((x) => x.length > 14)) n--;
      chunks.push(w.slice(i, i + n).join(' ')); i += n;
    }
    const tot = chunks.reduce((s, c) => s + c.length, 0);
    let t = a;
    for (const c of chunks) { const d = (b - a) * (c.length / tot); out.push({a: t, b: t + d, txt: c}); t += d; }
  }
  return out;
})();

const Subtitulos: React.FC = () => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const g = GOLPES.find((x) => t >= x.a && t < x.b + 0.12);
  if (!g) return null;
  const k = spring({frame: fr - f(g.a), fps: FPS, config: {damping: 14, stiffness: 220}});
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 1575, textAlign: 'center',
      fontFamily: SANS, fontWeight: 900, fontSize: Math.min(82, Math.floor(1350 / Math.max(10, g.txt.length))), lineHeight: 1.05, color: '#fff', textTransform: 'uppercase',
      WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', letterSpacing: 1,
      transform: `scale(${0.85 + 0.15 * k})`, textShadow: '0 6px 18px rgba(0,0,0,.6)'}}>
      {g.txt.replace('GDO', 'GDO')}
    </div>
  );
};

const Fondo: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(900px 700px at 85% 10%, rgba(245,130,32,.10), transparent 60%), radial-gradient(800px 800px at 0% 100%, rgba(245,130,32,.06), transparent 60%), ${BG}`}} />
);

const Kicker: React.FC<{txt: string; d?: number}> = ({txt, d = 0}) => {
  const fr = useCurrentFrame();
  const op = interpolate(fr - d, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', left: 64, top: 200, fontFamily: MONO, fontSize: 30, letterSpacing: 7,
    color: O, opacity: op, textTransform: 'uppercase'}}>{txt}</div>;
};

const Titulo: React.FC<{a: string; b: string; top?: number; size?: number}> = ({a, b, top = 260, size = 104}) => {
  const fr = useCurrentFrame();
  const k = spring({frame: fr - 3, fps: FPS, config: {damping: 16}});
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top, fontFamily: SANS, fontWeight: 900, fontSize: size,
      lineHeight: 1.0, letterSpacing: -2, color: '#fff', opacity: k, transform: `translateY(${(1 - k) * 40}px)`}}>
      {a}<br /><span style={{color: O}}>{b}</span>
    </div>
  );
};

type Paso = {n: string; t: string; s: string; on: number};
const Pasos: React.FC<{pasos: Paso[]; top: number; h?: number; gap?: number}> = ({pasos, top, h = 150, gap = 40}) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  return (
    <>
      {pasos.map((p, i) => {
        const y = top + i * (h + gap);
        const k = spring({frame: fr - 8 - i * 5, fps: FPS, config: {damping: 18}});
        const activo = t >= p.on && (i === pasos.length - 1 || t < pasos[i + 1].on);
        const hecho = t >= p.on;
        return (
          <React.Fragment key={i}>
            {i > 0 && <div style={{position: 'absolute', left: 107, top: y - gap, width: 4, height: gap, background: hecho ? O : '#2a2d2b', opacity: k}} />}
            <div style={{position: 'absolute', left: 54, right: 54, top: y, height: h, borderRadius: 30,
              background: activo ? 'rgba(245,130,32,.16)' : '#141716', border: `3px solid ${activo ? O : '#232624'}`,
              display: 'flex', alignItems: 'center', gap: 34, padding: '0 40px', opacity: k,
              transform: `translateX(${(1 - k) * -60}px) scale(${activo ? 1.02 : 1})`,
              boxShadow: activo ? '0 0 40px rgba(245,130,32,.25)' : 'none'}}>
              <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 70, color: hecho ? O : '#5a5f5c', width: 54}}>{p.n}</div>
              <div>
                <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 54, color: '#fff', lineHeight: 1.1}}>{p.t}</div>
                <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 34, color: '#a3a9a6', marginTop: 4}}>{p.s}</div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// Celular con pantallas reales del Club. pantallas: [desde (s, relativo), imagen]
const Celular: React.FC<{pantallas: [number, string][]; top: number; w?: number; badge?: [number, string]}> = ({pantallas, top, w = 470, badge}) => {
  const fr = useCurrentFrame();
  const t = fr / FPS;
  const k = spring({frame: fr - 4, fps: FPS, config: {damping: 15}});
  const h = w * 2.05;
  return (
    <div style={{position: 'absolute', left: (1080 - w) / 2, top, width: w, height: h, borderRadius: 64, background: '#111',
      border: '4px solid #2f3331', padding: 16, boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 90px rgba(245,130,32,.15)',
      transform: `translateY(${(1 - k) * 200}px)`, opacity: k}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 50, overflow: 'hidden', background: '#000'}}>
        {pantallas.map(([d, img], i) => {
          const sig = pantallas[i + 1]?.[0] ?? 999;
          const op = t >= d && t < sig + 0.3 ? interpolate(t - d, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}) : 0;
          return <Img key={i} src={staticFile(img)} style={{position: 'absolute', left: 0, top: 0, width: '100%', opacity: op}} />;
        })}
      </div>
      {badge && t >= badge[0] && (
        <div style={{position: 'absolute', right: -60, top: 120, background: O, color: '#111', fontFamily: SANS, fontWeight: 900,
          fontSize: 52, borderRadius: 40, padding: '12px 30px', boxShadow: '0 12px 40px rgba(245,130,32,.5)',
          transform: `scale(${spring({frame: fr - f(badge[0]), fps: FPS, config: {damping: 9}})})`}}>{badge[1]}</div>
      )}
    </div>
  );
};

const Presentadora: React.FC<{src: string}> = ({src}) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 62%, rgba(0,0,0,.55) 100%)'}} />
  </AbsoluteFill>
);

const Marca: React.FC = () => (
  <div style={{position: 'absolute', left: 60, top: 96, display: 'flex', alignItems: 'center', gap: 16}}>
    <Img src={staticFile('isotipo-blanco.svg')} style={{height: 64}} />
    <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 38, letterSpacing: 6, color: '#fff'}}>GDO <span style={{color: O}}>CLUB</span></div>
  </div>
);

const Fuente: React.FC<{txt: string}> = ({txt}) => (
  <div style={{position: 'absolute', left: 64, right: 64, top: 1360, fontFamily: MONO, fontSize: 26, color: '#7d8380', lineHeight: 1.4}}>{txt}</div>
);

const Seccion: React.FC<{a0: number; b0: number; children: React.ReactNode}> = ({a0, b0, children}) => {
  const a = m(a0), b = m(b0);
  return <Sequence from={f(a)} durationInFrames={f(b) - f(a)}>{children}</Sequence>;
};

export const Club: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  const fr = useCurrentFrame();
  // tiempos relativos a cada sección (en s de la voz original)
  const r = (t: number, a0: number) => m(t) - m(a0);
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile('voz.wav')} />

      {/* 1 · Presentadora */}
      <Sequence from={0} durationInFrames={f(m(4.2))}>
        <Presentadora src="host_intro.mp4" />
        <Marca />
      </Sequence>

      {/* 2 · Cómo te asociás */}
      <Seccion a0={4.2} b0={11.25}>
        <Fondo />
        <Kicker txt="GDO Club · paso a paso" />
        <Titulo a="Cómo te" b="asociás (gratis)" />
        <Pasos top={530} h={140} gap={34} pasos={[
          {n: '1', t: 'Entrás a la lista', s: 'lista.granjadeloeste.com', on: r(4.37, 4.2)},
          {n: '2', t: 'Tocás “Club”', s: 'arriba, en el menú', on: r(7.37, 4.2)},
          {n: '3', t: 'Completás tus datos', s: 'nombre, DNI, dirección, teléfono', on: r(8.34, 4.2)},
          {n: '4', t: 'Credencial digital', s: 'con tu número de socio', on: r(9.69, 4.2)},
        ]} />
      </Seccion>

      {/* 3 · $100 = 1 punto */}
      <Seccion a0={11.25} b0={13.5}>
        <Fondo />
        <Kicker txt="Cómo sumás" />
        <Titulo a="Cada compra" b="suma puntos" />
        <Sequence from={10}>
          <AbsoluteFill style={{alignItems: 'center', top: 560}}>
            {(() => {
              const k = spring({frame: fr - f(m(11.25)) - 10, fps: FPS, config: {damping: 12}});
              const v = Math.round(interpolate(fr - f(m(11.25)) - 10, [0, 24], [0, 100], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
              return (
                <div style={{textAlign: 'center', transform: `scale(${0.7 + 0.3 * k})`, opacity: k}}>
                  <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 300, color: O, lineHeight: 1}}>${v}</div>
                  <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 92, color: '#fff', marginTop: 10}}>= 1 Punto GDO</div>
                </div>
              );
            })()}
          </AbsoluteFill>
        </Sequence>
        <Fuente txt="Suman los pedidos minoristas y las compras en el local." />
      </Seccion>

      {/* 4 · Carga de puntos */}
      <Seccion a0={13.5} b0={16.8}>
        <Fondo />
        <Kicker txt="En el mostrador" />
        <Titulo a="Mostrás tu" b="credencial" size={96} />
        <Pasos top={500} h={120} gap={26} pasos={[
          {n: 'A', t: 'Mostrás la credencial', s: 'cuando comprás', on: r(13.62, 13.5)},
          {n: 'B', t: 'Se cargan los puntos', s: 'al toque', on: r(15.5, 13.5)},
        ]} />
        <Sequence from={f(r(13.8, 13.5))}><Celular top={830} w={290} pantallas={[[0, 'c_credencial.png'], [r(15.6, 13.8), 'd_credencial_mas.png']]} badge={[r(15.6, 13.8), '+1.230 pts']} /></Sequence>
      </Seccion>

      {/* 5 · Canje */}
      <Seccion a0={16.8} b0={20.7}>
        <Fondo />
        <Kicker txt="Cómo canjeás" />
        <Titulo a="Tus puntos," b="tus premios" size={96} />
        <Pasos top={480} h={112} gap={22} pasos={[
          {n: '1', t: 'Entrás a Premios', s: 'en tu cuenta del Club', on: r(16.94, 16.8)},
          {n: '2', t: 'Elegís el que quieras', s: 'y tocás Canjear', on: r(18.0, 16.8)},
          {n: '3', t: 'Te llega el voucher', s: 'lo usás en el local o en tu envío', on: r(19.56, 16.8)},
        ]} />
        <Sequence from={f(r(17.1, 16.8))}><Celular top={960} w={250} pantallas={[[0, 'e_premios.png'], [r(19.56, 17.1), 'f_voucher.png']]} /></Sequence>
      </Seccion>


      {/* 6 · Cierre con la presentadora */}
      <Sequence from={f(m(20.7))} durationInFrames={durationInFrames - f(m(20.7))}>
        <Presentadora src="host_cta.mp4" />
        <Marca />
        <AbsoluteFill style={{alignItems: 'center'}}>
          {(() => {
            const k = spring({frame: fr - f(m(20.7)) - 20, fps: FPS, config: {damping: 14}});
            return <div style={{position: 'absolute', top: 1270, background: 'rgba(11,13,12,.85)', border: `3px solid ${O}`, borderRadius: 50,
              padding: '18px 36px', fontFamily: SANS, fontWeight: 800, fontSize: 46, color: '#fff', opacity: k, transform: `scale(${0.8 + 0.2 * k})`}}>
              📲 lista.granjadeloeste.com <span style={{color: O}}>→ Club</span></div>;
          })()}
        </AbsoluteFill>
      </Sequence>

      <Subtitulos />
    </AbsoluteFill>
  );
};
