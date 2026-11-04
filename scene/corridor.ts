// Corredor fluvial esquemático (WAG-737). Esquemático e fora de escala; só a ordem dos lugares importa.
//
// API estável para os navios (WAG-739) e o diretor de câmera (WAG-740):
//
// - `PLACES`: os 6 lugares do corredor, na ordem, com posição no plano XZ (y = 0).
//   Barra Norte (leste, +x) até Porto Trombetas (oeste, -x, subindo o Trombetas para -z).
// - `corridorCurve`: CatmullRomCurve3 que passa pelos 6 lugares, de Barra Norte (u = 0) ao berço (u = 1).
// - `MILESTONE_U`: posição u (comprimento de arco, 0..1) de cada marco de MILESTONES na curva.
//     BARRA_NORTE = 0, FAZENDINHA = u de Fazendinha, FUNDEIO_TROMBETAS = u do fundeio perto do porto,
//     ATRACACAO / INICIO_CARGA / FIM_CARGA = 1 (berço), SAIDA_BARRA = 0 (volta pela mesma curva).
//     Macapá e Óbidos não são marcos: o navio passa por eles entre FAZENDINHA e FUNDEIO_TROMBETAS.
// - `pointAt(milestone, target?)`: ponto do marco na curva (y = 0, nível de referência da água).
// - `pointAtIndex(index, target?)`: ponto para o índice fracionário de shipsAt/shipAt (0..6),
//   via splitIndex. Entre FIM_CARGA e SAIDA_BARRA (descida), o ponto vai para a faixa da direita
//   (`OUTBOUND_LANE_OFFSET`), para não sobrepor quem sobe; em SAIDA_BARRA (índice 6) continua nessa faixa.
// - `ANCHORAGE_SLOTS`: as 3 posições de fundeio do porto, fora da curva. A WAG-739 decide quem vai em qual.
// - `rightOf(u)`: vetor unitário à direita de quem sobe o canal em u (no porto, o lado de terra).
// - `BERTH_POSITION`: ponto de atracação, ao lado do píer. Igual a pointAt('ATRACACAO').
//
// O y dos pontos é 0. Para pôr o navio na superfície da água, some `waterY(levelM)` de river.ts.

import { CatmullRomCurve3, Vector3 } from 'three';
import type { Milestone } from '../docs/schema.ts';
import { splitIndex } from '../data/selectors.ts';

export interface Place {
  id: 'barra_norte' | 'fazendinha' | 'macapa' | 'obidos' | 'foz_trombetas' | 'porto_trombetas';
  name: string; // rótulo principal
  note?: string; // segunda linha do rótulo
  position: Vector3;
  labelSide: 1 | -1; // 1: rótulo na margem de +z (perto da câmera), -1: na margem de -z
  labelGap?: number; // afastamento extra do rótulo, além da margem
  labelAt?: Vector3; // posição explícita do pino e do rótulo (ignora labelSide e labelGap)
}

export const PLACES: readonly Place[] = [
  { id: 'barra_norte', name: 'Barra Norte', position: new Vector3(58, 0, 8), labelSide: -1 },
  { id: 'fazendinha', name: 'Fazendinha', note: 'praticagem', position: new Vector3(42, 0, -1), labelSide: 1 },
  { id: 'macapa', name: 'Macapá', note: 'fundeio', position: new Vector3(27, 0, -5), labelSide: -1 },
  { id: 'obidos', name: 'Óbidos', note: 'estação de nível', position: new Vector3(-10, 0, 2), labelSide: -1 },
  { id: 'foz_trombetas', name: 'Foz do Trombetas', position: new Vector3(-20, 0, -1), labelSide: 1 },
  { id: 'porto_trombetas', name: 'Porto Trombetas', position: new Vector3(-34, 0, -15), labelSide: 1, labelAt: new Vector3(-42, 0, -21) },
];

export function place(id: Place['id']): Place {
  return PLACES.find((p) => p.id === id)!;
}

// Fundeio do Trombetas (marco FUNDEIO_TROMBETAS): na curva, pouco antes do berço.
const FUNDEIO_POINT = new Vector3(-27, 0, -8);

// Pontos de controle: os lugares, mais um ponto de meandro entre Macapá e Óbidos e o fundeio.
const CONTROL_POINTS = [
  place('barra_norte').position,
  place('fazendinha').position,
  place('macapa').position,
  new Vector3(10, 0, 0),
  place('obidos').position,
  place('foz_trombetas').position,
  FUNDEIO_POINT,
  place('porto_trombetas').position,
];

export const corridorCurve = new CatmullRomCurve3(CONTROL_POINTS, false, 'centripetal');

// u (comprimento de arco) do ponto de controle i. Divisões múltiplas de (n - 1) caem exatamente nos pontos.
const DIVISIONS = (CONTROL_POINTS.length - 1) * 200;
const lengths = corridorCurve.getLengths(DIVISIONS);
const total = lengths[DIVISIONS]!;
function controlU(i: number): number {
  return lengths[(i / (CONTROL_POINTS.length - 1)) * DIVISIONS]! / total;
}

// u de cada lugar, para rótulos e câmera.
export const PLACE_U: Record<Place['id'], number> = {
  barra_norte: controlU(0),
  fazendinha: controlU(1),
  macapa: controlU(2),
  obidos: controlU(4),
  foz_trombetas: controlU(5),
  porto_trombetas: controlU(7),
};

export const MILESTONE_U: Record<Milestone, number> = {
  BARRA_NORTE: 0,
  FAZENDINHA: PLACE_U.fazendinha,
  FUNDEIO_TROMBETAS: controlU(6),
  ATRACACAO: 1,
  INICIO_CARGA: 1,
  FIM_CARGA: 1,
  SAIDA_BARRA: 0,
};

export const OUTBOUND_LANE_OFFSET = 1.6;
export const ANCHORAGE_OFFSET = 3;

export function pointAt(milestone: Milestone, target = new Vector3()): Vector3 {
  return corridorCurve.getPointAt(MILESTONE_U[milestone], target);
}

const tangent = new Vector3();
const UP = new Vector3(0, 1, 0);

export function pointAtIndex(index: number, target = new Vector3()): Vector3 {
  const { from, to, frac } = splitIndex(index);
  const u = MILESTONE_U[from] + (MILESTONE_U[to] - MILESTONE_U[from]) * frac;
  corridorCurve.getPointAt(u, target);
  if (from === 'FIM_CARGA' && to === 'SAIDA_BARRA') {
    // Faixa de descida: desloca para a direita de quem desce, entrando aos poucos ao sair do berço.
    const ramp = Math.min(1, frac * 10);
    target.addScaledVector(rightOf(u, tangent), -OUTBOUND_LANE_OFFSET * ramp);
  }
  return target;
}

export const BERTH_POSITION = pointAt('ATRACACAO');

// Lado de terra do porto: direita de quem sobe o canal (tangente × cima).
export function rightOf(u: number, target = new Vector3()): Vector3 {
  return corridorCurve.getTangentAt(u, target).cross(UP).normalize();
}

// Três posições de fundeio, na margem oposta ao porto, em volta do marco FUNDEIO_TROMBETAS.
export const ANCHORAGE_SLOTS: readonly Vector3[] = [-0.025, 0, 0.025].map((du) => {
  const u = MILESTONE_U.FUNDEIO_TROMBETAS + du;
  return corridorCurve.getPointAt(u).addScaledVector(rightOf(u), -ANCHORAGE_OFFSET);
});
