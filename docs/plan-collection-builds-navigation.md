# Plan: Sammlung, Builds und Navigation zusammenführen

## Zusammenfassung der gewünschten Änderungen

1. **Beys + Sammlung zusammenführen**: `/beys` und `/collection` sollen nicht getrennt sein. Die persönliche Sammlung wird zur Hauptansicht für Beys.
2. **Mehrfachbesitz desselben Bey erlauben**: Gleicher Katalog-Bey darf mehrmals mit unterschiedlichem Preis, Shop und Kaufzeitpunkt vorkommen.
3. **Builder + Deck auf eine Seite**: Beide Funktionen bleiben erhalten, werden aber unter `/builder` zusammengefasst.
4. **Builds als zentrales Konzept**: Gespeicherte Combos (bisher „Creations“) bekommen eine eigene Seite `/builds` und sind in Matches und Simulator auswählbar. Deck-Ergebnisse lassen sich als Builds speichern.
5. **Neue Menü-Reihenfolge**: Start, Sammlung/Beys, Teile, Builder/Deck, Matches, Simulator, Profil.

---

## Vorgeschlagener Ansatz (eine umfassende Lösung)

### Datenmodell

- `OwnedBey` bekommt eine eindeutige `id` (z. B. `crypto.randomUUID()` oder Zeitstempel + Zufall). Damit kann derselbe Katalog-Bey mehrfach in der Sammlung existieren.
- `MyBeyRef` wird um `source: 'ownedBey'` erweitert:
  ```ts
  type MyBeyRef =
    | { source: 'bey'; beyId: string }
    | { source: 'ownedBey'; ownedBeyId: string }
    | { source: 'creation'; creationId: string };
  ```
  Für Matches wählt man zukünftig das konkrete Exemplar (`ownedBey`) oder einen Build (`creation`).
- `PersonalProfile` wird auf Version 2 hochgezogen. Beim Entschlüsseln findet automatisch eine Migration statt:
  - Jedem `OwnedBey` ohne `id` wird eine generierte `id` zugewiesen.
  - Vorhandene Matches mit `source: 'bey'` bleiben gültig, neue Matches verwenden bevorzugt `ownedBey`.
- `Creation` bleibt als Typ bestehen, wird aber in der UI konsequent als **Build** bezeichnet. Der lokale Store (`useCreationsStore`) behält seinen Speicherort in `localStorage`.

### Seiten und Routing

| Route | Inhalt |
|-------|--------|
| `/` | Startseite |
| `/beys` | Wird auf `/collection` umgeleitet oder ersetzt. |
| `/collection` | Persönliche Bey-Sammlung. Zeigt jedes gekaufte Exemplar als eigene Karte mit Preis, Shop, Datum, Set und verlinkten Teilen. |
| `/parts` | Teile-Katalog (unverändert). |
| `/builder` | Neuer Name für `/configurator`. Enthält zwei Tabs/Reiter: **Builder** (freies Kombinieren) und **Deck** (automatisches 3er-Deck). |
| `/deck` | Wird auf `/builder?tab=deck` umgeleitet. |
| `/configurator` | Wird auf `/builder` umgeleitet. |
| `/builds` | Neue Seite: Liste aller gespeicherten Builds (Profil-Creations + lokale Entwürfe) mit Bearbeiten/Duplizieren/Teilen/Löschen. |
| `/matches` | Match-History. Eigener Bey kann ein `ownedBey` oder ein Build sein. |
| `/simulator` | Simulator. Bey A/B können Katalog-Beys, eigene Exemplare oder Builds sein. |
| `/profile` | Profil- und Geräteverwaltung. |

### Builder/Deck-Seite

- Oben Tabs: **Builder** | **Deck**.
- Builder-Tab: Bisherige Configurator-Funktion, inkl. Speichern als Build.
- Deck-Tab: Bisherige DeckBuilder-Funktion, plus „Dieses Deck als 3 Builds speichern“-Button pro Deck. Jedes der drei Deck-Beys wird als eigener Build gespeichert.
- Beide Tabs nutzen denselben `useConfiguratorStore` für den aktuellen Zustand, damit man zwischen Builder und Deck wechseln kann, ohne die Auswahl zu verlieren.

### Builds-Seite

- Zeigt alle verfügbaren Builds gruppiert nach Quelle:
  - Builds aus dem verschlüsselten Profil
  - Lokale Entwürfe
- Aktionen pro Build: Bearbeiten (öffnet Builder mit vorhandener Auswahl), Duplizieren, Teilen, Löschen.
- Ein Build kann in Matches/Simulator ausgewählt werden (zukünftig über `source: 'creation'`).

### Matches und Simulator

- Bey-Auswahl bietet drei Quellen:
  1. Katalog-Beys (`source: 'bey'`)
  2. Eigene Exemplare (`source: 'ownedBey'`)
  3. Gespeicherte Builds (`source: 'creation'`)
- Für Statistiken werden Katalog-Bey-IDs und Build-IDs weiterhin getrennt ausgewertet.

### Navigation

Neue Reihenfolge im Header:
1. Start
2. Sammlung/Beys (`/collection`)
3. Teile (`/parts`)
4. Builder/Deck (`/builder`)
5. Matches (`/matches`)
6. Simulator (`/simulator`)
7. Profil (`/profile`)

`nav.*`-Keys in `de.json`/`en.json` werden angepasst (z. B. `nav.beys` entfernen oder auf „Sammlung“ umbiegen).

### Migration des verschlüsselten Profils

Da `profile.enc.json` committed wird, muss nach der Code-Änderung eine Migration durchgeführt werden:

1. `BX_PROFILE_PASSWORD=<pw> node scripts/decrypt-profile.cjs`
2. Falls `.tmp/profile.plain.json` Version 1 ist:
   - Jedem `ownedBey` eine `id` zuweisen.
   - `version` auf `2` setzen.
3. Optional: Bestehende Matches mit `source: 'bey'` auf `source: 'ownedBey'` umstellen, falls ein passendes Exemplar existiert.
4. `BX_PROFILE_PASSWORD=<pw> node scripts/encrypt-profile.cjs`
5. Build + Test + Push.

### Betroffene Dateien (Ausschnitt)

- `src/types/index.ts` – Typ-Erweiterungen (`OwnedBey.id`, `MyBeyRef`, Profil-Version 2).
- `src/stores/profile.ts` – Validierung + Migration auf Version 2.
- `src/utils/matches.ts` – `resolveMyBeyName` und Statistiken müssen `ownedBey` auflösen.
- `src/pages/Collection.tsx` – Zeigt mehrere Exemplare desselben Bey, erlaubt evtl. Markieren eines „Hauptexemplars“.
- `src/pages/Configurator.tsx` → `src/pages/Builder.tsx` – Umbenennen und Deck-Tab integrieren.
- `src/pages/DeckBuilder.tsx` – Wird in Builder integriert oder bleibt als Komponente.
- `src/pages/Builds.tsx` – Neue Seite.
- `src/pages/Matches.tsx`, `src/pages/Simulator.tsx` – Auswahl erweitern um `ownedBey` und Builds.
- `src/App.tsx`, `src/components/Layout.tsx` – Routing und Navigation.
- `src/i18n/locales/de.json`, `src/i18n/locales/en.json` – Neue/angepasste Keys.

### Offene Entscheidungen

- Soll `/beys` komplett entfallen oder auf `/collection` weiterleiten?
- Soll der Typ `Creation` in `Build` umbenannt werden (inkl. Store-Key in `localStorage`), oder nur die UI-Bezeichnung ändern?
- Soll die Sammlung pro Bey eine „Hauptexemplar“-Logik haben, damit Statistiken pro Katalog-Bey weiterhin funktionieren, ohne jedes Exemplar einzeln aufzuführen?

---

## Aufwand

Groß. Die Änderungen betreffen das zentrale Datenmodell, mehrere Seiten, das Routing, die Übersetzungen und erfordern eine Migration des verschlüsselten Profils.
