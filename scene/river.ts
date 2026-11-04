// Rio: escala vertical da água e geometria do leito (WAG-737).
//
// `waterY(levelM)` converte o nível em Óbidos (m) na altura da superfície da água na cena.
// A água, a régua e os navios (WAG-739) usam a mesma função, então o nível bate com a régua.

import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { corridorCurve, MILESTONE_U, PLACE_U, place, rightOf } from './corridor.ts';

export const LEVEL_REF_M = 11; // nível que fica em y = WATER_Y0
export const WATER_Y0 = 0.05;
export const WATER_SCALE = 1.2; // unidades de cena por metro (exagero vertical, esquemático)

export function waterY(levelM: number): number {
  return WATER_Y0 + (levelM - LEVEL_REF_M) * WATER_SCALE;
}

// Largura do leito ao longo da curva (u -> largura), linear por trechos.
const WIDTH_KNOTS: [number, number][] = [
  [0, 16],
  [PLACE_U.fazendinha, 11],
  [PLACE_U.macapa, 9],
  [PLACE_U.obidos, 6.5],
  [PLACE_U.foz_trombetas, 6.5],
  [MILESTONE_U.FUNDEIO_TROMBETAS, 10],
  [1, 7],
];

export function riverWidthAt(u: number): number {
  for (let i = 1; i < WIDTH_KNOTS.length; i++) {
    const [u0, w0] = WIDTH_KNOTS[i - 1]!;
    const [u1, w1] = WIDTH_KNOTS[i]!;
    if (u <= u1) return w0 + ((u - u0) / (u1 - u0)) * (w1 - w0);
  }
  return WIDTH_KNOTS[WIDTH_KNOTS.length - 1]![1];
}

// Faixa plana em y = 0 a partir de centros e larguras.
function pushRibbon(pos: number[], idx: number[], centers: Vector3[], sides: Vector3[], widths: number[]) {
  const base = pos.length / 3;
  centers.forEach((c, i) => {
    const h = widths[i]! / 2;
    const s = sides[i]!;
    pos.push(c.x - s.x * h, 0, c.z - s.z * h, c.x + s.x * h, 0, c.z + s.z * h);
    if (i > 0) {
      const a = base + (i - 1) * 2;
      const b = base + i * 2;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  });
}

// Leito do corredor (Barra Norte ao porto, com 3 unidades além do berço) e o Amazonas
// seguindo a montante depois da foz do Trombetas. Um só BufferGeometry: uma draw call.
export function buildRiverGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];

  const N = 160;
  const centers: Vector3[] = [];
  const sides: Vector3[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    centers.push(corridorCurve.getPointAt(u));
    sides.push(rightOf(u));
    widths.push(riverWidthAt(u));
  }
  const endTangent = corridorCurve.getTangentAt(1);
  centers.push(corridorCurve.getPointAt(1).addScaledVector(endTangent, 3));
  sides.push(rightOf(1));
  widths.push(riverWidthAt(1) * 0.8);
  pushRibbon(pos, idx, centers, sides, widths);

  // Amazonas a montante: da foz para oeste.
  const foz = place('foz_trombetas').position;
  const up = [foz.clone(), new Vector3(-32, 0, 5), new Vector3(-46, 0, 7), new Vector3(-58, 0, 6)];
  const upSides = up.map((_, i) => {
    const next = up[Math.min(i + 1, up.length - 1)]!;
    const prev = up[Math.max(i - 1, 0)]!;
    const t = next.clone().sub(prev).normalize();
    return new Vector3(-t.z, 0, t.x);
  });
  pushRibbon(pos, idx, up, upSides, [6.5, 6, 5.5, 5]);

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
