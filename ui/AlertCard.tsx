import { activeScenario, useClock } from '../clock/store.ts';
import { alertHeadline } from './format.ts';

// Card de alerta: um por item de scenario.alerts do cenário ativo.
export function AlertCard() {
  const alerts = useClock((s) => activeScenario(s)?.alerts);
  if (!alerts?.length) return null;
  return (
    <section className="ov-alerts" aria-label="Alertas">
      {alerts.map((a) => (
        <div key={`${a.shipId}-${a.milestone}`} className="ov-panel ov-alert" role="alert">
          <span className="ov-alert-icon" aria-hidden="true">
            !
          </span>
          <div>
            <p className="ov-alert-title">{alertHeadline(a)}</p>
            <p className="ov-alert-sub">
              Alerta <span className="ov-mono">{a.leadTimeDays}</span> dias antes do impacto no berço
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
