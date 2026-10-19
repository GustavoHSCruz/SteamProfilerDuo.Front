export const colorKeys = [
  'background_color',
  'background_end',
  'surface_color',
  'text_color',
  'muted_color',
  'accent_color',
  'secondary_color',
  'border_color',
];

const preset = (id: string, name: string, colors: string[], effect = 'solid', base = 'dark') => ({
  id,
  name,
  options: {
    ...Object.fromEntries(colorKeys.map((key, i) => [key, colors[i]])),
    theme: base,
    theme_preset: id,
    background_effect: effect,
    effect_strength: '45',
    gradient_angle: '135',
  } as Record<string, string>,
});

export const themes = [
  preset('dark', 'SteamProfiler escuro', [
    '#0b0a0e',
    '#322457',
    '#131219',
    '#eeecf3',
    '#8e8a9b',
    '#ffb454',
    '#6ea8ff',
    '#282631',
  ]),
  preset(
    'light',
    'SteamProfiler claro',
    ['#ffffff', '#e6e2ec', '#f4f2f7', '#1b1a20', '#6b6779', '#c97f22', '#2f6ad0', '#dcd8e4'],
    'solid',
    'light',
  ),
  preset(
    'steam',
    'Steam',
    ['#1b2838', '#2a475e', '#16202d', '#c7d5e0', '#8f98a0', '#66c0f4', '#ffb454', '#2a475e'],
    'solid',
    'steam',
  ),
  preset(
    'aurora',
    'Aurora',
    ['#07191e', '#174e62', '#102d36', '#e0fff9', '#87bab7', '#66edbe', '#a78bfa', '#3c9b99'],
    'aurora',
  ),
  preset(
    'neon',
    'Neon',
    ['#11091f', '#40134d', '#231232', '#faf0ff', '#b9a1cc', '#f472b6', '#8b8bff', '#b656cd'],
    'grid',
  ),
  preset(
    'paper',
    'Papel',
    ['#f5eee1', '#dfccb0', '#fffaf0', '#29221c', '#756858', '#b4472c', '#316a8b', '#b4a28a'],
    'grain',
    'light',
  ),
  preset(
    'ocean',
    'Oceano',
    ['#031728', '#075773', '#082d43', '#e2f6ff', '#8fb5c9', '#38d9ed', '#73a1ff', '#23627c'],
    'gradient',
  ),
  preset(
    'forest',
    'Floresta',
    ['#0a1910', '#284d30', '#15291c', '#eef4dd', '#a2b398', '#b6d76c', '#e6ac68', '#3d5840'],
    'gradient',
  ),
  preset(
    'sunset',
    'Pôr do sol',
    ['#291332', '#943b42', '#42223e', '#fff0e7', '#d4aaa8', '#ffbe76', '#ef81b5', '#8f5265'],
    'gradient',
  ),
  preset(
    'sakura',
    'Sakura',
    ['#fff1f4', '#e8c6dd', '#fff9fb', '#422d40', '#8c657c', '#b73c77', '#7564b2', '#dcb6c9'],
    'gradient',
    'light',
  ),
  preset(
    'dracula',
    'Drácula',
    ['#191923', '#36314f', '#282a36', '#f8f8f2', '#aaa7c2', '#bd93f9', '#50fa7b', '#56516c'],
    'solid',
  ),
  preset(
    'coffee',
    'Café',
    ['#211813', '#614434', '#33261e', '#f5e5ce', '#bea58b', '#e9b878', '#a4c0a1', '#71543e'],
    'grain',
  ),
  preset(
    'midnight',
    'Meia-noite',
    ['#070b1e', '#252758', '#111731', '#e8edff', '#939fc8', '#a1b4ff', '#d7a1f9', '#343f71'],
    'gradient',
  ),
  preset(
    'arctic',
    'Ártico',
    ['#eef6fa', '#c9e4ee', '#ffffff', '#1c3948', '#577d90', '#127f9b', '#526db5', '#b2d3df'],
    'gradient',
    'light',
  ),
  preset('mono', 'Grafite', [
    '#101010',
    '#363636',
    '#202020',
    '#f2f2f2',
    '#a2a2a2',
    '#dddddd',
    '#979797',
    '#4d4d4d',
  ]),
  preset(
    'lava',
    'Lava',
    ['#1c0b0b', '#64200f', '#2b1410', '#fff0e3', '#c59a8b', '#ff7748', '#ffc65c', '#8a3a27'],
    'gradient',
  ),
  preset(
    'cyber',
    'Terminal',
    ['#06130d', '#123b20', '#0b2316', '#dcffe6', '#7dad8b', '#65ff93', '#b6f06a', '#2f6842'],
    'scanlines',
  ),
  preset(
    'lavender',
    'Lavanda',
    ['#f0edff', '#d8cfef', '#faf8ff', '#393052', '#807394', '#7850b1', '#b14a83', '#c7b7dc'],
    'dots',
    'light',
  ),
];

export const themeKeys = [...colorKeys, 'background_effect', 'effect_strength', 'gradient_angle'];
export function selectedTheme(raw: Record<string, string>) {
  if (raw.theme_preset === 'custom') return 'custom';
  const known = themes.find((t) => t.id === raw.theme_preset);
  if (known) return known.id;
  if (
    colorKeys.some((key) => raw[key]) ||
    (raw.background_effect && raw.background_effect !== 'solid')
  )
    return 'custom';
  return themes.find((t) => t.id === raw.theme)?.id || 'dark';
}
export function themeValues(raw: Record<string, string>) {
  const base = themes.find((t) => t.id === raw.theme) || themes[0];
  return { ...base.options, ...raw };
}
export function applyTheme(id: string, raw: Record<string, string>) {
  if (id === 'custom') return { ...themeValues(raw), theme_preset: 'custom' };
  const theme = themes.find((t) => t.id === id) || themes[0];
  const next = { ...raw, ...theme.options };
  delete next.color; // Old badge-only colors must not override the selected theme.
  return next;
}
