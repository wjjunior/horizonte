import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseScenarioFile } from './loader.ts';
import { riverAt, scenarioById, shipAt, shipsAt, splitIndex, yardAt } from './selectors.ts';

const file = parseScenarioFile(JSON.parse(readFileSync('docs/scenario.example.json', 'utf8')));
const base = scenarioById(file, 'base');
const A = scenarioById(file, 'A');

// Índices na ordem de MILESTONES.
const FUNDEIO = 2;
const ATRACACAO = 3;
const FIM_CARGA = 5;

describe('shipAt', () => {
  it('interpola linearmente entre os P50 dos marcos presentes', () => {
    // Navio D no base: FUNDEIO p50 = 72, ATRACACAO p50 = 96. Metade do caminho em t = 84.
    const d = shipAt(base, 'D', 84)!;
    expect(d.status).toBe('underway');
    expect(d.index).toBeCloseTo(FUNDEIO + 0.5);
  });

  it('pula marcos ausentes: A vai de ATRACACAO (3) a FIM_CARGA (5)', () => {
    // A no base: ATRACACAO p50 = -10, FIM_CARGA p50 = 32. t = 11 é a metade.
    expect(shipAt(base, 'A', 11)!.index).toBeCloseTo((ATRACACAO + FIM_CARGA) / 2);
  });

  it('P10 fica à frente e P90 atrás do P50', () => {
    // D em t = 84: no P10 (70 -> 80) já atracou; no P90 (76 -> 110) está em 2 + 8/34.
    const d = shipAt(base, 'D', 84)!;
    expect(d.p10Index).toBe(ATRACACAO);
    expect(d.p90Index).toBeCloseTo(FUNDEIO + 8 / 34);
    expect(d.p90Index).toBeLessThanOrEqual(d.index);
    expect(d.index).toBeLessThanOrEqual(d.p10Index);
  });

  it('antes do primeiro marco: pending, preso no primeiro marco', () => {
    const d = shipAt(base, 'D', 10)!;
    expect(d).toEqual({ shipId: 'D', status: 'pending', index: FUNDEIO, p10Index: FUNDEIO, p90Index: FUNDEIO });
  });

  it('depois do último marco: done, preso no último marco', () => {
    const d = shipAt(base, 'D', 200)!;
    expect(d.status).toBe('done');
    expect([d.index, d.p10Index, d.p90Index]).toEqual([ATRACACAO, ATRACACAO, ATRACACAO]);
  });

  it('navio com um marco só fica parado nele', () => {
    // C no base só tem FUNDEIO (p50 = 86).
    expect(shipAt(base, 'C', 50)).toMatchObject({ status: 'pending', index: FUNDEIO });
    expect(shipAt(base, 'C', 86)).toMatchObject({ status: 'underway', index: FUNDEIO });
    expect(shipAt(base, 'C', 90)).toMatchObject({ status: 'done', index: FUNDEIO });
  });

  it('é determinístico', () => {
    expect(shipsAt(base, 84)).toEqual(shipsAt(base, 84));
  });

  it('o cenário muda a posição: no A, D atraca antes', () => {
    // t = 76: no A, D já atracou (p50 = 76); no base ainda está a caminho do berço.
    expect(shipAt(A, 'D', 76)!.index).toBe(ATRACACAO);
    expect(shipAt(base, 'D', 76)!.index).toBeLessThan(ATRACACAO);
  });
});

describe('shipsAt', () => {
  it('devolve os 7 navios na ordem das previsões', () => {
    expect(shipsAt(base, 0).map((p) => p.shipId)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });
});

describe('splitIndex', () => {
  it('quebra o índice nos marcos vizinhos', () => {
    expect(splitIndex(2.25)).toEqual({ from: 'FUNDEIO_TROMBETAS', to: 'ATRACACAO', frac: 0.25 });
    expect(splitIndex(6)).toEqual({ from: 'FIM_CARGA', to: 'SAIDA_BARRA', frac: 1 });
    expect(splitIndex(0)).toEqual({ from: 'BARRA_NORTE', to: 'FAZENDINHA', frac: 0 });
  });
});

describe('yardAt', () => {
  it('interpola o estoque e calcula a % da capacidade', () => {
    // Seco no base: 750 kt em t = 0, 920 kt em t = 120, capacidade 1000.
    const y = yardAt(base, 60);
    expect(y.seca.kt.p50).toBeCloseTo(835);
    expect(y.seca.pct.p50).toBeCloseTo(83.5);
    expect(y.seca.capacityKt).toBe(1000);
    expect(y.umida.pct.p50).toBeCloseTo((345 / 600) * 100);
  });

  it('fora da série, vale o ponto da ponta', () => {
    expect(yardAt(base, 200).seca.pct).toEqual({ p10: 86, p50: 92, p90: 97 });
    expect(yardAt(base, -5).seca.kt).toEqual({ p10: 700, p50: 750, p90: 800 });
  });

  it('o cenário muda o pátio: no A, o seco fica abaixo de 80% em D+5', () => {
    expect(yardAt(A, 120).seca.pct.p50).toBeLessThan(80);
    expect(yardAt(base, 120).seca.pct.p50).toBeGreaterThan(90);
  });
});

describe('riverAt', () => {
  it('interpola o nível em Óbidos e expõe o calado limite', () => {
    const r = riverAt(base, 60);
    expect(r.levelM.p50).toBeCloseTo(12.025);
    expect(r.levelM.p10).toBeCloseTo(11.9);
    expect(r.draftLimitM).toBe(11.7);
  });
});
