import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useClock } from '../clock/store.ts';
import { BEAT_COUNT, TIME_TRANSITION_S, beatByNumber, parseDemoParams, recordBeatAt, transitionT } from './beats.ts';

// Diretor dos beats (WAG-740). Monta dentro do <Canvas>, antes do <CameraDirector />.
// - &beat=N: entra direto no beat N, com o relógio parado (a câmera pula sem lerp).
// - Setas esquerda/direita: beat anterior/seguinte; o relógio corre até o t do beat.
// - ?record=1: toca os 5 beats com as durações de demo/beats.ts, sem interação.

const PARAMS = parseDemoParams(typeof window === 'undefined' ? '' : window.location.search);

// Pedido de corte seco para o <CameraDirector />: pula para a tomada sem lerp no próximo frame.
// Começa ligado, para o primeiro frame nunca lerpar a partir da câmera inicial do App.tsx.
export const cameraCut = { pending: true };

interface Transition {
  from: number;
  to: number;
  since: number; // segundos reais desde o início
}

function goTo(n: number, smooth: boolean): Transition | null {
  const b = beatByNumber(n);
  const s = useClock.getState();
  s.pause();
  s.setScenario(b.scenarioId);
  s.selectShip(b.shipId);
  s.setBeat(b.n);
  if (smooth) return s.t !== b.t ? { from: s.t, to: b.t, since: 0 } : null;
  s.seek(b.t);
  cameraCut.pending = true;
  return null;
}

export function Director() {
  const transition = useRef<Transition | null>(null);
  const recordElapsed = useRef(0);

  useEffect(() => {
    transition.current = goTo(PARAMS.record ? 1 : (PARAMS.beat ?? 1), false);
    if (PARAMS.record) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      // Captura antes do slider da linha do tempo: a seta sempre troca de beat.
      e.preventDefault();
      e.stopPropagation();
      const next = useClock.getState().beat + (e.key === 'ArrowRight' ? 1 : -1);
      if (next < 1 || next > BEAT_COUNT) return;
      transition.current = goTo(next, true);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  useFrame((_, delta) => {
    const s = useClock.getState();
    if (!s.file) return; // o roteiro só começa com o scenario.json carregado

    if (PARAMS.record) {
      recordElapsed.current += delta;
      const { n } = recordBeatAt(recordElapsed.current);
      if (n !== s.beat) transition.current = goTo(n, true);
    }

    const tr = transition.current;
    if (tr) {
      tr.since += delta;
      s.seek(transitionT(tr.from, tr.to, tr.since));
      if (tr.since >= TIME_TRANSITION_S) transition.current = null;
    }
  });

  return null;
}
