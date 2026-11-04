// Gerador do scenario.json (WAG-733).
//
// Monte Carlo de uma fila com berço único, calibrado para as metas da demo
// (CLAUDE.md e docs/beats.md). Parâmetros ilustrativos, dados sintéticos.
//
// Uso: node scripts/generate-scenario.ts
// Grava public/scenario.json, imprime os KPIs ao lado das metas e sai com
// código 1 se algum indicador ficar fora da tolerância.

import { mkdirSync, writeFileSync } from 'node:fs';
import { MILESTONES, SCENARIO_IDS, SHIP_IDS, ScenarioFileSchema } from '../docs/schema.ts';
import type {
  Cause,
  Milestone,
  Quantiles,
  Scenario,
  ScenarioFile,
  ScenarioId,
  Ship,
  ShipForecast,
  ShipId,
} from '../docs/schema.ts';

const SEED = 20261106;
const RUNS = 2000;
const TRAJECTORIES = 200;
const HORIZON_H = 240;
const STEP_H = 6;
const D5_H = 120;
const USD_PER_SHIP_DAY = 20_500;
const OUT_PATH = 'public/scenario.json';

// ---------------------------------------------------------------------------
// Parâmetros calibrados. Mexa aqui e rode de novo até os KPIs baterem.

const P = {
  // Pernas nominais do ciclo, em horas.
  barraToFazendinhaH: 12,
  inspectionH: 4, // praticagem e inspeção em Fazendinha, dentro do horário comercial
  fazendinhaToFundeioH: 36,
  fundeioToBerthH: 2, // manobra do fundeio ao berço
  berthToLoadH: 2,
  unberthH: 1, // berço livre 1 h depois do fim da carga
  loadToBarraH: 54,
  loadRateKtH: 2.3,

  // Ruído genérico.
  legNoiseSdH: 2,
  loadNoiseSd: 0.032, // fração da duração da carga
  tideMissP: 0.14, // chance de um navio qualquer perder a janela de maré
  inspectionOffHoursP: 0.21,
  inspectionOffHoursWaitH: [7, 17.5] as const,

  // Navio C: perde a janela de maré na Barra Norte e pega a inspeção fora do horário.
  tideWindowH: 12.4,
  cSecondWindowP: 0.84, // chance de perder também a janela seguinte
  cInspectionWaitH: [11.4, 24.1] as const,

  // Pátio, em kt.
  dryCapacityKt: 292,
  dryStartKt: [66.4, 11.9] as const, // média e desvio
  dryProductionKtH: [2.28, 0.175] as const, // média e desvio por rodada
  dryDailyNoiseSd: 0.041,
  // Com o galpão perto de cheio, a secagem desacelera: produção cai linearmente
  // de 100% em dryThrottleStart até zero na capacidade.
  dryThrottleStart: 0.891,
  scenarioBDryCut: 0.08,
  wetCapacityKt: 600,
  wetStartKt: [330, 15] as const,
  wetProductionKtH: [0.55, 0.04] as const,

  // Rio em Óbidos: queda exponencial de start para floor.
  riverStartM: [12.3, 0.04] as const,
  riverFloorM: 11.5,
  riverTauH: [100, 12] as const,
  draftLimitM: 11.7 as const,
  // Tonelagem do E: perde TPC kt por cm de rio abaixo da referência, na hora da carga.
  riverFullLoadM: 12.15,
  tpcKtPerCm: 0.065,
};

// ---------------------------------------------------------------------------
// Elenco e line-up. Horário programado sai do horário de fundeio pelas pernas nominais.

interface ShipDef {
  id: ShipId;
  cargo: 'seca' | 'umida';
  destination: string;
  market: Ship['market'];
  nominalTonnageKt: number;
  plannedFundeio: number;
  done: Milestone[]; // marcos já ocorridos em T0 (horário real = programado)
  riverLimited?: boolean;
  tideDelayed?: boolean; // navio C
  loadOverrunH?: readonly [number, number]; // carga em curso mais lenta que o programado (navio A)
}

const SHIPS: ShipDef[] = [
  { id: 'A', cargo: 'umida', destination: 'Vila do Conde', market: 'cabotagem', nominalTonnageKt: 50, plannedFundeio: -20, done: ['BARRA_NORTE', 'FAZENDINHA', 'FUNDEIO_TROMBETAS', 'ATRACACAO', 'INICIO_CARGA'], loadOverrunH: [2, 9] },
  { id: 'B', cargo: 'seca', destination: 'América do Norte', market: 'america_norte', nominalTonnageKt: 55, plannedFundeio: 5, done: ['BARRA_NORTE', 'FAZENDINHA'] },
  { id: 'C', cargo: 'umida', destination: 'Alumar', market: 'cabotagem', nominalTonnageKt: 50, plannedFundeio: 47, done: [], tideDelayed: true },
  { id: 'D', cargo: 'seca', destination: 'Europa', market: 'europa', nominalTonnageKt: 55, plannedFundeio: 72, done: [] },
  { id: 'E', cargo: 'umida', destination: 'Vila do Conde', market: 'cabotagem', nominalTonnageKt: 50, plannedFundeio: 140, done: [], riverLimited: true },
  { id: 'F', cargo: 'seca', destination: 'Europa', market: 'europa', nominalTonnageKt: 55, plannedFundeio: 167, done: [] },
  { id: 'G', cargo: 'seca', destination: 'Ásia', market: 'asia', nominalTonnageKt: 55, plannedFundeio: 196, done: [] },
];

const LINE_UP: Record<ScenarioId, ShipId[]> = {
  base: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  A: ['A', 'B', 'D', 'C', 'E', 'F', 'G'], // antecipar D: D atraca antes do C
  B: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
};

const SCENARIO_META: Record<ScenarioId, { label: string; actions: string[] }> = {
  base: { label: 'Base', actions: [] },
  A: { label: 'A: antecipar D', actions: ['Atracar o navio D antes do navio C'] },
  B: { label: 'B: reduzir seco em 8%', actions: ['Reduzir a produção de bauxita seca em 8%'] },
};

function loadHours(tonnageKt: number): number {
  return tonnageKt / P.loadRateKtH;
}

function plannedTimes(s: ShipDef): Record<Milestone, number> {
  const f = s.plannedFundeio;
  const startLoad = f + P.fundeioToBerthH + P.berthToLoadH;
  const endLoad = startLoad + loadHours(s.nominalTonnageKt);
  return {
    BARRA_NORTE: f - P.fazendinhaToFundeioH - P.inspectionH - P.barraToFazendinhaH,
    FAZENDINHA: f - P.fazendinhaToFundeioH - P.inspectionH,
    FUNDEIO_TROMBETAS: f,
    ATRACACAO: f + P.fundeioToBerthH,
    INICIO_CARGA: startLoad,
    FIM_CARGA: endLoad,
    SAIDA_BARRA: endLoad + P.loadToBarraH,
  };
}

const PLANNED = new Map(SHIPS.map((s) => [s.id, plannedTimes(s)]));

// ---------------------------------------------------------------------------
// PRNG semeado (mulberry32). Cada rodada tem seu próprio gerador e sorteia
// sempre na mesma ordem, então os três cenários usam os mesmos números
// aleatórios e só diferem pela política.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  uniform(a = 0, b = 1): number {
    return a + (b - a) * this.next();
  }
  normal(mean = 0, sd = 1): number {
    const u1 = Math.max(this.next(), 1e-12);
    const u2 = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ---------------------------------------------------------------------------
// Sorteios de uma rodada (independem do cenário).

interface ShipDraws {
  tideWaitH: number;
  inspectionExtraH: number;
  legNoise: [number, number, number]; // até Fazendinha, até o fundeio, descida
  loadNoise: number;
  loadOverrunH: number;
}

interface RunDraws {
  riverStart: number;
  riverTau: number;
  dryStart: number;
  dryRate: number;
  dryDaily: number[];
  wetStart: number;
  wetRate: number;
  ships: Map<ShipId, ShipDraws>;
}

function drawRun(rng: Rng): RunDraws {
  const riverStart = rng.normal(...P.riverStartM);
  const riverTau = rng.normal(...P.riverTauH);
  const dryStart = rng.normal(...P.dryStartKt);
  const dryRate = rng.normal(...P.dryProductionKtH);
  const dryDaily = Array.from({ length: HORIZON_H / 24 + 1 }, () => rng.normal(1, P.dryDailyNoiseSd));
  const wetStart = rng.normal(...P.wetStartKt);
  const wetRate = rng.normal(...P.wetProductionKtH);
  const ships = new Map<ShipId, ShipDraws>();
  for (const s of SHIPS) {
    const tideU = rng.uniform();
    const inspU = rng.uniform();
    const inspU2 = rng.uniform();
    const legNoise: [number, number, number] = [
      rng.normal(0, P.legNoiseSdH / 2),
      rng.normal(0, P.legNoiseSdH),
      rng.normal(0, P.legNoiseSdH),
    ];
    const loadNoise = rng.normal(0, P.loadNoiseSd);
    const overrunU = rng.uniform();
    const loadOverrunH = s.loadOverrunH ? s.loadOverrunH[0] + overrunU * (s.loadOverrunH[1] - s.loadOverrunH[0]) : 0;
    let tideWaitH: number;
    let inspectionExtraH: number;
    if (s.tideDelayed) {
      tideWaitH = P.tideWindowH * (tideU < P.cSecondWindowP ? 2 : 1);
      inspectionExtraH = P.cInspectionWaitH[0] + inspU2 * (P.cInspectionWaitH[1] - P.cInspectionWaitH[0]);
    } else {
      tideWaitH = tideU < P.tideMissP ? P.tideWindowH : 0; // perdeu a janela: espera a próxima
      const [lo, hi] = P.inspectionOffHoursWaitH;
      inspectionExtraH = inspU < P.inspectionOffHoursP ? lo + inspU2 * (hi - lo) : 0;
    }
    ships.set(s.id, { tideWaitH, inspectionExtraH, legNoise, loadNoise, loadOverrunH });
  }
  return { riverStart, riverTau, dryStart, dryRate, dryDaily, wetStart, wetRate, ships };
}

function riverLevel(d: RunDraws, t: number): number {
  return P.riverFloorM + (d.riverStart - P.riverFloorM) * Math.exp(-Math.max(t, 0) / d.riverTau);
}

// ---------------------------------------------------------------------------
// Uma rodada de um cenário.

interface ShipOutcome {
  times: Record<Milestone, number>;
  waitH: number;
  tonnageKt: number;
  causes: Partial<Record<Cause, number>>; // horas atribuídas a cada causa
}

interface RunOutcome {
  ships: Map<ShipId, ShipOutcome>;
  dry: number[]; // estoque nos pontos da série
  wet: number[];
  river: number[];
}

const SERIES_T = Array.from({ length: HORIZON_H / STEP_H + 1 }, (_, i) => i * STEP_H);

function simulate(d: RunDraws, scenario: ScenarioId): RunOutcome {
  const ships = new Map<ShipId, ShipOutcome>();

  // Chegada ao fundeio: não depende do berço.
  for (const s of SHIPS) {
    const plan = PLANNED.get(s.id)!;
    const r = d.ships.get(s.id)!;
    const done = new Set(s.done);
    const times = { ...plan };
    const causes: Partial<Record<Cause, number>> = {};
    if (!done.has('BARRA_NORTE')) {
      times.BARRA_NORTE = Math.max(plan.BARRA_NORTE + r.tideWaitH, 0);
      if (r.tideWaitH > 0) causes.mare_barra = r.tideWaitH;
    }
    if (!done.has('FAZENDINHA')) {
      times.FAZENDINHA = done.has('BARRA_NORTE')
        ? Math.max(plan.FAZENDINHA + r.legNoise[0], 0)
        : times.BARRA_NORTE + P.barraToFazendinhaH + r.legNoise[0];
    }
    if (!done.has('FUNDEIO_TROMBETAS')) {
      if (done.has('FAZENDINHA')) {
        times.FUNDEIO_TROMBETAS = Math.max(plan.FUNDEIO_TROMBETAS + r.legNoise[1], 0);
      } else {
        times.FUNDEIO_TROMBETAS =
          times.FAZENDINHA + P.inspectionH + r.inspectionExtraH + P.fazendinhaToFundeioH + r.legNoise[1];
        if (r.inspectionExtraH > 0) causes.inspecao_fazendinha = r.inspectionExtraH;
      }
    }
    ships.set(s.id, { times, waitH: 0, tonnageKt: s.nominalTonnageKt, causes });
  }

  // Berço único na ordem do line-up do cenário.
  let berthFree = -Infinity;
  for (const id of LINE_UP[scenario]) {
    const s = SHIPS.find((x) => x.id === id)!;
    const o = ships.get(id)!;
    const r = d.ships.get(id)!;
    const done = new Set(s.done);
    const t = o.times;
    if (!done.has('ATRACACAO')) {
      const ready = t.FUNDEIO_TROMBETAS + P.fundeioToBerthH;
      t.ATRACACAO = Math.max(ready, berthFree);
      o.waitH = t.ATRACACAO - ready;
      if (o.waitH > 0) o.causes.fila_berco = o.waitH;
    }
    if (!done.has('INICIO_CARGA')) t.INICIO_CARGA = t.ATRACACAO + P.berthToLoadH;
    if (s.riverLimited) {
      const level = riverLevel(d, t.INICIO_CARGA);
      const cut = P.tpcKtPerCm * Math.max(0, (P.riverFullLoadM - level) * 100);
      o.tonnageKt = Math.max(s.nominalTonnageKt - cut, 0);
    }
    t.FIM_CARGA = done.has('INICIO_CARGA')
      ? Math.max(PLANNED.get(id)!.FIM_CARGA + r.loadOverrunH, 0.5)
      : t.INICIO_CARGA + loadHours(o.tonnageKt) * (1 + r.loadNoise) + r.loadOverrunH;
    if (r.loadOverrunH > 0) o.causes.taxa_carregamento = r.loadOverrunH;
    t.SAIDA_BARRA = t.FIM_CARGA + P.loadToBarraH + r.legNoise[2];
    berthFree = t.FIM_CARGA + P.unberthH;
  }

  // Pátio hora a hora: produção entra, carregamento sai.
  const dryCut = scenario === 'B' ? 1 - P.scenarioBDryCut : 1;
  let dryStock = d.dryStart;
  let wetStock = d.wetStart;
  const dry: number[] = [];
  const wet: number[] = [];
  for (let h = 0; h <= HORIZON_H; h++) {
    if (h % STEP_H === 0) {
      dry.push(dryStock);
      wet.push(wetStock);
    }
    let dryOut = 0;
    let wetOut = 0;
    for (const s of SHIPS) {
      const o = ships.get(s.id)!;
      const start = Math.max(o.times.INICIO_CARGA, 0);
      const end = o.times.FIM_CARGA;
      const overlap = Math.max(0, Math.min(h + 1, end) - Math.max(h, start));
      if (overlap === 0) continue;
      const remainingShare = (end - o.times.INICIO_CARGA) > 0 ? overlap / (end - o.times.INICIO_CARGA) : 0;
      const out = o.tonnageKt * remainingShare;
      if (s.cargo === 'seca') dryOut += out;
      else wetOut += out;
    }
    const day = Math.floor(h / 24);
    const fill = dryStock / P.dryCapacityKt;
    const throttle = clamp((1 - fill) / (1 - P.dryThrottleStart), 0, 1);
    dryStock = clamp(dryStock + d.dryRate * d.dryDaily[day]! * dryCut * throttle - dryOut, 0, P.dryCapacityKt);
    wetStock = clamp(wetStock + d.wetRate - wetOut, 0, P.wetCapacityKt);
  }

  const river = SERIES_T.map((t) => riverLevel(d, t));
  return { ships, dry, wet, river };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

// ---------------------------------------------------------------------------
// Estatística.

function quantile(sorted: number[], q: number): number {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

function round(x: number, digits: number): number {
  const f = 10 ** digits;
  const r = Math.round(x * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

function quantiles(values: number[], digits = 1): Quantiles {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p10: round(quantile(sorted, 0.1), digits),
    p50: round(quantile(sorted, 0.5), digits),
    p90: round(quantile(sorted, 0.9), digits),
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function share(values: boolean[]): number {
  return values.filter(Boolean).length / values.length;
}

// ---------------------------------------------------------------------------
// Monta o arquivo.

const ALERT_SHIP: ShipId = 'C';
const ALERT_DELAY_H = 36;
const IMPACTED_SHIP: ShipId = 'D';

function arrivalDelay(o: ShipOutcome, id: ShipId): number {
  return o.times.FUNDEIO_TROMBETAS - PLANNED.get(id)!.FUNDEIO_TROMBETAS;
}

function buildScenario(id: ScenarioId, runs: RunOutcome[]): Scenario {
  const forecasts: ShipForecast[] = SHIPS.map((s) => {
    const outs = runs.map((r) => r.ships.get(s.id)!);
    const milestones: ShipForecast['milestones'] = {};
    for (const m of MILESTONES) milestones[m] = quantiles(outs.map((o) => o.times[m]));
    const delays = outs.map((o) => arrivalDelay(o, s.id));
    const fc: ShipForecast = {
      shipId: s.id,
      milestones,
      pDelay: {
        gt12h: round(share(delays.map((x) => x > 12)), 2),
        gt24h: round(share(delays.map((x) => x > 24)), 2),
        gt48h: round(share(delays.map((x) => x > 48)), 2),
      },
    };
    const cause = dominantCause(outs);
    if (cause) fc.dominantCause = cause;
    if (s.riverLimited) fc.maxTonnageKt = quantiles(outs.map((o) => o.tonnageKt));
    return fc;
  });

  const berthSchedule = LINE_UP[id].map((shipId) => {
    const outs = runs.map((r) => r.ships.get(shipId)!);
    return {
      shipId,
      start: quantiles(outs.map((o) => o.times.ATRACACAO)),
      end: quantiles(outs.map((o) => o.times.FIM_CARGA + P.unberthH)),
    };
  });

  const seriesPoints = (pick: (r: RunOutcome) => number[], digits: number) =>
    SERIES_T.map((t, i) => ({ t, ...quantiles(runs.map((r) => pick(r)[i]!), digits) }));

  const waitDays = round(mean(runs.map((r) => sum([...r.ships.values()].map((o) => o.waitH)))) / 24, 1);
  const d5 = SERIES_T.indexOf(D5_H);
  const pYard = round(share(runs.map((r) => r.dry[d5]! > 0.9 * P.dryCapacityKt)), 2);

  const alertDelays = runs.map((r) => arrivalDelay(r.ships.get(ALERT_SHIP)!, ALERT_SHIP));
  const alertP = round(share(alertDelays.map((x) => x >= ALERT_DELAY_H)), 2);
  const leadTimeDays = Math.floor(PLANNED.get(IMPACTED_SHIP)!.ATRACACAO / 24);

  return {
    id,
    label: SCENARIO_META[id].label,
    actions: SCENARIO_META[id].actions,
    forecasts,
    berthSchedule,
    yard: [
      { pile: 'seca', capacityKt: P.dryCapacityKt, points: seriesPoints((r) => r.dry, 1) },
      { pile: 'umida', capacityKt: P.wetCapacityKt, points: seriesPoints((r) => r.wet, 1) },
    ],
    river: { station: 'Obidos', draftLimitM: P.draftLimitM, points: seriesPoints((r) => r.river, 2) },
    kpis: {
      expectedWaitDays: waitDays,
      pYardDryOver90: pYard,
      opportunityCostUsd: Math.round(waitDays * USD_PER_SHIP_DAY),
    },
    alerts: [
      {
        shipId: ALERT_SHIP,
        milestone: 'FUNDEIO_TROMBETAS',
        probability: alertP,
        delayH: ALERT_DELAY_H,
        leadTimeDays,
        text: `${Math.round(alertP * 100)}% de chance de ${ALERT_DELAY_H} h de atraso`,
      },
    ],
    trajectories: runs.slice(0, TRAJECTORIES).map((r) => r.dry.map((x) => round(x, 1))),
  };
}

// Causa com mais horas médias de atraso ou espera, se passar de 4 h.
function dominantCause(outs: ShipOutcome[]): Cause | undefined {
  const totals = new Map<Cause, number>();
  for (const o of outs) {
    for (const [c, h] of Object.entries(o.causes) as [Cause, number][]) totals.set(c, (totals.get(c) ?? 0) + h);
  }
  let best: Cause | undefined;
  let bestH = 4;
  for (const [c, total] of totals) {
    const avg = total / outs.length;
    if (avg > bestH) {
      best = c;
      bestH = avg;
    }
  }
  return best;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function shipsFile(): Ship[] {
  return SHIPS.map((s) => {
    const plan = PLANNED.get(s.id)!;
    const planned: Ship['planned'] = {};
    for (const m of MILESTONES) planned[m] = round(plan[m], 1);
    return {
      id: s.id,
      cargo: s.cargo,
      destination: s.destination,
      market: s.market,
      nominalTonnageKt: s.nominalTonnageKt,
      planned,
    };
  });
}

// ---------------------------------------------------------------------------
// Metas e verificação.

interface Check {
  label: string;
  value: number;
  target: number;
  tolerance: number;
  unit: string;
}

const TARGETS: Record<ScenarioId, { waitDays: number; pYard: number }> = {
  base: { waitDays: 2.1, pYard: 0.64 },
  A: { waitDays: 1.2, pYard: 0.12 },
  B: { waitDays: 2.0, pYard: 0.3 },
};

function checks(file: ScenarioFile): Check[] {
  const out: Check[] = [];
  const byId = new Map(file.scenarios.map((s) => [s.id, s]));
  for (const id of SCENARIO_IDS) {
    const k = byId.get(id)!.kpis;
    out.push({ label: `${id}: espera esperada somada`, value: k.expectedWaitDays, target: TARGETS[id].waitDays, tolerance: 0.1, unit: 'dias' });
    out.push({ label: `${id}: P(pátio seco > 90% em D+5)`, value: k.pYardDryOver90, target: TARGETS[id].pYard, tolerance: 0.03, unit: '' });
  }
  const base = byId.get('base')!;
  const a = byId.get('A')!;
  const dryP50AtD5 = (s: Scenario) => {
    const dry = s.yard.find((y) => y.pile === 'seca')!;
    return dry.points.find((p) => p.t === D5_H)!.p50 / dry.capacityKt;
  };
  out.push({ label: 'base: alerta do C (P atraso >= 36 h)', value: base.alerts[0]!.probability, target: 0.8, tolerance: 0.03, unit: '' });
  out.push({ label: 'base: P50 do pátio seco em D+5', value: round(dryP50AtD5(base), 2), target: 0.92, tolerance: 0.03, unit: '' });
  // Meta de teto: abaixo de 80%. Representada como alvo 0,76 com tolerância 0,04.
  out.push({ label: 'A: P50 do pátio seco em D+5 (< 80%)', value: round(dryP50AtD5(a), 2), target: 0.76, tolerance: 0.04, unit: '' });
  const dFundeio = base.forecasts.find((f) => f.shipId === 'D')!.milestones.FUNDEIO_TROMBETAS!.p50;
  out.push({ label: 'base: D no fundeio (P50, h)', value: dFundeio, target: 72, tolerance: 4, unit: 'h' });
  const dWaitStart = base.berthSchedule.find((b) => b.shipId === 'D')!.start.p50;
  out.push({ label: 'base: D atraca depois de D+3 (P50, h)', value: dWaitStart > 72 ? 1 : 0, target: 1, tolerance: 0, unit: '' });
  const river = base.river.points.find((p) => p.t === D5_H)!.p50;
  out.push({ label: 'base: rio em Óbidos em D+5 (P50, m)', value: river, target: 11.75, tolerance: 0.1, unit: 'm' });
  return out;
}

// ---------------------------------------------------------------------------

function main(): void {
  const draws = Array.from({ length: RUNS }, (_, i) => drawRun(new Rng(SEED + i * 7919)));
  const runsBy = new Map(SCENARIO_IDS.map((id) => [id, draws.map((d) => simulate(d, id))]));
  const scenarios = SCENARIO_IDS.map((id) => buildScenario(id, runsBy.get(id)!));

  // --debug: espera média por navio, útil na calibração.
  if (process.argv.includes('--debug')) {
    for (const id of SCENARIO_IDS) {
      const runs = runsBy.get(id)!;
      const perShip = SHIP_IDS.map((s) => `${s}=${mean(runs.map((r) => r.ships.get(s)!.waitH)).toFixed(1)}h`);
      console.error(`[debug] ${id} espera média: ${perShip.join(' ')}`);
    }
  }

  const file: ScenarioFile = {
    meta: { t0: '2026-10-15T06:00:00-03:00', seed: SEED, disclaimer: 'Cenário ilustrativo, dados sintéticos' },
    ships: shipsFile(),
    scenarios,
  };

  const parsed = ScenarioFileSchema.safeParse(file);
  if (!parsed.success) {
    console.error('scenario.json reprovado pelo schema:');
    console.error(parsed.error.issues.slice(0, 10));
    process.exit(1);
  }

  mkdirSync('public', { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(file, null, 2) + '\n');

  console.log(`${OUT_PATH} gravado (semente ${SEED}, ${RUNS} rodadas)\n`);
  console.log('Cenário  Espera (dias)  P(seco > 90% D+5)  Custo (US$)');
  for (const s of scenarios) {
    const k = s.kpis;
    console.log(
      `${s.id.padEnd(8)} ${k.expectedWaitDays.toFixed(1).padStart(13)}  ${(k.pYardDryOver90 * 100).toFixed(0).padStart(16)}%  ${k.opportunityCostUsd.toLocaleString('pt-BR').padStart(11)}`,
    );
  }
  console.log('');

  let failed = 0;
  for (const c of checks(file)) {
    const ok = Math.abs(c.value - c.target) <= c.tolerance + 1e-9;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FORA'} ${c.label}: ${c.value} (meta ${c.target} ± ${c.tolerance}${c.unit ? ' ' + c.unit : ''})`);
  }
  if (failed > 0) {
    console.error(`\n${failed} indicador(es) fora da tolerância.`);
    process.exit(1);
  }
}

main();
