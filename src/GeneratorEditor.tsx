import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { DesignControls, styleKeys } from './DesignControls';
import type { Project } from './api';
import { controls, kinds, metrics, newGenerator } from './generator';
import type { GeneratorDesign, Kind, Rendered, SteamProfile } from './generator';

export function RenderPreview({ design, csrf }: { design: GeneratorDesign; csrf: string }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  useEffect(() => {
    let alive = true,
      object = '';
    api<Rendered>('/api/v1/render', 'POST', design, csrf)
      .then((data) => {
        if (!alive) return;
        if (data.mime === 'text/plain') setText(data.content);
        else {
          object = URL.createObjectURL(new Blob([data.content], { type: data.mime }));
          setUrl(object);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [design, csrf]);
  return url ? (
    <img src={url} alt={`Prévia de ${kinds.find((k) => k.id === design.kind)?.name}`} />
  ) : text ? (
    <pre>{text}</pre>
  ) : (
    <span className="project-kind">{kinds.find((k) => k.id === design.kind)?.name}</span>
  );
}

async function download(
  data: Rendered,
  name: string,
  format: 'svg' | 'png' | 'txt' | 'obj',
  scale: number,
) {
  let blob = new Blob([format === 'obj' ? data.model_obj || '' : data.content], {
    type: format === 'obj' ? 'text/plain' : data.mime,
  });
  let url = URL.createObjectURL(blob);
  try {
    if (format === 'png') {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PNG indisponível neste navegador.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Falha ao exportar PNG.'))),
          'image/png',
        ),
      );
      URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `duo-${name.replace(/[^a-z0-9-]/gi, '-').slice(0, 60)}.${format}`;
    link.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

async function imageData(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12000000)
    throw new Error('Escolha PNG, JPEG ou WebP de até 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / image.naturalWidth, 1200 / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png').split(',')[1];
    if (data.length > 1200000)
      throw new Error('A imagem ainda ficou grande. Use uma versão menor ou com menos detalhes.');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function GeneratorEditor({
  project,
  csrf,
  onSaved,
  onClose,
}: {
  project: Project & { design: GeneratorDesign };
  csrf: string;
  onSaved: (p: Project) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [design, setDesign] = useState(project.design);
  const [profile, setProfile] = useState<SteamProfile | null>(null);
  const [data, setData] = useState<Rendered | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [renderError, setRenderError] = useState('');
  const [status, setStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState('fit');
  const [scale, setScale] = useState(1);
  const [rival, setRival] = useState(design.options.vs || '');
  const [share, setShare] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [history, setHistory] = useState<GeneratorDesign[]>([]);
  const [future, setFuture] = useState<GeneratorDesign[]>([]);
  const revision = useRef(project.revision);
  const saved = useRef(JSON.stringify({ name: project.name, design: project.design }));
  const current = JSON.stringify({ name, design });
  const latest = useRef(current);
  latest.current = current;
  const pending = useRef<Promise<boolean> | null>(null);

  function change(next: GeneratorDesign) {
    setHistory((h) => [...h.slice(-49), design]);
    setFuture([]);
    setDesign(next);
    setStatus((s) => (s === 'saving' ? s : 'dirty'));
  }
  function option(key: string, value: string) {
    change({ ...design, options: { ...design.options, [key]: value } });
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [design, ...f]);
    setDesign(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setStatus((s) => (s === 'saving' ? s : 'dirty'));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, design]);
    setDesign(future[0]);
    setFuture((f) => f.slice(1));
    setStatus((s) => (s === 'saving' ? s : 'dirty'));
  }
  function chooseKind(kind: Kind) {
    if (kind === design.kind) return;
    const next = newGenerator(kind);
    change({
      ...next,
      selection: design.selection,
      excluded: design.excluded,
      background: design.background,
      options: {
        ...next.options,
        ...Object.fromEntries(
          styleKeys
            .filter((key) => design.options[key] !== undefined && key !== 'aspect')
            .map((key) => [key, design.options[key]]),
        ),
        theme: design.options.theme,
        lang: design.options.lang,
      },
    });
  }

  const save = useCallback(async (): Promise<boolean> => {
    if (pending.current) return pending.current;
    const snapshot = latest.current;
    if (snapshot === saved.current) return true;
    if (!JSON.parse(snapshot).name.trim()) {
      setError('Dê um nome ao projeto.');
      setStatus('error');
      return false;
    }
    setStatus('saving');
    setError('');
    const task = (async () => {
      try {
        const result = await api<{ project: Project }>(
          `/api/v1/projects/${project.id}`,
          'PUT',
          { ...JSON.parse(snapshot), revision: revision.current },
          csrf,
        );
        revision.current = result.project.revision;
        saved.current = snapshot;
        onSaved(result.project);
        setStatus(latest.current === snapshot ? 'saved' : 'dirty');
        return true;
      } catch (e) {
        setError((e as Error).message);
        setStatus('error');
        return false;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = task;
    return task;
  }, [project.id, csrf, onSaved]);
  useEffect(() => {
    if (current === saved.current || status === 'saving' || status === 'error') return;
    const timer = setTimeout(() => void save(), 800);
    return () => clearTimeout(timer);
  }, [current, status, save]);
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      if (latest.current !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);
  useEffect(() => {
    let alive = true;
    api<{ profile: SteamProfile | null }>('/api/v1/profile')
      .then((r) => {
        if (alive) setProfile(r.profile);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    api<{ url: string | null }>(`/api/v1/projects/${project.id}/share`)
      .then((r) => {
        if (alive) setShare(r.url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [project.id]);
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setRendering(true);
    setRenderError('');
    const timer = setTimeout(() => {
      api<Rendered>('/api/v1/render', 'POST', design, csrf)
        .then((r) => {
          if (alive) setData(r);
        })
        .catch((e) => {
          if (alive) {
            setData(null);
            setRenderError(e.message);
          }
        })
        .finally(() => {
          if (alive) setRendering(false);
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [design, profile, csrf]);
  useEffect(() => {
    if (!data || data.mime === 'text/plain') {
      setUrl('');
      return;
    }
    const object = URL.createObjectURL(new Blob([data.content], { type: data.mime }));
    setUrl(object);
    return () => URL.revokeObjectURL(object);
  }, [data]);

  async function sync() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ profile: SteamProfile }>(
        '/api/v1/profile/sync',
        'POST',
        undefined,
        csrf,
      );
      setProfile(r.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadRival() {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ profile: SteamProfile }>(
        '/api/v1/rival',
        'POST',
        { query: rival },
        csrf,
      );
      option('vs', r.profile.profile.steamid);
      setRival(r.profile.profile.steamid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ id: string }>(
        '/api/v1/assets',
        'POST',
        { data: await imageData(file) },
        csrf,
      );
      change({ ...design, background: r.id, options: { ...design.options, bg: 'own' } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function close() {
    setBusy(true);
    try {
      if (await save()) {
        if (latest.current !== saved.current && !(await save())) return;
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }
  async function exportFile(format: 'png' | 'svg' | 'txt' | 'obj') {
    if (!data) return;
    setBusy(true);
    setError('');
    try {
      await download(data, name, format, scale);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sharing(enable: boolean) {
    setBusy(true);
    setError('');
    try {
      if (!(await save())) return;
      if (latest.current !== saved.current && !(await save())) return;
      const r = await api<{ url: string | null }>(
        `/api/v1/projects/${project.id}/share`,
        enable ? 'POST' : 'DELETE',
        undefined,
        csrf,
      );
      setShare(r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage('Copiado.');
    } catch {
      setCopyMessage('Não foi possível copiar automaticamente. Selecione o texto abaixo.');
    }
  }
  const games = [...(profile?.library || []), ...(profile?.unplayed || [])];
  const chosen = [
    ...design.selection.filter((id) => games.some((g) => g.appid === id)),
    ...games.filter((g) => !design.selection.includes(g.appid)).map((g) => g.appid),
  ];
  const visible = chosen.filter((id) => !design.excluded.includes(id));
  function toggle(id: number) {
    if (!design.excluded.includes(id) && design.excluded.length >= 200) {
      setError('Você pode ocultar até 200 jogos por composição.');
      return;
    }
    change({
      ...design,
      excluded: design.excluded.includes(id)
        ? design.excluded.filter((i) => i !== id)
        : [...design.excluded, id],
    });
  }
  function move(id: number, delta: number) {
    const next = [...chosen];
    const at = next.indexOf(id),
      to = at + delta;
    if (at < 0 || to < 0 || to >= next.length) return;
    [next[at], next[to]] = [next[to], next[at]];
    change({ ...design, selection: next.slice(0, 200) });
  }
  const field = design.kind === 'versus' ? 'rows' : 'facts';
  const slots = design.kind === 'banner' ? 4 : 6;
  const selected = (design.options[field] || 'none').split(',');
  const size =
    data?.mime === 'image/svg+xml'
      ? data.content.match(/<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/)
      : null;
  const scaledWidth = zoom !== 'fit' && size ? Number(size[1]) * Number(zoom) : undefined;
  const snippets = share
    ? {
        URL: share,
        Markdown: `![${name.replace(/[\[\]]/g, '')}](${share})`,
        HTML: `<img src="${share}" alt="SteamProfiler Duo" />`,
        BBCode: `[img]${share}[/img]`,
      }
    : null;

  return (
    <main id="main" className="generator-workspace">
      <div className="editor-toolbar">
        <button className="text-button" disabled={busy || status === 'saving'} onClick={close}>
          ← Meus projetos
        </button>
        <label className="project-title">
          <span className="sr-only">Nome do projeto</span>
          <input
            disabled={busy}
            maxLength={80}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus((s) => (s === 'saving' ? s : 'dirty'));
            }}
          />
        </label>
        <span className={`save-status ${status}`} role="status">
          {status === 'saving'
            ? 'Salvando…'
            : status === 'error'
              ? 'Não salvo'
              : current === saved.current
                ? '✓ Tudo salvo'
                : 'Alterações pendentes'}
        </span>
        <button className="button small" disabled={busy || status === 'saving'} onClick={save}>
          Salvar
        </button>
        <button className="button small" disabled={busy || !history.length} onClick={undo}>
          ↶ Desfazer
        </button>
        <button className="button small" disabled={busy || !future.length} onClick={redo}>
          ↷ Refazer
        </button>
      </div>
      <div className="kind-tabs" role="group" aria-label="Tipo de saída">
        {kinds.map((kind) => (
          <button
            key={kind.id}
            disabled={busy}
            aria-pressed={design.kind === kind.id}
            onClick={() => chooseKind(kind.id)}
          >
            <span aria-hidden="true">{kind.icon}</span>
            {kind.name}
          </button>
        ))}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="generator-columns">
        <aside className="p controls">
          <div className="p-bar">
            <h2>
              <span className="dot" />
              Composição
            </h2>
            <span>{kinds.find((k) => k.id === design.kind)?.name}</span>
          </div>
          <h1>Personalizar saída</h1>
          <fieldset disabled={busy}>
            <label>
              Idioma da arte
              <select
                aria-label="Idioma da arte"
                value={design.options.lang}
                onChange={(e) => option('lang', e.target.value)}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            {controls[design.kind].map((c) => (
              <label key={c.key} className={c.flag ? 'check-control' : ''}>
                {c.flag ? (
                  <>
                    <input
                      type="checkbox"
                      checked={design.options[c.key] === '1'}
                      onChange={(e) => option(c.key, e.target.checked ? '1' : '0')}
                    />
                    {c.label}
                  </>
                ) : (
                  <>
                    {c.label}
                    {c.choices ? (
                      <select
                        aria-label={c.label}
                        value={design.options[c.key] || ''}
                        onChange={(e) => option(c.key, e.target.value)}
                      >
                        {c.choices.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : c.min !== undefined ? (
                      <>
                        <span className="control-value" aria-hidden="true">
                          {design.options[c.key]}
                        </span>
                        <input
                          type="range"
                          aria-label={c.label}
                          min={c.min}
                          max={
                            c.key === 'n' &&
                            design.kind === 'bars' &&
                            design.options.style !== 'art'
                              ? 15
                              : c.max
                          }
                          step={c.step || 1}
                          value={design.options[c.key] || c.min}
                          onChange={(e) => option(c.key, e.target.value)}
                        />
                      </>
                    ) : (
                      <input
                        maxLength={c.maxLength}
                        value={design.options[c.key] || ''}
                        onChange={(e) => option(c.key, e.target.value)}
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          </fieldset>
          {design.kind !== 'text' && (
            <DesignControls design={design} change={change} disabled={busy} />
          )}
          {['banner', 'versus', 'artwork'].includes(design.kind) && (
            <fieldset disabled={busy}>
              <legend>Métricas e ordem</legend>
              {Array.from({ length: slots }, (_, i) => (
                <label key={i}>
                  Posição {i + 1}
                  <select
                    value={selected[i] || 'none'}
                    onChange={(e) => {
                      const next = Array.from({ length: slots }, (_, n) => selected[n] || 'none');
                      next[i] = e.target.value;
                      option(field, next.filter((value) => value !== 'none').join(',') || 'none');
                    }}
                  >
                    {metrics.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </fieldset>
          )}
          {design.kind === 'versus' && (
            <fieldset disabled={busy}>
              <legend>Segundo perfil</legend>
              <label>
                SteamID ou URL
                <input
                  value={rival}
                  onChange={(e) => setRival(e.target.value)}
                  placeholder={
                    profile?.demo
                      ? 'Qualquer nome para a demonstração'
                      : 'https://steamcommunity.com/id/…'
                  }
                />
              </label>
              <button className="button" disabled={!rival.trim()} onClick={loadRival}>
                Carregar comparação
              </button>
            </fieldset>
          )}
          {design.kind !== 'text' && design.kind !== 'artwork' && (
            <label className="extra-background">
              Imagem de fundo
              <select
                aria-label="Origem do fundo"
                value={design.options.bg || 'flat'}
                onChange={(e) => option('bg', e.target.value)}
              >
                <option value="flat">Sem imagem</option>
                <option value="own">Minha imagem</option>
              </select>
            </label>
          )}
          {design.kind !== 'text' && design.options.bg === 'own' && (
            <fieldset disabled={busy}>
              <legend>Imagem de fundo</legend>
              <label>
                Escolher imagem
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
              </label>
              <p className="field-note">
                {design.background
                  ? 'Imagem salva no projeto.'
                  : 'PNG, JPEG ou WebP. O fundo será salvo com sua composição.'}
              </p>
            </fieldset>
          )}
        </aside>
        <section className="p generator-stage">
          <div className="p-bar">
            <h2>
              <span className="dot" />
              Prévia
            </h2>
            <span>
              {rendering
                ? 'Atualizando…'
                : size
                  ? `${size[1]} × ${size[2]} px`
                  : design.kind === 'text'
                    ? 'Unicode'
                    : ''}
            </span>
          </div>
          <div className="source-bar">
            <span>
              {profile
                ? `${profile.demo ? 'Demonstração · dados fictícios' : 'Biblioteca Steam'} / ${profile.profile.persona}`
                : 'Biblioteca não carregada'}
            </span>
            <button className="text-button" disabled={busy} onClick={sync}>
              {profile ? 'Atualizar dados' : 'Carregar minha biblioteca'}
            </button>
          </div>
          <div
            className={`render-stage ${zoom === 'fit' ? 'fit' : 'actual'}`}
            aria-busy={rendering}
          >
            {renderError ? (
              <p className="inline-error" role="alert">
                {renderError}
              </p>
            ) : !profile ? (
              <p>Carregue sua biblioteca Steam para começar.</p>
            ) : data?.mime === 'text/plain' ? (
              <pre>{data.content}</pre>
            ) : url ? (
              <img src={url} width={scaledWidth} alt="Prévia da composição" />
            ) : (
              <p>Preparando a composição…</p>
            )}
          </div>
          <div className="preview-tools">
            <label>
              Zoom
              <select value={zoom} onChange={(e) => setZoom(e.target.value)}>
                <option value="fit">Ajustar</option>
                <option value="0.5">50%</option>
                <option value="1">100%</option>
                <option value="2">200%</option>
              </select>
            </label>
            <span>
              {data ? `Dados de ${new Date(data.generated_at).toLocaleDateString('pt-BR')}` : ''}
            </span>
          </div>
          {data?.warnings.map((w) => (
            <p className="render-warning" key={w}>
              {w}
            </p>
          ))}
          <div className="export-bar">
            <p>
              Exportar composição<span>Arquivo completo com imagens incorporadas.</span>
            </p>
            {design.kind === 'text' ? (
              <>
                <button
                  className="button"
                  disabled={!data || rendering}
                  onClick={() => data && copy(data.content)}
                >
                  Copiar texto
                </button>
                <button
                  className="button primary"
                  disabled={!data || rendering || busy}
                  onClick={() => exportFile('txt')}
                >
                  Baixar TXT
                </button>
              </>
            ) : (
              <>
                <label className="scale-label">
                  PNG
                  <select
                    aria-label="Escala do PNG"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                  >
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                  </select>
                </label>
                <button
                  className="button"
                  disabled={!data || rendering || busy}
                  onClick={() => exportFile('svg')}
                >
                  Baixar SVG
                </button>
                <button
                  className="button primary"
                  disabled={!data || rendering || busy}
                  onClick={() => exportFile('png')}
                >
                  Baixar PNG
                </button>
              </>
            )}
          </div>
          {design.kind === 'scene3d' && (
            <div className="model-tools">
              <p>
                Modelo com vértices e faces em 3D. Ajuste a câmera nos controles; PNG e SVG incluem
                as capas. O OBJ exporta a geometria sem texturas.
              </p>
              <button
                className="button"
                disabled={!data?.model_obj || rendering || busy}
                onClick={() => exportFile('obj')}
              >
                Baixar modelo OBJ
              </button>
            </div>
          )}
          {design.kind === 'year' && data?.annual && (
            <p className="history-coverage">
              {data.annual.observations} sincronizações ·{' '}
              {data.annual.start
                ? `Cobertura de ${data.annual.start} a ${data.annual.end}`
                : 'Histórico ainda não iniciado'}
            </p>
          )}
          <div className="sharing">
            <h2>Link dinâmico</h2>
            <p>
              Ao ativar, qualquer pessoa com o link poderá ver esta arte. O link acompanha a
              composição salva e a última atualização da biblioteca.
            </p>
            <button
              className="button"
              disabled={busy || !data || rendering}
              onClick={() => sharing(!share)}
            >
              {share ? 'Desativar link público' : 'Ativar link público'}
            </button>
            {snippets &&
              Object.entries(snippets).map(([label, value]) => (
                <label key={label}>
                  {label}
                  <div className="snippet">
                    <input
                      aria-label={label}
                      readOnly
                      value={value}
                      onFocus={(e) => e.target.select()}
                    />
                    <button className="text-button" onClick={() => copy(value)}>
                      Copiar {label}
                    </button>
                  </div>
                </label>
              ))}
            {copyMessage && <p aria-live="polite">{copyMessage}</p>}
          </div>
        </section>
        <aside className="p library-picker">
          <div className="p-bar">
            <h2>
              <span className="dot" />
              Sua biblioteca
            </h2>
            <span>
              {visible.length} / {games.length}
            </span>
          </div>
          <div className="library-intro">
            <p>
              Escolha os jogos que entram na arte e sua ordem. As métricas gerais continuam
              representando a conta inteira.
            </p>
            <input
              aria-label="Filtrar jogos"
              placeholder="Buscar jogo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="text-button"
              disabled={busy}
              onClick={() => change({ ...design, selection: [], excluded: [] })}
            >
              Restaurar ordem por horas
            </button>
          </div>
          <div className="library-list">
            {chosen
              .map((id) => games.find((g) => g.appid === id))
              .filter((g) => g && g.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
              .map(
                (game) =>
                  game && (
                    <div className="library-game" key={game.appid}>
                      <label>
                        <input
                          disabled={busy}
                          type="checkbox"
                          checked={!design.excluded.includes(game.appid)}
                          onChange={() => toggle(game.appid)}
                        />
                        <span>
                          {game.name}
                          <small>{game.hours.toLocaleString('pt-BR')} h</small>
                        </span>
                      </label>
                      {chosen.indexOf(game.appid) >= 200 && (
                        <button
                          disabled={busy}
                          aria-label={`Priorizar ${game.name}`}
                          onClick={() =>
                            change({
                              ...design,
                              selection: [
                                game.appid,
                                ...chosen.filter((id) => id !== game.appid),
                              ].slice(0, 200),
                            })
                          }
                        >
                          ⇡
                        </button>
                      )}
                      <button
                        disabled={
                          busy || chosen[0] === game.appid || chosen.indexOf(game.appid) >= 200
                        }
                        aria-label={`Subir ${game.name}`}
                        onClick={() => move(game.appid, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={
                          busy || chosen.at(-1) === game.appid || chosen.indexOf(game.appid) >= 199
                        }
                        aria-label={`Descer ${game.name}`}
                        onClick={() => move(game.appid, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  ),
              )}
          </div>
          <p className="field-note library-note">
            Priorize até 200 jogos e oculte até 200. Os demais permanecem disponíveis. A ordem
            personalizada afeta as saídas por jogo. Grupos e comparação mantêm a ordenação própria.
          </p>
        </aside>
      </div>
    </main>
  );
}
