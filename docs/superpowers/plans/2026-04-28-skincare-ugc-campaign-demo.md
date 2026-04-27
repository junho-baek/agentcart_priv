# Skincare UGC Campaign Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a demo that shows an AI-native UGC creator turning a skincare post into a callable commerce persona and campaign-scoped shopping recommendation.

**Architecture:** Keep the existing local JSON registry and Node ESM runtime. Add campaign metadata to cards/personas, seed a `@maya-glow` skincare persona with a `barrier-repair-under-60` campaign, and make search/recommendation output surface campaign context and skincare safety boundaries. This is a demo wedge, not a full campaign management system.

**Tech Stack:** Node ESM, `node:test`, local JSON registry, existing CLI/API, Markdown docs and skills.

---

## File Structure

- Modify `data/seed-cards.json`: add 4 skincare demo cards for `@maya-glow` with `campaignHandle: "barrier-repair-under-60"`.
- Modify `data/seed-curator-personas.json`: add `maya-glow` persona with skincare-safe voice, disclosure text, and campaign one-liner.
- Modify `src/registry/schema.js`: preserve `campaignHandle` and `claimNotes` when creating/storing cards.
- Modify `src/registry/store.js`: persist `campaignHandle` and `claimNotes` for seed and imported cards.
- Modify `src/registry/recommend.js`: include campaign terms in recall text and show campaign/claim notes in formatted output.
- Modify `src/registry/protocol.js`: include `campaignHandle` and `claimNotes` in `CurationEntry` and `AgentProductContext`.
- Modify `src/registry/registration.js`: map `campaignHandle` and `claimNotes` from registration drafts into cards.
- Modify `test/schema.test.js`: cover card persistence for campaign metadata.
- Modify `test/recommend.test.js`: cover campaign-scoped skincare recall and safety note output.
- Modify `test/protocol.test.js`: cover campaign metadata in protocol objects.
- Modify `test/cli.test.js`: cover seeded `maya-glow` campaign demo search.
- Modify `README.md`: add the “creator post -> persona campaign -> recommendation” demo.
- Modify `skills/agentcart-shopping-skill.md`: teach shopping skill to respect campaign-scoped context and skincare claim limits.
- Modify `skills/agentcart-curator-registration-skill.md`: teach registration skill to collect `campaignHandle`, campaign CTA, and skincare safety fields.
- Modify `test/skill.test.js`: assert the two skill files mention campaign and skincare safety guardrails.

## Task 1: Preserve Campaign Metadata In Cards

**Files:**
- Modify: `src/registry/schema.js`
- Modify: `src/registry/store.js`
- Modify: `src/registry/registration.js`
- Modify: `test/schema.test.js`

- [ ] **Step 1: Write failing schema test**

Add this test to `test/schema.test.js`:

```js
test("createCard preserves campaign and claim metadata for UGC campaign demos", () => {
  const card = createCard({
    title: "Barrier Cream",
    category: "skincare",
    originalUrl: "https://brand.example/products/barrier-cream",
    curator: { handle: "maya-glow" },
    bestFor: ["dry sensitive skin"],
    notFor: ["fragrance-sensitive users"],
    curationNote: "Use as the final moisturizer step.",
    campaignHandle: "barrier-repair-under-60",
    claimNotes: ["Cosmetic routine support only; not acne or eczema treatment."],
  });

  assert.equal(card.campaignHandle, "barrier-repair-under-60");
  assert.deepEqual(card.claimNotes, [
    "Cosmetic routine support only; not acne or eczema treatment.",
  ]);
  assert.match(card.embeddingText, /barrier-repair-under-60/);
  assert.match(card.embeddingText, /Cosmetic routine support only/);
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/schema.test.js
```

Expected: FAIL because `createCard` does not preserve campaign metadata or include it in embedding text.

- [ ] **Step 3: Implement schema support**

In `src/registry/schema.js`:

1. Add `campaignHandle` and `claimNotes` to the `card` object in `createCard`.
2. Add `campaignHandle` and `claimNotes` to `buildEmbeddingText`.
3. Use existing `normalizeArray` for `claimNotes`.

Implementation shape:

```js
const claimNotes = normalizeArray(card.claimNotes);
const parts = [
  ...,
  `campaign: ${String(card.campaignHandle ?? "").trim()}.`,
  `claims: ${claimNotes.join(", ")}.`,
];
```

and:

```js
campaignHandle: String(input.campaignHandle ?? "").trim(),
claimNotes: normalizeArray(input.claimNotes),
```

- [ ] **Step 4: Persist metadata through store and registration**

In `src/registry/store.js`, add `campaignHandle` and `claimNotes` to `createStoredCard` normalized fields and returned stored card:

```js
claimNotes: normalizeList(input.claimNotes),
...
campaignHandle: String(normalizedInput.campaignHandle ?? "").trim(),
claimNotes: normalizedInput.claimNotes,
```

In `src/registry/registration.js`, add:

```js
campaignHandle: entry.campaignHandle,
claimNotes: entry.claimNotes,
```

to `cardInputFromCurationEntry`.

- [ ] **Step 5: Run schema test**

Run:

```bash
npm test -- test/schema.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/registry/schema.js src/registry/store.js src/registry/registration.js test/schema.test.js
git commit -m "feat: preserve campaign metadata on cards"
```

## Task 2: Seed Maya Glow Skincare Campaign

**Files:**
- Modify: `data/seed-cards.json`
- Modify: `data/seed-curator-personas.json`
- Modify: `test/cli.test.js`

- [ ] **Step 1: Write failing CLI seed/search test**

Add this test to `test/cli.test.js`:

```js
test("seed includes Maya Glow barrier repair campaign demo", async () => {
  await withCli(async ({ runCli, stdout, workDir }) => {
    await runCli(["seed"]);
    const searchCode = await runCli([
      "search",
      "@maya-glow barrier-repair-under-60 dry sensitive fragrance $60",
      "--budget",
      "60",
    ]);
    const registry = await loadRegistry(registryPathFor(workDir));
    const mayaCards = registry.cards.filter(
      (card) => card.curator.handle === "maya-glow"
    );
    const mayaPersona = registry.curatorPersonas.find(
      (persona) => persona.handle === "maya-glow"
    );
    const output = stdout.join("\n");

    assert.equal(searchCode, 0);
    assert.equal(mayaCards.length, 4);
    assert.ok(
      mayaCards.every((card) => card.campaignHandle === "barrier-repair-under-60")
    );
    assert.equal(mayaPersona.personaName, "Maya Glow");
    assert.match(output, /Barrier Repair Under \$60/);
    assert.match(output, /patch test/i);
    assert.match(output, /not medical advice/i);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/cli.test.js
```

Expected: FAIL because seed data does not include `maya-glow`.

- [ ] **Step 3: Add Maya Glow persona**

Append this object to `data/seed-curator-personas.json`:

```json
{
  "handle": "maya-glow",
  "displayName": "Maya Glow",
  "personaName": "Maya Glow",
  "tagline": "Skincare UGC creator who turns routine posts into cautious, budget-aware product picks.",
  "greeting": "Hi, I am Maya. Tell me your skin type, sensitivities, and budget before you copy my routine.",
  "adviceMode": "campaign_host",
  "commercialRole": "affiliate_publisher",
  "voiceTraits": ["clear", "careful", "ingredient-aware", "budget-aware", "no miracle claims"],
  "curationPrinciples": [
    "Adapt the routine to skin type and sensitivity instead of copying every product blindly.",
    "Prefer barrier-support basics before strong actives.",
    "Flag fragrance, exfoliating acids, retinoids, and health-sensitive claims clearly.",
    "Keep claims cosmetic and avoid promising treatment outcomes."
  ],
  "defaultOneLiner": "Tell me your skin type and budget first. A routine that ignores sensitivity is just an expensive mistake.",
  "categoryOneLiners": {
    "skincare": "Barrier routines should be boring, gentle, and easy to stop if your skin reacts."
  },
  "disclosureText": "Maya Glow recommendations may include affiliate links. Purchases may earn the link registrant a commission."
}
```

- [ ] **Step 4: Add four campaign cards**

Append four cards to `data/seed-cards.json`:

```json
{
  "title": "Fragrance-Free Gentle Cleanser",
  "category": "skincare",
  "originalUrl": "https://www.amazon.com/dp/B0MAYACLEANSE",
  "priceAmount": 12,
  "currency": "USD",
  "curator": { "handle": "maya-glow", "displayName": "Maya Glow" },
  "campaignHandle": "barrier-repair-under-60",
  "bestFor": ["dry sensitive skin", "barrier repair routine", "fragrance-free first cleanse"],
  "notFor": ["makeup removal as only cleanse", "users who want exfoliating cleanser"],
  "searchKeywords": ["barrier-repair-under-60", "Barrier Repair Under $60", "gentle cleanser", "dry sensitive skin", "fragrance sensitive"],
  "curationNote": "Start with a boring fragrance-free cleanser so the routine does not irritate before moisturizer even starts.",
  "claimNotes": ["Cosmetic cleansing support only; not acne, eczema, or dermatitis treatment."],
  "riskFlags": ["health_claim_sensitive"],
  "disclosure": "This may be an affiliate link; purchases may earn the link registrant a commission."
}
```

```json
{
  "title": "Hydrating Serum With Glycerin",
  "category": "skincare",
  "originalUrl": "https://brand.example/products/glycerin-serum",
  "priceAmount": 16,
  "currency": "USD",
  "curator": { "handle": "maya-glow", "displayName": "Maya Glow" },
  "campaignHandle": "barrier-repair-under-60",
  "bestFor": ["dry skin", "dehydrated feeling", "simple barrier routine"],
  "notFor": ["users avoiding humectant serums", "users who want active exfoliation"],
  "searchKeywords": ["barrier-repair-under-60", "Barrier Repair Under $60", "hydrating serum", "glycerin", "dry skin"],
  "curationNote": "A simple hydrating layer can help the routine feel less tight without jumping to strong actives.",
  "claimNotes": ["Cosmetic hydration support only; does not treat medical skin conditions."],
  "riskFlags": ["health_claim_sensitive"],
  "disclosure": "This may be an affiliate link; purchases may earn the link registrant a commission."
}
```

```json
{
  "title": "Ceramide Barrier Moisturizer",
  "category": "skincare",
  "originalUrl": "https://www.amazon.com/dp/B0MAYACREAM",
  "priceAmount": 22,
  "currency": "USD",
  "curator": { "handle": "maya-glow", "displayName": "Maya Glow" },
  "campaignHandle": "barrier-repair-under-60",
  "bestFor": ["dry sensitive skin", "barrier repair routine", "ceramide moisturizer"],
  "notFor": ["very oily skin that dislikes richer creams", "known sensitivity to fatty alcohols"],
  "searchKeywords": ["barrier-repair-under-60", "Barrier Repair Under $60", "ceramide", "moisturizer", "dry sensitive"],
  "curationNote": "This is the anchor step: a plain moisturizer that keeps the routine calm and budget-contained.",
  "claimNotes": ["Cosmetic moisture barrier support only; not medical treatment."],
  "riskFlags": ["health_claim_sensitive"],
  "disclosure": "This may be an affiliate link; purchases may earn the link registrant a commission."
}
```

```json
{
  "title": "Mineral Sunscreen For Sensitive Skin",
  "category": "skincare",
  "originalUrl": "https://brand.example/products/mineral-sunscreen",
  "priceAmount": 18,
  "currency": "USD",
  "curator": { "handle": "maya-glow", "displayName": "Maya Glow" },
  "campaignHandle": "barrier-repair-under-60",
  "bestFor": ["daytime barrier routine", "sensitive skin", "mineral sunscreen preference"],
  "notFor": ["users who dislike white cast", "night routine only"],
  "searchKeywords": ["barrier-repair-under-60", "Barrier Repair Under $60", "mineral sunscreen", "sensitive skin", "day routine"],
  "curationNote": "If this is a daytime routine, sunscreen matters more than adding another trendy active.",
  "claimNotes": ["Use as labeled; does not replace medical advice for photosensitivity or skin disease."],
  "riskFlags": ["health_claim_sensitive"],
  "disclosure": "This may be an affiliate link; purchases may earn the link registrant a commission."
}
```

- [ ] **Step 5: Run CLI test and observe expected partial failure**

Run:

```bash
npm test -- test/cli.test.js
```

Expected: FAIL only on missing recommendation output text such as `patch test` or `not medical advice`. The seed assertions should pass after the data is added. Continue directly to Task 3 before committing.

- [ ] **Step 6: Do not commit yet if CLI output is still failing**

Task 2 and Task 3 intentionally form one shippable demo slice. Commit after Task 3 using:

```bash
git add data/seed-cards.json data/seed-curator-personas.json test/cli.test.js
git commit -m "feat: seed skincare ugc campaign demo"
```

If Task 3 changes are ready in the same working tree, use the combined commit in Task 3 Step 7 instead.

## Task 3: Surface Campaign And Skincare Safety In Recommendations

**Files:**
- Modify: `src/registry/recommend.js`
- Modify: `test/recommend.test.js`

- [ ] **Step 1: Write failing recommendation tests**

Add these tests to `test/recommend.test.js`:

```js
test("searchCards recalls campaign handles and claim notes", () => {
  const campaignCard = recommendationCard({
    title: "Ceramide Barrier Moisturizer",
    category: "skincare",
    originalUrl: "https://www.amazon.com/dp/B0MAYACREAM",
    priceAmount: 22,
    currency: "USD",
    curator: { handle: "maya-glow" },
    campaignHandle: "barrier-repair-under-60",
    bestFor: ["dry sensitive skin"],
    notFor: ["very oily skin"],
    searchKeywords: ["Barrier Repair Under $60"],
    curationNote: "The anchor moisturizer step.",
    claimNotes: ["Cosmetic moisture barrier support only; not medical treatment."],
    riskFlags: ["health_claim_sensitive"],
    disclosure: "This may be an affiliate link.",
  });

  const results = searchCards("barrier-repair-under-60 medical treatment", [campaignCard], {
    budgetAmount: 60,
  });

  assert.equal(results[0].title, "Ceramide Barrier Moisturizer");
});
```

```js
test("formatRecommendationResponse shows campaign and skincare claim notes", () => {
  const card = recommendationCard({
    title: "Ceramide Barrier Moisturizer",
    category: "skincare",
    originalUrl: "https://www.amazon.com/dp/B0MAYACREAM",
    priceAmount: 22,
    currency: "USD",
    curator: { handle: "maya-glow" },
    campaignHandle: "barrier-repair-under-60",
    bestFor: ["dry sensitive skin"],
    notFor: ["very oily skin"],
    searchKeywords: ["Barrier Repair Under $60"],
    curationNote: "The anchor moisturizer step.",
    claimNotes: ["Cosmetic moisture barrier support only; not medical treatment."],
    riskFlags: ["health_claim_sensitive"],
    disclosure: "This may be an affiliate link.",
  });

  const response = formatRecommendationResponse([card], "barrier-repair-under-60", {
    curatorPersonas: [
      {
        handle: "maya-glow",
        personaName: "Maya Glow",
        defaultOneLiner:
          "Tell me your skin type and budget first. A routine that ignores sensitivity is just an expensive mistake.",
      },
    ],
  });

  assert.match(response, /캠페인: barrier-repair-under-60/);
  assert.match(response, /주의: Cosmetic moisture barrier support only; not medical treatment\./);
  assert.match(response, /patch test/i);
  assert.match(response, /not medical advice/i);
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- test/recommend.test.js
```

Expected: FAIL because recommendation text does not include campaign or claim notes.

- [ ] **Step 3: Add campaign fields to recall text**

In `src/registry/recommend.js`, update `cardPositiveText(card)`:

```js
function cardPositiveText(card) {
  return [
    card.title,
    card.category,
    card.campaignHandle,
    ...normalizeArray(card.bestFor),
    ...normalizeArray(card.searchKeywords),
    ...normalizeArray(card.claimNotes),
    card.curationNote,
  ].join(" ");
}
```

- [ ] **Step 4: Add safety note helpers**

Add helpers near `curatorOneLinerFor`:

```js
function hasRiskFlag(card, riskFlag) {
  return normalizeArray(card.riskFlags).includes(riskFlag);
}

function needsSkincareSafetyNote(card) {
  return card.category === "skincare" || hasRiskFlag(card, "health_claim_sensitive");
}
```

- [ ] **Step 5: Update recommendation formatting**

In `formatRecommendationResponse`, after curation note:

```js
if (isPresent(card.campaignHandle)) {
  lines.push(`캠페인: ${card.campaignHandle}`);
}

for (const claimNote of normalizeArray(card.claimNotes)) {
  lines.push(`주의: ${claimNote}`);
}

if (needsSkincareSafetyNote(card)) {
  lines.push("스킨케어 안전: patch test first; this is not medical advice.");
}
```

- [ ] **Step 6: Run recommendation and CLI tests**

Run:

```bash
npm test -- test/recommend.test.js test/cli.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2 and Task 3 together if needed**

If Task 2 was waiting for output support, commit both:

```bash
git add data/seed-cards.json data/seed-curator-personas.json src/registry/recommend.js test/recommend.test.js test/cli.test.js
git commit -m "feat: add skincare campaign recommendation demo"
```

If Task 2 already committed, commit only recommendation files:

```bash
git add src/registry/recommend.js test/recommend.test.js
git commit -m "feat: surface campaign safety in recommendations"
```

## Task 4: Expose Campaign Metadata In Protocol Context

**Files:**
- Modify: `src/registry/protocol.js`
- Modify: `test/protocol.test.js`

- [ ] **Step 1: Write failing protocol test**

Update the `card` fixture in `test/protocol.test.js`:

```js
campaignHandle: "barrier-repair-under-60",
claimNotes: ["Cosmetic routine support only; not medical treatment."],
```

Then add assertions:

```js
assert.equal(entry.campaignHandle, "barrier-repair-under-60");
assert.deepEqual(entry.claimNotes, [
  "Cosmetic routine support only; not medical treatment.",
]);
```

and in the `buildAgentProductContext` test:

```js
assert.equal(context.recommendationContext.campaignHandle, "barrier-repair-under-60");
assert.deepEqual(context.risk.claimNotes, [
  "Cosmetic routine support only; not medical treatment.",
]);
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- test/protocol.test.js
```

Expected: FAIL because protocol objects do not include campaign metadata.

- [ ] **Step 3: Implement protocol fields**

In `buildCurationEntry(card)`, add:

```js
campaignHandle: String(card?.campaignHandle ?? "").trim(),
```

In `buildAgentProductContext(card, { persona })`, add:

```js
recommendationContext: {
  ...
  campaignHandle: curationEntry.campaignHandle,
},
risk: {
  riskFlags: curationEntry.riskFlags,
  claimNotes: curationEntry.claimNotes,
  prohibitedClaims: DEFAULT_PROHIBITED_CLAIMS,
},
```

- [ ] **Step 4: Run protocol tests**

Run:

```bash
npm test -- test/protocol.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/registry/protocol.js test/protocol.test.js
git commit -m "feat: include campaign metadata in protocol context"
```

## Task 5: Document Creator Post To Persona Campaign Demo

**Files:**
- Modify: `README.md`
- Modify: `docs/protocol/commerce-context-protocol.md`

- [ ] **Step 1: Update README demo section**

Add a section after "Beta Service Model":

```md
## UGC Campaign Demo

The first demo wedge is not "more product links." It is a creator post follow-up funnel:

```text
Post CTA:
Want to adapt this routine to your skin type and budget?
Chat with my skincare persona.

Paste into Codex/Claude/OpenClaw:
agentcart-shopping에서 @maya-glow 페르소나로 barrier-repair-under-60 캠페인 추천해줘.
My skin is dry, fragrance-sensitive, and my budget is $60.
```

AgentCart loads `@maya-glow`, scopes recommendations to `barrier-repair-under-60`, shows affiliate disclosure, picks up to 3 products, and surfaces skincare safety notes such as patch testing and no medical claims.
```

- [ ] **Step 2: Update protocol campaign description**

In `docs/protocol/commerce-context-protocol.md`, add a "Campaign Context" section after `AgentCartRegistrationDraft`:

```md
## Campaign Context

`campaignHandle` connects a creator post, prompt CTA, and product subset.

Example:

- Curator persona: `@maya-glow`
- Campaign: `barrier-repair-under-60`
- CTA: "Want to adapt this routine to your skin type and budget? Chat with my skincare persona."

Campaign handles should be stable, kebab-case, and safe to paste into natural-language prompts.
```

- [ ] **Step 3: Inspect docs**

Run:

```bash
sed -n '1,160p' README.md
sed -n '1,140p' docs/protocol/commerce-context-protocol.md
```

Expected: README names the UGC campaign demo and protocol docs define `campaignHandle`.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/protocol/commerce-context-protocol.md
git commit -m "docs: describe ugc campaign demo"
```

## Task 6: Update Skills For Campaign And Skincare Guardrails

**Files:**
- Modify: `skills/agentcart-shopping-skill.md`
- Modify: `skills/agentcart-curator-registration-skill.md`
- Modify: `test/skill.test.js`

- [ ] **Step 1: Write failing skill tests**

In `test/skill.test.js`, add:

```js
test("shopping skill documents campaign-scoped skincare safety behavior", async () => {
  const content = await readFile(
    new URL("../skills/agentcart-shopping-skill.md", import.meta.url),
    "utf8"
  );

  assert.match(content, /campaignHandle/);
  assert.match(content, /barrier-repair-under-60/);
  assert.match(content, /patch test first/);
  assert.match(content, /not medical advice/);
});
```

and extend the curator registration skill test:

```js
assert.match(content, /campaignHandle/);
assert.match(content, /creator post CTA/);
assert.match(content, /skincare/);
assert.match(content, /Do not claim treatment outcomes/);
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- test/skill.test.js
```

Expected: FAIL until skill docs are updated.

- [ ] **Step 3: Update shopping skill**

In `skills/agentcart-shopping-skill.md`, add a "Campaign Scoped Recommendations" section:

```md
## Campaign Scoped Recommendations

If a user names a campaign such as `barrier-repair-under-60`, treat it as `campaignHandle` context. Prefer cards from the requested curator and campaign before falling back to general search.

For skincare campaigns, show claim notes and say: "patch test first; this is not medical advice." Do not claim treatment outcomes for acne, eczema, dermatitis, hyperpigmentation, or other medical skin conditions unless the card explicitly contains qualified evidence, and even then stay conservative.
```

- [ ] **Step 4: Update curator registration skill**

In `skills/agentcart-curator-registration-skill.md`, add fields to Required Output:

```md
- `campaignHandle`: kebab-case id for a creator post, campaign, or CTA
- creator post CTA: the sentence followers paste into their agent
- skincare safety notes when the campaign touches skin, wellness, supplements, or health-sensitive categories
```

Add safety rule:

```md
Do not claim treatment outcomes. For skincare, keep language to routine fit, sensitivity, ingredient caution, patch testing, and cosmetic support.
```

- [ ] **Step 5: Run skill tests**

Run:

```bash
npm test -- test/skill.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/agentcart-shopping-skill.md skills/agentcart-curator-registration-skill.md test/skill.test.js
git commit -m "docs: add campaign safety rules to skills"
```

## Task 7: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run demo commands**

Run:

```bash
npm run agentcart -- seed
npm run agentcart -- search "@maya-glow barrier-repair-under-60 dry sensitive fragrance $60" --budget 60
npm run agentcart -- protocol:persona maya-glow
```

Expected:

- search output includes `Maya Glow`
- search output includes `Barrier Repair Under $60` or `barrier-repair-under-60`
- search output includes `patch test first`
- persona output includes `"adviceMode": "campaign_host"`

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short --branch
```

Expected: only pre-existing browser artifacts may remain untracked.

- [ ] **Step 4: Commit any docs fixes**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "docs: polish skincare campaign demo"
```

## Scope Guardrails

- Do not build a campaign admin UI in this plan.
- Do not add a production DB in this plan.
- Do not add real skincare claims, medical claims, before/after claims, or product efficacy claims.
- Do not add scraping or external product fetching.
- Do not change purchase-assist behavior.
- Do not promise actual creator revenue lift in product copy. The demo shows the funnel, not proven lift.
