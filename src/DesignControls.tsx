import { useEffect, useState } from 'react';
import { applyTheme, colorKeys, selectedTheme, themeKeys, themes, themeValues } from './themes';
import type { GeneratorDesign } from './generator';

export const styleDefaults: Record<string, string> = {
  fade: '55',
  blur: '0',
  background_effect: 'solid',
  background_end: '#322457',
  effect_strength: '45',
  gradient_angle: '135',
  border_width: '1',
  border_style: 'solid',
  corner_radius: '18',
  padding: '38',
  font: 'sans',
  title: '',
  caption: '',
  title_size: '46',
  aspect: 'native',
  canvas_width: '1200',
  canvas_height: '900',
  image_shape: 'rounded',
  image_ratio: 'landscape',
  image_fit: 'cover',
  image_border: '0',
  image_radius: '16',
  image_saturation: '100',
  image_source: 'capsule',
};
export const styleKeys = [
  ...Object.keys(styleDefaults),
  'theme_preset',
  'background_color',
  'surface_color',
  'text_color',
  'muted_color',
  'accent_color',
  'secondary_color',
  'border_color',
];
const labels = [
  'Cor do fundo',
  'Segunda cor do fundo',
  'Cor dos painéis',
  'Cor do texto',
  'Cor do texto secundário',
  'Cor de destaque',
  'Cor secundária',
  'Cor da borda',
];
export function DesignControls({
  design,
  change,
  disabled,
}: {
  design: GeneratorDesign;
  change: (d: GeneratorDesign) => void;
  disabled: boolean;
}) {
  const raw = design.options;
  const resolved = themeValues(raw);
  const value = (key: string) => resolved[key] ?? styleDefaults[key] ?? '';
  const set = (key: string, v: string) =>
    change({
      ...design,
      options: { ...(themeKeys.includes(key) ? applyTheme('custom', raw) : raw), [key]: v },
    });
  const select = (key: string, label: string, choices: string[][]) => (
    <label key={key}>
      {label}
      <select aria-label={label} value={value(key)} onChange={(e) => set(key, e.target.value)}>
        {choices.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const range = (key: string, label: string, min: number, max: number, step = 1) => (
    <label key={key}>
      {label}
      <span className="control-value" aria-hidden="true">
        {value(key)}
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value(key)}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  );
  return (
    <fieldset disabled={disabled} className="design-controls">
      <details open>
        <summary>Cores e fundo</summary>
        <label>
          Tema
          <select
            aria-label="Tema"
            value={selectedTheme(raw)}
            onChange={(e) => change({ ...design, options: applyTheme(e.target.value, raw) })}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <div className="color-grid">
          {colorKeys.map((key, i) => (
            <ColorControl
              key={key}
              label={labels[i]}
              value={value(key)}
              change={(v) => set(key, v)}
            />
          ))}
        </div>
        {select('background_effect', 'Efeito de fundo', [
          ['solid', 'Cor sólida'],
          ['gradient', 'Gradiente'],
          ['aurora', 'Aurora'],
          ['grid', 'Grade'],
          ['dots', 'Pontos'],
          ['grain', 'Granulado'],
          ['scanlines', 'Scanlines'],
        ])}
        {!['solid', 'gradient'].includes(value('background_effect')) &&
          range('effect_strength', 'Intensidade do efeito', 0, 100)}
        {['gradient', 'aurora'].includes(value('background_effect')) &&
          range('gradient_angle', 'Ângulo do gradiente', 0, 360)}
        {raw.bg === 'own' && (
          <>
            {range('fade', 'Escurecer imagem de fundo', 0, 100)}
            {range('blur', 'Desfocar imagem de fundo', 0, 40)}
          </>
        )}
        {select('border_style', 'Estilo da borda', [
          ['solid', 'Contínua'],
          ['dashed', 'Tracejada'],
          ['double', 'Dupla'],
          ['glow', 'Brilho'],
        ])}
        {range('border_width', 'Espessura da borda', 0, 16)}
        {range('corner_radius', 'Arredondamento da arte', 0, 100)}
      </details>
      <details>
        <summary>Tela e proporção</summary>
        {select('aspect', 'Proporção da tela', [
          ['native', 'Nativa do formato'],
          ['square', '1:1 · Quadrado'],
          ['landscape', '16:9 · Paisagem'],
          ['story', '9:16 · Story'],
          ['portrait', '4:5 · Post'],
          ['photo', '3:2 · Fotografia'],
          ['poster', '2:3 · Pôster'],
          ['ultrawide', '21:9 · Ultrawide'],
          ['classic', '4:3 · Clássico'],
          ['custom', 'Dimensões personalizadas'],
        ])}
        {raw.aspect === 'custom' && (
          <>
            {range('canvas_width', 'Largura da tela', 320, 2400, 10)}
            {range('canvas_height', 'Altura da tela', 240, 2400, 10)}
          </>
        )}
        {range('padding', 'Margem interna', 12, 100)}
        <p className="field-note">A proporção e os efeitos são aplicados também ao SVG e ao PNG.</p>
      </details>
      <details>
        <summary>Tipografia e título</summary>
        {select('font', 'Família tipográfica', [
          ['sans', 'Sem serifa'],
          ['serif', 'Serifada'],
          ['mono', 'Monoespaçada'],
        ])}
        {['bars', 'mosaic', 'poster', 'rings', 'year', 'scene3d'].includes(design.kind) && (
          <>
            <label>
              Título da composição
              <input
                aria-label="Título da composição"
                maxLength={100}
                value={value('title')}
                placeholder="Usar nome do perfil"
                onChange={(e) => set('title', e.target.value)}
              />
            </label>
            <label>
              Subtítulo
              <input
                aria-label="Subtítulo"
                maxLength={160}
                value={value('caption')}
                placeholder="Texto de apoio"
                onChange={(e) => set('caption', e.target.value)}
              />
            </label>
            {range('title_size', 'Tamanho do título', 22, 90)}
          </>
        )}
      </details>
      {['bars', 'mosaic', 'poster', 'year'].includes(design.kind) && (
        <details open>
          <summary>Imagens dos jogos</summary>
          {select('image_source', 'Imagem da Steam', [
            ['capsule', 'Cápsula'],
            ['portrait', 'Capa vertical'],
            ['hero', 'Imagem panorâmica'],
            ['header', 'Cabeçalho da loja'],
          ])}
          {select('image_shape', 'Formato das imagens', [
            ['rounded', 'Retângulo arredondado'],
            ['square', 'Retângulo reto'],
            ['circle', 'Círculo'],
            ['hex', 'Hexágono'],
          ])}
          {select('image_ratio', 'Proporção das capas', [
            ['landscape', 'Panorâmica'],
            ['square', 'Quadrada'],
            ['portrait', 'Vertical'],
          ])}
          {select('image_fit', 'Enquadramento', [
            ['cover', 'Preencher e recortar'],
            ['contain', 'Mostrar imagem inteira'],
          ])}
          {range('image_radius', 'Raio das imagens', 0, 80)}
          {range('image_border', 'Borda das imagens', 0, 12)}
          {range('image_saturation', 'Saturação das imagens', 0, 200)}
        </details>
      )}
    </fieldset>
  );
}

function ColorControl({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  return (
    <label>
      {label}
      <span>
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
        <input
          aria-label={`${label} hexadecimal`}
          maxLength={7}
          value={hex}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            setHex(next);
            if (/^#[0-9a-f]{6}$/i.test(next)) change(next.toLowerCase());
          }}
          onBlur={() => setHex(value)}
        />
      </span>
    </label>
  );
}
