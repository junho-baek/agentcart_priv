# Commerce Context Protocol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first AgentCart commerce context protocol slice: protocol docs, examples, Node mappers, API/CLI surfaces, and a curator registration skill stub grounded in the approved design.

**Architecture:** Keep the existing Node ESM registry as the runtime. Add a focused `src/registry/protocol.js` module that converts current cards/personas into `CurationEntry`, `AgentProductContext`, and `RecommenderPersona` objects. Expose those objects through CLI commands and local API routes while documenting the protocol under `docs/protocol/`.

**Tech Stack:** Node ESM, `node:test`, existing JSON registry, Markdown skill files, local HTTP API.

---

## File Structure

- Create `docs/protocol/commerce-context-protocol.md`: human-readable protocol reference.
- Create `docs/protocol/examples/curation-entry.json`: sample creator/brand source record.
- Create `docs/protocol/examples/recommender-persona.json`: sample insight-first commercial actor persona.
- Create `docs/protocol/examples/agent-product-context.json`: sample agent-facing context.
- Create `src/registry/protocol.js`: pure conversion and validation helpers.
- Create `test/protocol.test.js`: unit tests for protocol helpers.
- Modify `src/api/server.js`: add read-only protocol context/persona routes.
- Modify `test/server.test.js`: cover new routes.
- Modify `src/cli/commands.js`: add `protocol:context`, `protocol:persona`, and `protocol:validate`.
- Modify `test/cli.test.js`: cover new CLI commands.
- Create `skills/agentcart-curator-registration-skill.md`: canonical future registration skill draft.
- Modify `test/skill.test.js`: verify the registration skill includes disclosure and structure requirements.
- Modify `README.md`: mention protocol docs and new commands.

## Task 1: Protocol Docs And Examples

**Files:**
- Create: `docs/protocol/commerce-context-protocol.md`
- Create: `docs/protocol/examples/curation-entry.json`
- Create: `docs/protocol/examples/recommender-persona.json`
- Create: `docs/protocol/examples/agent-product-context.json`

- [ ] **Step 1: Write protocol reference**

Create `docs/protocol/commerce-context-protocol.md` with sections for `CurationEntry`, `AgentProductContext`, `RecommenderPersona`, `DisclosurePolicy`, and `PersonaInjection`.

- [ ] **Step 2: Write protocol examples**

Create one JSON example for each core object. Use `junho-baek` style grocery context for the examples.

- [ ] **Step 3: Inspect docs**

Run: `sed -n '1,220p' docs/protocol/commerce-context-protocol.md`

Expected: the document names the split between human registration objects and agent-facing context.

- [ ] **Step 4: Commit**

```bash
git add docs/protocol
git commit -m "docs: add commerce context protocol reference"
```

## Task 2: Protocol Helper Module

**Files:**
- Create: `src/registry/protocol.js`
- Create: `test/protocol.test.js`

- [ ] **Step 1: Write failing tests**

Add tests that call:

```js
import {
  buildAgentProductContext,
  buildCurationEntry,
  buildRecommenderPersona,
  validateProtocolObject,
} from "../src/registry/protocol.js";
```

Test expected behavior:

- `buildCurationEntry(card)` includes `kind: "CurationEntry"`, title, original URL, curator handle, fit/avoid lists.
- `buildRecommenderPersona(persona)` includes `kind: "RecommenderPersona"`, `adviceMode: "insight_first"`, and `commercialRole`.
- `buildAgentProductContext(card, { persona })` includes `kind: "AgentProductContext"`, disclosure relationship, fit rules, risk flags, and allowed/prohibited actions.
- `validateProtocolObject({ kind: "Bad" })` returns `{ ok: false }`.

- [ ] **Step 2: Run failing test**

Run: `npm test -- test/protocol.test.js`

Expected: FAIL because `src/registry/protocol.js` does not exist yet.

- [ ] **Step 3: Implement helpers**

Create pure helpers in `src/registry/protocol.js`:

```js
export function normalizeHandle(handle) { ... }
export function buildCurationEntry(card) { ... }
export function buildRecommenderPersona(persona) { ... }
export function buildAgentProductContext(card, { persona } = {}) { ... }
export function validateProtocolObject(object) { ... }
```

Keep validation lightweight: require known `kind`, stable ids/handles, and required core fields.

- [ ] **Step 4: Run test**

Run: `npm test -- test/protocol.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/registry/protocol.js test/protocol.test.js
git commit -m "feat: add commerce context protocol helpers"
```

## Task 3: API And CLI Surfaces

**Files:**
- Modify: `src/api/server.js`
- Modify: `test/server.test.js`
- Modify: `src/cli/commands.js`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Write failing server tests**

Add tests for:

- `GET /api/protocol/context/<slug-or-id>` returns `{ context }` with `kind: "AgentProductContext"`.
- Missing card returns `{ error: "context_not_found" }`.
- `GET /api/protocol/personas/<handle>` returns `{ persona }` with `kind: "RecommenderPersona"`.

- [ ] **Step 2: Write failing CLI tests**

Add tests for:

- `agentcart protocol:context <slug>` prints JSON with `kind: "AgentProductContext"`.
- `agentcart protocol:persona junho-baek` prints JSON with `kind: "RecommenderPersona"`.
- `agentcart protocol:validate <file>` prints `Protocol object valid: <kind>` for a valid JSON object.

- [ ] **Step 3: Run failing tests**

Run: `npm test -- test/server.test.js test/cli.test.js`

Expected: FAIL because commands and routes do not exist.

- [ ] **Step 4: Implement API routes**

In `src/api/server.js`, import protocol helpers and add:

- `/api/protocol/context/:idOrSlug`
- `/api/protocol/personas/:handle`

Both routes are read-only and use existing registry data.

- [ ] **Step 5: Implement CLI commands**

In `src/cli/commands.js`, add help text and handlers:

- `protocol:context <slug-or-id>`
- `protocol:persona <handle>`
- `protocol:validate <file>`

Print pretty JSON for context/persona commands.

- [ ] **Step 6: Run tests**

Run: `npm test -- test/server.test.js test/cli.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/api/server.js src/cli/commands.js test/server.test.js test/cli.test.js
git commit -m "feat: expose protocol context through api and cli"
```

## Task 4: Registration Skill Draft And Docs

**Files:**
- Create: `skills/agentcart-curator-registration-skill.md`
- Modify: `test/skill.test.js`
- Modify: `README.md`

- [ ] **Step 1: Write failing skill test**

Add a test that reads `skills/agentcart-curator-registration-skill.md` and expects:

- frontmatter name `agentcart-curator-registration`
- phrase `CurationEntry`
- phrase `RecommenderPersona`
- phrase `Commercial actor persona`
- phrase `Do not hide brand, sponsor, affiliate, or merchant relationships`

- [ ] **Step 2: Run failing test**

Run: `npm test -- test/skill.test.js`

Expected: FAIL because the skill file does not exist yet.

- [ ] **Step 3: Create skill draft**

Create a concise skill describing when to use it, required disclosure behavior, required output sections, pressure scenarios, and expected structured drafts.

- [ ] **Step 4: Update README**

Add a short "Commerce Context Protocol" section that points to `docs/protocol/commerce-context-protocol.md` and mentions the new CLI commands.

- [ ] **Step 5: Run tests**

Run: `npm test -- test/skill.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md skills/agentcart-curator-registration-skill.md test/skill.test.js
git commit -m "docs: add curator registration skill draft"
```

## Task 5: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Check git status**

Run: `git status --short --branch`

Expected: only pre-existing untracked browser artifacts may remain.

- [ ] **Step 3: Final commit if needed**

If verification required documentation fixes, commit them with:

```bash
git add <changed-files>
git commit -m "docs: polish protocol rollout"
```
