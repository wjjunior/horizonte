import { describe, expect, it } from 'vitest';
import { SHOTS } from '../scene/shots.ts';
import {
  BEATS,
  RECORD_TOTAL_S,
  TIME_TRANSITION_S,
  beatByNumber,
  clampBeat,
  parseDemoParams,
  recordBeatAt,
  transitionT,
} from './beats.ts';

describe('BEATS', () => {
  it('tem os 5 beats em ordem, numerados de 1 a 5', () => {
    expect(BEATS.map((b) => b.n)).toEqual([1, 2, 3, 4, 5]);
  });

  it('segue a tabela do docs/beats.md', () => {
    expect(BEATS.map((b) => [b.shot, b.t, b.scenarioId, b.shipId, b.recordSeconds])).toEqual([
      ['overview', 0, 'base', null, 4],
      ['overview', 0, 'base', 'C', 5],
      ['port', 72, 'base', 'D', 5],
      ['yard', 120, 'base', null, 6],
      ['yard', 120, 'A', 'D', 13],
    ]);
  });

  it('o tempo simulado nunca volta', () => {
    for (let i = 1; i < BEATS.length; i++) expect(BEATS[i].t).toBeGreaterThanOrEqual(BEATS[i - 1].t);
  });

  it('usa só tomadas que existem', () => {
    for (const b of BEATS) expect(SHOTS[b.shot]).toBeDefined();
  });

  it('o ?record=1 dura no máximo 40 s', () => {
    expect(RECORD_TOTAL_S).toBe(33);
    expect(RECORD_TOTAL_S).toBeLessThanOrEqual(40);
  });

  it('cada beat dura mais que a transição do relógio', () => {
    for (const b of BEATS) expect(b.recordSeconds).toBeGreaterThan(TIME_TRANSITION_S);
  });
});

describe('clampBeat / beatByNumber', () => {
  it('limita a 1..5', () => {
    expect(clampBeat(0)).toBe(1);
    expect(clampBeat(9)).toBe(5);
    expect(beatByNumber(3).shot).toBe('port');
  });
});

describe('recordBeatAt', () => {
  it('troca de beat nas fronteiras das durações', () => {
    expect(recordBeatAt(0)).toEqual({ n: 1, sinceStart: 0 });
    expect(recordBeatAt(3.99).n).toBe(1);
    expect(recordBeatAt(4)).toEqual({ n: 2, sinceStart: 0 });
    expect(recordBeatAt(9)).toEqual({ n: 3, sinceStart: 0 });
    expect(recordBeatAt(14).n).toBe(4);
    expect(recordBeatAt(20)).toEqual({ n: 5, sinceStart: 0 });
  });

  it('fica no último beat depois do fim', () => {
    expect(recordBeatAt(RECORD_TOTAL_S + 10).n).toBe(5);
  });
});

describe('transitionT', () => {
  it('vai de from a to e para', () => {
    expect(transitionT(0, 72, 0)).toBe(0);
    expect(transitionT(0, 72, TIME_TRANSITION_S / 2)).toBeCloseTo(36);
    expect(transitionT(0, 72, TIME_TRANSITION_S)).toBe(72);
    expect(transitionT(0, 72, 99)).toBe(72);
  });
});

describe('parseDemoParams', () => {
  it('lê record e beat', () => {
    expect(parseDemoParams('')).toEqual({ record: false, beat: null });
    expect(parseDemoParams('?record=1')).toEqual({ record: true, beat: null });
    expect(parseDemoParams('?beat=3&still=1')).toEqual({ record: false, beat: 3 });
    expect(parseDemoParams('?beat=12')).toEqual({ record: false, beat: 5 });
    expect(parseDemoParams('?beat=x')).toEqual({ record: false, beat: null });
  });
});
