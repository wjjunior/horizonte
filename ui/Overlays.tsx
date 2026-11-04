// Camada 2D sobre o canvas (WAG-738): alerta, KPIs, alternador, linha do tempo e rodapé.
// DOM puro, acima do <Canvas>. Lê o relógio com hooks de seletor.

import { useEffect } from 'react';
import { useClock } from '../clock/store.ts';
import { loadScenarioFile } from '../data/loader.ts';
import { AlertCard } from './AlertCard.tsx';
import { isStillMode } from './format.ts';
import { KpiPanel } from './KpiPanel.tsx';
import { Timeline } from './Timeline.tsx';
import './tokens.css';
import './overlays.css';

export const DISCLAIMER = 'Cenário ilustrativo, dados sintéticos';

const STILL = typeof window !== 'undefined' && isStillMode(window.location.search);

// Os overlays funcionam sozinhos: se ninguém carregou o scenario.json, carregam aqui.
// Quem carregar primeiro vence; o segundo resultado é descartado.
function useScenarioFallback() {
  useEffect(() => {
    if (useClock.getState().file) return;
    let cancelled = false;
    loadScenarioFile()
      .then((file) => {
        if (!cancelled && !useClock.getState().file) useClock.getState().setFile(file);
      })
      .catch((e: unknown) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, []);
}

export function Overlays() {
  useScenarioFallback();
  if (STILL) return null;
  return (
    <div className="ov-root">
      <AlertCard />
      <KpiPanel />
      <Timeline />
      <footer className="ov-footer">{DISCLAIMER}</footer>
    </div>
  );
}
