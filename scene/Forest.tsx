import { useMemo } from 'react';
import { Color, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { SCENE_COLORS } from './palette.ts';
import { treeTransforms } from './portLayout.ts';

// Mata low-poly em volta do porto (WAG-751): copas achatadas de floresta tropical, posições fixas
// (PRNG semeado em portLayout.ts). Um InstancedMesh com cor por instância: uma draw call.
export function Forest() {
  const trees = treeTransforms();
  const geometry = useMemo(() => {
    const g = new IcosahedronGeometry(1, 0);
    g.deleteAttribute('uv');
    return g;
  }, []);

  const setRef = (m: InstancedMesh | null) => {
    if (!m) return;
    const mat = new Matrix4();
    const pos = new Vector3();
    const scale = new Vector3();
    const q = new Quaternion();
    const palette = SCENE_COLORS.forest.map((c) => new Color(c));
    trees.forEach((t, i) => {
      pos.set(t.x, t.s * 0.55, t.z);
      scale.set(t.s, t.s * 0.75, t.s);
      m.setMatrixAt(i, mat.compose(pos, q, scale));
      m.setColorAt(i, palette[t.c]!);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  return (
    <instancedMesh ref={setRef} args={[geometry, undefined, trees.length]}>
      <meshLambertMaterial flatShading />
    </instancedMesh>
  );
}
