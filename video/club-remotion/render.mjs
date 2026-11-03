import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const [modo, ...rest] = process.argv.slice(2);
const browserExecutable = process.env.CHROME_PATH || null; // en la PC se usa el Chrome que baja Remotion
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Club', browserExecutable});
if (modo === 'stills') {
  for (const s of rest) await renderStill({serveUrl, composition, frame: Math.round(+s * 30), output: `out/still_${s}.jpg`, imageFormat: 'jpeg', browserExecutable});
} else {
  await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: rest[0], browserExecutable, crf: 18, concurrency: 4,
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 20 === 0) process.stdout.write(`${Math.round(progress * 100)}% `); }});
}
console.log('ok');
