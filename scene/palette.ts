// Cores da cena (WAG-737). Fundo e superfícies vêm de docs/tokens.md; o ocre de acento
// (#C2622D) fica de fora de propósito: é só para seleção e marca.

export const SCENE_COLORS = {
  background: '#0E1A22',
  board: '#15252F',
  water: '#1C4A5E',
  centerline: '#FFFFFF',
  pin: '#8FA3AE',
  pier: '#5E6E78',
  shiploader: '#A9B6BD',
  conveyor: '#4A5A64',
  pileDry: '#8A5236', // bauxita seca
  pileWet: '#6A4434', // bauxita úmida
  capacity: '#FFFFFF',
  gauge: '#D8E0E5',
  draftLimit: '#E25A4F', // status vermelho
  levelMarker: '#E3A13B', // status âmbar
  buoy: '#E3A13B',
  label: '#E8EEF2',
  labelMuted: '#9FB0BA',
} as const;
