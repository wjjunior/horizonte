// Layout do Porto Trombetas inspirado na planta real (WAG-751). Só dados e funções puras.
//
// Modelado à mão a partir de fotos e imagens de satélite usadas só como referência de disposição:
// nada foi decalcado, e nenhuma imagem entra no repo. Fora de escala.
//
// Referencial local do porto: origem no ponto de atracação (BERTH_POSITION), +x a jusante (leste),
// +z para a terra (sul, `-rightOf(1)`). O navio atraca paralelo à margem sul, com a proa para rio acima.
//
// Draw calls: todas as estruturas estáticas saem de `buildStructures()` num só BufferGeometry com cor
// por vértice (1 draw call); a mata é um InstancedMesh (1 draw call, em Forest.tsx).

import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BERTH_POSITION, corridorCurve, rightOf } from './corridor.ts';
import { SCENE_COLORS } from './palette.ts';
import { waterDistance } from './river.ts';

// ---------------------------------------------------------------------------
// Referencial

const EAST = corridorCurve.getTangentAt(1).negate().setY(0).normalize(); // a jusante
const LAND = rightOf(1).negate(); // margem sul
export const PORT_YAW = Math.atan2(-EAST.z, EAST.x); // rotação em y que leva o +x local para EAST

export function toWorld(x: number, z: number, target = new Vector3()): Vector3 {
  return target.copy(BERTH_POSITION).addScaledVector(EAST, x).addScaledVector(LAND, z).setY(0);
}

export function toLocal(wx: number, wz: number): { x: number; z: number } {
  const dx = wx - BERTH_POSITION.x;
  const dz = wz - BERTH_POSITION.z;
  return { x: dx * EAST.x + dz * EAST.z, z: dx * LAND.x + dz * LAND.z };
}

const tmp = new Vector3();

// z local da margem sul em x local: primeiro ponto em terra andando do berço para o sul.
export function southBankZ(x: number): number {
  for (let z = -6; z < 20; z += 0.05) {
    toWorld(x, z, tmp);
    if (z > -1 && waterDistance(tmp.x, tmp.z) > 0) return z;
  }
  return 20;
}

// ---------------------------------------------------------------------------
// Píer, pilhas e boias

const PIER_X = 0.4;
const BANK_AT_PIER = southBankZ(PIER_X);

// Ponte de acesso longa saindo da margem sul até a plataforma do shiploader, ao lado do costado.
export const PIER = {
  x: PIER_X,
  platformZ: 1.0, // centro da plataforma (o costado do navio fica em z = 0,4)
  rootZ: BANK_AT_PIER + 0.8, // raiz da ponte, já em terra
  deckY: 2.3,
} as const;

export interface PileLayout {
  pile: 'seca' | 'umida';
  name: string;
  color: string;
  x: number; // centro, local
  z: number;
  len: number; // comprimento ao longo do eixo noroeste-sudeste
  depth: number;
  rotY: number; // -π/4: eixo longo de noroeste para sudeste
  labelX: number; // posição do rótulo ao longo do eixo da pilha, para os dois rótulos não se cobrirem
}

// Pilhas longas e paralelas, de noroeste para sudeste, no pátio a sudoeste do píer.
// A seca fica mais perto da correia; a úmida, ao lado, a sudoeste.
const PILE_AXIS = -Math.PI / 4;
export const PILE_LAYOUT: readonly PileLayout[] = [
  { pile: 'seca', name: 'Seco', color: SCENE_COLORS.pileDry, x: -6.4, z: 9.4, len: 7, depth: 3, rotY: PILE_AXIS, labelX: 2.6 },
  { pile: 'umida', name: 'Úmido', color: SCENE_COLORS.pileWet, x: -9.4, z: 12.4, len: 7, depth: 3, rotY: PILE_AXIS, labelX: -2.6 },
];

// Pátio: retângulo de chão de bauxita em volta das pilhas, no mesmo eixo.
const YARD = { x: -7.9, z: 10.9, len: 10, width: 8.4 };

// Duas boias de amarração, uma a vante e outra a ré do navio atracado (coordenadas de mundo).
export const MOORING_BUOYS: readonly Vector3[] = [toWorld(-2.7, -0.9), toWorld(2.9, -0.9)];

// Posição de mundo do rótulo da Lagoa Ajudante.
export const LAGOA_AT = new Vector3(-53, 0, -33);

// ---------------------------------------------------------------------------
// Clareiras (sem mata), em coordenadas locais

type Poly = readonly (readonly [number, number])[];

function rect(x0: number, x1: number, z0: number, z1: number): Poly {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

// Retângulo girado: centro, comprimento no eixo (cos, -sin) de rotY, largura no perpendicular.
function rotRect(cx: number, cz: number, len: number, width: number, rotY: number): Poly {
  const ax = Math.cos(rotY);
  const az = -Math.sin(rotY);
  const px = -az;
  const pz = ax;
  const l = len / 2;
  const w = width / 2;
  return [
    [cx - ax * l - px * w, cz - az * l - pz * w],
    [cx + ax * l - px * w, cz + az * l - pz * w],
    [cx + ax * l + px * w, cz + az * l + pz * w],
    [cx - ax * l + px * w, cz - az * l + pz * w],
  ];
}

export const CLEARINGS: readonly Poly[] = [
  rotRect(YARD.x, YARD.z, YARD.len + 1.6, YARD.width + 1.6, PILE_AXIS), // pátio
  rect(-7.5, 3.5, 2.5, 9), // galpão, raiz do píer e correia
  rect(-4.5, 4.2, 6.5, 13.5), // correia e Secagem
  rect(4, 13, 4.5, 13.5), // vila
  rect(-19, -11.5, -1, 6.8), // VIBRA
  rect(-23, -18.5, -1, 5.2), // Usina II
  rect(-11.5, -6.5, 13, 24), // ferrovia
];

function inPoly(x: number, z: number, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function inClearing(x: number, z: number): boolean {
  return CLEARINGS.some((p) => inPoly(x, z, p));
}

// ---------------------------------------------------------------------------
// Mata

// PRNG semeado (mulberry32): nada de Math.random; a mesma semente gera a mesma mata.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TreeTransform {
  x: number; // mundo
  z: number;
  s: number; // escala da copa
  c: number; // índice da cor em SCENE_COLORS.forest
}

const TREE_SEED = 751;
const TREE_CANDIDATES = 1500;
const TREE_REGION = { minX: -64, maxX: -17, minZ: -36, maxZ: 4 }; // mundo: região do porto

const TREES: readonly TreeTransform[] = (() => {
  const rnd = mulberry32(TREE_SEED);
  const out: TreeTransform[] = [];
  for (let i = 0; i < TREE_CANDIDATES; i++) {
    const x = TREE_REGION.minX + rnd() * (TREE_REGION.maxX - TREE_REGION.minX);
    const z = TREE_REGION.minZ + rnd() * (TREE_REGION.maxZ - TREE_REGION.minZ);
    const s = 0.55 + rnd() * 0.5;
    const c = Math.floor(rnd() * SCENE_COLORS.forest.length);
    if (waterDistance(x, z) < 0.6 + s * 0.4) continue;
    const l = toLocal(x, z);
    if (inClearing(l.x, l.z)) continue;
    out.push({ x, z, s, c });
  }
  return out;
})();

export function treeTransforms(): readonly TreeTransform[] {
  return TREES;
}

// ---------------------------------------------------------------------------
// Estruturas estáticas (local), num só BufferGeometry com cor por vértice

const parts: BufferGeometry[] = [];
const col = new Color();

function add(g: BufferGeometry, color: string) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng.getAttribute('uv')) ng.deleteAttribute('uv');
  if (!ng.getAttribute('normal')) ng.computeVertexNormals();
  col.set(color);
  const n = ng.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3);
  ng.setAttribute('color', new Float32BufferAttribute(c, 3));
  parts.push(ng);
}

function box(cx: number, y0: number, cz: number, sx: number, sy: number, sz: number, color: string, rotY = 0) {
  const g = new BoxGeometry(sx, sy, sz);
  g.rotateY(rotY);
  g.translate(cx, y0 + sy / 2, cz);
  add(g, color);
}

function cyl(cx: number, y0: number, cz: number, r: number, h: number, color: string, seg = 8) {
  const g = new CylinderGeometry(r, r, h, seg);
  g.translate(cx, y0 + h / 2, cz);
  add(g, color);
}

// Triângulos soltos (não indexados), com normais planas.
function tris(v: number[], color: string) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  add(g, color);
}

// Barra entre dois pontos (correia, trilho), com seção sx × sy.
function beam(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, w: number, h: number, color: string) {
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const g = new BoxGeometry(len, h, w);
  g.rotateZ(Math.atan2(y1 - y0, Math.hypot(x1 - x0, z1 - z0)));
  g.rotateY(Math.atan2(-(z1 - z0), x1 - x0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  add(g, color);
}

// Chão plano: polígono convexo em leque, logo acima da placa.
function ground(poly: Poly, y: number, color: string) {
  const v: number[] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    for (const k of [0, i + 1, i]) v.push(poly[k]![0], y, poly[k]![1]);
  }
  tris(v, color);
}

// Prédio com telhado em duas águas: comprimento em x, largura em z (antes de girar).
function gabled(cx: number, cz: number, len: number, wid: number, wallH: number, ridgeH: number, rotY: number, wall: string, roof: string) {
  const g = new BoxGeometry(len, wallH, wid);
  g.translate(0, wallH / 2, 0);
  g.rotateY(rotY);
  g.translate(cx, 0, cz);
  add(g, wall);
  const a = len / 2;
  const b = wid / 2 + 0.08; // beiral
  const e = wallH;
  const r = ridgeH;
  const v = [
    -a, e, -b, a, r, 0, a, e, -b,
    -a, e, -b, -a, r, 0, a, r, 0,
    -a, e, b, a, e, b, a, r, 0,
    -a, e, b, a, r, 0, -a, r, 0,
    -a, e, -b, -a, e, b, -a, r, 0,
    a, e, -b, a, r, 0, a, e, b,
  ];
  const rg = new BufferGeometry();
  rg.setAttribute('position', new Float32BufferAttribute(v, 3));
  rg.rotateY(rotY);
  rg.translate(cx, 0, cz);
  rg.computeVertexNormals();
  add(rg, roof);
}

function buildParts() {
  const C = SCENE_COLORS;
  const { x: px, platformZ, rootZ, deckY } = PIER;

  // Píer: plataforma do shiploader ao lado do costado e ponte de acesso longa até a margem sul.
  box(px, deckY - 0.35, platformZ, 1.6, 0.35, 0.9, C.pier);
  box(px, deckY - 0.2, (platformZ + 0.45 + rootZ) / 2, 0.36, 0.2, rootZ - platformZ - 0.45, C.pier);
  for (let z = platformZ + 0.9; z < rootZ; z += 0.9) box(px, 0, z, 0.12, deckY - 0.2, 0.12, C.conveyor);
  for (const dx of [-0.6, 0.6]) box(px + dx, 0, platformZ, 0.2, deckY - 0.35, 0.2, C.conveyor);
  // Shiploader: torre na plataforma e lança sobre o porão do navio.
  box(px + 0.2, deckY, platformZ + 0.15, 0.55, 2.1, 0.55, C.shiploader);
  box(px + 0.2, deckY + 1.75, platformZ - 0.75, 0.3, 0.3, 2.1, C.shiploader);
  box(px + 0.2, deckY + 1.0, platformZ - 1.55, 0.18, 0.75, 0.18, C.shiploader);
  // Dolfins de atracação, a vante e a ré.
  for (const dx of [-2.0, 2.2]) {
    box(dx, 0, 0.8, 0.5, deckY - 0.3, 0.5, C.pier);
    beam(dx, deckY - 0.3, 0.8, px + (dx < 0 ? -0.8 : 0.8), deckY - 0.3, platformZ, 0.12, 0.1, C.conveyor);
  }

  // Correia elevada sobre pilares: da raiz do píer até a ponta da pilha seca.
  const belt: [number, number, number][] = [
    [px, deckY - 0.2, rootZ],
    [px, 1.9, rootZ + 2.6],
    [-3.6, 1.4, 7.6],
  ];
  for (let i = 1; i < belt.length; i++) {
    const [x0, y0, z0] = belt[i - 1]!;
    const [x1, y1, z1] = belt[i]!;
    beam(x0, y0, z0, x1, y1, z1, 0.32, 0.22, C.conveyor);
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.1));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      box(x0 + (x1 - x0) * f, 0, z0 + (z1 - z0) * f, 0.12, y0 + (y1 - y0) * f - 0.1, 0.12, C.pier);
    }
  }

  // Galpão grande de telhado em duas águas, junto à margem, a sudoeste do píer.
  gabled(-3.6, BANK_AT_PIER + 1.9, 5.6, 2.1, 1.0, 2.1, 0, C.shedWall, C.shedRoof);

  // Pátio de bauxita, com trilho da empilhadeira entre as pilhas.
  ground(rotRect(YARD.x, YARD.z, YARD.len, YARD.width, PILE_AXIS), 0.02, C.yardGround);
  const [dry, wet] = PILE_LAYOUT;
  const mx = (dry!.x + wet!.x) / 2;
  const mz = (dry!.z + wet!.z) / 2;
  const ax = Math.cos(PILE_AXIS) * 4.2;
  const az = -Math.sin(PILE_AXIS) * 4.2;
  beam(mx - ax, 0.05, mz - az, mx + ax, 0.05, mz + az, 0.18, 0.08, C.rail);
  // Empilhadeira-recuperadora: corpo no trilho e lança sobre a pilha seca.
  box(mx + ax * 0.3, 0.05, mz + az * 0.3, 0.7, 0.9, 0.7, C.shiploader, PILE_AXIS);
  beam(mx + ax * 0.3, 1.2, mz + az * 0.3, dry!.x + ax * 0.3, 2.2, dry!.z + az * 0.3, 0.16, 0.16, C.shiploader);

  // Secagem: bloco com chaminé, a leste do pátio.
  box(1.6, 0, 11.2, 2.2, 1.4, 1.6, C.building);
  cyl(2.4, 1.4, 10.8, 0.18, 1.6, C.building, 6);

  // Base de combustível VIBRA a oeste, com tanques e píer próprio com balsa.
  const vBank = southBankZ(-14.5);
  for (const [x, dz, r, h] of [
    [-14.6, 2.6, 0.8, 0.9],
    [-16.6, 3.2, 0.6, 0.8],
    [-15.2, 4.4, 0.7, 0.7],
  ] as const) {
    cyl(x, 0, vBank + dz, r, h, C.tank, 10);
  }
  box(-13.4, 1.5, vBank - 0.5, 0.25, 0.15, 2.2, C.pier);
  box(-13.4, 0, vBank - 1.9, 2.2, 1.55, 0.7, C.pier);
  // Píer curto entre a VIBRA e o berço.
  const sBank = southBankZ(-8.5);
  box(-8.5, 1.6, sBank - 0.4, 0.3, 0.15, 2.0, C.pier);
  box(-8.5, 0, sBank - 1.6, 0.9, 1.75, 0.9, C.pier);

  // Usina de Geração II, mais a oeste, com duas chaminés.
  const uBank = southBankZ(-20.5);
  box(-20.6, 0, uBank + 2.6, 2.6, 1.3, 1.6, C.building);
  cyl(-21.4, 1.3, uBank + 2.3, 0.16, 1.4, C.building, 6);
  cyl(-20.6, 1.3, uBank + 2.3, 0.16, 1.4, C.building, 6);

  // Vila de Porto Trombetas, a sudeste: casas em grade, com telhado em duas águas.
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k < 6; k++) {
      const x = 5 + k * 1.35 + (row % 2) * 0.5;
      const z = 6.2 + row * 1.35;
      toWorld(x, z, tmp);
      if (waterDistance(tmp.x, tmp.z) < 1) continue;
      gabled(x, z, 0.8, 0.55, 0.45, 0.75, 0, C.house, C.houseRoof);
    }
  }

  // Ferrovia chegando pelo sul ao pátio (o minério vem das minas por trem).
  for (const dx of [-0.18, 0.18]) beam(-8.4 + dx, 0.05, 15.2, -9.6 + dx, 0.05, 23, 0.07, 0.06, C.rail);
}

export function buildStructures(): BufferGeometry {
  parts.length = 0;
  buildParts();
  const g = mergeGeometries(parts)!;
  parts.length = 0;
  return g;
}
