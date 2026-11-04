import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Group, Mesh } from 'three';
import { activeScenario, useClock } from '../clock/store.ts';
import { riverAt } from '../data/selectors.ts';
import { PLACE_U, place, rightOf } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { riverWidthAt, waterY } from './river.ts';

// Régua de Óbidos: poste graduado de 11 m a 13 m (marca a cada 0,25 m), barra vermelha no
// calado limite e marcador âmbar no nível P50 atual. Mesma escala vertical da água.
const MIN_M = 11;
const MAX_M = 13;
const fmt = (m: number) => m.toFixed(2).replace('.', ',');

export function Gauge() {
  const obidos = place('obidos').position;
  const u = PLACE_U.obidos;
  // Na beira da margem de +z (lado da câmera), dentro d'água: a superfície cruza o poste.
  const pos = useMemo(
    () => obidos.clone().addScaledVector(rightOf(u), -(riverWidthAt(u) / 2 - 0.4)),
    [obidos, u],
  );
  const ticks = useMemo(() => {
    const v: number[] = [];
    for (let m = MIN_M; m <= MAX_M + 1e-6; m += 0.25) {
      const y = waterY(m);
      const len = Math.abs(m - Math.round(m)) < 1e-6 ? 0.9 : 0.45;
      v.push(-0.2, y, 0.21, -0.2 - len, y, 0.21);
    }
    return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(v, 3));
  }, []);

  const marker = useRef<Mesh>(null);
  const levelLabel = useRef<{ text: string; sync: () => void }>(null);
  const limitLabel = useRef<{ text: string; sync: () => void }>(null);
  const limitGroup = useRef<Group>(null);

  useFrame(() => {
    const s = useClock.getState();
    const sc = activeScenario(s);
    if (!sc) return;
    const r = riverAt(sc, s.t);
    const yLevel = waterY(r.levelM.p50);
    const yLimit = waterY(r.draftLimitM);
    if (marker.current) marker.current.position.y = yLevel;
    if (limitGroup.current) limitGroup.current.position.y = yLimit;
    const levelText = `${fmt(r.levelM.p50)} m`;
    if (levelLabel.current && levelLabel.current.text !== levelText) {
      levelLabel.current.text = levelText;
      levelLabel.current.sync();
    }
    const limitText = `calado limite ${fmt(r.draftLimitM)} m`;
    if (limitLabel.current && limitLabel.current.text !== limitText) {
      limitLabel.current.text = limitText;
      limitLabel.current.sync();
    }
  });

  const top = waterY(MAX_M);
  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, top / 2, 0]}>
        <boxGeometry args={[0.4, top, 0.4]} />
        <meshLambertMaterial color={SCENE_COLORS.gauge} flatShading />
      </mesh>
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color={SCENE_COLORS.gauge} />
      </lineSegments>
      <group ref={limitGroup} position={[0, waterY(11.7), 0]}>
        <mesh>
          <boxGeometry args={[2.6, 0.14, 0.5]} />
          <meshBasicMaterial color={SCENE_COLORS.draftLimit} />
        </mesh>
        <Label
          ref={limitLabel}
          position={[1.6, 0, 0]}
          text="calado limite"
          size={1}
          color={SCENE_COLORS.draftLimit}
          anchorX="left"
          anchorY="middle"
        />
      </group>
      <mesh ref={marker} position={[0.75, waterY(12), 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.35, 0.7, 3]} />
        <meshBasicMaterial color={SCENE_COLORS.levelMarker} />
      </mesh>
      <Label ref={levelLabel} position={[0, top + 0.4, 0]} text="" size={1.1} color={SCENE_COLORS.levelMarker} />
    </group>
  );
}
