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

  it('água desce quando o nível desce', () => {
    expect(waterY(11.7)).toBeLessThan(waterY(12.3));
  });
});
