import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scenarioById, shipAt } from '../data/selectors.ts';
import { ScenarioFileSchema } from '../docs/schema.ts';
import type { ShipForecast, ShipId } from '../docs/schema.ts';
import { ANCHORAGE_SLOTS, BERTH_POSITION } from './corridor.ts';
import {
  assignAnchorageSlots,
  newPose,
  RIBBON_SEGMENTS,
  SEA_QUEUE_SLOTS,
  seaQueueRanks,
  shipPose,
  statusColor,
  writeRibbon,
} from './ships.ts';

const q = (p50: number) => ({ p10: p50, p50, p90: p50 });
const fc = (shipId: ShipId, ms: ShipForecast['milestones']): ShipForecast => ({
  shipId,
  milestones: ms,
  pDelay: { gt12h: 0, gt24h: 0, gt48h: 0 },
});

const file = ScenarioFileSchema.parse(JSON.parse(readFileSync(new URL('../public/scenario.json', import.meta.url), 'utf8')));
const base = scenarioById(file, 'base');
const scA = scenarioById(file, 'A');

describe('statusColor', () => {
  it('vermelho quando P(atraso > 24 h) >= 50%', () => {
    expect(statusColor({ gt12h: 1, gt24h: 0.5, gt48h: 0 })).toBe('red');
  });
  it('âmbar quando P(atraso > 12 h) >= 15% e não é vermelho', () => {
    expect(statusColor({ gt12h: 0.15, gt24h: 0.49, gt48h: 0 })).toBe('amber');
  });
  it('verde abaixo dos dois limiares', () => {
    expect(statusColor({ gt12h: 0.14, gt24h: 0.1, gt48h: 0 })).toBe('green');
  });
  it('no base, o C sai vermelho', () => {
    const c = base.forecasts.find((f) => f.shipId === 'C')!;
    expect(statusColor(c.pDelay)).toBe('red');
  });
});

describe('assignAnchorageSlots', () => {
  it('primeiro a chegar pega a vaga mais perto do berço; quem chega com ela ocupada pega a próxima', () => {
    const slots = assignAnchorageSlots([
      fc('D', { FUNDEIO_TROMBETAS: q(74), ATRACACAO: q(115) }),
      fc('C', { FUNDEIO_TROMBETAS: q(88), ATRACACAO: q(90) }),
    ]);
    expect(slots.get('D')).toBe(2);
    expect(slots.get('C')).toBe(1);
  });
  it('vaga liberada na atracação volta a ser usada', () => {
    const slots = assignAnchorageSlots([
      fc('A', { FUNDEIO_TROMBETAS: q(10), ATRACACAO: q(20) }),
      fc('B', { FUNDEIO_TROMBETAS: q(30), ATRACACAO: q(40) }),
    ]);
    expect(slots.get('A')).toBe(2);
    expect(slots.get('B')).toBe(2);
  });
  it('sem vaga livre (4 ao mesmo tempo), o quarto fica sem vaga', () => {
    const ids: ShipId[] = ['A', 'B', 'C', 'D'];
    const slots = assignAnchorageSlots(ids.map((id, i) => fc(id, { FUNDEIO_TROMBETAS: q(i), ATRACACAO: q(100) })));
    expect([slots.get('A'), slots.get('B'), slots.get('C')]).toEqual([2, 1, 0]);
    expect(slots.has('D')).toBe(false);
  });
  it('ignora navio sem os dois marcos', () => {
    expect(assignAnchorageSlots([fc('A', { ATRACACAO: q(5) })]).size).toBe(0);
  });
});

describe('seaQueueRanks', () => {
  it('ordena pelo P50 do primeiro marco e ignora quem já entrou antes de t0', () => {
    const ranks = seaQueueRanks([
      fc('A', { BARRA_NORTE: q(-10) }),
      fc('E', { BARRA_NORTE: q(88) }),
      fc('C', { BARRA_NORTE: q(20) }),
      fc('D', { BARRA_NORTE: q(20) }),
    ]);
    expect([...ranks.entries()]).toEqual([
      ['C', 0],
      ['D', 1],
      ['E', 2],
    ]);
  });
});

function poseOf(sc: typeof base, id: ShipId, t: number) {
  const f = sc.forecasts.find((x) => x.shipId === id)!;
  const sp = shipAt(sc, id, t)!;
  return shipPose(
    sp,
    { forecast: f, anchorSlot: assignAnchorageSlots(sc.forecasts).get(id), seaRank: seaQueueRanks(sc.forecasts).get(id), t },
    newPose(),
  );
}

describe('shipPose no scenario.json', () => {
  it('em D0 os 7 navios estão visíveis, os pendentes na fila do Atlântico', () => {
    const ids: ShipId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    expect(ids.every((id) => poseOf(base, id, 0).visible)).toBe(true);
    expect(poseOf(base, 'C', 0).position.distanceTo(SEA_QUEUE_SLOTS[0]!)).toBeLessThan(1e-6);
  });
  it('no base, em D+3 com folga (t = 80), o D está fundeado numa vaga e o berço está vazio', () => {
    const d = poseOf(base, 'D', 80);
    expect(ANCHORAGE_SLOTS.some((s) => s.distanceTo(d.position) < 1e-6)).toBe(true);
  });
  it('no cenário A, em t = 80, o D já está no berço', () => {
    expect(poseOf(scA, 'D', 80).position.distanceTo(BERTH_POSITION)).toBeLessThan(1e-6);
  });
  it('depois da saída pela barra o navio some', () => {
    expect(poseOf(base, 'A', 120).visible).toBe(false);
  });
  it('determinístico: mesma entrada, mesma pose', () => {
    expect(poseOf(base, 'C', 36).position.toArray()).toEqual(poseOf(base, 'C', 36).position.toArray());
  });
});

describe('writeRibbon', () => {
  it('a faixa do C se alonga entre D+0,5 e D+1,5', () => {
    const len = (t: number) => {
      const sp = shipAt(base, 'C', t)!;
      const arr = new Float32Array((RIBBON_SEGMENTS + 1) * 2 * 3);
      writeRibbon(arr, 0, sp, true, 0);
      const last = RIBBON_SEGMENTS * 2 * 3;
      return Math.hypot(arr[last]! - arr[0]!, arr[last + 2]! - arr[2]!);
    };
    expect(len(36)).toBeGreaterThan(len(12));
    expect(len(36)).toBeGreaterThan(1);
  });
  it('navio escondido não desenha faixa', () => {
    const sp = shipAt(base, 'C', 36)!;
    expect(writeRibbon(new Float32Array((RIBBON_SEGMENTS + 1) * 6), 0, sp, false, 0)).toBe(false);
  });
});
