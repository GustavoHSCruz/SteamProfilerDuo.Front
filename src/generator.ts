import { applyTheme } from './themes';
export type Kind =
  | 'bars'
  | 'banner'
  | 'badge'
  | 'versus'
  | 'artwork'
  | 'text'
  | 'mosaic'
  | 'poster'
  | 'rings'
  | 'year'
  | 'scene3d';
export type GeneratorDesign = {
  version: 2;
  kind: Kind;
  options: Record<string, string>;
  selection: number[];
  excluded: number[];
  background: string | null;
};
export type Game = { appid: number; name: string; hours: number; minutes_2weeks?: number };
export type SteamProfile = {
  generated_at: string;
  demo: boolean;
  profile: { steamid: string; persona: string; level?: number };
  totals: { owned: number; hours: number; played: number };
  library: Game[];
  unplayed: Game[];
  warnings: string[];
};
export type Rendered = {
  content: string;
  mime: string;
  generated_at: string;
  demo: boolean;
  warnings: string[];
  model_obj?: string;
  annual?: {
    year: number;
    observations: number;
    start: string | null;
    end: string | null;
    unallocated_hours: number;
  };
};
export const kinds: { id: Kind; name: string; description: string; icon: string }[] = [
  {
    id: 'bars',
    name: 'Gráfico',
    description: 'Jogos, plataformas, gêneros e anos. Quatro estilos de barras.',
    icon: '▥',
  },
  {
    id: 'banner',
    name: 'Banner',
    description: 'Seis proporções para perfil, blog, fórum e assinatura.',
    icon: '▰',
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Uma métrica, sua cor e seu rótulo. Compacto ou ampliado.',
    icon: '▣',
  },
  {
    id: 'versus',
    name: 'Comparação',
    description: 'Dois perfis, métricas lado a lado e jogos em comum.',
    icon: '⇄',
  },
  {
    id: 'artwork',
    name: 'Artwork',
    description: 'Arte completa com avatar, jogos, fundo e assinatura.',
    icon: '▧',
  },
  {
    id: 'text',
    name: 'Texto',
    description: 'Barras Unicode para copiar em locais que não aceitam imagens.',
    icon: '≡',
  },
  {
    id: 'mosaic',
    name: 'Mosaico',
    description: 'Uma coleção de capas com enquadramento, formas e grade próprios.',
    icon: '▦',
  },
  {
    id: 'poster',
    name: 'Pôster',
    description: 'Uma capa em destaque, título e identidade visual de pôster.',
    icon: '▯',
  },
  {
    id: 'rings',
    name: 'Distribuição',
    description: 'Anéis proporcionais ao tempo e legenda da sua seleção.',
    icon: '◉',
  },
  {
    id: 'year',
    name: 'Meu ano',
    description: 'Retrospectiva com meses, destaques e histórico registrado no Duo.',
    icon: '◷',
  },
  {
    id: 'scene3d',
    name: 'Coleção 3D',
    description: 'Caixas e pódios com câmera, volume, iluminação e exportação de malha.',
    icon: '⬡',
  },
];
export const metrics = [
  ['none', 'Não exibir'],
  ['hours', 'Horas jogadas'],
  ['games', 'Jogos na biblioteca'],
  ['played', 'Jogos iniciados'],
  ['never', 'Nunca jogados'],
  ['level', 'Nível Steam'],
  ['top', 'Mais jogado'],
  ['linux', 'Horas no Linux'],
  ['deck', 'Horas no Deck'],
  ['achievements', 'Conquistas'],
  ['badges', 'Insígnias'],
  ['since', 'Na Steam desde'],
  ['per_day', 'Horas por dia'],
  ['now', 'Jogando agora'],
];
const defaults: Record<Kind, Record<string, string>> = {
  bars: {
    style: 'art',
    show: 'top',
    n: '5',
    w: '640',
    head: '1',
    chart_type: 'horizontal',
    chart_palette: 'multi',
  },
  banner: { preset: 'blog', facts: 'hours,games,played' },
  badge: { metric: 'hours', style: 'flat', logo: '1', label: '' },
  versus: { vs: '', rows: 'hours,games,played', games: '5', w: '640' },
  artwork: {
    preset: 'wide',
    bg: 'flat',
    fade: '55',
    blur: '0',
    facts: 'hours,games,played,level',
    games: '4',
    sign: '',
    face: '1',
    round: '0',
    foot: '1',
  },
  text: { show: 'top', n: '5', cells: '18', pad: '22' },
  mosaic: { games: '6', columns: '3', gap: '24' },
  poster: { games: '1' },
  rings: { show: 'top', n: '6', chart_palette: 'multi' },
  year: { year: String(new Date().getFullYear()), aspect: 'square' },
  scene3d: { model: 'stack', rotation: '-25', tilt: '-12', depth: '0.6', lighting: '80' },
};
export function newGenerator(kind: Kind = 'bars'): GeneratorDesign {
  return {
    version: 2,
    kind,
    options: applyTheme('dark', {
      theme: 'dark',
      lang: 'pt',
      background_effect: 'solid',
      aspect: 'native',
      ...defaults[kind],
    }),
    selection: [],
    excluded: [],
    background: null,
  };
}
export type Control = {
  key: string;
  label: string;
  choices?: string[][];
  min?: number;
  max?: number;
  step?: number;
  flag?: boolean;
  maxLength?: number;
};
const show = [
  ['top', 'Mais jogados'],
  ['recent', 'Últimas duas semanas'],
  ['platform', 'Plataforma'],
  ['genres', 'Gênero'],
  ['years', 'Ano da última partida'],
];
export const controls: Record<Kind, Control[]> = {
  bars: [
    {
      key: 'style',
      label: 'Estilo',
      choices: [
        ['plain', 'Simples'],
        ['color', 'Colorido'],
        ['icon', 'Ícones'],
        ['art', 'Capas dos jogos'],
      ],
    },
    { key: 'show', label: 'Agrupar por', choices: show },
    { key: 'n', label: 'Quantidade de linhas', min: 1, max: 8 },
    {
      key: 'chart_type',
      label: 'Tipo de gráfico',
      choices: [
        ['horizontal', 'Barras horizontais'],
        ['vertical', 'Colunas'],
        ['lollipop', 'Lollipop'],
        ['area', 'Área'],
        ['treemap', 'Treemap'],
      ],
    },
    {
      key: 'chart_palette',
      label: 'Cores das séries',
      choices: [
        ['multi', 'Paleta multicolorida'],
        ['single', 'Cor de destaque'],
      ],
    },
  ],
  banner: [
    {
      key: 'preset',
      label: 'Proporção',
      choices: [
        ['blog', 'Blog · 760 × 160'],
        ['forum', 'Fórum · 520 × 120'],
        ['wide', 'Largo'],
        ['card', 'Cartão'],
        ['tower', 'Vertical'],
        ['side', 'Lateral'],
      ],
    },
  ],
  badge: [
    { key: 'metric', label: 'Métrica', choices: metrics.slice(1) },
    {
      key: 'style',
      label: 'Estilo',
      choices: [
        ['flat', 'Flat'],
        ['square', 'Quadrado'],
        ['plastic', 'Plástico'],
        ['big', 'Ampliado'],
      ],
    },
    { key: 'label', label: 'Rótulo personalizado', maxLength: 24 },
  ],
  versus: [
    { key: 'games', label: 'Jogos em comum', min: 0, max: 10 },
    { key: 'w', label: 'Largura', min: 360, max: 900, step: 20 },
  ],
  artwork: [
    {
      key: 'preset',
      label: 'Proporção',
      choices: [
        ['wide', 'Panorâmico'],
        ['back', 'Fundo de perfil'],
        ['square', 'Quadrado'],
        ['tall', 'Vertical'],
      ],
    },
    {
      key: 'bg',
      label: 'Fundo',
      choices: [
        ['back', 'Fundo do perfil Steam'],
        ['face', 'Avatar ampliado'],
        ['flat', 'Cores e efeitos do tema'],
        ['own', 'Minha imagem'],
      ],
    },
    { key: 'fade', label: 'Escurecimento', min: 0, max: 100 },
    { key: 'blur', label: 'Desfoque', min: 0, max: 40 },
    { key: 'games', label: 'Jogos em destaque', min: 0, max: 12 },
    { key: 'sign', label: 'Assinatura (vazio usa o perfil)', maxLength: 25 },
    { key: 'face', label: 'Exibir avatar', flag: true },
    { key: 'round', label: 'Avatar circular', flag: true },
  ],
  mosaic: [
    { key: 'games', label: 'Quantidade de jogos', min: 1, max: 16 },
    { key: 'columns', label: 'Colunas', min: 1, max: 6 },
    { key: 'gap', label: 'Espaço entre jogos', min: 4, max: 60 },
  ],
  poster: [],
  rings: [
    { key: 'show', label: 'Agrupar por', choices: show },
    { key: 'n', label: 'Quantidade de séries', min: 1, max: 8 },
    {
      key: 'chart_palette',
      label: 'Cores das séries',
      choices: [
        ['multi', 'Multicolorida'],
        ['single', 'Cor de destaque'],
      ],
    },
  ],
  year: [{ key: 'year', label: 'Ano da retrospectiva', min: 2003, max: 2100 }],
  scene3d: [
    {
      key: 'model',
      label: 'Modelo 3D',
      choices: [
        ['stack', 'Coleção de caixas'],
        ['box', 'Caixa individual'],
        ['podium', 'Pódio'],
      ],
    },
    { key: 'rotation', label: 'Rotação horizontal', min: -180, max: 180 },
    { key: 'tilt', label: 'Inclinação', min: -65, max: 65 },
    { key: 'depth', label: 'Profundidade do modelo', min: 0.15, max: 2, step: 0.05 },
    { key: 'lighting', label: 'Sombreamento', min: 0, max: 100 },
  ],
  text: [
    { key: 'show', label: 'Agrupar por', choices: show },
    { key: 'n', label: 'Quantidade de linhas', min: 1, max: 15 },
    { key: 'cells', label: 'Comprimento das barras', min: 6, max: 40 },
    { key: 'pad', label: 'Largura dos nomes', min: 8, max: 40 },
  ],
};
