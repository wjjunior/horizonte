// Tomadas de câmera nomeadas (WAG-737). Só dados: o diretor com lerp é da WAG-740.
// Posições e alvos em coordenadas de cena; fov vertical em graus.

export type ShotName = 'overview' | 'barra' | 'port' | 'yard';

export interface Shot {
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_FOV = 35;

export const SHOTS: Record<ShotName, Shot> = {
  overview: { position: [6, 82, 78], target: [6, 0, -3] },
  barra: { position: [64, 24, 34], target: [50, 0, 3] },
  // WAG-751: recalibradas para a planta nova (berço na margem sul, fundeio a jusante, pátio a sudoeste).
  port: { position: [-29, 38, 13.5], target: [-35, 0, -14.5] },
  yard: { position: [-24, 30, 12], target: [-39, 1.5, -10] },
};
