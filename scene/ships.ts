// Navios: funções puras de pose, cor e fila (WAG-739). O componente fica em Ships.tsx.
//
// Decisões documentadas:
// - Cor por status, a partir de `pDelay` (atraso de chegada ao fundeio de Trombetas):
//     vermelho: P(atraso > 24 h) >= 50%
//     âmbar:    P(atraso > 12 h) >= 15%
//     verde:    o resto
//   No base, o C sai vermelho (gt24h = 0,99); D a G saem âmbar (gt12h perto de 20%); A e B, verdes.
// - `pending` (antes do P50 do primeiro marco): o navio espera no Atlântico, ao sul da Barra Norte,
//   numa fila fixa por cenário (ordem do P50 do primeiro marco). Nas últimas PENDING_MOVE_H horas
//   ele desliza da vaga até a Barra Norte. A vaga não muda quando outro sai: a fila não "pula".
// - `done` em SAIDA_BARRA: escondido (o navio já saiu). `done` em outro marco: fica no marco.
// - Fundeio (entre FUNDEIO_TROMBETAS e ATRACACAO): o navio sai da curva para uma das 3
//   ANCHORAGE_SLOTS. A vaga é escolhida na chegada (P50), a primeira livre na ordem
//   ANCHORAGE_PREFERENCE (a mais perto do berço primeiro), e não muda até a atracação.
//   Ele entra na vaga e sai dela para o berço em até ANCHOR_MOVE_H horas.
// - Atracado (ATRACACAO a FIM_CARGA): BERTH_POSITION, que é o fim da curva.
// - Subida: cada navio tem uma faixa lateral fixa (INBOUND_LANE), para o C e o D, que entram juntos
//   na Barra Norte, não se sobreporem. A faixa converge para o eixo entre o fundeio e o berço.
// - Faixa de incerteza: do p90Index (atrás) ao p10Index (à frente), na mesma faixa lateral do navio.
//   O P50 sólido é o próprio casco.

import { Vector3 } from 'three';
import { MILESTONES } from '../docs/schema.ts';
import type { ShipForecast, ShipId } from '../docs/schema.ts';
import { splitIndex } from '../data/selectors.ts';
import type { ShipPosition } from '../data/selectors.ts';
import { ANCHORAGE_SLOTS, corridorCurve, MILESTONE_U, place, pointAtIndex, rightOf } from './corridor.ts';

export type StatusColor = 'green' | 'amber' | 'red';

export const STATUS_HEX: Record<StatusColor, string> = {
  green: '#3FB57A',
  amber: '#E3A13B',
  red: '#E25A4F',
};

export const ACCENT_HEX = '#C2622D'; // seleção

export const RED_GT24H = 0.5;
export const AMBER_GT12H = 0.15;

export function statusColor(pDelay: ShipForecast['pDelay']): StatusColor {
  if (pDelay.gt24h >= RED_GT24H) return 'red';
  if (pDelay.gt12h >= AMBER_GT12H) return 'amber';
  return 'green';
}

// ---------------------------------------------------------------------------
// Fundeio

export const ANCHORAGE_PREFERENCE = [2, 1, 0] as const; // índices de ANCHORAGE_SLOTS; 2 é o mais perto do berço
export const ANCHOR_MOVE_H = 2;

// Vaga de fundeio de cada navio no cenário. Alocação gulosa por ordem de chegada (P50 do
// FUNDEIO_TROMBETAS): cada navio pega a primeira vaga livre na ordem de preferência e a segura até
// o P50 da ATRACACAO. Se as 3 estiverem ocupadas, o navio fica sem vaga (espera na curva).
export function assignAnchorageSlots(forecasts: readonly ShipForecast[]): Map<ShipId, number> {
  const stays = forecasts
    .flatMap((fc) => {
      const arr = fc.milestones.FUNDEIO_TROMBETAS?.p50;
      const berth = fc.milestones.ATRACACAO?.p50;
      return arr === undefined || berth === undefined ? [] : [{ id: fc.shipId, arr, berth }];
    })
    .sort((a, b) => a.arr - b.arr || a.id.localeCompare(b.id));
  const freeAt = ANCHORAGE_SLOTS.map(() => -Infinity);
  const out = new Map<ShipId, number>();
  for (const s of stays) {
    const slot = ANCHORAGE_PREFERENCE.find((k) => freeAt[k]! <= s.arr);
    if (slot === undefined) continue;
    freeAt[slot] = s.berth;
    out.set(s.id, slot);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fila no Atlântico (pending)

export const PENDING_MOVE_H = 3;
const BARRA = place('barra_norte').position;

// Vagas no Atlântico, em fila indiana ao sul da Barra Norte, na faixa de oceano que a tomada
// overview mostra (x de 56 a 62). A vaga 0 é a mais perto da barra; 5 e 6 só por segurança.
export const SEA_QUEUE_SLOTS: readonly Vector3[] = [
  [58.5, 11.5],
  [58.5, 14.7],
  [58.5, 17.9],
  [58.5, 21.1],
  [58.5, 24.3],
  [61.5, 13],
  [61.5, 16.2],
].map(([x, z]) => new Vector3(x, 0, z));

// Ordem de cada navio na fila do Atlântico: pelo P50 do primeiro marco, só para quem chega depois de t0.
export function seaQueueRanks(forecasts: readonly ShipForecast[], t0 = 0): Map<ShipId, number> {
  const first = (fc: ShipForecast) => MILESTONES.map((m) => fc.milestones[m]?.p50).find((v) => v !== undefined);
  const ranked = forecasts
    .flatMap((fc) => {
      const t = first(fc);
      return t === undefined || t <= t0 ? [] : [{ id: fc.shipId, t }];
    })
    .sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
  return new Map(ranked.map((r, i) => [r.id, Math.min(i, SEA_QUEUE_SLOTS.length - 1)]));
}

// ---------------------------------------------------------------------------
// Faixas laterais e pontos na curva

const LANE_A = 0.9;
const LANE_B = -0.3;
export const INBOUND_LANE: Record<ShipId, number> = { A: LANE_A, B: LANE_B, C: LANE_A, D: LANE_B, E: LANE_A, F: LANE_B, G: LANE_A };

export function uAtIndex(index: number): number {
  const { from, to, frac } = splitIndex(index);
  return MILESTONE_U[from] + (MILESTONE_U[to] - MILESTONE_U[from]) * frac;
}

const tmpSide = new Vector3();

// Ponto do navio no índice, com a faixa lateral de subida (cheia até o fundeio, zero no berço).
export function lanePoint(shipId: ShipId, index: number, target = new Vector3()): Vector3 {
  pointAtIndex(index, target);
  const f = Math.min(1, Math.max(0, 3 - index));
  if (f > 0) target.addScaledVector(rightOf(uAtIndex(index), tmpSide), INBOUND_LANE[shipId] * f);
  return target;
}

// ---------------------------------------------------------------------------
// Pose do casco

export interface ShipPose {
  visible: boolean;
  atSea: boolean; // na fila do Atlântico (o rótulo vai para a esquerda, para não cobrir a fila)
  position: Vector3; // y = 0; o componente soma waterY
  yaw: number; // rotação em torno de y; 0 = proa para +x
}

const tmpDir = new Vector3();
const tmpA = new Vector3();
const tmpB = new Vector3();

function yawOf(dir: Vector3): number {
  return Math.atan2(-dir.z, dir.x);
}

function upstreamYaw(u: number): number {
  return yawOf(corridorCurve.getTangentAt(Math.min(Math.max(u, 0), 1), tmpDir));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export interface PoseContext {
  forecast: ShipForecast;
  anchorSlot: number | undefined;
  seaRank: number | undefined;
  t: number;
}

export function shipPose(pos: ShipPosition, ctx: PoseContext, out: ShipPose): ShipPose {
  const { forecast: fc, t } = ctx;
  out.visible = true;
  out.atSea = false;
  const { index } = pos;

  if (pos.status === 'done' && index >= MILESTONES.length - 1) {
    out.visible = false;
    return out;
  }

  if (pos.status === 'pending' && ctx.seaRank !== undefined) {
    const tStart = MILESTONES.map((m) => fc.milestones[m]?.p50).find((v) => v !== undefined)!;
    const slot = SEA_QUEUE_SLOTS[ctx.seaRank]!;
    const entry = lanePoint(fc.shipId, index, tmpA);
    const f = clamp01((t - (tStart - PENDING_MOVE_H)) / PENDING_MOVE_H);
    out.position.lerpVectors(slot, entry, f);
    out.atSea = f < 0.5;
    out.yaw = f > 0 ? yawOf(tmpDir.subVectors(entry, slot)) : yawOf(tmpDir.subVectors(BARRA, slot));
    return out;
  }

  const arr = fc.milestones.FUNDEIO_TROMBETAS?.p50;
  const berthT = fc.milestones.ATRACACAO?.p50;
  if (index >= 2 && index < 3 && ctx.anchorSlot !== undefined && arr !== undefined && berthT !== undefined) {
    const move = Math.min(ANCHOR_MOVE_H, (berthT - arr) / 2);
    const slot = ANCHORAGE_SLOTS[ctx.anchorSlot]!;
    const fundeioU = MILESTONE_U.FUNDEIO_TROMBETAS;
    out.yaw = upstreamYaw(fundeioU);
    if (move <= 0) {
      out.position.copy(slot);
    } else if (t < arr + move) {
      out.position.lerpVectors(lanePoint(fc.shipId, 2, tmpA), slot, clamp01((t - arr) / move));
    } else if (t > berthT - move) {
      out.position.lerpVectors(slot, pointAtIndex(3, tmpB), clamp01((t - (berthT - move)) / move));
    } else {
      out.position.copy(slot);
    }
    return out;
  }

  lanePoint(fc.shipId, index, out.position);
  const u = uAtIndex(index);
  // Na descida (FIM_CARGA a SAIDA_BARRA) a proa aponta para a barra.
  out.yaw = index > MILESTONES.indexOf('FIM_CARGA') ? upstreamYaw(u) + Math.PI : upstreamYaw(u);
  return out;
}

export function newPose(): ShipPose {
  return { visible: false, atSea: false, position: new Vector3(), yaw: 0 };
}

// ---------------------------------------------------------------------------
// Faixa de incerteza

export const RIBBON_SEGMENTS = 40;
export const RIBBON_WIDTH = 0.9;
export const RIBBON_MIN_SPAN = 0.002; // em índice; abaixo disso a faixa some

const ribbonPts = Array.from({ length: RIBBON_SEGMENTS + 1 }, () => new Vector3());

// Escreve a faixa do navio (RIBBON_SEGMENTS + 1 pares de vértices) em `positions`, a partir do
// vértice `offset`, com y = `y`. Faixa vazia (escondida ou sem incerteza) vira um ponto degenerado.
export function writeRibbon(
  positions: Float32Array,
  offset: number,
  pos: ShipPosition,
  visible: boolean,
  y: number,
): boolean {
  const span = pos.p10Index - pos.p90Index;
  const show = visible && span > RIBBON_MIN_SPAN;
  const pts = ribbonPts;
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const idx = show ? pos.p90Index + (span * i) / RIBBON_SEGMENTS : pos.index;
    lanePoint(pos.shipId, idx, pts[i]);
  }
  const h = show ? RIBBON_WIDTH / 2 : 0;
  for (let i = 0; i <= RIBBON_SEGMENTS; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(RIBBON_SEGMENTS, i + 1)]!;
    tmpDir.subVectors(b, a);
    // Trecho parado no berço (índices 3 a 5 caem todos em u = 1): usa a tangente da curva.
    if (tmpDir.lengthSq() < 1e-10) corridorCurve.getTangentAt(uAtIndex(pos.index), tmpDir);
    tmpDir.setY(0).normalize();
    // lado: perpendicular no plano XZ
    const sx = -tmpDir.z * h;
    const sz = tmpDir.x * h;
    const p = pts[i]!;
    const k = (offset + i * 2) * 3;
    positions[k] = p.x - sx;
    positions[k + 1] = y;
    positions[k + 2] = p.z - sz;
    positions[k + 3] = p.x + sx;
    positions[k + 4] = y;
    positions[k + 5] = p.z + sz;
  }
  return show;
}
