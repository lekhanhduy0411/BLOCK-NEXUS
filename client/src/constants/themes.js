import {
  GAME_BACKGROUNDS,
  GAME_BACKGROUND_MAP,
  getBackgroundById,
} from '../data/backgrounds';

export const BACKGROUND_THEMES = GAME_BACKGROUNDS;
export const BACKGROUND_THEME_MAP = GAME_BACKGROUND_MAP;
export const getThemeById = getBackgroundById;

export const BLOCK_SKINS = [
  {
    id: 'CYBER_NEON',
    name: 'Neon Hiện Đại',
    description: 'Viền phát sáng sắc nét cùng lõi tối tinh xảo',
    previewColors: ['#00f3ff', '#bc13fe', '#f59e0b'],
  },
  {
    id: 'CLASSIC_GLOSSY',
    name: 'Khối Bóng Cổ Điển',
    description: 'Khối 3D vát cạnh nổi bật phong cách cổ điển',
    previewColors: ['#38bdf8', '#f43f5e', '#22c55e'],
  },
  {
    id: 'SPATIAL_GLASS',
    name: 'Pha Lê Kính Mờ',
    description: 'Khối pha lê trong suốt phản chiếu ánh sáng dịu',
    previewColors: ['#67e8f9', '#d8b4fe', '#fde68a'],
  },
];

export const DEFAULT_SETTINGS = {
  sound: true,
  bgm: false,
  vibration: true,
  ghostPreview: true,
  motionTrail: true,
  blockSkin: 'CYBER_NEON',
  backdropDim: 0.35,
  backdropBlur: false,
};
