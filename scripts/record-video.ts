// Vídeo de reserva da demo (WAG-743): grava o ?record=1 e converte para H.264.
//
//   node scripts/record-video.ts            build, gravação e conversão
//   node scripts/record-video.ts --no-build usa o dist/ que já existe
//
// Passos: `npm run build`, `vite preview` numa porta livre, Chromium headless 1920×1080 com
// recordVideo em ?record=1, espera o roteiro (RECORD_TOTAL_S de demo/beats.ts) e converte o
// .webm com o ffmpeg do PATH para out/demo-reserva.mp4 (H.264, yuv420p, sem áudio, faststart).
//
// Corte do começo: no primeiro segundo e pouco a cena ainda está montando (canvas vazio, depois
// sem os rótulos, que são texto SDF no WebGL). O corte é medido em dois passos:
// 1. O beat 1 é um quadro parado e determinístico, igual ao de &beat=1. Antes de gravar, o script
//    tira desse &beat=1 um screenshot de referência e, na gravação, espera um screenshot bater com
//    ela. Isso confirma que o beat 1 assentou e dá uma estimativa do instante no vídeo.
// 2. O relógio dos screenshots não é o do vídeo, então o instante exato sai do próprio .webm: o
//    Chromium decodifica os frames até a estimativa + VIDEO_SCAN_EXTRA_S, e o corte é o primeiro
//    frame depois da última mudança visível. Esse valor vira o -ss.
// O .webm bruto fica em out/ para conferir.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { preview } from 'vite';
import { RECORD_TOTAL_S } from '../demo/beats.ts';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = resolve(ROOT, 'out');
const WEBM = resolve(OUT_DIR, 'demo-reserva.webm');
const MP4 = resolve(OUT_DIR, 'demo-reserva.mp4');
const WIDTH = 1920;
const HEIGHT = 1080;
// Folga depois do último beat, para a conversão nunca cortar o fim do vídeo.
const TAIL_S = 1;
// Espera para a referência do &beat=1 assentar, e limite para a gravação chegar nela.
const SETTLE_MS = 5_000;
const STABLE_TIMEOUT_MS = 15_000;
// A varredura do .webm vai até a estimativa + esta folga, sem passar do beat 2 (4 s de beat 1).
const VIDEO_SCAN_EXTRA_S = 2;
// Mudança entre frames seguidos, medida em blocos de 8×8 px (no frame reduzido a 480×270): um
// bloco muda se a diferença média por canal (0 a 255) passa de BLOCK_DIFF; o frame muda se
// BLOCK_COUNT blocos mudam. Medido no .webm: num quadro parado nenhum bloco passa de 4 (o ruído
// do VP8 se espalha fraco); a cena surgindo muda ~1.100 blocos e os números dos rótulos, ~15.
const BLOCK_DIFF = 4;
const BLOCK_COUNT = 3;
// O beat 1 precisa ficar parado pelo menos isto antes do fim da varredura.
const MIN_STILL_S = 0.5;

function ffmpegAvailable(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Screenshot do beat 1 assentado, numa página sem gravação.
async function beat1Reference(browser: Browser, url: string): Promise<Buffer> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(`${url}?beat=1`);
    await page.waitForTimeout(SETTLE_MS);
    const a = await page.screenshot();
    await page.waitForTimeout(500);
    const b = await page.screenshot();
    if (!a.equals(b)) throw new Error('o &beat=1 não ficou parado: sem referência para o corte');
    return a;
  } finally {
    await context.close();
  }
}

// Instante (ms, relógio do Node) do primeiro screenshot igual à referência.
async function reachReference(page: Page, reference: Buffer): Promise<number> {
  const deadline = Date.now() + STABLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const at = Date.now();
    if ((await page.screenshot()).equals(reference)) return at;
  }
  throw new Error(`a gravação não chegou ao quadro do beat 1 em ${STABLE_TIMEOUT_MS / 1000} s`);
}

async function record(): Promise<number> {
  const server = await preview({ root: ROOT, logLevel: 'warn', preview: { port: 0, strictPort: false, open: false } });
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('vite preview não informou a URL local');

  const videoDir = resolve(OUT_DIR, 'raw');
  rmSync(videoDir, { recursive: true, force: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const reference = await beat1Reference(browser, url);
    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
      recordVideo: { dir: videoDir, size: { width: WIDTH, height: HEIGHT } },
    });
    const page = await context.newPage();
    const videoStart = Date.now();

    await page.goto(`${url}?record=1`);
    const startS = ((await reachReference(page, reference)) - videoStart) / 1000; // estimativa

    await page.waitForTimeout((RECORD_TOTAL_S + TAIL_S) * 1000);
    const video = page.video();
    await context.close();
    if (!video) throw new Error('o Playwright não gravou vídeo');
    renameSync(await video.path(), WEBM);
    rmSync(videoDir, { recursive: true, force: true });

    const untilS = startS + VIDEO_SCAN_EXTRA_S;
    const scan = await stableFrameInVideo(browser, untilS);
    console.log(`estimativa pelos screenshots: ${startS.toFixed(2)} s; mudanças no .webm (s:blocos): ${scan.diffs}`);
    if (scan.t > untilS - MIN_STILL_S) throw new Error(`o beat 1 ainda mudava em ${scan.t.toFixed(2)} s do .webm`);
    return scan.t;
  } finally {
    await browser.close();
    await new Promise<void>((done) => server.httpServer.close(() => done()));
  }
}

// Primeiro frame do .webm depois da última mudança em [0, untilS]: o beat 1 já assentado.
async function stableFrameInVideo(browser: Browser, untilS: number): Promise<{ t: number; diffs: string }> {
  // Blob URL na própria página: um file:// contaminaria o canvas e bloquearia o getImageData.
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ({ b64, untilS, blockDiff, blockCount }) => {
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const v = document.createElement('video');
        v.muted = true;
        v.preload = 'auto';
        v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/webm' }));
        await new Promise((ok) => v.addEventListener('loadeddata', ok, { once: true }));
        const c = document.createElement('canvas');
        c.width = 480;
        c.height = 270;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        const grab = async (t: number) => {
          await new Promise((ok) => {
            v.addEventListener('seeked', ok, { once: true });
            v.currentTime = t;
          });
          g.drawImage(v, 0, 0, c.width, c.height);
          return g.getImageData(0, 0, c.width, c.height).data;
        };
        const step = 1 / 25; // o Playwright grava a 25 fps
        let prev = await grab(0);
        let stable = 0;
        const diffs: string[] = [];
        for (let t = step; t <= untilS; t += step) {
          const cur = await grab(t + step / 2);
          let changed = 0;
          for (let by = 0; by < c.height; by += 8) {
            for (let bx = 0; bx < c.width; bx += 8) {
              let sum = 0;
              for (let y = by; y < by + 8; y++) {
                for (let x = bx; x < bx + 8; x++) {
                  const i = (y * c.width + x) * 4;
                  sum += Math.abs(cur[i] - prev[i]) + Math.abs(cur[i + 1] - prev[i + 1]) + Math.abs(cur[i + 2] - prev[i + 2]);
                }
              }
              if (sum / (8 * 8 * 3) > blockDiff) changed++;
            }
          }
          if (changed >= blockCount) {
            stable = t;
            diffs.push(`${t.toFixed(2)}s:${changed}`);
          }
          prev = cur;
        }
        return { t: stable, diffs: diffs.join(' ') };
      },
      { b64: readFileSync(WEBM).toString('base64'), untilS, blockDiff: BLOCK_DIFF, blockCount: BLOCK_COUNT },
    );
  } finally {
    await page.close();
  }
}

function convert(startS: number): void {
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-ss', startS.toFixed(2),
      '-i', WEBM,
      '-t', String(RECORD_TOTAL_S),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-movflags', '+faststart',
      MP4,
    ],
    { stdio: 'inherit' },
  );
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  if (!process.argv.includes('--no-build')) execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });

  const startS = await record();
  console.log(`webm: ${WEBM}`);
  console.log(`beat 1 começa em ${startS.toFixed(2)} s do .webm; roteiro de ${RECORD_TOTAL_S} s`);

  if (!ffmpegAvailable()) {
    console.error('ffmpeg não encontrado no PATH: o .webm ficou em out/, a conversão para H.264 não rodou.');
    process.exit(1);
  }
  convert(startS);
  console.log(`mp4: ${MP4} (${(statSync(MP4).size / 1e6).toFixed(1)} MB)`);
}

await main();
