// Tomadas de câmera nomeadas (WAG-737). Só dados: o diretor com lerp é da WAG-740.
// Posições e alvos em coordenadas de cena; fov vertical em graus.

export type ShotName = 'overview' | 'barra' | 'port' | 'yard';

export interface Shot {
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_FOV = 35;

export const SHOTS: Record<ShotName, Shot> = {
  overview: { position: [10, 78, 74], target: [10, 0, -3] },
  barra: { position: [64, 24, 34], target: [50, 0, 3] },
  port: { position: [-6, 32, 20], target: [-28, 0, -13] },
  yard: { position: [-4, 26, 12], target: [-27, 1.5, -18] },
};
