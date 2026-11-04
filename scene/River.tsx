import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Line, LineBasicMaterial, Matrix4 } from 'three';
import type { Group, InstancedMesh } from 'three';
import { activeScenario, useClock } from '../clock/store.ts';
import { riverAt } from '../data/selectors.ts';
import { BOARD } from './Board.tsx';
import { ANCHORAGE_SLOTS, corridorCurve } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { buildRiverGeometry, LEVEL_REF_M, waterY } from './river.ts';

const OCEAN_X0 = 56;

// Água (leito, Atlântico, linha do canal e boias do fundeio) num grupo cuja altura segue
// riverAt(t).levelM.p50. Sem animação de onda (lista de corte).
export function River() {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => buildRiverGeometry(), []);
  const centerline = useMemo(() => {
    const g = new BufferGeometry().setFromPoints(corridorCurve.getSpacedPoints(200).map((p) => p.setY(0.03)));
    return new Line(g, new LineBasicMaterial({ color: SCENE_COLORS.centerline, transparent: true, opacity: 0.18 }));
  }, []);

  useFrame(() => {
    const s = useClock.getState();
    const sc = activeScenario(s);
    if (!sc || !group.current) return;
    group.current.position.y = waterY(riverAt(sc, s.t).levelM.p50);
  });

  return (
    <group ref={group} position={[0, waterY(LEVEL_REF_M + 1), 0]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={SCENE_COLORS.water} />
      </mesh>
      <mesh position={[(OCEAN_X0 + BOARD.maxX) / 2, 0, (BOARD.minZ + BOARD.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOARD.maxX - OCEAN_X0, BOARD.maxZ - BOARD.minZ]} />
        <meshBasicMaterial color={SCENE_COLORS.water} />
      </mesh>
      <primitive object={centerline} />
      <Buoys />
    </group>
  );
}

// Três boias nas posições de fundeio (InstancedMesh: uma draw call).
function Buoys() {
  const setRef = (m: InstancedMesh | null) => {
    if (!m) return;
    const mat = new Matrix4();
    ANCHORAGE_SLOTS.forEach((p, i) => m.setMatrixAt(i, mat.makeTranslation(p.x, 0.25, p.z)));
    m.instanceMatrix.needsUpdate = true;
  };
  const c = ANCHORAGE_SLOTS[1]!;
  return (
    <>
      <instancedMesh ref={setRef} args={[undefined, undefined, ANCHORAGE_SLOTS.length]}>
        <cylinderGeometry args={[0.35, 0.35, 0.5, 6]} />
        <meshLambertMaterial color={SCENE_COLORS.buoy} flatShading />
      </instancedMesh>
      <Label position={[c.x - 2.5, 1.2, c.z + 2.5]} text="Fundeio" size={1.1} color={SCENE_COLORS.labelMuted} />
    </>
  );
}
