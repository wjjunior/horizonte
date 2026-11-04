// Export do still 4K da tomada overview (WAG-741), para a capa e a tela T1 do deck.
//
// Uso: npm run build && npm run still
// Exige a build em dist/ (o script não builda): sobe o `vite preview` sobre dist/ numa porta
// livre, abre o Chromium headless do Playwright em 1920×1080 com deviceScaleFactor 2 e grava:
//   out/still-overview.png          beat 1: corredor inteiro, sem destaque
//   out/still-overview-navio-c.png  beat 2: mesma tomada, navio C destacado (slide 4 do PDF)
//
// A URL é ?beat=N&still=1, sem record=1: com &beat=N o diretor entra no beat com o relógio
// parado, então o frame não depende de quando o screenshot sai. still=1 esconde os overlays DOM;
// o aviso "esquemático, fora de escala" faz parte da cena e fica.
// WebGL por SwiftShader (render em CPU), para o mesmo beat dar o mesmo PNG em toda execução.

import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const OUT = resolve(ROOT, 'out');

// Espera depois do `load`: fontes, scenario.json e primeiros frames. Com SwiftShader a cena
// monta cerca de 1,5 s depois do `load`.
const SETTLE_MS = 4000;

const STILLS = [
  { file: 'still-overview.png', beat: 1 },
  { file: 'still-overview-navio-c.png', beat: 2 },
];

if (!existsSync(resolve(DIST, 'index.html')) || !existsSync(resolve(DIST, 'scenario.json'))) {
  console.error('dist/ sem index.html ou scenario.json. Rode antes: npm run generate && npm run build');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const server = await preview({ root: ROOT, logLevel: 'warn', preview: { host: '127.0.0.1', open: false } });
const base = server.resolvedUrls?.local[0];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  if (!base) throw new Error('vite preview não informou a URL local');
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

  for (const { file, beat } of STILLS) {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto(new URL(`?beat=${beat}&still=1`, base).href, { waitUntil: 'load' });
    await page.waitForSelector('canvas');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_MS);
    if (errors.length) throw new Error(`erro na página (beat ${beat}):\n${errors.join('\n')}`);

    const path = resolve(OUT, file);
    await page.screenshot({ path });
    console.log(`beat ${beat} -> ${path}`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise<void>((done) => server.httpServer.close(() => done()));
}
