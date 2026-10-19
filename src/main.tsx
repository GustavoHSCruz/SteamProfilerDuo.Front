import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import type { Design, Layout, Project, Session, Theme } from './api';
import { Artwork, downloadArtwork, palettes, sizes } from './Artwork';
import './styles.css';
import { GeneratorEditor, RenderPreview } from './GeneratorEditor';
import { kinds, newGenerator } from './generator';
import type { Kind, GeneratorDesign } from './generator';

function Logo() {
  return (
    <span className="wordmark" role="img" aria-label="SteamProfiler Duo">
      <img className="duo-mark" src="/favicon.svg" alt="" />
      <span>
        steamprofiler<span className="brand-domain">.org</span>
      </span>
    </span>
  );
}

function PanelBar({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="p-bar">
      <h2>
        <span className="dot" aria-hidden="true" />
        {title}
      </h2>
      {detail && <span className="p-detail">{detail}</span>}
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [privacy, setPrivacy] = useState(false);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const next = await api<Session>('/api/v1/session');
      setSession(next);
      if (next.user) {
        const data = await api<{ projects: Project[] }>('/api/v1/projects');
        setProjects(data.projects);
      } else setProjects([]);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function devLogin() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/dev', 'POST');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create(kind: Kind = 'bars', original?: Project) {
    if (!session?.user) return;
    setBusy(true);
    setError('');
    try {
      const body = original
        ? { name: `${original.name.slice(0, 70)} · cópia`, design: original.design }
        : { name: 'Meu novo projeto', design: newGenerator(kind) };
      const data = await api<{ project: Project }>('/api/v1/projects', 'POST', body, session.csrf);
      setProjects((current) => [data.project, ...current]);
      setActive(data.project);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(project: Project) {
    if (!confirm(`Excluir “${project.name}”? A arte salva será removida permanentemente.`)) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/v1/projects/${project.id}`, 'DELETE', undefined, session?.csrf);
      setProjects((current) => current.filter((p) => p.id !== project.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/logout', 'POST', undefined, session?.csrf);
      setActive(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const updateProject = useCallback((project: Project) => {
    setProjects((current) => current.map((p) => (p.id === project.id ? project : p)));
  }, []);

  return (
    <>
      <a className="skip" href="#main">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <Logo />
        <span className="edition">
          gerador pessoal <span className="alpha">alpha</span>
        </span>
        <nav className="account" aria-label="Conta e ecossistema">
          <a href="https://steamprofiler.org" className="nav-pill" target="_blank" rel="noreferrer">
            Profiler ↗
          </a>
          {session?.user && (
            <>
              <span className="username">
                <span className="dot" aria-hidden="true" />
                {session.user.name}
              </span>
              {!active && (
                <button className="nav-pill" onClick={logout} disabled={busy}>
                  Sair
                </button>
              )}
            </>
          )}
        </nav>
      </header>
      {error && (
        <div className="global-error" role="alert">
          {error} <button onClick={refresh}>Tentar novamente</button>
        </div>
      )}
      {!loaded ? (
        <main id="main" className="loading" aria-live="polite">
          {error ? 'Não foi possível carregar seus projetos.' : 'Carregando Duo…'}
        </main>
      ) : active && session?.user ? (
        active.design.version === 2 ? (
          <GeneratorEditor
            key={active.id}
            project={active as Project & { design: GeneratorDesign }}
            csrf={session.csrf!}
            onSaved={updateProject}
            onClose={() => setActive(null)}
          />
        ) : (
          <Editor
            key={active.id}
            project={active as Project & { design: Design }}
            csrf={session.csrf!}
            onSaved={updateProject}
            onClose={() => setActive(null)}
          />
        )
      ) : !session?.user ? (
        <main id="main" className="landing">
          <section className="p landing-copy">
            <PanelBar title="SteamProfiler Duo" detail="área pessoal" />
            <div className="p-body login-body">
              <p className="eyebrow">SEU PERFIL, DO SEU JEITO</p>
              <h1>
                Crie.
                <br />
                Salve.
                <br />
                <span className="accent">Continue.</span>
              </h1>
              <p className="lead">
                O gerador do seu espaço pessoal. Personalize suas artes, guarde cada projeto e
                retome de onde parou.
              </p>
              <a className="button primary large" href="/api/auth/steam">
                Entrar com Steam <span>↗</span>
              </a>
              <p className="login-note">
                Você entra pela Steam. Sua senha fica lá.
                <br />
                Seus projetos ficam privados no Duo.
                <br />
                <a href="https://steamprofiler.org/terms#duo" target="_blank" rel="noreferrer">
                  Leia os Termos de Uso
                </a>
                {' · '}
                <button className="text-button" onClick={() => setPrivacy(true)}>
                  Privacidade do Duo
                </button>
              </p>
              {new URLSearchParams(location.search).has('login') && (
                <p className="inline-error" role="alert">
                  {new URLSearchParams(location.search).get('login') === 'cancelled'
                    ? 'Login cancelado. Você pode tentar novamente quando quiser.'
                    : 'Não foi possível concluir o login Steam. Tente entrar novamente.'}
                </p>
              )}
              {session?.dev_login && (
                <button className="dev-button" onClick={devLogin} disabled={busy}>
                  Entrar no ambiente de desenvolvimento
                </button>
              )}
            </div>
          </section>
          <section className="p landing-art">
            <PanelBar title="Gerador / prévia" detail="gráfico · capas dos jogos" />
            <div className="preview-body">
              <div className="preview-canvas">
                <img
                  src="/examples/bars.svg"
                  alt="Gráfico do SteamProfiler com capas e horas por jogo; dados fictícios"
                />
              </div>
              <div className="preview-caption">
                <span className="accent">01 / GRÁFICO</span>
                <span>Dados de exemplo</span>
              </div>
              <div className="format-summary">
                <span>banner</span>
                <span>artwork</span>
                <span>badge</span>
                <span className="format-export">PNG / SVG</span>
              </div>
            </div>
          </section>
          <section className="p landing-feature">
            <PanelBar title="01 / Personalização" />
            <div className="p-body">
              <h3>Uma arte com seus detalhes.</h3>
              <p>
                Gráficos, banners, badges, comparações, artwork e texto a partir da sua biblioteca.
              </p>
            </div>
          </section>
          <section className="p landing-feature">
            <PanelBar title="02 / Projetos" />
            <div className="p-body">
              <h3>O próximo ajuste fica salvo.</h3>
              <p>Reabra, duplique e continue a edição. Seus projetos acompanham sua conta.</p>
            </div>
          </section>
          <section className="p landing-feature">
            <PanelBar title="03 / Exportação" />
            <div className="p-body">
              <h3>Pronto para levar com você.</h3>
              <p>Baixe em PNG ou SVG. O arquivo leva a versão da arte que você escolheu.</p>
            </div>
          </section>
        </main>
      ) : (
        <main id="main" className="dashboard">
          <section className="p workspace-summary">
            <PanelBar title="Duo / área pessoal" detail="gerador" />
            <div className="p-body">
              <p className="eyebrow">{session.user.name}</p>
              <h1>
                Seu estúdio<span className="accent">.</span>
              </h1>
              <p className="lead">Crie uma arte ou continue um projeto salvo.</p>
              <button className="button primary" disabled={busy} onClick={() => create()}>
                ＋ Novo projeto
              </button>
              <dl className="workspace-counts">
                <div>
                  <dt>projetos</dt>
                  <dd>{projects.length.toString().padStart(2, '0')}</dd>
                </div>
                <div>
                  <dt>formatos</dt>
                  <dd>{kinds.length}</dd>
                </div>
                <div>
                  <dt>exportação</dt>
                  <dd>
                    PNG<span className="muted"> / </span>SVG
                  </dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="p templates">
            <PanelBar title="Gerador / tipos de saída" detail={`${kinds.length} formatos`} />
            <div className="generator-catalog">
              {kinds.map((kind) => (
                <button
                  className="generator-choice"
                  key={kind.id}
                  disabled={busy}
                  onClick={() => create(kind.id)}
                >
                  <span className="kind-symbol">{kind.icon}</span>
                  <span>
                    <strong>{kind.name}</strong>
                    <small>{kind.description}</small>
                  </span>
                  <span className="accent">↗</span>
                </button>
              ))}
            </div>
          </section>
          <section className="p projects">
            <div className="p-bar">
              <h2>
                <span className="dot" aria-hidden="true" />
                Meus projetos{' '}
                <span className="muted">{projects.length.toString().padStart(2, '0')}</span>
              </h2>
              <label className="search">
                <input
                  placeholder="Buscar projeto…"
                  aria-label="Buscar projeto"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {projects.length === 0 ? (
              <div className="empty">
                <div className="empty-map" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>Nenhum projeto salvo ainda.</h3>
                <p>Escolha um tipo de saída ou crie seu primeiro projeto.</p>
                <button className="text-button" disabled={busy} onClick={() => create()}>
                  Criar meu primeiro projeto ↗
                </button>
              </div>
            ) : (
              <div className="project-grid">
                {projects
                  .filter((p) => p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
                  .map((project) => (
                    <article className="project" key={project.id}>
                      <button
                        className="project-preview"
                        onClick={() => setActive(project)}
                        aria-label={`Editar ${project.name}`}
                      >
                        {project.design.version === 2 ? (
                          <RenderPreview design={project.design} csrf={session.csrf!} />
                        ) : (
                          <Artwork design={project.design} />
                        )}
                      </button>
                      <div className="project-meta">
                        {project.design.version === 1 && <span>Rascunho do editor inicial</span>}
                        <button className="project-name" onClick={() => setActive(project)}>
                          {project.name}
                        </button>
                        <span>
                          Editado em{' '}
                          {new Date(project.updated_at * 1000).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="project-actions">
                          <button
                            onClick={() =>
                              create(
                                project.design.version === 2 ? project.design.kind : 'bars',
                                project,
                              )
                            }
                            disabled={busy}
                          >
                            Duplicar
                          </button>
                          <button onClick={() => remove(project)} disabled={busy}>
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            )}
            {projects.length > 0 &&
              !projects.some((p) =>
                p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              ) && <p className="empty-search">Nenhum projeto com esse nome.</p>}
          </section>
        </main>
      )}
      <footer>
        <div className="footer-links">
          <a href="https://steamprofiler.org" target="_blank" rel="noreferrer">
            SteamProfiler ↗
          </a>
          <a
            href="https://github.com/GustavoHSCruz/SteamProfilerDuo.Front"
            target="_blank"
            rel="noreferrer"
          >
            Front ↗
          </a>
          <a
            href="https://github.com/GustavoHSCruz/SteamProfilerDuo.Api"
            target="_blank"
            rel="noreferrer"
          >
            API ↗
          </a>
          <button className="text-button" onClick={() => setPrivacy(true)}>
            Privacidade
          </button>
          <a href="https://steamprofiler.org/terms#duo" target="_blank" rel="noreferrer">
            Termos de Uso
          </a>
          <a href="https://steamprofiler.org/terms/history" target="_blank" rel="noreferrer">
            Histórico dos termos
          </a>
          <span className="footer-domain">duo.steamprofiler.org</span>
        </div>
        <p>
          SteamProfiler Duo é um projeto independente, sem vínculo com a Valve. Steam e suas marcas
          pertencem à Valve Corporation.
        </p>
      </footer>
      {privacy && <Privacy onClose={() => setPrivacy(false)} />}
    </>
  );
}

function Privacy({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="privacy-title">
      <h2 id="privacy-title">Seus dados no Duo</h2>
      <p>
        O login Steam fornece seu identificador de conta. Quando disponível, usamos também seu nome
        público. Sua senha fica na Steam.
      </p>
      <p>
        O Duo guarda seus projetos e uma sessão em cookie necessário ao funcionamento. Os projetos
        são privados por padrão. Se você ativar um link público, qualquer pessoa com esse link
        poderá ver a composição até você desativá-lo. Arquivos já baixados continuam com quem os
        recebeu. Exportar uma arte gera um arquivo no navegador.
      </p>
      <p>
        O gerador usa os dados públicos da biblioteca Steam e as imagens que você escolher salvar. O
        login não libera acesso a dados privados da Steam. Não há analytics ou cookies de
        publicidade nesta implementação.
      </p>
      <p>
        Você pode excluir projetos no estúdio e encerrar a sessão em Sair. Esta é uma versão alpha;
        exportação completa da conta, exclusão de conta e política operacional de retenção ainda
        serão concluídas antes da abertura pública.
      </p>
      <button className="button primary" onClick={onClose} autoFocus>
        Entendi
      </button>
    </dialog>
  );
}

function Editor({
  project,
  csrf,
  onSaved,
  onClose,
}: {
  project: Project & { design: Design };
  csrf: string;
  onSaved: (p: Project) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [design, setDesign] = useState<Design>(project.design);
  const [status, setStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [closing, setClosing] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const revision = useRef(project.revision);
  const saved = useRef(JSON.stringify({ name: project.name, design: project.design }));
  const current = JSON.stringify({ name, design });
  const latest = useRef(current);
  latest.current = current;
  const pending = useRef<Promise<boolean> | null>(null);

  const save = useCallback(async (): Promise<boolean> => {
    if (pending.current) return pending.current;
    const snapshot = latest.current;
    if (snapshot === saved.current) return true;
    if (!JSON.parse(snapshot).name.trim()) {
      setError('Dê um nome ao projeto para salvar.');
      setStatus('error');
      return false;
    }
    setStatus('saving');
    setError('');
    const work = (async () => {
      try {
        const data = await api<{ project: Project }>(
          `/api/v1/projects/${project.id}`,
          'PUT',
          { ...JSON.parse(snapshot), revision: revision.current },
          csrf,
        );
        revision.current = data.project.revision;
        saved.current = snapshot;
        onSaved(data.project);
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
    pending.current = work;
    return work;
  }, [project.id, csrf, onSaved]);

  useEffect(() => {
    if (current === saved.current || status === 'saving' || status === 'error') return;
    const timer = setTimeout(() => {
      void save();
    }, 1000);
    return () => clearTimeout(timer);
  }, [current, status, save]);
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (latest.current !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  function edit(next: Partial<Design>) {
    setDesign((d) => ({ ...d, ...next }));
    setStatus((s) => (s === 'saving' ? s : 'dirty'));
  }
  async function close() {
    setClosing(true);
    try {
      if (await save()) {
        if (latest.current !== saved.current && !(await save())) return;
        onClose();
      }
    } finally {
      setClosing(false);
    }
  }
  async function download(format: 'png' | 'svg') {
    if (!svg.current) return;
    setExporting(true);
    setError('');
    try {
      await downloadArtwork(svg.current, design, format);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <main id="main" className="editor">
      <div className="editor-toolbar">
        <button className="text-button" onClick={close} disabled={closing || status === 'saving'}>
          ← Meus projetos
        </button>
        <label className="project-title">
          <span className="sr-only">Nome do projeto</span>
          <input
            disabled={closing}
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
              : current !== saved.current
                ? 'Alterações pendentes'
                : '✓ Tudo salvo'}
        </span>
        <button className="button small" onClick={save} disabled={status === 'saving'}>
          Salvar
        </button>
      </div>
      <div className="editor-body">
        <aside className="p controls">
          <PanelBar title="Configuração" detail="editor" />
          <h1>Personalizar arte</h1>
          <fieldset disabled={closing}>
            <legend>Formato</legend>
            <div className="format-buttons">
              {(['banner', 'card', 'square'] as Layout[]).map((layout) => (
                <button
                  key={layout}
                  aria-pressed={design.layout === layout}
                  onClick={() => edit({ layout })}
                >
                  {{ banner: 'Banner', card: 'Cartão', square: 'Quadrado' }[layout]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={closing}>
            <legend>Paleta</legend>
            <div className="swatches">
              {(Object.keys(palettes) as Theme[]).map((theme) => (
                <button
                  key={theme}
                  className={`swatch ${theme}`}
                  aria-label={palettes[theme].name}
                  aria-pressed={theme === design.theme}
                  title={palettes[theme].name}
                  onClick={() => edit({ theme })}
                >
                  {theme === design.theme && '✓'}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={closing}>
            <legend>Identidade</legend>
            <label>
              Chamada
              <input
                maxLength={32}
                value={design.eyebrow}
                onChange={(e) => edit({ eyebrow: e.target.value })}
              />
            </label>
            <label>
              Nome na arte
              <input
                maxLength={40}
                value={design.title}
                onChange={(e) => edit({ title: e.target.value })}
              />
            </label>
            <label>
              Sua frase
              <textarea
                rows={2}
                maxLength={100}
                value={design.subtitle}
                onChange={(e) => edit({ subtitle: e.target.value })}
              />
            </label>
          </fieldset>
          <fieldset disabled={closing}>
            <legend>Seus destaques</legend>
            <p className="field-note">
              Editor inicial preservado. Para usar sua biblioteca Steam, volte aos projetos e
              escolha um dos novos tipos de saída.
            </p>
            {design.stats.map((stat, i) => (
              <div className="stat-inputs" key={i}>
                <label>
                  <span className="sr-only">Rótulo {i + 1}</span>
                  <input
                    maxLength={20}
                    value={stat.label}
                    onChange={(e) =>
                      edit({
                        stats: design.stats.map((s, n) =>
                          n === i ? { ...s, label: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  <span className="sr-only">Valor {i + 1}</span>
                  <input
                    maxLength={12}
                    value={stat.value}
                    onChange={(e) =>
                      edit({
                        stats: design.stats.map((s, n) =>
                          n === i ? { ...s, value: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </fieldset>
        </aside>
        <section className="p canvas-area" aria-label="Prévia da arte">
          <div className="canvas-heading">
            <span>PRÉVIA AO VIVO</span>
            <span>{sizes[design.layout].join(' × ')} PX</span>
          </div>
          <div className={`artboard ${design.layout}`}>
            <Artwork design={design} svgRef={svg} />
          </div>
          <div className="export-bar">
            <p>
              Sua arte, pronta para sair daqui.
              <span>Arquivos estáticos. Os números não atualizam após exportar.</span>
            </p>
            <button className="button" disabled={exporting} onClick={() => download('svg')}>
              Baixar SVG
            </button>
            <button className="button primary" disabled={exporting} onClick={() => download('png')}>
              {exporting ? 'Exportando…' : '↓ Baixar PNG'}
            </button>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
