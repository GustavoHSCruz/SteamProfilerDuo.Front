import { useId } from 'react';
import type { Ref } from 'react';
import type { Design, Layout, Theme } from './api';

export const palettes: Record<
  Theme,
  { name: string; accent: string; background: string; soft: string }
> = {
  ember: { name: 'Âmbar', accent: '#ffb454', background: '#101017', soft: '#948fa0' },
  mint: { name: 'Verde', accent: '#8bc9ad', background: '#101017', soft: '#948fa0' },
  violet: {
    name: 'Violeta',
    accent: '#a995de',
    background: '#101017',
    soft: '#948fa0',
  },
  ice: { name: 'Azul', accent: '#88b8eb', background: '#101017', soft: '#948fa0' },
};
export const sizes: Record<Layout, [number, number]> = {
  banner: [1200, 480],
  card: [900, 600],
  square: [800, 800],
};

export function Artwork({ design: d, svgRef }: { design: Design; svgRef?: Ref<SVGSVGElement> }) {
  const id = useId().replace(/:/g, '');
  const [w, h] = sizes[d.layout];
  const p = palettes[d.theme];
  const compact = d.layout !== 'banner';
  const mapX = compact ? w * 0.56 : w * 0.62;
  const mapY = compact ? 90 : 102;
  const mapW = w - mapX - 56;
  const mapH = compact ? h * 0.23 : 186;
  const textY = compact ? h * 0.48 : 205;
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={`Arte de ${d.title}`}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect width={w} height={h} rx="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={w} height={h} fill={p.background} />
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="11" fill="none" stroke="#32313d" />
        <line x1="0" y1="92" x2={w} y2="92" stroke="#22212c" />
        <g transform={`translate(${mapX}, ${mapY})`} aria-hidden="true">
          <rect width={mapW * 0.54 - 4} height={mapH} rx="3" fill={p.accent} opacity=".8" />
          <rect
            x={mapW * 0.54}
            width={mapW * 0.46}
            height={mapH * 0.54 - 4}
            rx="3"
            fill={p.accent}
            opacity=".5"
          />
          <rect
            x={mapW * 0.54}
            y={mapH * 0.54}
            width={mapW * 0.26 - 4}
            height={mapH * 0.46}
            rx="3"
            fill={p.accent}
            opacity=".3"
          />
          <rect
            x={mapW * 0.8}
            y={mapH * 0.54}
            width={mapW * 0.2}
            height={mapH * 0.23 - 3}
            rx="3"
            fill={p.accent}
            opacity=".18"
          />
          <rect
            x={mapW * 0.8}
            y={mapH * 0.77}
            width={mapW * 0.2}
            height={mapH * 0.23}
            rx="3"
            fill={p.accent}
            opacity=".1"
          />
        </g>
        <text
          x="56"
          y="66"
          fill={p.accent}
          fontFamily="IBM Plex Mono, monospace"
          fontSize="14"
          letterSpacing="4"
        >
          {d.eyebrow}
        </text>
        <rect x="56" y={textY - 69} width="32" height="4" rx="2" fill={p.accent} />
        <text
          x="54"
          y={textY}
          fill="#f1eff5"
          fontFamily="Bricolage Grotesque, sans-serif"
          fontSize={Math.min(65, (w * (compact ? 0.82 : 0.5)) / Math.max(d.title.length * 0.57, 1))}
          fontWeight="800"
        >
          {d.title}
        </text>
        <text
          x="56"
          y={textY + 40}
          fill={p.soft}
          fontFamily="Archivo, sans-serif"
          fontSize={Math.min(19, (w * 0.75) / Math.max(d.subtitle.length * 0.55, 1))}
        >
          {d.subtitle}
        </text>
        <line x1="56" x2={w - 56} y1={h - 132} y2={h - 132} stroke={p.soft} opacity=".2" />
        {d.stats.map((s, i) => (
          <g key={i} transform={`translate(${56 + i * ((w - 112) / 3)}, ${h - 85})`}>
            <text
              fill="#f1eff5"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="30"
              fontWeight="700"
            >
              {s.value}
            </text>
            <text
              y="28"
              fill={p.soft}
              fontFamily="IBM Plex Mono, monospace"
              fontSize="11"
              letterSpacing="2"
            >
              {s.label}
            </text>
          </g>
        ))}
        <text
          x={w - 30}
          y={h - 18}
          textAnchor="end"
          fill={p.soft}
          fontFamily="IBM Plex Mono, monospace"
          fontSize="10"
          opacity=".6"
        >
          duo.steamprofiler.org
        </text>
      </g>
    </svg>
  );
}

// Export embeds the exact local fonts so the downloaded file matches the editor
// without depending on a font installation or fetching anything when opened.
let fontRules: Promise<string> | undefined;
function exportFonts(): Promise<string> {
  if (!fontRules) {
    fontRules = Promise.all(
      [
        ['Bricolage Grotesque', '800', 'bricolage-grotesque-800'],
        ['Archivo', '400', 'archivo-400'],
        ['IBM Plex Mono', '400', 'ibm-plex-mono-400'],
        ['IBM Plex Mono', '700', 'ibm-plex-mono-600'],
      ].map(async ([family, weight, file]) => {
        const response = await fetch(`/fonts/${file}.woff2`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new Error('Não foi possível carregar as fontes para exportar. Tente novamente.');
        const blob = await response.blob();
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Não foi possível preparar as fontes.'));
          reader.readAsDataURL(blob);
        });
        return `@font-face{font-family:'${family}';font-weight:${weight};src:url('${data}') format('woff2');}`;
      }),
    )
      .then((rules) => rules.join(''))
      .catch((error) => {
        fontRules = undefined;
        throw error;
      });
  }
  return fontRules;
}

export async function downloadArtwork(svg: SVGSVGElement, design: Design, format: 'svg' | 'png') {
  const exported = svg.cloneNode(true) as SVGSVGElement;
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await exportFonts();
  exported.prepend(style);
  const source = new XMLSerializer().serializeToString(exported);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let output = url;
  try {
    if (format === 'png') {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      [canvas.width, canvas.height] = sizes[design.layout];
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Este navegador não conseguiu exportar PNG. Use SVG.');
      context.drawImage(img, 0, 0);
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('Não foi possível gerar o PNG. Tente SVG.');
      output = URL.createObjectURL(png);
    }
    const link = document.createElement('a');
    link.href = output;
    link.download = `duo-${design.title.replace(/[^a-z0-9-]/gi, '-').slice(0, 40) || 'arte'}.${format}`;
    link.click();
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (output !== url) URL.revokeObjectURL(output);
    }, 1000);
  }
}
