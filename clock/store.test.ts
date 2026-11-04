import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseScenarioFile } from '../data/loader.ts';
import { shipAt, yardAt } from '../data/selectors.ts';
import { activeScenario, INITIAL_CLOCK, T_MAX, useClock } from './store.ts';

const file = parseScenarioFile(JSON.parse(readFileSync('docs/scenario.example.json', 'utf8')));
const clock = () => useClock.getState();

beforeEach(() => {
  useClock.setState(INITIAL_CLOCK);
});

describe('relógio', () => {
  it('tick só avança tocando, na velocidade dada', () => {
    clock().tick(1);
    expect(clock().t).toBe(0);
    clock().setSpeed(10);
    clock().play();
    clock().tick(0.5);
    expect(clock().t).toBe(5);
    clock().pause();
    clock().tick(1);
    expect(clock().t).toBe(5);
  });

  it('para sozinho em D10', () => {
    clock().seek(T_MAX - 1);
    clock().play();
    clock().tick(10);
    expect(clock().t).toBe(T_MAX);
    expect(clock().playing).toBe(false);
  });

  it('scrub limitado de D0 a D10', () => {
    clock().seek(-30);
    expect(clock().t).toBe(0);
    clock().seek(999);
    expect(clock().t).toBe(T_MAX);
    clock().seek(72);
    expect(clock().t).toBe(72);
  });

  it('togglePlay alterna', () => {
    clock().togglePlay();
    expect(clock().playing).toBe(true);
    clock().togglePlay();
    expect(clock().playing).toBe(false);
  });

  it('guarda navio selecionado e beat', () => {
    clock().selectShip('C');
    clock().setBeat(3);
    expect(clock()).toMatchObject({ selectedShipId: 'C', beat: 3 });
  });
});

describe('cenário ativo', () => {
  it('null até o arquivo carregar', () => {
    expect(activeScenario(clock())).toBeNull();
  });

  it('trocar o cenário no store muda as posições retornadas', () => {
    clock().setFile(file);
    clock().seek(76);
    const read = () => {
      const sc = activeScenario(clock())!;
      return { d: shipAt(sc, 'D', clock().t)!.index, dry: yardAt(sc, 120).seca.pct.p50 };
    };

    const base = read();
    clock().setScenario('A');
    const a = read();

    expect(a.d).not.toBe(base.d);
    expect(a.d).toBe(3); // no A, D já atracou em t = 76
    expect(a.dry).toBeLessThan(base.dry);

    clock().setScenario('base');
    expect(read()).toEqual(base);
  });
});
