// Seletores puros sobre o cenário ativo (WAG-734).
// Recebem o cenário e t (horas desde T0) e não guardam estado: mesmo t, mesmo resultado.
// Nada de Math.random nem Date.now aqui.

import { MILESTONES } from '../docs/schema.ts';
import type { Milestone, Quantiles, Scenario, ScenarioFile, ScenarioId, ShipForecast, ShipId } from '../docs/schema.ts';

export function scenarioById(file: ScenarioFile, id: ScenarioId): Scenario {
  const sc = file.scenarios.find((s) => s.id === id);
  if (!sc) throw new Error(`cenário ${id} não encontrado no scenario.json`);
  return sc;
}

// ---------------------------------------------------------------------------
// Navios

// Posição agnóstica de curva: índice fracionário na ordem de MILESTONES
// (0 = BARRA_NORTE, 6 = SAIDA_BARRA). 2,5 = metade do caminho entre o fundeio e a atracação.
//
// - `index`: posição no P50, interpolação linear entre os P50 dos marcos presentes.
// - `p10Index` / `p90Index`: a mesma interpolação sobre os horários P10 (navio adiantado,
//   mais à frente) e P90 (atrasado, mais atrás). É o segmento de incerteza; p90Index <= p10Index.
// - `status`, decidido pelo P50:
//   - 'pending': t antes do P50 do primeiro marco presente. Índices presos no primeiro marco.
//   - 'underway': entre o primeiro e o último marco presente.
//   - 'done': t depois do P50 do último marco presente. Índices presos no último marco
//     (sem dado além dele; se o último for SAIDA_BARRA, o navio já saiu).
//   A cena decide o que desenhar em cada status (ex.: esconder 'done' em SAIDA_BARRA).
export type ShipStatus = 'pending' | 'underway' | 'done';

export interface ShipPosition {
  shipId: ShipId;
  status: ShipStatus;
  index: number;
  p10Index: number;
  p90Index: number;
}

interface Knot {
  t: number;
  index: number;
}

// Interpolação de t -> índice sobre nós ordenados por índice. Os horários passam por um
// máximo acumulado para nunca voltar no tempo (P10 e P90 não são checados em ordem pelo schema).
function indexAt(knots: Knot[], t: number): number {
  let prevT = -Infinity;
  const ks = knots.map((k) => ({ index: k.index, t: (prevT = Math.max(prevT, k.t)) }));
  const first = ks[0]!;
  const last = ks[ks.length - 1]!;
  if (t <= first.t) return first.index;
  if (t >= last.t) return last.index;
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1]!;
    const b = ks[i]!;
    if (t < b.t) return a.index + ((t - a.t) / (b.t - a.t)) * (b.index - a.index);
  }
  return last.index;
}

function knotsFor(fc: ShipForecast, q: keyof Quantiles): Knot[] {
  const ks: Knot[] = [];
  MILESTONES.forEach((m, index) => {
    const v = fc.milestones[m];
    if (v) ks.push({ t: v[q], index });
  });
  return ks;
}

function positionOf(fc: ShipForecast, t: number): ShipPosition | undefined {
  const p50 = knotsFor(fc, 'p50');
  if (p50.length === 0) return undefined;
  const status: ShipStatus = t < p50[0]!.t ? 'pending' : t > p50[p50.length - 1]!.t ? 'done' : 'underway';
  return {
    shipId: fc.shipId,
    status,
    index: indexAt(p50, t),
    p10Index: indexAt(knotsFor(fc, 'p10'), t),
    p90Index: indexAt(knotsFor(fc, 'p90'), t),
  };
}

// Posição de um navio em t. undefined se o navio não tem previsão ou nenhum marco.
export function shipAt(scenario: Scenario, shipId: ShipId, t: number): ShipPosition | undefined {
  const fc = scenario.forecasts.find((f) => f.shipId === shipId);
  return fc && positionOf(fc, t);
}

// Posição de todos os navios com ao menos um marco, na ordem de scenario.forecasts.
export function shipsAt(scenario: Scenario, t: number): ShipPosition[] {
  return scenario.forecasts.flatMap((fc) => positionOf(fc, t) ?? []);
}

// Quebra um índice fracionário nos dois marcos vizinhos, para mapear na curva:
// curve.getPointAt(lerp(u[from], u[to], frac)).
export function splitIndex(index: number): { from: Milestone; to: Milestone; frac: number } {
  const last = MILESTONES.length - 1;
  const i = Math.min(Math.max(index, 0), last);
  const lo = Math.min(Math.floor(i), last - 1);
  return { from: MILESTONES[lo]!, to: MILESTONES[lo + 1]!, frac: i - lo };
}

// ---------------------------------------------------------------------------
// Séries (pátio e rio)

// Interpolação linear entre os pontos; fora da série, vale o ponto da ponta.
function seriesAt(points: readonly ({ t: number } & Quantiles)[], t: number): Quantiles {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const pick = (p: Quantiles): Quantiles => ({ p10: p.p10, p50: p.p50, p90: p.p90 });
  if (t <= first.t) return pick(first);
  if (t >= last.t) return pick(last);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      return { p10: a.p10 + f * (b.p10 - a.p10), p50: a.p50 + f * (b.p50 - a.p50), p90: a.p90 + f * (b.p90 - a.p90) };
    }
  }
  return pick(last);
}

export interface YardReading {
  capacityKt: number;
  kt: Quantiles; // estoque em kt
  pct: Quantiles; // estoque em % da capacidade (0 a 100)
}

export type YardAt = Record<'seca' | 'umida', YardReading>;

export function yardAt(scenario: Scenario, t: number): YardAt {
  const read = (pile: 'seca' | 'umida'): YardReading => {
    const s = scenario.yard.find((y) => y.pile === pile)!; // o schema garante as duas pilhas
    const kt = seriesAt(s.points, t);
    const toPct = (v: number) => (v / s.capacityKt) * 100;
    return { capacityKt: s.capacityKt, kt, pct: { p10: toPct(kt.p10), p50: toPct(kt.p50), p90: toPct(kt.p90) } };
  };
  return { seca: read('seca'), umida: read('umida') };
}

export interface RiverReading {
  levelM: Quantiles; // nível em Óbidos, em m
  draftLimitM: number;
}

export function riverAt(scenario: Scenario, t: number): RiverReading {
  return { levelM: seriesAt(scenario.river.points, t), draftLimitM: scenario.river.draftLimitM };
}
