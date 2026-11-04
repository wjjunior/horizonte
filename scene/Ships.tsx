import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import type { Group, InstancedMesh, Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { activeScenario, useClock } from '../clock/store.ts';
import { riverAt, shipAt } from '../data/selectors.ts';
import { SHIP_IDS } from '../docs/schema.ts';
import type { ShipId } from '../docs/schema.ts';
import { Label } from './Label.tsx';
import { SCENE_COLORS } from './palette.ts';
import { waterY } from './river.ts';
import {
  ACCENT_HEX,
  assignAnchorageSlots,
  INBOUND_LANE,
  newPose,
  RIBBON_SEGMENTS,
  seaQueueRanks,
  shipPose,
  STATUS_HEX,
  statusColor,
  writeRibbon,
} from './ships.ts';

// Navios e faixas de incerteza (WAG-739). Regras de pose, cor e fila em ships.ts.
// Draw calls: cascos (1, InstancedMesh), faixas (1, um BufferGeometry com as 7), anel de seleção (1,
// só quando há navio selecionado) e um rótulo por navio (7).

const N = SHIP_IDS.length;
const VERTS_PER_RIBBON = (RIBBON_SEGMENTS + 1) * 2;
const RIBBON_ALPHA = 0.18; // branco a 18%
const RIBBON_ALPHA_RED = 0.45; // faixa vermelha do navio em risco (C no beat 2)
const HULL_Y = 0.02;
const RIBBON_Y = 0.06;
type LabelMode = 'above' | 'below' | 'sea';
const LABEL_OFFSET: Record<LabelMode, [number, number, number]> = {
  above: [0, 1.6, 0],
  below: [0, 0.3, 1.4], // +z fica mais perto da câmera: abaixo do casco na tela
  sea: [-1.4, 0.4, 0], // na fila do Atlântico, à esquerda do casco
};

// Parte do mesh do troika que o rótulo usa para trocar a âncora sem re-render.
interface TroikaText {
  anchorX: string;
  anchorY: string;
  sync: () => void;
}

// Casco low-poly: proa em +x, comprimento 3, boca 0.8, com a superestrutura na popa.
function buildHullGeometry(): BufferGeometry {
  const s = new Shape();
  s.moveTo(-1.5, -0.4);
  s.lineTo(1.0, -0.4);
  s.lineTo(1.5, 0);
  s.lineTo(1.0, 0.4);
  s.lineTo(-1.5, 0.4);
  s.closePath();
  const hull = new ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
  hull.rotateX(-Math.PI / 2); // extrusão vira altura (y)
  const bridge = new BoxGeometry(0.55, 0.6, 0.62).toNonIndexed();
  bridge.translate(-1.1, 0.45 + 0.3, 0);
  hull.deleteAttribute('uv');
  bridge.deleteAttribute('uv');
  return mergeGeometries([hull, bridge])!;
}

function buildRibbonGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  const pos = new BufferAttribute(new Float32Array(N * VERTS_PER_RIBBON * 3), 3).setUsage(DynamicDrawUsage);
  const col = new BufferAttribute(new Float32Array(N * VERTS_PER_RIBBON * 4), 4).setUsage(DynamicDrawUsage);
  const idx: number[] = [];
  for (let s = 0; s < N; s++) {
    const base = s * VERTS_PER_RIBBON;
    for (let i = 0; i < RIBBON_SEGMENTS; i++) {
      const a = base + i * 2;
      const b = a + 2;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  g.setAttribute('position', pos);
  g.setAttribute('color', col);
  g.setIndex(idx);
  return g;
}

const STATUS_COLOR = {
  green: new Color(STATUS_HEX.green),
  amber: new Color(STATUS_HEX.amber),
  red: new Color(STATUS_HEX.red),
};
const WHITE = new Color('#FFFFFF');

const cargoText = (cargo: 'seca' | 'umida') => (cargo === 'seca' ? 'seco' : 'úmido');

export function Ships() {
  const file = useClock((s) => s.file);
  const scenarioId = useClock((s) => s.scenarioId);
  const selected = useClock((s) => s.selectedShipId);

  const hulls = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh>(null);
  const labels = useRef<(Group | null)[]>([]);
  const texts = useRef<(TroikaText | null)[]>([]);
  const labelMode = useRef<LabelMode[]>([]);
  const hullGeometry = useMemo(() => buildHullGeometry(), []);
  const ribbonGeometry = useMemo(() => buildRibbonGeometry(), []);

  // Vagas de fundeio e fila do Atlântico: fixas por cenário.
  const plan = useMemo(() => {
    const sc = file && activeScenario({ file, scenarioId });
    if (!sc) return null;
    return {
      anchor: assignAnchorageSlots(sc.forecasts),
      sea: seaQueueRanks(sc.forecasts),
      forecast: new Map(sc.forecasts.map((fc) => [fc.shipId, fc])),
      color: new Map(sc.forecasts.map((fc) => [fc.shipId, statusColor(fc.pDelay)])),
    };
  }, [file, scenarioId]);

  const work = useMemo(
    () => ({ pose: newPose(), m: new Matrix4(), q: new Quaternion(), s: new Vector3(1, 1, 1), up: new Vector3(0, 1, 0) }),
    [],
  );

  useFrame(() => {
    const st = useClock.getState();
    const sc = activeScenario(st);
    const mesh = hulls.current;
    if (!sc || !plan || !mesh) return;
    const wy = waterY(riverAt(sc, st.t).levelM.p50);
    const positions = ribbonGeometry.getAttribute('position') as BufferAttribute;
    const colors = ribbonGeometry.getAttribute('color') as BufferAttribute;
    const { pose, m, q, s, up } = work;
    let ringShown = false;

    SHIP_IDS.forEach((id, i) => {
      const fc = plan.forecast.get(id);
      const sp = shipAt(sc, id, st.t);
      if (!fc || !sp) {
        pose.visible = false;
      } else {
        shipPose(sp, { forecast: fc, anchorSlot: plan.anchor.get(id), seaRank: plan.sea.get(id), t: st.t }, pose);
      }
      const label = labels.current[i];

      if (pose.visible) {
        q.setFromAxisAngle(up, pose.yaw);
        pose.position.y = wy + HULL_Y;
        m.compose(pose.position, q, s);
        // Rótulo: à esquerda na fila do Atlântico; acima do casco na faixa A; abaixo (na tela) na faixa B,
        // para o C e o D, que sobem lado a lado, não se cobrirem (só até o fundeio, onde o rótulo "Fundeio" fica embaixo).
        const mode: LabelMode = pose.atSea ? 'sea' : INBOUND_LANE[id] < 0 && sp && sp.index < 2 ? 'below' : 'above';
        if (label) {
          const o = LABEL_OFFSET[mode];
          label.position.set(pose.position.x + o[0], wy + o[1], pose.position.z + o[2]);
        }
        const text = texts.current[i];
        if (text && labelMode.current[i] !== mode) {
          labelMode.current[i] = mode;
          text.anchorX = mode === 'sea' ? 'right' : 'center';
          text.anchorY = mode === 'sea' ? 'middle' : mode === 'below' ? 'top' : 'bottom';
          text.sync();
        }
        if (st.selectedShipId === id && ring.current) {
          ring.current.position.set(pose.position.x, wy + RIBBON_Y + 0.01, pose.position.z);
          ringShown = true;
        }
      } else {
        m.makeScale(0, 0, 0);
      }
      mesh.setMatrixAt(i, m);
      if (label) label.visible = pose.visible;

      const status = plan.color.get(id) ?? 'green';
      mesh.setColorAt(i, STATUS_COLOR[status]);

      // Faixa de incerteza
      const shown = sp ? writeRibbon(positions.array as Float32Array, i * VERTS_PER_RIBBON, sp, pose.visible, wy + RIBBON_Y) : false;
      const c = status === 'red' ? STATUS_COLOR.red : WHITE;
      const a = shown ? (status === 'red' ? RIBBON_ALPHA_RED : RIBBON_ALPHA) : 0;
      const ca = colors.array as Float32Array;
      for (let v = 0; v < VERTS_PER_RIBBON; v++) {
        const k = (i * VERTS_PER_RIBBON + v) * 4;
        ca[k] = c.r;
        ca[k + 1] = c.g;
        ca[k + 2] = c.b;
        ca[k + 3] = a;
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    if (ring.current) ring.current.visible = ringShown;
  });

  const ships = file?.ships ?? [];

  return (
    <>
      <instancedMesh ref={hulls} args={[hullGeometry, undefined, N]} frustumCulled={false}>
        <meshLambertMaterial color="#FFFFFF" flatShading />
      </instancedMesh>
      <mesh geometry={ribbonGeometry} frustumCulled={false} renderOrder={1}>
        <meshBasicMaterial vertexColors transparent depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={2}>
        <ringGeometry args={[2.0, 2.4, 32]} />
        <meshBasicMaterial color={ACCENT_HEX} />
      </mesh>
      {SHIP_IDS.map((id: ShipId, i) => {
        const ship = ships.find((s) => s.id === id);
        return (
          <group key={id} ref={(g) => void (labels.current[i] = g)} visible={false}>
            <Label
              ref={(tx) => void (texts.current[i] = tx as TroikaText | null)}
              position={[0, 0, 0]}
              text={ship ? `${id} · ${cargoText(ship.cargo)}` : id}
              size={1.5}
              color={selected === id ? ACCENT_HEX : SCENE_COLORS.label}
            />
          </group>
        );
      })}
    </>
  );
}
