// Relógio simulado e estado da demo (WAG-734).
//
// Em componentes React, use o hook com seletor: useClock((s) => s.t).
// Dentro do useFrame, leia com useClock.getState() para não causar re-render,
// e chame useClock.getState().tick(delta) uma vez por frame.

import { create } from 'zustand';
import { scenarioById } from '../data/selectors.ts';
import type { Scenario, ScenarioFile, ScenarioId, ShipId } from '../docs/schema.ts';

export const T_MIN = 0; // D0, 06h00
export const T_MAX = 240; // D10
export const DEFAULT_SPEED = 6; // horas simuladas por segundo real: D0 a D10 em 40 s

const clampT = (t: number) => Math.min(Math.max(t, T_MIN), T_MAX);

export interface ClockState {
  file: ScenarioFile | null; // scenario.json validado; null até o loader terminar
  t: number; // horas desde T0, de T_MIN a T_MAX
  playing: boolean;
  speed: number; // horas simuladas por segundo real
  scenarioId: ScenarioId;
  selectedShipId: ShipId | null;
  beat: number; // beat atual da demo (1 a 5); o significado fica em demo/

  setFile: (file: ScenarioFile) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  seek: (t: number) => void; // scrub, limitado a [T_MIN, T_MAX]
  tick: (dtSeconds: number) => void; // avança se estiver tocando; para sozinho em T_MAX
  setScenario: (id: ScenarioId) => void;
  selectShip: (id: ShipId | null) => void;
  setBeat: (beat: number) => void;
}

export const INITIAL_CLOCK = {
  file: null,
  t: T_MIN,
  playing: false,
  speed: DEFAULT_SPEED,
  scenarioId: 'base',
  selectedShipId: null,
  beat: 1,
} satisfies Partial<ClockState>;

export const useClock = create<ClockState>()((set, get) => ({
  ...INITIAL_CLOCK,

  setFile: (file) => set({ file }),
  play: () => set({ playing: get().t < T_MAX }),
  pause: () => set({ playing: false }),
  togglePlay: () => (get().playing ? get().pause() : get().play()),
  setSpeed: (speed) => set({ speed: Math.max(0, speed) }),
  seek: (t) => set({ t: clampT(t) }),
  tick: (dtSeconds) => {
    const s = get();
    if (!s.playing || dtSeconds <= 0) return;
    const t = clampT(s.t + dtSeconds * s.speed);
    set(t >= T_MAX ? { t, playing: false } : { t });
  },
  setScenario: (scenarioId) => set({ scenarioId }),
  selectShip: (selectedShipId) => set({ selectedShipId }),
  setBeat: (beat) => set({ beat }),
}));

// Cenário ativo, para passar aos seletores de data/selectors.ts. null até o arquivo carregar.
export function activeScenario(s: Pick<ClockState, 'file' | 'scenarioId'>): Scenario | null {
  return s.file ? scenarioById(s.file, s.scenarioId) : null;
}
