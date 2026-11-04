import { SCENE_COLORS } from './palette.ts';

// Base do diorama: uma placa com o topo em y = 0. O Atlântico fica no grupo da água (River.tsx).
export const BOARD = { minX: -65, maxX: 75, minZ: -37, maxZ: 27 } as const;

export function Board() {
  const w = BOARD.maxX - BOARD.minX;
  const d = BOARD.maxZ - BOARD.minZ;
  return (
    <mesh position={[(BOARD.minX + BOARD.maxX) / 2, -1, (BOARD.minZ + BOARD.maxZ) / 2]}>
      <boxGeometry args={[w, 2, d]} />
      <meshLambertMaterial color={SCENE_COLORS.board} flatShading />
    </mesh>
  );
}
