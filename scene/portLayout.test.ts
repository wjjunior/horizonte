import { describe, expect, it } from 'vitest';
import { ANCHORAGE_SLOTS } from './corridor.ts';
import {
  buildStructures,
  CLEARINGS,
  inClearing,
  MOORING_BUOYS,
  PIER,
  PILE_LAYOUT,
  southBankZ,
  toLocal,
  toWorld,
  treeTransforms,
} from './portLayout.ts';
import { waterDistance } from './river.ts';

// WAG-751: layout do porto inspirado na planta real. Referencial local: origem no berço,
// +x a jusante (leste), +z para a terra (sul).
describe('layout do porto', () => {
  it('toWorld e toLocal são inversos', () => {
    const w = toWorld(3, 7);
    const l = toLocal(w.x, w.z);
    expect(l.x).toBeCloseTo(3, 6);
    expect(l.z).toBeCloseTo(7, 6);
  });

  it('a plataforma do shiploader fica entre o navio e a margem sul, e a ponte chega à margem', () => {
    const bank = southBankZ(PIER.x);
    expect(PIER.platformZ).toBeGreaterThan(0.4); // costado do navio (boca 0,8)
    expect(PIER.platformZ).toBeLessThan(bank);
    expect(PIER.rootZ).toBeGreaterThan(bank);
  });

  it('a mata é determinística, fora d’água e fora das clareiras', () => {
    const a = treeTransforms();
    expect(a.length).toBeGreaterThan(250);
    expect(treeTransforms()).toEqual(a);
    for (const t of a) {
      expect(waterDistance(t.x, t.z)).toBeGreaterThan(0.5);
      const l = toLocal(t.x, t.z);
      expect(inClearing(l.x, l.z)).toBe(false);
    }
  });

  it('nenhuma árvore em cima do fundeio, do berço ou das pilhas', () => {
    const near = (x: number, z: number, r: number) => treeTransforms().some((t) => Math.hypot(t.x - x, t.z - z) < r);
    for (const s of ANCHORAGE_SLOTS) expect(near(s.x, s.z, 2)).toBe(false);
    for (const p of PILE_LAYOUT) {
      const w = toWorld(p.x, p.z);
      expect(near(w.x, w.z, 2)).toBe(false);
    }
    expect(CLEARINGS.length).toBeGreaterThan(3);
  });

  it('pilhas seca e úmida em terra, longas e paralelas (noroeste a sudeste)', () => {
    expect(PILE_LAYOUT.map((p) => p.pile).sort()).toEqual(['seca', 'umida']);
    for (const p of PILE_LAYOUT) {
      const w = toWorld(p.x, p.z);
      expect(waterDistance(w.x, w.z)).toBeGreaterThan(1);
      expect(p.len).toBeGreaterThan(p.depth);
      expect(p.rotY).toBeCloseTo(-Math.PI / 4, 6);
    }
  });

  it('boias de amarração na água, uma de cada lado do navio', () => {
    expect(MOORING_BUOYS).toHaveLength(2);
    for (const b of MOORING_BUOYS) expect(waterDistance(b.x, b.z)).toBeLessThan(0);
    const xs = MOORING_BUOYS.map((b) => toLocal(b.x, b.z).x);
    expect(Math.min(...xs)).toBeLessThan(-1.5);
    expect(Math.max(...xs)).toBeGreaterThan(1.5);
  });

  it('estruturas estáticas num só BufferGeometry com cor por vértice', () => {
    const g = buildStructures();
    expect(g.getAttribute('position').count).toBeGreaterThan(100);
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
    expect(g.getAttribute('normal').count).toBe(g.getAttribute('position').count);
  });
});
