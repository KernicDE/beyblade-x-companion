# AGENTS.md — Beyblade X Companion

This file is for AI coding agents. It describes the project as it currently exists, not a wishlist. Always check the repo against these facts, because the project may have evolved after this file was written.

## Project overview

Beyblade X Companion is a planned static companion website for the Beyblade X toy line. Users will be able to:

- Browse a database of official Beys and their individual parts (Blades, Assist Blades, Ratchets, Bits, Launchers).
- View rated characteristics per part (Attack / Defense / Stamina / Balance).
- Mix & match parts in a configurator to see predicted characteristics of custom combinations.
- Save creations locally in the browser and share them via compressed, client-side links.

There is intentionally no account system or backend. All user data lives in `localStorage` and is exchanged through URL hashes.

The canonical design document is at `docs/superpowers/specs/2026-07-09-beyblade-x-companion-design.md`. Treat that spec as the source of truth for product and technical decisions.

## Current state (read this carefully)

The project has been scaffolded and a minimal placeholder dataset is in place. Application code now exists under `src/` and static data under `public/data/`.

- `package.json`, `vite.config.ts`, source files, and tests exist.
- A placeholder dataset covers a few Beyblade X starter products and their parts.
- The implementation is ready for incremental feature work and full data population.
- CI/CD workflows and GitHub Pages deployment configuration are still missing.

## Planned technology stack

The stack is documented in the design spec. Do not introduce alternate frameworks without a good reason and an explicit decision.

- **Hosting**: GitHub Pages static site.
  - Planned URL: `kernicde.github.io/beyblade-x-companion`
  - Repo owner: `KernicDE`
- **Build tool / bundler**: Vite
- **UI library**: React
- **Language**: TypeScript
- **Routing**: React Router in `HashRouter` mode. Required because GitHub Pages has no server-side routing fallback; deep links must survive refresh.
- **State management**: Zustand, with persistence middleware writing the user profile to `localStorage`.
- **PWA**: `vite-plugin-pwa` to generate a service worker and web manifest.
- **Link-state compression**: `lz-string` for export/share link payloads.
- **Charts**: Custom SVG radar/spider chart component (4 axes: Attack, Defense, Stamina, Balance). No charting library.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`). Chosen to keep styling co-located with components and avoid maintaining a separate CSS architecture for a small app.
- **Testing**: Vitest with jsdom. Chosen because it integrates natively with Vite and keeps the test setup minimal.

Reference data (Beys, parts, launchers) will ship as static JSON files loaded at runtime and cached by the service worker, so data updates are independent of app code changes.

## Data model

Reference entities live in static JSON files. A creation belongs to the user profile in `localStorage`.

- **Part** (`blade`, `assistBlade`, `ratchet`, `bit`): `id`, `category`, `name`, `imageUrl`, `releaseDate`, `releaseWave`, `description`, `officialStats` (weight, height, spin direction, type tag), and researched `ratings` (1–5 for attack/defense/stamina/balance) with `ratingsDisclaimer: true`.
- **Launcher**: informational only; no ratings, not selectable.
- **Bey**: factory combo linking `bladeId`, optional `assistBladeId`, `ratchetId`, `bitId`.
- **Creation**: user combo stored in profile, with `id`, `name`, optional `note`, part IDs, timestamps.
- **Profile**: `{ version: number, creations: Creation[] }` persisted to `localStorage` under a single key.

A combo's displayed rating per dimension is the simple average of that dimension across the selected parts. Do not invent hidden weights.

## Pages & navigation

Planned routes (subject to naming during implementation):

- Home / landing page
- Bey database list → Bey detail page
- Parts database list → Part detail page
- Configurator (mix & match)
- My Profile (saved creations)
- Import view (`#/import?d=<compressed>`)
- Read-only share view (`#/view/<compressed>`)

Detail pages use a two-column layout on desktop and stack on mobile. Launchers have no ratings chart.

## Sharing & cross-device continuity

All sharing is client-side. No data leaves the browser except through links the user copies themselves.

- **Export link**: carries the entire profile. On import, if local creations already exist, show a confirmation that clearly states how many local creations will be replaced by how many from the link. Do not silently merge.
- **Share link**: carries a single creation and opens a read-only view. Read-only is a UI presentation choice, not a security boundary.

## Build and test commands

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run oxlint.
- `npm test` — run the Vitest suite.

## Code style guidelines

Not yet established. When implementation starts, prefer:

- TypeScript strict mode.
- Functional React components and hooks.
- Co-located types for domain entities.
- Consistent naming matching the data model (`Blade`, `AssistBlade`, `Ratchet`, `Bit`, `Launcher`, `Bey`, `Creation`, `Profile`).
- Minimal dependencies; only add packages already listed in the planned stack unless justified.

## Testing instructions

- Unit tests exist for rating calculation (`src/utils/data.test.ts`) and link compression/decompression (`src/utils/links.test.ts`).
- Run tests with `npm test`.
- Component tests for the configurator and detail pages are planned once the UI stabilizes.
- Manually verify service worker caching and offline behavior on GitHub Pages after deployment.

## Security considerations

- **No sensitive data**: the app stores toy-part preferences and user-named creations only. No authentication tokens, payment data, or PII.
- **LocalStorage**: treat `localStorage` contents as untrusted when loading. Validate the stored profile shape and version before using it; fail gracefully to an empty profile.
- **URL payloads**: compressed links can be tampered with by users. Decompress defensively and validate the decoded shape. Never `eval` or execute data from URL parameters.
- **Images**: do not hard-host fan-wiki images by default because licensing is unclear. Default to simple original category icons, with an optional per-item `imageUrl` for later properly licensed sources.
- **CSP / GitHub Pages**: keep the app self-contained. Avoid inline scripts so the service worker / CSP story stays simple.

## Data sourcing & maintenance

- Initial data will be researched from community sources (`beyblade.fandom.com`, `beybase.com`).
- Ratings are community estimates, not official Takara Tomy stats. The UI must always display this disclaimer.
- New releases are added by editing the static JSON files; no CMS or backend is planned.
- Full data population is a separate phase from app scaffolding. Start development with a small placeholder dataset.

## Out of scope for v1

- Login / cloud account / backend sync
- Community features (public ratings, comments, galleries)
- Battle or tournament simulation
- Guaranteed licensed per-item artwork

## Useful paths

- `docs/superpowers/specs/2026-07-09-beyblade-x-companion-design.md` — canonical design spec
- `.superpowers/brainstorm/92876-1783582567/content/` — early UI mockups and rating-style experiments (ignored by git)
- `.gitignore` — ignores `.superpowers/`, `node_modules/`, `dist/`, `.DS_Store`

## Notes for agents

- Before writing code, check whether the project has moved past the design phase. If `package.json` is still missing, the first task is scaffolding, not feature implementation.
- Respect the planned stack unless asked to change it explicitly.
- Keep the app offline-first and lightweight; avoid heavy charting or state libraries.
