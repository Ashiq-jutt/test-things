// Each theme cycles through its backgrounds, one per scene.
export const THEMES = {
  midnight: {
    backgrounds: [
      ['#0b1026', '#2b1a5c'],
      ['#0a1f3d', '#0f4c75'],
      ['#1a0b2e', '#5b1a6b'],
      ['#071a2b', '#14506b'],
    ],
    text: '#ffffff',
    accent: '#ffd23f',
    glow: 'rgba(120, 140, 255, 0.35)',
  },
  sunset: {
    backgrounds: [
      ['#2b0a3d', '#c2185b'],
      ['#3d0a1f', '#e65100'],
      ['#1f0a3d', '#ad1457'],
      ['#3d1a0a', '#d84315'],
    ],
    text: '#ffffff',
    accent: '#ffe066',
    glow: 'rgba(255, 170, 90, 0.35)',
  },
  forest: {
    backgrounds: [
      ['#06201a', '#1b5e3f'],
      ['#0a2a2a', '#00695c'],
      ['#10240c', '#33691e'],
      ['#06262e', '#0b6e6e'],
    ],
    text: '#ffffff',
    accent: '#c6ff4d',
    glow: 'rgba(120, 255, 180, 0.3)',
  },
  paper: {
    backgrounds: [
      ['#f7f3ea', '#e8dfca'],
      ['#f1f5f4', '#d5e4e0'],
      ['#f8eeee', '#ecd3d3'],
      ['#eef1f8', '#d3daec'],
    ],
    text: '#1a1a1a',
    accent: '#d6336c',
    glow: 'rgba(255, 255, 255, 0.6)',
  },
};

export const DEFAULT_THEME = 'midnight';
