import { Matrix4 } from 'three';
import type { InstancedMesh } from 'three';
import { PLACE_U, PLACES, rightOf } from './corridor.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { riverWidthAt } from './river.ts';

// Pinos e rótulos dos 6 lugares do corredor, mais o aviso "esquemático, fora de escala".
const PIN_H = 1.6;

const pins = PLACES.map((p) => {
  const u = PLACE_U[p.id];
  // labelSide 1 = margem de +z = esquerda de quem sobe (-rightOf).
  const side = rightOf(u).multiplyScalar(-p.labelSide * (riverWidthAt(u) / 2 + 1.2 + (p.labelGap ?? 0)));
  return { place: p, at: p.labelAt?.clone() ?? p.position.clone().add(side) };
});

export function Corridor() {
  const setRef = (m: InstancedMesh | null) => {
    if (!m) return;
    const mat = new Matrix4();
    pins.forEach(({ at }, i) => m.setMatrixAt(i, mat.makeTranslation(at.x, PIN_H / 2, at.z)));
    m.instanceMatrix.needsUpdate = true;
  };
  return (
    <>
      <instancedMesh ref={setRef} args={[undefined, undefined, pins.length]}>
        <cylinderGeometry args={[0.18, 0.18, PIN_H, 5]} />
        <meshLambertMaterial color={SCENE_COLORS.pin} flatShading />
      </instancedMesh>
      {pins.map(({ place, at }) => (
        <Label
          key={place.id}
          position={[at.x, PIN_H + 0.3, at.z]}
          text={place.note ? `${place.name}\n${place.note}` : place.name}
          size={1.5}
        />
      ))}
      <Label
        position={[-38, 0.6, 19]}
        text="Esquemático, fora de escala"
        size={1.5}
        color={SCENE_COLORS.labelMuted}
        anchorX="left"
      />
    </>
  );
}
