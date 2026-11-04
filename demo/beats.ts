// Roteiro dos 5 beats do 3D (WAG-740). Fonte da verdade: docs/beats.md, seção
// "Beats do 3D para demo/beats.ts". Só dados e funções puras; nada de Math.random.

import type { ScenarioId, ShipId } from '../docs/schema.ts';
import type { ShotName } from '../scene/shots.ts';

export interface Beat {
  n: number; // 1 a 5
  shot: ShotName;
  t: number; // horas desde T0 (06h00 de D0)
  scenarioId: ScenarioId;
  shipId: ShipId | null; // navio em destaque (anel ocre)
  recordSeconds: number; // duração no ?record=1, com a transição de câmera incluída
  caption: string; // fala de apoio do beat
}

export const BEATS: readonly Beat[] = [
  {
    n: 1,
    shot: 'overview',
    t: 0,
    scenarioId: 'base',
    shipId: null,
    recordSeconds: 4,
    caption: 'O corredor inteiro, cada navio com a sua faixa.',
  },
  {
    n: 2,
    shot: 'overview',
    t: 0,
    scenarioId: 'base',
    shipId: 'C',
    recordSeconds: 5,
    caption: 'O C, em vermelho, com a faixa esticada.',
  },
  {
    n: 3,
    shot: 'port',
    t: 72,
    scenarioId: 'base',
    shipId: 'D',
    recordSeconds: 5,
    caption: 'Três dias depois: o berço parado esperando o C, e o D fundeado ao lado.',
  },
  {
    n: 4,
    shot: 'yard',
    t: 120,
    scenarioId: 'base',
    shipId: null,
    recordSeconds: 6,
    caption: 'Em D+5, a pilha de seco a 92%, e o rio baixando na régua.',
  },
  {
    n: 5,
    shot: 'yard',
    t: 120,
    scenarioId: 'A',
    shipId: 'D',
    recordSeconds: 13,
    caption: 'Com a decisão A, a fila se desfaz e a pilha fica abaixo de 80%.',
  },
];

export const BEAT_COUNT = BEATS.length;
export const RECORD_TOTAL_S = BEATS.reduce((sum, b) => sum + b.recordSeconds, 0);

// Tempo, em segundos reais, que o relógio leva para ir do t do beat anterior ao t do novo.
export const TIME_TRANSITION_S = 2.5;

export function clampBeat(n: number): number {
  return Math.min(Math.max(Math.round(n), 1), BEAT_COUNT);
}

export function beatByNumber(n: number): Beat {
  return BEATS[clampBeat(n) - 1];
}

// Beat em que o ?record=1 está após `elapsed` segundos. Depois do fim, fica no último.
export function recordBeatAt(elapsed: number): { n: number; sinceStart: number } {
  let start = 0;
  for (const b of BEATS) {
    if (elapsed < start + b.recordSeconds) return { n: b.n, sinceStart: Math.max(0, elapsed - start) };
    start += b.recordSeconds;
  }
  const last = BEATS[BEAT_COUNT - 1];
  return { n: last.n, sinceStart: elapsed - (start - last.recordSeconds) };
}

// Tempo simulado durante a transição entre beats: smoothstep de `from` para `to` em TIME_TRANSITION_S.
export function transitionT(from: number, to: number, sinceStart: number): number {
  const x = Math.min(Math.max(sinceStart / TIME_TRANSITION_S, 0), 1);
  return from + (to - from) * x * x * (3 - 2 * x);
}

export interface DemoParams {
  record: boolean;
  beat: number | null; // &beat=N, já limitado a 1..5
}

export function parseDemoParams(search: string): DemoParams {
  const q = new URLSearchParams(search);
  const raw = q.get('beat');
  const n = raw === null ? NaN : Number(raw);
  return { record: q.get('record') === '1', beat: Number.isFinite(n) ? clampBeat(n) : null };
}
