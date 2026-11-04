import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Line, LineBasicMaterial, Matrix4 } from 'three';
import type { Group, InstancedMesh } from 'three';
import { activeScenario, useClock } from '../clock/store.ts';
import { riverAt } from '../data/selectors.ts';
import { BOARD } from './Board.tsx';
import { ANCHORAGE_SLOTS, corridorCurve, rightOf } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { MOORING_BUOYS } from './portLayout.ts';
import { buildRiverGeometry, LEVEL_REF_M, OCEAN_X0, waterY } from './river.ts';

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

// Boias: três nas posições de fundeio e duas de amarração no berço (WAG-751). InstancedMesh: uma draw call.
const BUOYS = [...ANCHORAGE_SLOTS, ...MOORING_BUOYS];
// Rótulo do fundeio ao norte da vaga mais perto do berço, puxado para oeste: nas tomadas port e yard,
// o leste do fundeio fica atrás do painel de KPIs.
const FUNDEIO_LABEL = ANCHORAGE_SLOTS[2]!.clone()
  .addScaledVector(rightOf(1), 2.6)
  .addScaledVector(corridorCurve.getTangentAt(1), 3);

function Buoys() {
  const setRef = (m: InstancedMesh | null) => {
    if (!m) return;
    const mat = new Matrix4();
    BUOYS.forEach((p, i) => m.setMatrixAt(i, mat.makeTranslation(p.x, 0.25, p.z)));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh ref={setRef} args={[undefined, undefined, BUOYS.length]}>
        <cylinderGeometry args={[0.35, 0.35, 0.5, 6]} />
        <meshLambertMaterial color={SCENE_COLORS.buoy} flatShading />
      </instancedMesh>
      <Label position={[FUNDEIO_LABEL.x, 1.2, FUNDEIO_LABEL.z]} text="Fundeio" size={1.1} color={SCENE_COLORS.labelMuted} />
    </>
  );
}
