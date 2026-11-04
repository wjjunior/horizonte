import { activeScenario, useClock } from '../clock/store.ts';
import { SCENARIO_IDS } from '../docs/schema.ts';
import { formatDays, formatPct, formatUsd } from './format.ts';

export const RUN_STAMP = 'Rodada 06h00, dados de 05h45';

const FALLBACK_LABEL = { base: 'Base', A: 'A', B: 'B' } as const;

// Carimbo da rodada, alternador Base / A / B e os 3 KPIs do cenário ativo.
export function KpiPanel() {
  const file = useClock((s) => s.file);
  const scenarioId = useClock((s) => s.scenarioId);
  const setScenario = useClock((s) => s.setScenario);
  const kpis = useClock((s) => activeScenario(s)?.kpis);

  const labelOf = (id: (typeof SCENARIO_IDS)[number]) =>
    file?.scenarios.find((s) => s.id === id)?.label ?? FALLBACK_LABEL[id];

  return (
    <section className="ov-panel ov-kpis" aria-label="Indicadores do cenário">
      <p className="ov-stamp">{RUN_STAMP}</p>

      <div className="ov-switch" role="radiogroup" aria-label="Cenário">
        {SCENARIO_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === scenarioId}
            className="ov-switch-btn"
            onClick={() => setScenario(id)}
          >
            {labelOf(id)}
          </button>
        ))}
      </div>

      <dl className="ov-kpi-list">
        <div className="ov-kpi">
          <dt>Espera esperada somada</dt>
          <dd>
            <span className="ov-kpi-value">{kpis ? formatDays(kpis.expectedWaitDays) : '—'}</span>
            <span className="ov-kpi-unit">dias de navio</span>
          </dd>
        </div>
        <div className="ov-kpi">
          <dt>Pátio seco acima de 90% em D+5</dt>
          <dd>
            <span className="ov-kpi-value">{kpis ? formatPct(kpis.pYardDryOver90) : '—'}</span>
            <span className="ov-kpi-unit">de chance</span>
          </dd>
        </div>
        <div className="ov-kpi">
          <dt>Custo de oportunidade</dt>
          <dd>
            <span className="ov-kpi-value">{kpis ? formatUsd(kpis.opportunityCostUsd) : '—'}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
