import { describe, expect, it } from 'vitest';
import { ANCHORAGE_SLOTS, BERTH_POSITION, rightOf } from './corridor.ts';
import { waterDistance } from './river.ts';

// WAG-751: o leito no porto segue rio acima além do berço, com o porto na margem sul.
describe('leito do rio no porto', () => {
  it('o berço e as vagas de fundeio ficam dentro d’água', () => {
    expect(waterDistance(BERTH_POSITION.x, BERTH_POSITION.z)).toBeLessThan(-1);
    for (const s of ANCHORAGE_SLOTS) expect(waterDistance(s.x, s.z)).toBeLessThan(-0.8);
  });

  it('o rio continua a oeste do berço (não termina no porto)', () => {
    expect(waterDistance(BERTH_POSITION.x - 15, BERTH_POSITION.z - 1)).toBeLessThan(0);
  });

  it('a margem sul fica perto do berço, e ao sul dela é terra', () => {
    const land = BERTH_POSITION.clone().addScaledVector(rightOf(1), -5);
    expect(waterDistance(land.x, land.z)).toBeGreaterThan(0.5);
  });
});
