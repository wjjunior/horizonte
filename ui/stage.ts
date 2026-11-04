// Palco de 1920×1080 escalado para caber na janela (WAG-752). Função pura; o hook fica em App.tsx.
//
// A cena, as tomadas e os overlays são desenhados em 1920×1080. Em telas menores (Mac), o palco
// inteiro é reduzido por CSS, mantendo 16:9 e centralizado, sem scroll. Em 1920×1080 a escala é 1.

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export interface StageFit {
  scale: number;
  x: number; // deslocamento horizontal do palco escalado, em px da janela
  y: number;
}

export function stageFit(viewportW: number, viewportH: number): StageFit {
  const scale = Math.min(viewportW / STAGE_WIDTH, viewportH / STAGE_HEIGHT);
  return {
    scale,
    x: (viewportW - STAGE_WIDTH * scale) / 2,
    y: (viewportH - STAGE_HEIGHT * scale) / 2,
  };
}
