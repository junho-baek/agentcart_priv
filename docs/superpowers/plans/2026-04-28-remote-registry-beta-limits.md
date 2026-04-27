# Remote Registry Beta Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. When editing `skills/agentcart-curator-registration-skill.md`, also use superpowers:writing-skills and keep the skill change test-first.

**Goal:** Prepare AgentCart for service-mode registration by adding account identity, curator-scoped limits, hosted API semantics, and skill guidance for email-gated beta registration. Keep local JSON as the development backend, but make the product contract match a future hosted registry API and operational DB.

**Product Decision:** Initial beta accounts are email-gated. Default free beta limit is 1 curator persona and 30 product/link entries per account. Public/global discovery should not be the default registration path; curator-scoped lookup is the primary path, and global search stays a later controlled capability.

**Architecture:** Extend the existing Node ESM CLI/API/store instead of replacing the runtime. Add account/ownership metadata to the registry, enforce limits in `register:draft`, expose account-scoped registration API semantics, and document that the CLI is the registry interface that can later point to a hosted API/MCP transport. Avoid introducing a production database in this slice unless a later plan chooses Turso/D1/Postgres explicitly.

**Tech Stack:** Node ESM, `node:test`, existing local JSON registry, existing HTTP API, Markdown skills.

---

## File Structure

- Modify `src/registry/store.js`: add account records, email normalization, quota helpers, ownership metadata, and registration draft import helpers.
- Create `src/registry/registration.js`: pure validation/mapping for `AgentCartRegistrationDraft`, account limits, and curator-scoped registration rules.
- Modify `src/cli/commands.js`: enforce account/email requirements for draft registration.
- Modify `src/api/server.js`: add beta registration endpoint semantics for `POST /api/register-draft`.
- Modify `test/cli.test.js`: cover email-gated draft registration and over-limit drafts.
- Modify `test/server.test.js`: cover register-draft API behavior and public search staying curator-scoped when handle is present.
- Create `test/registration.test.js`: focused unit tests for draft validation and quota checks.
- Modify `skills/agentcart-curator-registration-skill.md`: teach the skill to collect account email, keep drafts under 30 entries, and avoid global-search assumptions.
- Modify `README.md`: document beta limits and remote-registry direction.
- Modify `docs/protocol/commerce-context-protocol.md`: add account/quota/publication policy fields.

## Task 1: Define Registration Account And Quota Contract

**Files:**
- Create: `src/registry/registration.js`
- Create: `test/registration.test.js`
- Modify: `docs/protocol/commerce-context-protocol.md`

- [ ] **Step 1: Write failing tests**

Add tests for:

- `normalizeAccountEmail(" Creator@Example.COM ")` returns `creator@example.com`.
- `validateRegistrationDraft(draft, { maxEntries: 30 })` accepts a draft with 1 persona and <=30 entries.
- A draft without account email returns `account_email_required`.
- A draft with 31 entries returns `entry_limit_exceeded`.
- A draft with more than 1 persona for free beta returns `persona_limit_exceeded`.
- A draft with entries missing curator handle or disclosure returns deterministic errors.

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/registration.test.js
```

Expected: FAIL because `src/registry/registration.js` does not exist.

- [ ] **Step 3: Implement pure registration helpers**

Create `src/registry/registration.js` with:

```js
export const FREE_BETA_LIMITS = { maxPersonas: 1, maxEntries: 30 };
export function normalizeAccountEmail(email) { ... }
export function entriesFromRegistrationDraft(draft) { ... }
export function personasFromRegistrationDraft(draft) { ... }
export function validateRegistrationDraft(draft, options = {}) { ... }
export function accountIdForEmail(email) { ... }
```

Keep it pure: no file I/O.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- test/registration.test.js
```

Expected: PASS.

- [ ] **Step 5: Update protocol docs**

Document `accountEmail`, beta limits, ownership, and publication policy:

- `accountEmail`
- `visibility`: `private`, `curator_scoped`, or `public_candidate`
- default `maxEntries: 30`
- default `maxPersonas: 1`
- global search is not guaranteed for free beta entries

- [ ] **Step 6: Commit**

```bash
git add src/registry/registration.js test/registration.test.js docs/protocol/commerce-context-protocol.md
git commit -m "feat: define beta registration limits"
```

## Task 2: Enforce Limits In Local Registry Import

**Files:**
- Modify: `src/registry/store.js`
- Modify: `src/cli/commands.js`
- Modify: `test/cli.test.js`
- Modify: `test/store.test.js`

- [ ] **Step 1: Write failing CLI tests**

Add tests that:

- `register:draft --email creator@example.com draft.json` saves account metadata and imports <=30 entries.
- `register:draft draft.json` fails when neither `--email` nor draft `accountEmail` exists.
- 31 entries fail before any card is written.
- A second import for the same email cannot exceed 30 total active cards for the beta account.
- Imported cards include `accountEmail`, `visibility`, and `curator.handle`.

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- test/cli.test.js test/store.test.js
```

Expected: FAIL until registration helpers are wired.

- [ ] **Step 3: Move draft mapping into registration helper**

Remove duplicated draft parsing from `src/cli/commands.js` and import:

- `entriesFromRegistrationDraft`
- `personasFromRegistrationDraft`
- `validateRegistrationDraft`
- `normalizeAccountEmail`

- [ ] **Step 4: Add account-aware storage**

In `src/registry/store.js`, add:

- `accounts: []` to empty registry shape.
- `upsertAccount(path, { email, plan })`.
- `countAccountCards(registry, accountEmail)`.
- `addCard` support for `accountEmail`, `visibility`, and `publicationStatus`.
- `addCuratorPersona` support for `accountEmail`.

Keep existing seed/local tests passing.

- [ ] **Step 5: Enforce beta limit in `register:draft`**

`register:draft` should:

1. Read `--email` or `draft.accountEmail`.
2. Validate draft.
3. Load current registry and count existing cards for that email.
4. Reject if existing + incoming entries > 30.
5. Upsert account and persona.
6. Add cards with default `visibility: "curator_scoped"` and `publicationStatus: "draft"` unless explicitly set.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- test/cli.test.js test/store.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/registry/store.js src/cli/commands.js test/cli.test.js test/store.test.js
git commit -m "feat: enforce beta registration quotas"
```

## Task 3: Add Hosted Registry API Contract

**Files:**
- Modify: `src/api/server.js`
- Modify: `test/server.test.js`
- Modify: `README.md`

- [ ] **Step 1: Write failing server tests**

Add tests for:

- `POST /api/register-draft` with `{ accountEmail, personas, entries }` imports a valid draft.
- Missing account email returns `400 { error: "account_email_required" }`.
- More than 30 entries returns `400 { error: "entry_limit_exceeded" }`.
- `GET /api/search?q=...&curator=junho-baek` limits results to that curator.
- Global search continues working locally, but README says service-mode default should use curator-scoped lookup.

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- test/server.test.js
```

Expected: FAIL until route and scoped search are implemented.

- [ ] **Step 3: Implement API route**

Add `POST /api/register-draft`.

For this local API slice, use simple email identity in the body or `x-agentcart-account-email`. Do not add production auth yet; document that hosted service must replace this with signed auth before public launch.

- [ ] **Step 4: Implement curator-scoped search parameter**

Support:

```text
GET /api/search?q=<query>&curator=<handle>
```

Filter candidate cards by normalized curator handle before ranking when `curator` is present.

- [ ] **Step 5: Update README**

Add a "Beta Service Model" section:

- email-gated registration
- free beta: 1 persona / 30 links
- curator-scoped search default
- global search later
- hosted registry API and DB required for service and monetization
- CLI/MCP should hide registry URL from user prompts

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- test/server.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/api/server.js test/server.test.js README.md
git commit -m "feat: add beta registration api contract"
```

## Task 4: Update Registration Skill With Skill-TDD Guardrails

**Files:**
- Modify: `skills/agentcart-curator-registration-skill.md`
- Modify: `test/skill.test.js`

- [ ] **Step 1: Write failing skill tests**

Add tests that require the skill to mention:

- `accountEmail`
- `30`
- `curator_scoped`
- `Do not promise global search exposure`
- `Collect email before registration`
- `Do not split one creator across multiple emails to bypass limits`

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/skill.test.js
```

Expected: FAIL until skill text is updated.

- [ ] **Step 3: Update skill minimally**

Add a short "Beta Registration Limits" section:

- collect email before registration
- default free beta limits
- one persona / 30 entries
- draft default visibility is `curator_scoped`
- public/global exposure requires later review or paid/approved tier
- do not help bypass limits by rotating emails

Because superpowers:writing-skills expects pressure scenarios, include compact pressure cases:

- creator asks to register 80 links for free
- brand wants public global exposure immediately
- operator proposes splitting links across multiple emails
- entry lacks disclosure but user wants fast import

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- test/skill.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/agentcart-curator-registration-skill.md test/skill.test.js
git commit -m "docs: add beta limits to registration skill"
```

## Task 5: Full Verification And Push

**Files:**
- No new files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Check git status**

Run:

```bash
git status --short --branch
```

Expected: only pre-existing browser artifacts may remain untracked.

- [ ] **Step 3: Push branch**

Run:

```bash
git push
```

Expected: branch updates on `origin/codex/commerce-context-protocol`.

## Open Decisions For Later

- Production DB choice: Turso/D1/Postgres. This plan intentionally avoids choosing it.
- Auth choice: magic link, OAuth, or API key. This plan only creates the account/quota contract.
- Billing provider and paid tiers.
- Review/moderation workflow for public/global exposure.
- MCP server transport. This plan keeps CLI/API contracts stable so MCP can wrap them later.
