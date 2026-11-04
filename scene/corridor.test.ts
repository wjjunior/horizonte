import { describe, expect, it } from 'vitest';
import { MILESTONES } from '../docs/schema.ts';
import {
  ANCHORAGE_SLOTS,
  BERTH_POSITION,
  corridorCurve,
  MILESTONE_U,
  OUTBOUND_LANE_OFFSET,
  PLACE_U,
  PLACES,
  pointAt,
  pointAtIndex,
  rightOf,
} from './corridor.ts';
import { waterY } from './river.ts';

describe('corredor', () => {
  it('lugares em ordem ao longo da curva', () => {
    const us = PLACES.map((p) => PLACE_U[p.id]);
    expect(us[0]).toBe(0);
    expect(us[us.length - 1]).toBeCloseTo(1, 6);
    for (let i = 1; i < us.length; i++) expect(us[i]!).toBeGreaterThan(us[i - 1]!);
  });

  it('marcos de subida em ordem e descida volta à Barra Norte', () => {
    const up = MILESTONES.slice(0, 6).map((m) => MILESTONE_U[m]);
    for (let i = 1; i < up.length; i++) expect(up[i]!).toBeGreaterThanOrEqual(up[i - 1]!);
    expect(MILESTONE_U.SAIDA_BARRA).toBe(0);
  });

  it('pointAtIndex nos índices inteiros cai no pointAt do marco', () => {
    MILESTONES.slice(0, 6).forEach((m, i) => {
      expect(pointAtIndex(i).distanceTo(pointAt(m))).toBeLessThan(1e-6);
    });
    // SAIDA_BARRA (índice 6) fica na faixa de descida, ao lado do ponto da curva.
    expect(pointAtIndex(6).distanceTo(pointAt('SAIDA_BARRA'))).toBeCloseTo(OUTBOUND_LANE_OFFSET, 6);
    expect(BERTH_POSITION.distanceTo(pointAt('ATRACACAO'))).toBeLessThan(1e-6);
  });

  it('descida vai para a faixa da direita', () => {
    const mid = pointAtIndex(5.5);
    const u = (MILESTONE_U.FIM_CARGA + MILESTONE_U.SAIDA_BARRA) / 2;
    const center = corridorCurve.getPointAt(u);
    expect(mid.distanceTo(center)).toBeCloseTo(OUTBOUND_LANE_OFFSET, 6);
  });

  it('três posições de fundeio distintas', () => {
    expect(ANCHORAGE_SLOTS).toHaveLength(3);
    expect(ANCHORAGE_SLOTS[0]!.distanceTo(ANCHORAGE_SLOTS[1]!)).toBeGreaterThan(1);
  });

  // WAG-751: o Trombetas corre de leste para oeste em frente ao porto, que fica na margem sul.
  it('o último trecho chega ao berço subindo para oeste, com a terra ao sul', () => {
    expect(corridorCurve.getTangentAt(1).x).toBeLessThan(-0.95);
    expect(rightOf(1).multiplyScalar(-1).z).toBeGreaterThan(0.9);
  });

  it('fundeio a jusante (leste) do berço, sem encostar no navio atracado; vaga 2 é a mais perto', () => {
    for (const s of ANCHORAGE_SLOTS) {
      expect(s.x).toBeGreaterThan(BERTH_POSITION.x);
      expect(s.distanceTo(BERTH_POSITION)).toBeGreaterThan(3.5);
    }
    const d = ANCHORAGE_SLOTS.map((s) => s.distanceTo(BERTH_POSITION));
    expect(d[2]!).toBeLessThan(d[1]!);
    expect(d[1]!).toBeLessThan(d[0]!);
  });

  it('água desce quando o nível desce', () => {
    expect(waterY(11.7)).toBeLessThan(waterY(12.3));
  });
});
