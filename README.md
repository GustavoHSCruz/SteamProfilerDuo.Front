# SteamProfiler Duo Front

A personal artwork studio at **https://duo.steamprofiler.org**. React, TypeScript
and Vite. This is a separate application from SteamProfiler.Front and consumes
only the dedicated [Duo API](https://github.com/GustavoHSCruz/SteamProfilerDuo.Api).

## First alpha

- Steam sign-in and a clearly identified local development account.
- Private saved projects: create, search, reopen, duplicate and delete.
- Eleven outputs: bars, banner, badge, versus, artwork, text, mosaic, poster,
  time-share rings, yearly retrospective and a procedural 3D game collection.
- Eighteen unified themes plus Custom, seven background effects, eight color controls, border styles and image shapes.
- Eight aspect-ratio presets plus custom dimensions, typography and title controls.
- A subtle integrated SteamProfiler signature; compact badges use only the icon.
- Original per-format controls, themes, metric ordering, proportions and signature.
- Steam public library synchronization, game search, selection and ordering.
- Autosave, conflict detection, undo/redo and persistent custom image backgrounds.
- Self-contained SVG, PNG at 1×/2× and Unicode text export.
- Revocable public links with URL, Markdown, HTML and BBCode snippets.
- SteamProfiler's original visual language and an amber italic DUO logo badge.

Real library synchronization requires `STEAM_API_KEY` in the dedicated API.
Private Steam data is not unlocked by OpenID. Genre enrichment and total
achievements are not collected yet; missing metrics and collection warnings are
shown explicitly. Local demo data is fictional and clearly labeled. Backlog, price alerts and account-wide export/deletion remain future work.
Initial v1 drafts remain accessible in their original editor; new projects use v2.

The yearly view uses first/last daily observations collected by Duo. Months with
no coverage remain blank; historical Steam Replay data is not reconstructed.
3D outputs are meshes of game boxes or podiums, projected with adjustable camera,
depth and shading. SVG/PNG contain game artwork; OBJ exports the mesh without textures.

## Run locally

Use Node.js 22.12+ or 24 LTS and Python 3.12+. Clone the two repositories into
sibling directories named `steamprofiler-duo-front` and `steamprofiler-duo-api`.

In the API directory:

```sh
DUO_ENV=development DUO_ORIGIN=http://127.0.0.1:5182 DUO_DEV_LOGIN=1 python3 app.py
```

In this directory:

```sh
npm ci --ignore-scripts
npm run dev
```

Visit **http://127.0.0.1:5182** and choose the development login. The front proxies
`/api` to port 16300; all account data stays in the dedicated API database. Use
the configured host, not `localhost`, because write requests validate the origin.
Disable development login to use real Steam authentication, and configure
`STEAM_API_KEY` on the API for library synchronization.

## Validation

```sh
npm run format:check
npm run build
npx playwright install chromium
npm test
```

The build always checks TypeScript. Browser tests start both repositories with an
isolated temporary database on ports **5183 and 16301**, leaving the development
preview on 5182/16300 available. They cover create/edit/autosave, SVG/PNG downloads, reload,
logout/login, deletion, a failed save and retry, conflicts between tabs and mobile
overflow. Temporary test databases are placed under the operating system's temp
directory; they contain only fixture accounts and can be removed after testing.
Use `npm run format` to apply the checked-in formatting conventions.

CI checks out the Duo API to run the same browser flow. This is a development
contract dependency, not a dependency on the public SteamProfiler. Pin its commit
when the initial API release is published. Install failures, type errors and test
failures are mandatory failures; there is no conditional build skip.

## Architecture

- `src/main.tsx`: login, project dashboard and compatibility with initial drafts.
- `src/GeneratorEditor.tsx`: composition editor, library curation, history, export and sharing.
- `src/DesignControls.tsx`: unified themes, backgrounds, geometry and typography.
- `src/generator.ts`: format catalogue, options and defaults.
- `src/Artwork.tsx`: retained only for initial v1 drafts.
- `src/api.ts`: typed v1 contract and Portuguese error messages.
- `src/styles.css`: SteamProfiler's dark tiled panels, amber accent and responsive UI.
- `public/fonts/`: the same self-hosted Bricolage Grotesque, Archivo and IBM Plex Mono
  faces as the public Profiler, with their SIL Open Font License notices.
- `deploy/default.conf`: static files and same-origin `/api` reverse proxy.

Visual tokens, the compact status bar, panel headings, treemap mark and typography
follow SteamProfiler.Front. They are vendored here without a runtime dependency
on that application. Font files are covered by the licenses in `public/fonts/`,
not this repository's MIT license. Current SVG exports use the original renderer
and embed their images; PNG exports rasterize the same SVG as the preview.
Demo game images in `public/examples/` have separate ownership notices.

The dedicated API vendors the original SteamProfiler renderer without depending
on the Profiler service. Previews use SVG image blobs, never raw SVG inserted
into the page DOM. Session credentials stay
in an HttpOnly cookie; nothing is placed in localStorage. The editor retries only
after another edit or an explicit save following an error, and never silently
overwrites a newer server revision.

## Deployment preparation

`npm run build` creates `dist/`. The Dockerfile serves it through unprivileged
nginx, with the Duo API on the compose network. Run the compose file in the API
repository. A TLS edge should route **duo.steamprofiler.org** to host loopback port
16310. No extra API hostname is needed. The production UI is Portuguese in this
first iteration; localization remains future work.

The checked-in configuration does not register DNS, obtain certificates or publish
the service. The alpha's privacy dialog describes the current implementation;
complete the API repository's launch tasks before public signup.

## Contributing and license

MIT. Run build and browser tests before submitting changes. Prefer focused changes
and update both sides of the versioned contract when necessary. Never commit
`.env`, session credentials, personal data or a development database. Report
security issues privately using the repository's GitHub security advisory flow.

SteamProfiler Duo is independent and has no affiliation with Valve. This repository
does not include the separately licensed SteamProfiler Player.

## Terms of use

See [TERMS.md](TERMS.md) for this application’s terms and the Git-linked revision archive.
