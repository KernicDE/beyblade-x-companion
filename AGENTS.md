# AGENTS.md — Beyblade X Tracker

This file is for AI coding agents. It describes the project as it currently exists, not a wishlist. Always check the repo against these facts, because the project may have evolved after this file was written.

## Project overview

Beyblade X Tracker is a **personal** static tracker app for one user's Beyblade X collection. It is no longer a general companion site. The owner uses it to:

- Track owned Beys (purchase date, shop, price, set for Random Booster pulls) and owned parts (which set they came from, purchase date).
- Keep personal 4-axis ratings (Attack/Defense/Stamina/Balance) per owned Bey and part, independent of catalog community ratings.
- Combine parts freely in the builder and see predicted scores — optionally computed from personal ratings instead of community ratings. Combos can be saved locally as drafts.
- Track matches: own Bey (stock or saved combo) vs. any opponent (catalog Bey or free-text name for unknown Beys), result and finish type (Xtreme/Over/Burst/Spin), with statistics (win rate, streak, finish distribution, nemesis).

There is intentionally no account system or backend. The site is a static Vite build on GitHub Pages.

## Architecture: how personal data works (important)

The personal profile (collection, matches, personal ratings, saved creations) lives **encrypted inside the repo** as a static file:

- `public/data/profile.enc.json` — AES-256-GCM encrypted, committed, shipped with the site. PBKDF2-SHA-256 (250k iterations) derives the key from the owner's password.
- `.tmp/profile.plain.json` — plaintext working copy. **Gitignored (`.tmp/`), never commit it.**
- `scripts/encrypt-profile.cjs` — `BX_PROFILE_PASSWORD=<pw> node scripts/encrypt-profile.cjs` encrypts plaintext → `public/data/profile.enc.json`.
- `scripts/decrypt-profile.cjs` — decrypts back to `.tmp/profile.plain.json` for editing.
- `src/utils/crypto.ts` — browser-side counterpart (Web Crypto API). Payload format must stay identical between browser and scripts.

Because the file ships with the site, the same profile is available on every device after entering the password. The password is never stored or committed; the agent asks the owner for it once per update run (env var, never hardcoded).

### Data maintenance workflow (core duty of the agent)

The tracker pages are **read-only** in the app. When the owner reports new purchases, ratings, or matches (e.g. after a match day), the agent:

1. Decrypts: `BX_PROFILE_PASSWORD=<pw> node scripts/decrypt-profile.cjs` (skip if `.tmp/profile.plain.json` is already current).
2. If new Beys/parts are missing from the catalog, adds them to `public/data/*.json` (+ images) first.
3. Edits `.tmp/profile.plain.json` (see data model below).
4. Re-encrypts: `BX_PROFILE_PASSWORD=<pw> node scripts/encrypt-profile.cjs`.
5. Verifies with `npm test` / `npm run build`, then the owner commits/pushes; GitHub Actions (`.github/workflows/deploy.yml`) deploys to Pages.

**Prices**: EUR is the canonical currency. CHF purchases are converted to EUR at the purchase-date exchange rate on data entry (the agent looks up the historical rate); both values are stored (`priceEur`, `priceChf`).

Local-only data: combo drafts saved in the builder live in `localStorage` (`src/stores/creations.ts`) and are device-local. Important combos can be merged into the encrypted profile on request.

## Technology stack

- **Hosting**: GitHub Pages static site (`kernicde.github.io/beyblade-x-companion`), deploy via `.github/workflows/deploy.yml` on push to `master`.
- **Build tool**: Vite 8, `base: '/beyblade-x-companion/'`.
- **UI**: React 19 + TypeScript 6 (strict), React Router v7 in `HashRouter` mode (required for GitHub Pages).
- **State**: Zustand 5. Two stores: `src/stores/profile.ts` (encrypted personal profile, lock/unlock lifecycle) and `src/stores/creations.ts` (local combo drafts, persisted to `localStorage`).
- **PWA**: `vite-plugin-pwa` (service worker + manifest).
- **Link sharing**: `lz-string` for creation share/import links (`src/utils/links.ts`, `CreationsExport` format).
- **Charts**: custom SVG radar/bars components. No charting library.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`; theme CSS variables in `src/index.css`.
- **Linting**: oxlint via `.oxlintrc.json`.
- **i18n**: lightweight custom provider in `src/i18n/` with `en`/`de` locale JSON.
- **Testing**: Vitest 4 with jsdom.
- **Crypto**: Web Crypto API only — no crypto dependency.

Reference catalog data (Beys, parts, launchers) ships as static JSON under `public/data/`, loaded at runtime (`src/utils/data.ts`). It is no longer batch-maintained; the agent extends it organically when the owner buys new Beys.

## Data model

### Personal profile (encrypted, `PersonalProfile` in `src/types/index.ts`)

- **OwnedBey**: `beyId` (catalog ref), `purchaseDate`, `shop`, `priceEur` (canonical), `priceChf` (original, if paid in CHF), `setName` (for Random Booster pulls), `personalRatings` (4 axes), `note`.
- **OwnedPart**: `partId`, `category`, `obtainedFrom` (beyId, set name, or "Einzelkauf"), `purchaseDate`, `personalRatings`, `note`.
- **Match**: `id`, `date`, `myBey` (`{source:'bey',beyId}` or `{source:'creation',creationId}`), `opponent` (`name` always; `beyId`/`combo` optional), `result` (win/loss), `finishType` (`xtreme|over|burst|spin`, optional), `note`.
- **Creation**: saved combo (`id`, `name`, part IDs, timestamps) — both in the encrypted profile and as local drafts.
- Match statistics are computed, not stored: `src/utils/matches.ts` (records, streaks, finish distributions, opponent stats).

### Catalog (public, unchanged)

- **Part** (`blade`, `assistBlade`, `ratchet`, `bit`): id, category, name, imageUrl, release info, `officialStats`, community `ratings` (1–5), `ratingsDisclaimer: true`.
- **Launcher**: informational only; no ratings.
- **Bey**: factory combo linking part IDs, plus catalog prices (`priceEur` etc.).

A combo's displayed rating per dimension is the simple average across selected parts. Personal ratings can override community ratings per part (`calculateComboRatings` third parameter, `buildPersonalRatingsMap`).

## Pages & navigation

- `/` — personal hub (gated): collection overview, match quick stats, quick links.
- `/collection` — owned Beys/parts with purchase info and personal ratings (gated).
- `/matches` — match history + statistics (gated).
- `/beys`, `/beys/:id` — catalog; detail pages also show "Mein Exemplar" and personal record with/against that Bey when unlocked.
- `/parts`, `/parts/:category/:id` — catalog; detail shows "Mein Exemplar" when unlocked.
- `/configurator` — builder with optional personal-ratings override; saves local drafts.
- `/simulator` — Bey-vs-Bey prediction with optional personal-ratings override.
- `/dashboard` — meta/collection insights (gated).
- `/profile` — local drafts management, export/import links, lock/forget-device.
- `/import?d=<compressed>`, `/view/<compressed>` — creation share links.

Personal pages are wrapped in `src/components/UnlockGate.tsx` (password prompt until unlocked). Catalog and builder/simulator stay public.

## Build and test commands

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run oxlint.
- `npm test` — run the Vitest suite.
- `BX_PROFILE_PASSWORD=<pw> node scripts/encrypt-profile.cjs` / `decrypt-profile.cjs` — profile data maintenance.

## Code style guidelines

- TypeScript strict mode, functional React components and hooks.
- Types co-located in `src/types/index.ts`.
- i18n: all UI strings in `src/i18n/locales/de.json` and `en.json` (German is the owner's primary language).
- Minimal dependencies; do not add packages without justification.

## Testing instructions

- Unit tests: rating calculation + personal override (`src/utils/data.test.ts`), link compression (`src/utils/links.test.ts`), match statistics (`src/utils/matches.test.ts`), encryption round-trip (`src/utils/crypto.test.ts`).
- Run tests with `npm test`.
- Manually verify lock/unlock and service worker caching on GitHub Pages after deployment.

## Security considerations

- **No highly sensitive data**: toy collection and match results only. Still, the profile is encrypted (AES-256-GCM + PBKDF2) because it ships publicly on GitHub Pages.
- **Never commit** `.tmp/profile.plain.json` or the password. `.tmp/` is gitignored.
- Client-side encryption is offline brute-forceable — acceptable for this threat model; use a solid password.
- **URL payloads**: decompress defensively and validate decoded shapes. Never `eval` data from URL parameters.
- **localStorage**: validate stored shapes before use; fail gracefully.

## Out of scope

- Backend, database, live sync (updates happen via agent + redeploy).
- In-app editing of collection/matches (read-only by design).
- Match sets with points (only single battles).
- Login / cloud accounts, community features, battle simulation, licensed artwork guarantees.

## Useful paths

- `docs/superpowers/specs/2026-07-09-beyblade-x-companion-design.md` — original design spec (pre-pivot, historical)
- `docs/manual-review-instructions.md` — rules for curating catalog data (ratings in 0.5 steps, always set `ratingsSource`)
- `docs/manual-review-todo.md` — todo list of catalog entries under manual review
- `docs/kimi-continuation-guide.md` — continuation guide for another Kimi instance
- `src/types/index.ts` — all domain types including `PersonalProfile`
- `src/stores/profile.ts` — encrypted profile lifecycle
- `src/utils/matches.ts` — match statistics
- `scripts/encrypt-profile.cjs` / `scripts/decrypt-profile.cjs` — data maintenance
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `.gitignore` — ignores `.tmp/` (plaintext profile!), `.superpowers/`, `node_modules/`, `dist/`

## Notes for agents

- The most common task is data maintenance: owner reports purchases/matches → update catalog + profile → encrypt → done. Follow the workflow above exactly.
- Keep the crypto payload format in `src/utils/crypto.ts` and the scripts byte-compatible.
- Keep the app offline-first and lightweight.
