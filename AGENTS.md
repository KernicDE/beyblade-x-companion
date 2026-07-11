# AGENTS.md — Beyblade X Companion

This file is for AI coding agents. It describes the project as it currently exists, not a wishlist. Always verify against the repo, because the project may have evolved after this file was written.

## Project overview

Beyblade X Companion is a static, offline-first companion website for the Beyblade X toy line. It runs entirely in the browser and is deployed to GitHub Pages.

Users can:

- Browse a database of official Beys and their individual parts (Blades, Assist Blades, Ratchets, Bits, Launchers).
- View rated characteristics per Bey or part on a 1–5 scale across Attack, Defense, Stamina, and Balance.
- Mix & match parts in the Builder to see predicted characteristics of custom combinations.
- Save custom combinations locally and share them via compressed, client-side links.
- Track their physical collection (owned Beys and parts), view collection analytics, simulate matchups, and receive purchase recommendations based on meta coverage.
- Switch between English and German UI text, and between light, dark, and system theme.

There is no account system or backend. All user data lives in `localStorage`; data exchange happens through URL hashes.

The canonical design document is at `docs/superpowers/specs/2026-07-09-beyblade-x-companion-design.md`. Treat that spec as the source of truth for product goals, but the implementation details below reflect the current codebase.

## Current state

The project is scaffolded, functional, and already contains a substantial dataset. Application code lives under `src/`, static data under `public/data/`, and static assets under `public/images/`.

- `package.json`, Vite config, source files, and tests exist.
- A large JSON dataset covers hundreds of Beyblade X products and parts.
- Reference data, collection tracking, Builder, sharing, Dashboard, and Simulator are implemented.
- GitHub Pages deployment is configured via `.github/workflows/deploy.yml`.
- A manual review workflow is in progress for researching and curating data; see `docs/manual-review-instructions.md` and `docs/manual-review-todo.md`.

## Technology stack

Do not introduce alternate frameworks without a good reason and an explicit decision.

- **Hosting**: GitHub Pages static site.
  - URL: `https://kernicde.github.io/beyblade-x-companion/`
  - Repo owner: `KernicDE`
- **Build tool / bundler**: Vite 8, configured with `base: '/beyblade-x-companion/'` in `vite.config.ts`.
- **UI library**: React 19.
- **Language**: TypeScript 6, with project references split into `tsconfig.app.json` (app code) and `tsconfig.node.json` (Vite config).
- **Routing**: React Router v7 in `HashRouter` mode. Required because GitHub Pages has no server-side routing fallback; deep links must survive refresh.
- **State management**: Zustand 5, with persistence middleware writing the profile and theme to `localStorage`.
- **PWA**: `vite-plugin-pwa` generates a service worker, web manifest, and precaches build assets and JSON data.
- **Link-state compression**: `lz-string` compresses profile/creation payloads into URL-safe strings.
- **Charts**: Custom SVG radar/spider chart component (`src/components/RadarChart.tsx`) with 4 axes. No charting library.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. Theme-aware CSS variables are defined in `src/index.css`.
- **Testing**: Vitest 4 with jsdom and `@testing-library/react`.
- **Linting**: oxlint via `.oxlintrc.json`.
- **Internationalization**: A lightweight custom i18n provider in `src/i18n/` supports English (`en`) and German (`de`) locale JSON files.

## Data model

Reference entities live in static JSON files. User creations belong to the profile persisted in `localStorage`.

### Core types (`src/types/index.ts`)

- **PartCategory**: `blade` | `assistBlade` | `ratchet` | `bit`.
- **Ratings**: `{ attack, defense, stamina, balance }` on a 1–5 scale.
- **OfficialStats**: optional `weightGrams`, `heightMm`, `spinDirection` (`right` | `left` | `both`), and `typeTag` (`Attack` | `Defense` | `Stamina` | `Balance`).
- **Part** (`Blade`, `AssistBlade`, `Ratchet`, `Bit`): `id`, `category`, `name`, `manufacturer` (`Takara Tomy` | `Hasbro`), `imageUrl`, `releaseDate`, `releaseWave`, localized `description` and `assessment`, `officialStats`, `ratings`, `ratingsDisclaimer: true`, optional `ratingsSource` (`community` | `estimated`), and optional `tier`.
- **Launcher**: informational only; no ratings, not selectable in combos. Has `spinCapability` and localized fields.
- **Bey**: official factory combo linking `bladeId`, optional `assistBladeId`, `ratchetId`, `bitId`, plus localized `assessment`, optional pricing, and optional `tier`.
- **Creation**: user combo stored in the profile, with `id`, `name`, optional `note`, part IDs, `createdAt`, and `updatedAt`.
- **Profile** (version 3): `{ version, username?, ownedBeyIds[], ownedProductIds[], ownedPartIds[], currency, autoOwnParts, creations[] }`.

### Static data files (`public/data/`)

- `blades.json`, `assistBlades.json`, `ratchets.json`, `bits.json`, `launchers.json`, `beys.json` — reference entities.
- `prices.json` — maps `releaseWave` to JPY/USD/EUR prices; merged into Beys at load time.
- `meta.json` — optional meta statistics: `topCombos`, `metaParts`, and `recommendedPurchases`. Used by the Dashboard.

All JSON is loaded at runtime via `fetch` and cached by the service worker, so data updates are independent of app code changes.

### Rating calculation

A combo's displayed rating per dimension is the simple average of that dimension across the selected parts. There are no hidden weights. Missing optional parts (e.g., no Assist Blade) are excluded from the average. See `src/utils/data.ts::calculateComboRatings`.

### Tier calculation

Tiers (`S`/`A`/`B`/`C`/`F`) are computed relative to a type-specific score distribution when `typeScores` are available, or by absolute thresholds otherwise. See `src/utils/data.ts::calculateTier` and `buildTypeScores`.

## Code organization

```
src/
  App.tsx              — HashRouter route tree and DataProvider wrapper
  main.tsx             — React root render with I18nProvider
  index.css            — Tailwind import and theme CSS variables
  components/          — Reusable UI components (Layout, RadarChart, RatingBars, PartPicker, badges, filters, etc.)
  contexts/            — React context definitions (DataContext)
  hooks/               — Custom hooks (useData)
  i18n/                — Custom i18n provider and en/de locale JSON
  pages/               — Route-level page components (Home, BeyDatabase, BeyDetail, PartsDatabase, PartDetail, Configurator, Dashboard, Simulator, Profile, Import, View)
  stores/              — Zustand stores (profile, configurator, theme)
  types/               — Shared TypeScript domain types
  utils/               — Data loading, rating/tier helpers, link compression, and their tests
```

## Routes

Implemented routes in `src/App.tsx`:

- `/` — Home / landing page
- `/beys` — Bey database list
- `/beys/:id` — Bey detail page
- `/parts` — Parts database list
- `/parts/:category/:id` — Part detail page (categories: `blade`, `assistBlade`, `ratchet`, `bit`, `launcher`)
- `/configurator` — Builder / mix-and-match page. Accepts `?edit=<creationId>` to load a saved creation.
- `/dashboard` — Collection analytics, meta coverage, recommended purchases
- `/simulator` — Rule-based Bey vs Bey matchup predictor
- `/profile` — User profile, collection stats, saved creations, export link
- `/import?d=<compressed>` — Import an exported profile
- `/view/:compressed` — Read-only share view of a single creation

Detail pages use a two-column layout on desktop and stack on mobile. Launchers have no ratings chart.

## Sharing & cross-device continuity

All sharing is client-side. No data leaves the browser except through links the user copies themselves.

- **Export link** (`/import?d=<compressed>`): carries the entire profile. On import, if local creations already exist, the UI shows a confirmation stating how many local creations will be replaced by how many from the link. It does not silently merge.
- **Share link** (`/view/<compressed>`): carries a single creation and opens a read-only view. Read-only is a UI presentation choice, not a security boundary.

Both compressed payloads are validated on decompression; malformed payloads render an error UI.

## Build and test commands

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run oxlint.
- `npm test` — run the Vitest suite in watch mode.
- `npm test -- --run` — run the Vitest suite once (CI style).

## Code style guidelines

- TypeScript strict mode is enabled in `tsconfig.app.json`.
- Use functional React components and hooks.
- Co-locate types for domain entities in `src/types/index.ts`.
- Match the data model naming (`Blade`, `AssistBlade`, `Ratchet`, `Bit`, `Launcher`, `Bey`, `Creation`, `Profile`).
- Keep components small and focused; list/database pages use local state for filtering/sorting.
- Prefer minimal dependencies; only add packages already in use or justified.
- Use Tailwind utility classes; theme-aware colors should reference CSS variables where appropriate (`var(--bg)`, `var(--surface)`, `var(--text)`, `var(--muted)`).
- Use the custom `useTranslation()` hook and locale keys for user-facing strings. Keep both `en.json` and `de.json` in sync when adding or changing text.
- Avoid `eval` or executing any data from URL parameters or `localStorage`.

## Testing instructions

- Unit tests exist for rating calculation (`src/utils/data.test.ts`) and link compression/decompression (`src/utils/links.test.ts`).
- Run tests with `npm test -- --run`.
- Component tests for pages are not yet implemented.
- After deployment, manually verify service worker caching and offline behavior on GitHub Pages.

## Deployment

GitHub Pages deployment is handled by `.github/workflows/deploy.yml`:

- Triggered on every push to `master` or manually via `workflow_dispatch`.
- Uses Node 22, installs dependencies with `npm ci`, builds with `npm run build`, and deploys the `dist/` directory.
- The target GitHub Pages environment is `github-pages`.

## Data sourcing & maintenance

- Data is researched from community sources such as `beyblade.fandom.com` and `beybase.com`.
- Ratings are community or AI estimates, not official Takara Tomy stats. The UI must always display this disclaimer.
- When setting ratings, use 0.5 steps and always set `ratingsSource` to `community` or `estimated`.
- New releases are added by editing the static JSON files; no CMS or backend is planned.
- Helper scripts in `scripts/` (CommonJS and Python) assist with bulk tasks like image downloading, background cleanup, stat filling, and database generation, but content decisions must be reviewed manually per `docs/manual-review-instructions.md`.
- The manual review todo list is at `docs/manual-review-todo.md`.

## Security considerations

- **No sensitive data**: the app stores toy-part preferences and user-named creations only. No authentication tokens, payment data, or PII.
- **LocalStorage**: treat `localStorage` contents as untrusted when loading. The profile store validates shape and version before using persisted data and falls back to an empty profile on failure.
- **URL payloads**: compressed links can be tampered with by users. Decompress defensively and validate the decoded shape. Never `eval` or execute data from URL parameters.
- **Images**: images are stored in the repo under `public/images/`. Prefer official manufacturer images or clean product photos with white backgrounds.
- **CSP / GitHub Pages**: keep the app self-contained and avoid inline scripts so the service worker / CSP story stays simple.

## Out of scope

- Login / cloud account / backend sync
- Community features (public ratings, comments, galleries)
- Guaranteed licensed per-item artwork

## Useful paths

- `docs/superpowers/specs/2026-07-09-beyblade-x-companion-design.md` — canonical design spec
- `docs/manual-review-instructions.md` — rules for the ongoing manual data review
- `docs/manual-review-todo.md` — todo list of Beys to review
- `docs/kimi-continuation-guide.md` — continuation guide for another Kimi instance
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow
- `.gitignore` — ignores `.superpowers/`, `node_modules/`, `dist/`, `.DS_Store`

## Notes for agents

- Before writing code, check whether the project has moved past the design phase. This project is already implemented, so new work should extend or fix existing code rather than re-scaffold.
- Respect the planned stack unless asked to change it explicitly.
- Keep the app offline-first and lightweight; avoid heavy charting or state libraries.
- When adding user-facing text, update both `src/i18n/locales/en.json` and `src/i18n/locales/de.json`.
- When modifying the data model or profile shape, bump the profile version and add a migration in `src/stores/profile.ts`.
