import { describe, expect, it } from 'vitest';
import { stageFit } from './stage.ts';

// WAG-752: o palco de 1920×1080 é escalado para caber na janela, centralizado.
describe('stageFit', () => {
  it('em 1920×1080 a escala é 1, sem deslocamento', () => {
    expect(stageFit(1920, 1080)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('janela mais larga que 16:9 (Mac 1440×900): limita pela altura e centraliza na horizontal', () => {
    const f = stageFit(1440, 900);
    expect(f.scale).toBeCloseTo(1440 / 1920, 6); // 16:10 limita pela largura
    expect(f.x).toBeCloseTo(0, 6);
    expect(f.y).toBeCloseTo((900 - 1080 * f.scale) / 2, 6);
  });

  it('janela baixa (navegador com barras): limita pela altura e centraliza na horizontal', () => {
    const f = stageFit(1512, 800);
    expect(f.scale).toBeCloseTo(800 / 1080, 6);
    expect(f.y).toBeCloseTo(0, 6);
    expect(f.x).toBeCloseTo((1512 - 1920 * f.scale) / 2, 6);
  });

  it('o palco escalado nunca passa da janela', () => {
    for (const [w, h] of [
      [1440, 900],
      [1512, 982],
      [1728, 1117],
      [1280, 720],
      [2560, 1440],
    ] as const) {
      const f = stageFit(w, h);
      expect(1920 * f.scale).toBeLessThanOrEqual(w + 1e-6);
      expect(1080 * f.scale).toBeLessThanOrEqual(h + 1e-6);
    }
  });
});
