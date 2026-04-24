# Agent Commerce Middle DB CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end CLI MVP for an agent-commerce middle DB where sellers submit products, buyer agents query contextual shopping intents, the system reviews link/price/scam risk, and opens the selected purchase URL.

**Architecture:** Use a Node.js TypeScript CLI with a local JSON-backed middle DB for today. Keep clean module boundaries so the JSON DB can later become a hosted API/Postgres DB without rewriting product, review, recommendation, and skill logic.

**Tech Stack:** Node.js 20+, TypeScript, Node built-in `node:test`, local JSON file at `.agent-commerce/db.json`, no web app for MVP.

---

## Master Implementation Prompt

```text
You are Codex implementing an MVP from an empty repo.

Product:
We are building Agent Commerce, a middle database agents query before shopping.

This is NOT a seller-owned DB.
This is NOT a generic shopping mall.
This is NOT only a product page generator.

The core loop:
1. Seller/creator submits a product into our middle DB with product details, purchase link, affiliate disclosure, price snapshot, best-for/not-for context, and claims.
2. Buyer installs a shopping review skill.
3. Buyer asks an agent: "엄마 생일 선물 사야 하는데 10만원 이하로 뭐가 좋을까?"
4. The agent queries our DB through the CLI.
5. The system ranks products by buyer context fit, not commission rate.
6. The system reviews link risk, stale price risk, missing disclosure, scam signals, and unsupported claims.
7. The agent recommends 3 options with risk flags and opens the selected purchase link.

Build the MVP as a Node.js TypeScript CLI.

Non-goals:
- Do not build a web app.
- Do not build auth.
- Do not build payments.
- Do not scrape platform reviews.
- Do not claim lowest price.
- Do not auto-post public reviews.
- Do not rank by commission rate.
- Do not call paid LLM APIs.

Create these files:
- `package.json`
- `tsconfig.json`
- `.gitignore`
- `README.md`
- `src/schema.ts`
- `src/db.ts`
- `src/slug.ts`
- `src/platform.ts`
- `src/review.ts`
- `src/recommender.ts`
- `src/agentJson.ts`
- `src/skill.ts`
- `src/seed.ts`
- `src/cli.ts`
- `test/db.test.ts`
- `test/review.test.ts`
- `test/recommender.test.ts`
- `test/agentJson.test.ts`
- `test/cli.test.ts`

CLI commands:
- `agent-commerce seed --reset`
- `agent-commerce seller:add --name <name> --url <url> --price <number> --currency <KRW|USD> --category <category> --handle <handle> --description <text> --best-for <comma list> --not-for <comma list> --affiliate <yes|no> --disclosure <text> [--captured-at <iso>]`
- `agent-commerce seller:list`
- `agent-commerce buyer:ask "<query>" [--budget <number>] [--recipient <text>] [--category <text>] [--json]`
- `agent-commerce review:product <slug> [--json]`
- `agent-commerce product:agent-json <slug>`
- `agent-commerce open <slug> [--dry-run]`
- `agent-commerce install-skill [--target generic|codex|claude] [--output <path>]`

Data model:
Use a local JSON DB at `.agent-commerce/db.json`.

Types:
- Contributor: id, handle, profileUrl optional, createdAt
- Product: id, slug, canonicalName, brand optional, category, description, imageUrl optional, createdAt, updatedAt
- PurchaseLink: id, productId, contributorId, originalUrl, finalUrl optional, sourceDomain, platform, isAffiliate, disclosureText, priceAtSubmit, currency, capturedAt, linkStatus, riskStatus, createdAt
- AgentProductCard: id, productId, purchaseLinkId, slug, summary, bestFor, notFor, riskFlags, claims, readinessScore, publishedAt
- ReviewReport: productId, purchaseLinkId, priceStalenessStatus, linkRiskStatus, scamRiskStatus, claimVerificationStatus, verdict, riskFlags, reviewedAt
- AgentQuery: id, queryText, buyerContext, resultProductIds, createdAt
- ClickEvent: id, productId, purchaseLinkId, queryId optional, dryRun, openedAt

Recommendation rules:
- Tokenize Korean and English simply by lowercasing, removing punctuation, splitting whitespace, and keeping meaningful chunks.
- Score by category match, budget fit, recipient/context match, bestFor overlap, description overlap, and risk penalties.
- Never use affiliate status or commission rate as a positive ranking factor.
- If price exceeds budget, downrank heavily.
- If missing disclosure on affiliate link, downrank heavily.
- If URL is invalid, non-HTTPS, suspicious shortener, or stale price > 30 days, downrank heavily.
- Return top 3 with explanation.

Risk review rules:
- Invalid URL: `invalid_url`
- Non-HTTPS URL: `non_https_url`
- Suspicious shortener domains: `bit.ly`, `tinyurl.com`, `t.co`, `is.gd`, `rebrand.ly`, `cutt.ly`
- Missing affiliate disclosure when `isAffiliate=true`: `missing_affiliate_disclosure`
- Price snapshot older than 7 days: `price_stale_warning`
- Price snapshot older than 30 days: `price_stale_high`
- Medical or impossible claims in description/claims: flag `unsupported_high_risk_claim`
- Empty bestFor/notFor: flag `low_context_quality`
- Verdict levels: `recommendable`, `consider_with_caution`, `do_not_recommend`

Agent JSON shape:
`product:agent-json <slug>` must print valid JSON:
{
  "schema_version": "agent-commerce.product.v0",
  "product": {...},
  "purchase_path": {...},
  "price_snapshot": {...},
  "decision": {...},
  "trust": {...}
}

Skill install:
`install-skill` writes a markdown instruction file. The skill tells an agent:
- Use `buyer:ask` for shopping intents.
- Use `product:agent-json` before recommending a specific product.
- Use `review:product` before opening a link.
- Always disclose affiliate links.
- Always mention captured price time and that final price may differ.
- Refuse to recommend products with `do_not_recommend` unless explicitly explaining why not.
- Use `open <slug>` only after the user selects a product.

Seed data:
Create at least 8 Korean gift products, including:
- safe recommended products under 100000 KRW
- one stale price product
- one suspicious shortener URL product
- one affiliate product missing disclosure
- one over-budget product

Tests:
Use Node built-in test runner.
Run tests via `npm test`.

Required tests:
1. DB initializes an empty file and persists seller-added products.
2. Slugs are stable and unique.
3. Risk review flags stale price, suspicious shortener, missing disclosure, and non-HTTPS URLs.
4. Buyer query "엄마 생일 선물 10만원 이하" returns relevant under-budget gift products first.
5. Recommendation does not boost affiliate products.
6. Agent JSON is valid and includes disclosure, capturedAt, readinessScore, riskFlags, and `ranking_uses_commission_rate: false`.
7. `open --dry-run` records a click event without launching a browser.
8. `install-skill` writes a usable skill markdown file.

Verification commands after implementation:
```bash
npm install
npm run build
npm test
node dist/cli.js seed --reset
node dist/cli.js seller:list
node dist/cli.js buyer:ask "엄마 생일 선물 사야 하는데 10만원 이하로 추천해줘"
node dist/cli.js buyer:ask "엄마 생일 선물 사야 하는데 10만원 이하로 추천해줘" --json
node dist/cli.js review:product <one-seed-slug>
node dist/cli.js product:agent-json <one-seed-slug>
node dist/cli.js open <one-seed-slug> --dry-run
node dist/cli.js install-skill --target generic
```

README must include:
- What this MVP is
- Why it is a middle DB for agent commerce
- Buyer flow
- Seller flow
- All CLI commands
- Risk review policy
- Why ranking ignores commission rate
- Known limitations
- Next steps toward hosted DB and MCP server

Implementation discipline:
- Use small focused files.
- No hidden magic.
- No large dependencies.
- Make every error user-readable.
- If the repo is not a git repo, do not fail on commit steps.
- After finishing, report changed files, verification results, and known limitations.
```

---

## Task Plan

### Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] Create a Node TypeScript CLI project with `build`, `test`, and `start` scripts.
- [ ] Configure `bin` as `agent-commerce`.
- [ ] Add `.agent-commerce/`, `dist/`, and `node_modules/` to `.gitignore`.
- [ ] Add README skeleton with product definition and commands.
- [ ] Run `npm install`.
- [ ] Run `npm run build`, expect TypeScript compile to succeed after source files exist.

### Task 2: Core Schema And JSON DB

**Files:**
- Create: `src/schema.ts`
- Create: `src/db.ts`
- Create: `src/slug.ts`
- Test: `test/db.test.ts`

- [ ] Define all core types in `src/schema.ts`.
- [ ] Implement JSON DB initialization, load, save, and upsert helpers.
- [ ] Implement stable slug generation with uniqueness.
- [ ] Test DB initialization and persistence.
- [ ] Test slug uniqueness.
- [ ] Run `npm test`.

### Task 3: Platform And Risk Review

**Files:**
- Create: `src/platform.ts`
- Create: `src/review.ts`
- Test: `test/review.test.ts`

- [ ] Implement URL parsing and platform/domain detection.
- [ ] Implement risk flags for invalid URL, non-HTTPS, shortener domains, stale prices, missing disclosure, unsupported claims, and low context quality.
- [ ] Implement verdict calculation.
- [ ] Test each risk flag explicitly.
- [ ] Run `npm test`.

### Task 4: Seller Submission And Seed Data

**Files:**
- Create: `src/seed.ts`
- Modify: `src/cli.ts`
- Test: `test/cli.test.ts`

- [ ] Implement CLI argument parsing without heavy dependencies.
- [ ] Implement `seller:add`.
- [ ] Implement `seller:list`.
- [ ] Implement `seed --reset` with at least 8 Korean gift products and intentional risk cases.
- [ ] Test seller add/list and seed reset.
- [ ] Run `npm test`.

### Task 5: Buyer Recommendation

**Files:**
- Create: `src/recommender.ts`
- Modify: `src/cli.ts`
- Test: `test/recommender.test.ts`

- [ ] Implement simple Korean/English token matching.
- [ ] Implement recommendation scoring with budget/context/risk penalties.
- [ ] Implement `buyer:ask`.
- [ ] Implement `buyer:ask --json`.
- [ ] Test "엄마 생일 선물 10만원 이하" returns relevant under-budget gift products first.
- [ ] Test affiliate status is not a positive ranking factor.
- [ ] Run `npm test`.

### Task 6: Agent JSON And Link Opening

**Files:**
- Create: `src/agentJson.ts`
- Modify: `src/cli.ts`
- Test: `test/agentJson.test.ts`
- Test: `test/cli.test.ts`

- [ ] Implement `product:agent-json <slug>`.
- [ ] Implement `review:product <slug>`.
- [ ] Implement `open <slug> --dry-run`.
- [ ] Record click events for dry-run and real open.
- [ ] On macOS, real open can use `open <url>`, but tests must only use `--dry-run`.
- [ ] Test agent JSON shape and click event recording.
- [ ] Run `npm test`.

### Task 7: Skill Installer

**Files:**
- Create: `src/skill.ts`
- Modify: `src/cli.ts`
- Test: `test/cli.test.ts`

- [ ] Implement `install-skill --target generic|codex|claude`.
- [ ] Write a markdown skill file with exact agent behavior instructions.
- [ ] Include affiliate disclosure, captured price, risk review, and "open only after user selects" rules.
- [ ] Test skill file creation.
- [ ] Run `npm test`.

### Task 8: Final Verification And README

**Files:**
- Modify: `README.md`

- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Run seed and demo buyer query.
- [ ] Run review, agent-json, dry-run open, and install-skill commands.
- [ ] Update README with actual command output examples.
- [ ] Report known limitations and next steps.

---

## Self-Review

Spec coverage:
- Seller product submission: Task 4.
- Our middle DB: Task 2.
- Buyer contextual query: Task 5.
- Agent-readable JSON: Task 6.
- Risk review for scam, link, stale price, disclosure: Task 3 and Task 6.
- Purchase link opening and click tracking: Task 6.
- Skill installation: Task 7.
- Verification: Task 8.

Placeholder scan:
- No TBD, TODO, "implement later", or vague "handle errors" instructions.

Type consistency:
- Command names, entity names, and JSON schema names match across tasks.
