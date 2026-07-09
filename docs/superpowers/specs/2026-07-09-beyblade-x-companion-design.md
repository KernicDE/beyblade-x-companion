# Beyblade X Companion — Design Spec

## 1. Purpose

A companion website for the Beyblade X toy line. Users can browse a database of official Beys and their individual parts (Blades, Assist Blades, Ratchets, Bits, Launchers), see rated characteristics per part, and mix & match parts in a configurator to see the predicted characteristics of their own custom combination. No account system — all user data lives in the browser.

## 2. Hosting & Stack

- **Hosting**: GitHub Pages, static site. Repo: `github.com/KernicDE/beyblade-x-companion`. Standard project URL: `kernicde.github.io/beyblade-x-companion`. Chosen over Claude Artifacts for durability — the user owns the repo, it's versionable, works offline, and isn't tied to a Claude.ai session's lifetime or CSP restrictions.
- **Framework**: Vite + React + TypeScript. Chosen over vanilla JS because the configurator needs dynamic, reactive UI ("build your bey" with live-updating derived stats), and over Svelte/Vue for the larger ecosystem and easier long-term maintainability/AI-assisted changes.
- **Routing**: React Router in `HashRouter` mode. GitHub Pages has no server-side routing, so a deep link like `/bey/dran-sword` would 404 on refresh under a normal `BrowserRouter`. `HashRouter` (`#/bey/dran-sword`) avoids that entirely without a 404.html redirect hack, and lets the compressed share/export state travel in the same hash segment (e.g. `#/import?d=<compressed>`).
- **State management**: [Zustand](https://github.com/pmndrs/zustand) for app state (profile, configurator selection). Chosen over React Context/useReducer for less boilerplate and simpler persistence middleware integration with `localStorage`.
- **Radar chart**: custom-built small SVG component (4 axes: Attack/Defense/Stamina/Balance). No charting library dependency — the shape is simple enough that a ~100kb dependency (e.g. Recharts) isn't justified, and a custom component keeps full styling control and a light offline bundle.
- **Link-state compression**: [lz-string](https://github.com/pieroxy/lz-string) to compress JSON profile/creation state into URL-safe strings for export/share links.
- **PWA**: Vite PWA plugin (`vite-plugin-pwa`) generating a service worker + web manifest.

## 3. Data Model

All reference data (Beys, parts, launchers) ships as static JSON files loaded at runtime (not bundled into the JS), fetched once and cached by the service worker. This keeps data updates independent of app code changes and keeps the initial JS bundle small.

### Part entities: Blade, Assist Blade, Ratchet, Bit

Each part (regardless of category) has:

```
{
  id: string
  category: "blade" | "assistBlade" | "ratchet" | "bit"
  name: string
  imageUrl: string
  releaseDate: string        // ISO date
  releaseWave: string        // e.g. "BX-01"
  description: string
  officialStats: {
    weightGrams?: number
    heightMm?: number
    spinDirection?: "right" | "left" | "both"
    typeTag?: string         // official manufacturer type label, if any
  }
  ratings: {                 // 1-5, researched/derived — NOT official
    attack: number
    defense: number
    stamina: number
    balance: number
  }
  ratingsDisclaimer: true    // always shown in UI as "community estimate, not official"
}
```

Assist Blade is optional in a combo — some Blades don't use one.

### Launcher

Informational only — no ratings, not selectable in the configurator (it's not part of the spinning combo).

```
{
  id: string
  name: string
  imageUrl: string
  releaseDate: string
  description: string
  spinCapability: "right" | "left" | "both"
}
```

### Bey (official product)

An official, factory-defined combination.

```
{
  id: string
  name: string
  imageUrl: string
  releaseDate: string
  releaseWave: string
  bladeId: string
  assistBladeId?: string
  ratchetId: string
  bitId: string
}
```

Its displayed ratings are computed the same way as user Creations (see below) — there is no separately stored rating for the official Bey.

### Creation (user-built combo)

Stored per-user in `localStorage`, not part of the reference database.

```
{
  id: string           // generated locally (uuid)
  name: string          // user-given
  note?: string
  bladeId: string
  assistBladeId?: string
  ratchetId: string
  bitId: string
  createdAt: string
  updatedAt: string
}
```

### Rating calculation

A Creation's (or official Bey's) displayed rating per dimension (Attack/Defense/Stamina/Balance) is the **simple average** of that dimension's rating across all parts used (Blade, Assist Blade if present, Ratchet, Bit). Chosen over a weighted-by-part-type formula because there's no official basis for weighting, and a simple average is transparent and easy to explain to users.

### Profile

```
{
  creations: Creation[]
}
```

Persisted as a single `localStorage` key, versioned (`{ version: 1, creations: [...] }`) so the storage schema can evolve later without breaking existing saved profiles.

## 4. Pages & Navigation

- **Home** — landing/overview, entry points to the other sections
- **Bey Database** — searchable/filterable list of official Beys → detail page
- **Parts Database** — searchable/filterable list of Blades/Assist Blades/Ratchets/Bits/Launchers → detail page
- **Configurator** (Mix & Match) — build a combo, see live derived ratings, save to profile
- **My Profile** — list of saved Creations with actions: Edit, Delete, Share, Duplicate

### Detail page (Bey or Part)

Two-column layout on desktop (stacks on mobile): left column shows image, category, name, release info, description, and official raw stats (weight/height/spin/type tag where applicable). Right column shows the 4-axis radar/spider chart of the 1-5 ratings. Launchers show the left info column only (no ratings chart, since they have none).

### Configurator

4-column grid, one column per part category (Blade / Assist Blade / Ratchet / Bit), each showing the currently selected part with a way to open a picker for that category. Below the grid, a live-updating radar chart shows the resulting combo's Attack/Defense/Stamina/Balance as parts are changed. A "Save" action persists the current selection as a new Creation in the profile (prompting for a name).

### Profile page

List of saved Creations, each as a card showing name, mini radar chart, and action buttons: Edit (reopens in configurator), Delete (with confirmation), Share (generates read-only link for that single Creation), Duplicate (creates a copy to modify independently). A profile-level "Export" action generates a link carrying the entire profile for continued editing on another device.

## 5. Sharing & Cross-Device Continuity

No backend, no accounts — all mechanisms are pure client-side URL encoding, since GitHub Pages cannot store server-side state.

- **Export link** (`#/import?d=<compressed>`): encodes the user's entire profile (all Creations), compressed via `lz-string`. Opening it on a device that already has local Creations shows a confirmation prompt listing what will happen ("This will replace your N locally saved creations with the M creations from this link") before replacing — no silent merge, to avoid accidentally losing local work. After import, the profile is fully editable on that device, continuing from the same state.
- **Share link** (`#/view/<compressed>`): encodes a single Creation, compressed via `lz-string`. Opens in a dedicated read-only view (radar chart + part list), with no edit/save controls rendered. There is no real access control (the data isn't sensitive) — read-only is a UI-level presentation choice, not a security boundary.
- Both link types keep the whole payload client-side; no data ever leaves the user's browser except via the link they explicitly copy/send themselves.

## 6. PWA & Offline

- Web app manifest for installability (name, icons, standalone display mode).
- Service worker (via `vite-plugin-pwa`) precaches the app shell and all reference JSON data files on first visit. After that, browsing the database, using the configurator, and managing the profile all work fully offline.
- Responsive layout throughout (mobile-first breakpoints), since the configurator and detail pages are the primary interaction surfaces and need to work well on phones.

## 7. Data Sourcing & Maintenance

Initial data population is researched from `beyblade.fandom.com` and `beybase.com` (community wiki sources), aiming for full coverage of all X-series Beys and parts released as of the time of building. The JSON data structure is designed so the user can append future releases themselves without needing a CMS or backend — new entries are just new objects in the relevant JSON file.

Data population (researching and entering every released Bey and part) is a substantial, separate effort from building the application itself — the implementation plan should treat app scaffolding (with a small placeholder dataset) and full data population as separate, sequential phases rather than one monolithic task.

Image usage: fan-wiki images have unclear copyright/licensing for redistribution. Default approach: do not hard-host copied wiki images; use simple original illustrations/icons per part category (e.g. one icon per category, not per individual part) as the default visual, with a per-item `imageUrl` field left empty/optional so real images can be added later if a properly licensed source is found.

## 8. Out of Scope (v1)

- Login / cloud account / cross-device sync via a backend
- Community features (other users' ratings, comments, public galleries)
- Battle/tournament simulation
- Guaranteed licensed per-item artwork (see Section 7 — default is category-level icons, not photos)
