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
  [MILESTONE_U.FUNDEIO_TROMBETAS, 12],
  [1, 13],
];

// Deslocamento do eixo do leito para a direita de quem sobe (rightOf), em unidades de cena. No porto
// (WAG-751) o leito fica ao norte da linha de navegação: o berço encosta na margem sul e o fundeio fica
// no meio do rio. Zero até a foz do Trombetas, como antes.
export const PORT_SHIFT = 2.5;
const SHIFT_KNOTS: [number, number][] = [
  [0, 0],
  [PLACE_U.foz_trombetas, 0],
  [MILESTONE_U.FUNDEIO_TROMBETAS, PORT_SHIFT],
  [1, PORT_SHIFT],
];

function knotsAt(knots: [number, number][], u: number): number {
  for (let i = 1; i < knots.length; i++) {
    const [u0, w0] = knots[i - 1]!;
    const [u1, w1] = knots[i]!;
    if (u <= u1) return u1 === u0 ? w1 : w0 + ((u - u0) / (u1 - u0)) * (w1 - w0);
  }
  return knots[knots.length - 1]![1];
}

export function riverWidthAt(u: number): number {
  return knotsAt(WIDTH_KNOTS, u);
}

// Trombetas a montante do porto (WAG-751): o rio passa em frente ao berço e segue para oeste, virando
// para o norte até a borda da placa. Deslocamentos [dx, dz, largura] a partir do eixo do leito no berço.
const UPSTREAM: [number, number, number][] = [
  [-5, -0.3, 13],
  [-10, -1.2, 12.5],
  [-15, -3, 12],
  [-20, -5.5, 11],
  [-26, -9, 10],
];

// Lagoa Ajudante: na margem norte, atrás de uma faixa de ilhas e mata. Pontos [x, z, largura].
const LAGOA_AJUDANTE: [number, number, number][] = [
  [-60, -32.5, 3],
  [-51, -33, 4],
  [-42, -32.8, 4.5],
  [-34, -31.6, 3.5],
  [-28, -29.8, 2.2],
];

interface Polyline {
  centers: Vector3[];
  widths: number[];
}

function corridorPolyline(): Polyline {
  const N = 160;
  const centers: Vector3[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    centers.push(corridorCurve.getPointAt(u).addScaledVector(rightOf(u), knotsAt(SHIFT_KNOTS, u)));
    widths.push(riverWidthAt(u));
  }
  const end = centers[N]!;
  for (const [dx, dz, w] of UPSTREAM) {
    centers.push(new Vector3(end.x + dx, 0, end.z + dz));
    widths.push(w);
  }
  return { centers, widths };
}

// Amazonas a montante: da foz para oeste, afastado para o sul do pátio do porto (WAG-751).
function amazonasPolyline(): Polyline {
  const foz = place('foz_trombetas').position;
  return {
    centers: [foz.clone(), new Vector3(-31, 0, 6.5), new Vector3(-45, 0, 10), new Vector3(-58, 0, 11)],
    widths: [6.5, 6, 5.5, 5],
  };
}

function lagoaPolyline(): Polyline {
  return { centers: LAGOA_AJUDANTE.map(([x, z]) => new Vector3(x, 0, z)), widths: LAGOA_AJUDANTE.map(([, , w]) => w) };
}

const POLYLINES: readonly Polyline[] = [corridorPolyline(), amazonasPolyline(), lagoaPolyline()];
export const OCEAN_X0 = 56; // Atlântico: água em x > OCEAN_X0 (plano em River.tsx)

// Distância com sinal até a água no plano XZ: negativa dentro d'água, positiva em terra.
export function waterDistance(x: number, z: number): number {
  if (x > OCEAN_X0) return OCEAN_X0 - x;
  let best = Infinity;
  for (const { centers, widths } of POLYLINES) {
    for (let i = 1; i < centers.length; i++) {
      const a = centers[i - 1]!;
      const b = centers[i]!;
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const len2 = abx * abx + abz * abz;
      const t = len2 > 0 ? Math.min(1, Math.max(0, ((x - a.x) * abx + (z - a.z) * abz) / len2)) : 0;
      const d = Math.hypot(x - (a.x + abx * t), z - (a.z + abz * t));
      const half = (widths[i - 1]! + (widths[i]! - widths[i - 1]!) * t) / 2;
      best = Math.min(best, d - half);
    }
  }
  return best;
}

// Faixa plana em y = 0 a partir de centros e larguras; o lado sai da tangente entre os vizinhos.
function pushRibbon(pos: number[], idx: number[], { centers, widths }: Polyline) {
  const base = pos.length / 3;
  const t = new Vector3();
  centers.forEach((c, i) => {
    t.subVectors(centers[Math.min(i + 1, centers.length - 1)]!, centers[Math.max(i - 1, 0)]!).setY(0).normalize();
    const h = widths[i]! / 2;
    // lado = tangente × cima (igual a rightOf na curva)
    const sx = -t.z;
    const sz = t.x;
    pos.push(c.x - sx * h, 0, c.z - sz * h, c.x + sx * h, 0, c.z + sz * h);
    if (i > 0) {
      const a = base + (i - 1) * 2;
      const b = base + i * 2;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  });
}

// Leito do corredor (Barra Norte ao porto, seguindo rio acima além do berço), o Amazonas a montante da
// foz do Trombetas e a Lagoa Ajudante. Um só BufferGeometry: uma draw call.
export function buildRiverGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const p of POLYLINES) pushRibbon(pos, idx, p);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
