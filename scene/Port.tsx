import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, CylinderGeometry, Float32BufferAttribute } from 'three';
import type { Group } from 'three';
import { activeScenario, useClock } from '../clock/store.ts';
import { yardAt } from '../data/selectors.ts';
import { BERTH_POSITION, corridorCurve } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';

// Diorama do Porto Trombetas (WAG-737): berço único com píer e shiploader, correia até o pátio
// e as pilhas seca e úmida. Coordenadas locais do porto: +x ao longo do canal (sentido de subida),
// +z para a terra (rightOf), origem no ponto de atracação do navio.

export const PILE_MAX_H = 4; // altura da pilha a 100% da capacidade
const PIER = { len: 8, width: 1.4, top: 2.1, z: 2.4 };

interface PileSpec {
  pile: 'seca' | 'umida';
  name: string;
  color: string;
  x: number;
  z: number;
  len: number;
  depth: number;
}

const PILES: PileSpec[] = [
  { pile: 'seca', name: 'Seco', color: SCENE_COLORS.pileDry, x: -6, z: 8, len: 6, depth: 3.6 },
  { pile: 'umida', name: 'Úmido', color: SCENE_COLORS.pileWet, x: 4.5, z: 9, len: 7.5, depth: 4.6 },
];

// Tronco de pirâmide com base unitária em [-0,5, 0,5] e altura 1 a partir de y = 0.
function pileGeometry() {
  const g = new CylinderGeometry(0.55, 1, 1, 4, 1, false, Math.PI / 4);
  g.translate(0, 0.5, 0);
  g.scale(Math.SQRT1_2, 1, Math.SQRT1_2);
  return g;
}

// Retângulo da linha de capacidade, na altura de 100%.
function capacityOutline(len: number, depth: number) {
  const x = len / 2;
  const z = depth / 2;
  const y = PILE_MAX_H;
  const v = [-x, y, -z, x, y, -z, x, y, -z, x, y, z, x, y, z, -x, y, z, -x, y, z, -x, y, -z];
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(v, 3));
}

const t = corridorCurve.getTangentAt(1);
const YAW = Math.atan2(-t.z, t.x);

export function Port() {
  return (
    <group position={[BERTH_POSITION.x, 0, BERTH_POSITION.z]} rotation={[0, YAW, 0]}>
      {/* Píer do berço único */}
      <mesh position={[0, PIER.top / 2, PIER.z]}>
        <boxGeometry args={[PIER.len, PIER.top, PIER.width]} />
        <meshLambertMaterial color={SCENE_COLORS.pier} flatShading />
      </mesh>
      <Label position={[-PIER.len / 2 - 0.5, PIER.top + 0.3, PIER.z]} text="Berço único" size={1.1} anchorX="right" />
      {/* Shiploader: torre no píer e lança sobre o navio */}
      <mesh position={[1, PIER.top + 1.5, PIER.z + 0.2]}>
        <boxGeometry args={[0.8, 3, 0.8]} />
        <meshLambertMaterial color={SCENE_COLORS.shiploader} flatShading />
      </mesh>
      <mesh position={[1, PIER.top + 2.8, PIER.z - 1.4]}>
        <boxGeometry args={[0.45, 0.4, 3.6]} />
        <meshLambertMaterial color={SCENE_COLORS.shiploader} flatShading />
      </mesh>
      {/* Correia do pátio ao shiploader */}
      <mesh position={[1, 0.5, (PIER.z + PILES[0]!.z) / 2 + 0.3]}>
        <boxGeometry args={[0.4, 0.3, PILES[0]!.z - PIER.z - 1.5]} />
        <meshLambertMaterial color={SCENE_COLORS.conveyor} flatShading />
      </mesh>
      {PILES.map((p) => (
        <Pile key={p.pile} spec={p} />
      ))}
    </group>
  );
}

function Pile({ spec }: { spec: PileSpec }) {
  const geometry = useMemo(() => pileGeometry(), []);
  const outline = useMemo(() => capacityOutline(spec.len, spec.depth), [spec.len, spec.depth]);
  const body = useRef<Group>(null);
  const label = useRef<{ text: string; sync: () => void }>(null);

  useFrame(() => {
    const s = useClock.getState();
    const sc = activeScenario(s);
    if (!sc) return;
    const pct = yardAt(sc, s.t)[spec.pile].pct.p50;
    if (body.current) body.current.scale.y = Math.max(0.02, (pct / 100) * PILE_MAX_H);
    const text = `${spec.name} ${Math.round(pct)}%`;
    if (label.current && label.current.text !== text) {
      label.current.text = text;
      label.current.sync();
    }
  });

  return (
    <group position={[spec.x, 0, spec.z]}>
      <group ref={body} scale={[1, 0.02, 1]}>
        <mesh geometry={geometry} scale={[spec.len, 1, spec.depth]}>
          <meshLambertMaterial color={spec.color} flatShading />
        </mesh>
      </group>
      <lineSegments geometry={outline}>
        <lineBasicMaterial color={SCENE_COLORS.capacity} transparent opacity={0.7} />
      </lineSegments>
      <Label ref={label} position={[0, PILE_MAX_H + 0.4, 0]} text={spec.name} size={1.2} />
    </group>
  );
}
