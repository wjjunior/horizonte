import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import type { Group } from 'three';
import { activeScenario, useClock } from '../clock/store.ts';
import { yardAt } from '../data/selectors.ts';
import { BERTH_POSITION, place } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { buildStructures, LAGOA_AT, PILE_LAYOUT, PORT_YAW } from './portLayout.ts';
import type { PileLayout } from './portLayout.ts';

// Diorama do Porto Trombetas: berço único, pátio com as pilhas seca e úmida (WAG-737), agora com o
// layout inspirado na planta real (WAG-751): píer com ponte de acesso longa e shiploader, navio paralelo
// à margem sul, correia elevada, galpão, Secagem, VIBRA, Usina II, vila e ferrovia (scene/portLayout.ts).
// Coordenadas locais do porto: +x a jusante (leste), +z para a terra (sul, -rightOf(1)), origem no
// ponto de atracação do navio.

export const PILE_MAX_H = 4; // altura da pilha a 100% da capacidade

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

const tag = place('porto_trombetas').labelAt!;

export function Port() {
  const structures = useMemo(() => buildStructures(), []);
  return (
    <>
      <group position={[BERTH_POSITION.x, 0, BERTH_POSITION.z]} rotation={[0, PORT_YAW, 0]}>
        {/* Píer, correia, galpão, pátio, Secagem, VIBRA, usina, vila e ferrovia: uma draw call */}
        <mesh geometry={structures}>
          <meshLambertMaterial vertexColors flatShading side={DoubleSide} />
        </mesh>
        {/* Na água, a oeste da proa: o rótulo do navio atracado fica acima do casco. */}
        <Label position={[-2.3, 0.6, 0.2]} text="Berço único" size={1.1} anchorX="right" anchorY="middle" />
        {PILE_LAYOUT.map((p) => (
          <Pile key={p.pile} spec={p} />
        ))}
      </group>
      <Label position={[tag.x, 1.6, tag.z]} text="layout inspirado na planta real" size={0.9} color={SCENE_COLORS.labelMuted} anchorY="top" />
      <Label position={[LAGOA_AT.x, 0.6, LAGOA_AT.z]} text="Lagoa Ajudante" size={1} color={SCENE_COLORS.labelMuted} />
    </>
  );
}

function Pile({ spec }: { spec: PileLayout }) {
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
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotY, 0]}>
      <group ref={body} scale={[1, 0.02, 1]}>
        <mesh geometry={geometry} scale={[spec.len, 1, spec.depth]}>
          <meshLambertMaterial color={spec.color} flatShading />
        </mesh>
      </group>
      <lineSegments geometry={outline}>
        <lineBasicMaterial color={SCENE_COLORS.capacity} transparent opacity={0.7} />
      </lineSegments>
      <Label ref={label} position={[spec.labelX, PILE_MAX_H + 0.4, 0]} text={spec.name} size={1.2} />
    </group>
  );
}
