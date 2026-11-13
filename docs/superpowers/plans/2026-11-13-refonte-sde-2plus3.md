# Refonte SDE direction 2 + 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unifier l'expérience visuelle cinématique et communautaire de toutes les pages publiques et des espaces membre/administrateur, sans altérer l'authentification, les routes ou les droits.

**Architecture:** La vitrine utilise les feuilles globales de `public/vitrine/` déjà chargées sur les documents HTML publics ; la refonte doit y ajouter une couche de styles scoped et des composants de navigation/hero qui conservent les liens existants. Les tableaux de bord privés sont générés depuis les composants React de `frontend/` et compilés vers les ressources publiques ; leurs changements doivent rester purement présentatifs et conserver les appels API existants.

**Tech Stack:** HTML statique, CSS, JavaScript, React 19, esbuild, Cloudflare Worker, Node.js tests.

**Spec:** `docs/superpowers/specs/2026-11-13-refonte-sde-2plus3-design.md`

## Global Constraints

- Ne pas modifier `src/worker.js`, les routes d'authentification ou les permissions.
- Conserver les URL, formulaires, appels API et contenu métier existants.
- Utiliser les couleurs `#0D1B38`, `#FAF7F0`, `#D9A72E`, `#B74624` et `#00644F` dans les couches de présentation ciblées.
- Réutiliser les visuels SDE présents dans le dépôt ; ne créer aucun contenu factuel ou portrait fictif.
- Préserver `prefers-reduced-motion`, `:focus-visible`, le contraste AA et les règles mobiles.
- Valider avec Node 22+ et les dépendances listées dans `package-lock.json` ; l'environnement actuel a Node 24 mais ne fournit pas `npm`.

## Review Focus

- Session non connectée : les pages publiques restent publiques et les liens du portail ne dévoilent aucune donnée ; couverture dans la tâche 5.
- Membre connecté : navigation et données visibles restent limitées aux routes existantes ; couverture dans la tâche 4.
- Administrateur connecté : les raccourcis financiers restent conditionnés par le niveau existant ; couverture dans la tâche 4.
- Mobile 390 px : les quatre accès, le menu et le compte à rebours ne débordent pas ; couverture dans la tâche 3.
- Mouvement réduit et navigation clavier : aucune animation obligatoire et indicateur de focus visible ; couverture dans les tâches 2 et 4.

---

### Task 1: Establish the reproducible build baseline

**Files:**
- Modify: `package.json` only if an existing repository convention supports a Node runtime bootstrap script
- Test: `test/verifier.mjs`

**Interfaces:**
- Consumes: Node.js 22+ and `package-lock.json`
- Produces: a recorded baseline test result before visual changes

- [ ] **Step 1: Install the repository's locked Node dependencies**

Run: `npm ci`

- [ ] **Step 2: Run the baseline verification**

Run: `npm test`
Expected: PASS before the visual change; otherwise record failing test names and stop for diagnosis.

- [ ] **Step 3: Commit the baseline-only configuration if one was required**

```bash
git add package.json package-lock.json
git commit -m "chore: document SDE visual build baseline"
```

### Task 2: Add the shared public visual language

**Files:**
- Modify: `public/vitrine/sde-shell-public.css`
- Modify: `public/vitrine/sde-hybride-integral-2027.css`
- Test: `test/sde-theme-navigation-unifie.test.mjs`
- Test: `test/refonte-sde-hybride.test.mjs`

**Interfaces:**
- Consumes: existing body page classes and `sde-shell-public.js` navigation metadata
- Produces: `--sde-23-*` custom properties and scoped public rules used by every loaded vitrine document

- [ ] **Step 1: Write a failing test for the 2+3 design tokens and accessibility guardrails**

Add assertions that both public stylesheets declare `#0D1B38`, `#FAF7F0`, `#D9A72E`, `#B74624`, `#00644F`, `:focus-visible`, and `prefers-reduced-motion` in the new 2+3 section.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/sde-theme-navigation-unifie.test.mjs test/refonte-sde-hybride.test.mjs`
Expected: FAIL because the 2+3 token section is absent.

- [ ] **Step 3: Implement the scoped public style layer**

Append a named `SDE 2+3` layer to the existing public sheets. Scope hero, sections, cards, navigation, programme tiles and footer to public body classes; keep private selectors out of `sde-shell-public.css`.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node --test test/sde-theme-navigation-unifie.test.mjs test/refonte-sde-hybride.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the public design layer**

```bash
git add public/vitrine/sde-shell-public.css public/vitrine/sde-hybride-integral-2027.css test/sde-theme-navigation-unifie.test.mjs test/refonte-sde-hybride.test.mjs
git commit -m "feat: add SDE 2 plus 3 public design layer"
```

### Task 3: Refine the public entry points and programme discovery

**Files:**
- Modify: `public/vitrine/portail.html`
- Modify: `public/vitrine/programmes.html`
- Modify: `public/vitrine/sde-shell-public.js`
- Test: `test/agenda-programmes-ux.test.mjs`
- Test: `test/sde-accueil-reference-officielle-2027.test.mjs`
- Test: `test/pages-publiques.test.mjs`

**Interfaces:**
- Consumes: existing public routes `/mouvement`, `/contact#rejoindre`, `/programmes#agenda`, `/portail`, existing TPA event data and programme cards
- Produces: a four-access hero and a discoverable programme path for TPA, TPM, Holy Talk and Holy Brunch

- [ ] **Step 1: Write failing DOM tests for the four visible actions and programme labels**

Assert the hero exposes exactly the existing paths to movement, joining, programmes and portal; assert the programmes page visibly names TPA, Traversée Prophétique Mensuelle, Holy Talk and Holy Brunch without changing their existing registration targets.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/agenda-programmes-ux.test.mjs test/sde-accueil-reference-officielle-2027.test.mjs test/pages-publiques.test.mjs`
Expected: FAIL for the new four-access and programme-discovery assertions.

- [ ] **Step 3: Implement the page markup and navigation refinement**

Use the existing hero and programme cards; add only semantic labels, supported descriptions and links that map to already-rendered content. Keep TPA's existing `datetime="2026-12-18T20:00:00+00:00"` and `Google Meet` presentation.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `node --test test/agenda-programmes-ux.test.mjs test/sde-accueil-reference-officielle-2027.test.mjs test/pages-publiques.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the public-entry refinement**

```bash
git add public/vitrine/portail.html public/vitrine/programmes.html public/vitrine/sde-shell-public.js test/agenda-programmes-ux.test.mjs test/sde-accueil-reference-officielle-2027.test.mjs test/pages-publiques.test.mjs
git commit -m "feat: unify SDE public entry and programmes"
```

### Task 4: Apply the same language to member and command dashboards

**Files:**
- Modify: `frontend/operations.jsx`
- Modify: `frontend/reference-shell.jsx`
- Modify: `frontend/reference.css`
- Modify: `frontend/business-mosaic.css`
- Test: `test/refonte-integrale-metiers.test.mjs`
- Test: `test/portail-unifie.test.mjs`
- Test: `test/espaces-prives-visibles.test.mjs`

**Interfaces:**
- Consumes: `portal.selectionner(module)`, `portal.compte.niveau`, existing `useData` API calls and the current private navigation routes
- Produces: visually coherent member and administration covers/cards that retain existing module and role gates

- [ ] **Step 1: Write failing tests for private presentation without access changes**

Assert the new private classes appear around existing member and command covers, API paths remain unchanged, and finance navigation remains conditional on `portal.compte.niveau>=2`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/refonte-integrale-metiers.test.mjs test/portail-unifie.test.mjs test/espaces-prives-visibles.test.mjs`
Expected: FAIL because the new 2+3 dashboard classes are absent.

- [ ] **Step 3: Implement the private visual refinement**

Use existing headings, metrics and module launchers. Add no new API calls, local storage, fake metrics or privilege checks; preserve all `portal.selectionner(...)` destinations.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `node --test test/refonte-integrale-metiers.test.mjs test/portail-unifie.test.mjs test/espaces-prives-visibles.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit the dashboard presentation changes**

```bash
git add frontend/operations.jsx frontend/reference-shell.jsx frontend/reference.css frontend/business-mosaic.css test/refonte-integrale-metiers.test.mjs test/portail-unifie.test.mjs test/espaces-prives-visibles.test.mjs
git commit -m "feat: unify member and command SDE experience"
```

### Task 5: Build, validate, and review the production artifact

**Files:**
- Modify: generated files only through `npm run build:experience`
- Test: `test/refonte-sde-hybride.test.mjs`
- Test: `test/refonte-integrale-metiers.test.mjs`
- Test: `test/sde-six-maquettes-integration.test.mjs`
- Test: `test/sde-os40-securite.test.mjs`

**Interfaces:**
- Consumes: source changes from Tasks 2–4
- Produces: compiled public CSS/operations bundle validated against visual, mobile and access invariants

- [ ] **Step 1: Run the production build**

Run: `npm run build:experience`
Expected: exits with code 0 and updates only generated experience assets.

- [ ] **Step 2: Run focused visual and permission tests**

Run: `node --test test/refonte-sde-hybride.test.mjs test/refonte-integrale-metiers.test.mjs test/sde-six-maquettes-integration.test.mjs test/sde-os40-securite.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run the complete repository test suite**

Run: `npm test`
Expected: PASS with no new failures.

- [ ] **Step 4: Inspect the working tree and production diff**

Run: `git status --short && git diff --check main...HEAD`
Expected: only intended source, generated assets, tests and documentation; no whitespace errors or secrets.

- [ ] **Step 5: Commit the verified build output**

```bash
git add public/vitrine frontend test docs
git commit -m "feat: complete SDE 2 plus 3 visual refonte"
```
