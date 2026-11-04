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
  // Planta do porto (WAG-751), paleta A: natural, mas apagada dentro do tema escuro. Nenhuma destas
  // pode ser confundida com o verde, o âmbar ou o vermelho de status, nem com o ocre de seleção.
  forest: ['#27403A', '#31503F', '#2B4838'], // mata em verde-petróleo apagado
  yardGround: '#3E2A22', // chão de bauxita, ocre escuro
  shedWall: '#4A3A33',
  shedRoof: '#6E4030', // telhado de duas águas do galpão
  building: '#4E5A61', // Usina II e Secagem
  house: '#3A4A52', // vila de Porto Trombetas
  houseRoof: '#553A30',
  tank: '#7D8A92', // tanques da VIBRA
  rail: '#2E3A40', // ferrovia e trilhos do pátio
} as const;
