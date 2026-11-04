// Contrato do scenario.json (WAG-730). Gerador e app importam daqui.
// Os tipos saem do schema Zod (z.infer), então há uma definição só.
//
// Convenções:
// - Tempo em horas desde T0 (rodada das 06h00 de D0). Negativo = já aconteceu;
//   nesse caso o marco tem p10 = p50 = p90.
// - Atraso de um marco = previsão p50 - horário programado (Ship.planned).
//   A cascata da T2 é a diferença de atraso entre marcos consecutivos.
// - Pátio em kt (mil toneladas); a porcentagem é calculada na leitura (/ capacityKt).
// - Rio em metros, nível na estação de Óbidos.
// - Probabilidades de 0 a 1.

import { z } from 'zod';

export const MILESTONES = [
  'BARRA_NORTE',
  'FAZENDINHA',
  'FUNDEIO_TROMBETAS',
  'ATRACACAO',
  'INICIO_CARGA',
  'FIM_CARGA',
  'SAIDA_BARRA',
] as const;
export const MilestoneSchema = z.enum(MILESTONES);

export const SHIP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const ShipIdSchema = z.enum(SHIP_IDS);

export const SCENARIO_IDS = ['base', 'A', 'B'] as const;
export const ScenarioIdSchema = z.enum(SCENARIO_IDS);

const probability = z.number().min(0).max(1);

const quantileShape = { p10: z.number(), p50: z.number(), p90: z.number() };
const isOrdered = (q: { p10: number; p50: number; p90: number }) => q.p10 <= q.p50 && q.p50 <= q.p90;
const ORDER_MSG = { message: 'quantis fora de ordem: esperado p10 <= p50 <= p90' };

export const QuantilesSchema = z.object(quantileShape).refine(isOrdered, ORDER_MSG);

const SeriesPointSchema = z.object({ t: z.number(), ...quantileShape }).refine(isOrdered, ORDER_MSG);

// Horários (ou p50) dos marcos presentes precisam seguir a ordem do ciclo.
function inCycleOrder(times: Partial<Record<(typeof MILESTONES)[number], number>>): boolean {
  let last = -Infinity;
  for (const m of MILESTONES) {
    const t = times[m];
    if (t === undefined) continue;
    if (t < last) return false;
    last = t;
  }
  return true;
}
const CYCLE_MSG = { message: `marcos fora da ordem do ciclo: ${MILESTONES.join(' < ')}` };

const pointsInTimeOrder = z
  .array(SeriesPointSchema)
  .min(1)
  .refine((ps) => ps.every((p, i) => i === 0 || p.t > ps[i - 1]!.t), { message: 'pontos da série fora da ordem de t' });

export const CauseSchema = z.enum(['mare_barra', 'inspecao_fazendinha', 'fila_berco', 'taxa_carregamento', 'chuva']);

export const ShipSchema = z.object({
  id: ShipIdSchema,
  cargo: z.enum(['seca', 'umida']),
  destination: z.string().min(1),
  market: z.enum(['cabotagem', 'america_norte', 'europa', 'asia']),
  nominalTonnageKt: z.number().positive(), // cerca de 50 kt por navio
  // Line-up: horário programado de cada marco, a partir da ETA informada pelo agente.
  // É a referência do atraso e não muda entre cenários.
  planned: z.partialRecord(MilestoneSchema, z.number()).refine(inCycleOrder, CYCLE_MSG),
});

export const ShipForecastSchema = z.object({
  shipId: ShipIdSchema,
  milestones: z
    .partialRecord(MilestoneSchema, QuantilesSchema)
    .refine(
      (ms) => inCycleOrder(Object.fromEntries(Object.entries(ms).map(([m, q]) => [m, q.p50]))),
      CYCLE_MSG,
    ),
  // Probabilidade de o atraso de chegada ao fundeio de Trombetas passar de 12, 24 e 48 h.
  pDelay: z
    .object({ gt12h: probability, gt24h: probability, gt48h: probability })
    .refine((p) => p.gt12h >= p.gt24h && p.gt24h >= p.gt48h, {
      message: 'pDelay precisa decrescer: gt12h >= gt24h >= gt48h',
    }),
  dominantCause: CauseSchema.optional(),
  maxTonnageKt: QuantilesSchema.optional(), // saída do M2 (nível do rio limita a tonelagem)
});

export const YardSeriesSchema = z.object({
  pile: z.enum(['seca', 'umida']),
  capacityKt: z.number().positive(),
  points: pointsInTimeOrder, // estoque em kt
});

export const RiverSeriesSchema = z.object({
  station: z.literal('Obidos'),
  draftLimitM: z.union([z.literal(11.7), z.literal(11.85)]),
  points: pointsInTimeOrder, // nível em m
});

export const AlertSchema = z.object({
  shipId: ShipIdSchema,
  milestone: MilestoneSchema, // marco em que o atraso é medido (a chegada é FUNDEIO_TROMBETAS)
  probability,
  delayH: z.number().positive(),
  leadTimeDays: z.number().nonnegative(),
  text: z.string().min(1),
});

export const ScenarioSchema = z
  .object({
    id: ScenarioIdSchema,
    label: z.string().min(1),
    actions: z.array(z.string().min(1)),
    forecasts: z.array(ShipForecastSchema),
    berthSchedule: z.array(z.object({ shipId: ShipIdSchema, start: QuantilesSchema, end: QuantilesSchema })),
    yard: z.array(YardSeriesSchema),
    river: RiverSeriesSchema,
    kpis: z.object({
      expectedWaitDays: z.number().nonnegative(),
      pYardDryOver90: probability, // P(pátio seco > 90% da capacidade em D+5)
      opportunityCostUsd: z.number().nonnegative(),
    }),
    alerts: z.array(AlertSchema),
    // Amostras do estoque do pátio seco para o leque; cada amostra tem um valor por ponto da série seca.
    trajectories: z.array(z.array(z.number())).optional(),
  })
  .superRefine((s, ctx) => {
    const piles = s.yard.map((y) => y.pile).sort();
    if (piles.join() !== 'seca,umida') {
      ctx.addIssue({ code: 'custom', path: ['yard'], message: 'o pátio precisa de uma série seca e uma úmida' });
    }
    const dry = s.yard.find((y) => y.pile === 'seca');
    s.trajectories?.forEach((tr, i) => {
      if (dry && tr.length !== dry.points.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['trajectories', i],
          message: `trajetória com ${tr.length} valores; a série seca tem ${dry.points.length} pontos`,
        });
      }
    });
  });

export const ScenarioFileSchema = z
  .object({
    meta: z.object({
      t0: z.iso.datetime({ offset: true }), // ex.: 2026-10-15T06:00:00-03:00
      seed: z.number().int(),
      disclaimer: z.string().min(1),
    }),
    ships: z.array(ShipSchema).length(SHIP_IDS.length),
    scenarios: z.array(ScenarioSchema).length(SCENARIO_IDS.length),
  })
  .superRefine((f, ctx) => {
    const shipIds = f.ships.map((s) => s.id);
    if (new Set(shipIds).size !== shipIds.length) {
      ctx.addIssue({ code: 'custom', path: ['ships'], message: 'id de navio repetido' });
    }
    const scenarioIds = f.scenarios.map((s) => s.id);
    if (new Set(scenarioIds).size !== scenarioIds.length) {
      ctx.addIssue({ code: 'custom', path: ['scenarios'], message: 'id de cenário repetido' });
    }
    const planned = new Map(f.ships.map((s) => [s.id, s.planned]));
    f.scenarios.forEach((sc, si) => {
      const ids = sc.forecasts.map((fc) => fc.shipId).sort();
      if (ids.join() !== [...SHIP_IDS].join()) {
        ctx.addIssue({
          code: 'custom',
          path: ['scenarios', si, 'forecasts'],
          message: 'cada cenário precisa de exatamente uma previsão por navio (A a G)',
        });
      }
      sc.forecasts.forEach((fc, fi) => {
        for (const m of Object.keys(fc.milestones) as Milestone[]) {
          if (planned.get(fc.shipId)?.[m] === undefined) {
            ctx.addIssue({
              code: 'custom',
              path: ['scenarios', si, 'forecasts', fi, 'milestones', m],
              message: `navio ${fc.shipId} sem horário programado para ${m}; sem ele não há atraso`,
            });
          }
        }
      });
    });
  });

export type Milestone = z.infer<typeof MilestoneSchema>;
export type ShipId = z.infer<typeof ShipIdSchema>;
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;
export type Quantiles = z.infer<typeof QuantilesSchema>;
export type Cause = z.infer<typeof CauseSchema>;
export type Ship = z.infer<typeof ShipSchema>;
export type ShipForecast = z.infer<typeof ShipForecastSchema>;
export type YardSeries = z.infer<typeof YardSeriesSchema>;
export type RiverSeries = z.infer<typeof RiverSeriesSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type ScenarioFile = z.infer<typeof ScenarioFileSchema>;
