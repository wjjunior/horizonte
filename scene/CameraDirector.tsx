import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useClock } from '../clock/store.ts';
import { beatByNumber } from '../demo/beats.ts';
import { cameraCut } from '../demo/Director.tsx';
import { SHOTS } from './shots.ts';

// Taxa do lerp amortecido, por segundo: 1 - e^(-λ·delta) independe do frame rate.
// Com λ = 2,2, a câmera cobre 90% do caminho em ~1 s e 99% em ~2 s.
export const CAMERA_DAMPING = 2.2;

// Diretor de câmera (WAG-740): segue a tomada do beat atual do store.
// Corte seco quando o diretor pede (entrada por &beat=N, determinística); senão, lerp amortecido.
export function CameraDirector() {
  const camera = useThree((s) => s.camera);
  const v = useMemo(() => ({ pos: new Vector3(), target: new Vector3(), goalPos: new Vector3(), goalTarget: new Vector3() }), []);

  useFrame((_, delta) => {
    const shot = SHOTS[beatByNumber(useClock.getState().beat).shot];
    v.goalPos.set(...shot.position);
    v.goalTarget.set(...shot.target);
    if (cameraCut.pending) {
      v.pos.copy(v.goalPos);
      v.target.copy(v.goalTarget);
      cameraCut.pending = false;
    } else {
      const k = 1 - Math.exp(-CAMERA_DAMPING * delta);
      v.pos.lerp(v.goalPos, k);
      v.target.lerp(v.goalTarget, k);
    }
    camera.position.copy(v.pos);
    camera.lookAt(v.target);
  });

  return null;
}
