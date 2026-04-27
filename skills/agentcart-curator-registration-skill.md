---
name: agentcart-curator-registration
description: Use when a creator, brand, merchant, or campaign operator asks to register, draft, import, validate, or prepare AgentCart curator personas and shopping links
---

# AgentCart Curator Registration

Use this skill to turn creator, brand, merchant, or campaign material into AgentCart-ready curator drafts. The goal is not to write ad copy. The goal is to produce agent-readable commerce context that can be safely used by shopping agents.

AgentCart treats a curator as a Commercial actor persona: a recognizable point of view that may recommend products, events, brand links, affiliate links, or owned-shop links. The persona can be useful, funny, expert, or highly specific, but its commercial relationships must stay visible.

## When to Use

Use this skill when the user wants to:

- register a creator or brand curator persona
- convert Instagram, Linktree, Inflearn, blog, newsletter, or campaign links into AgentCart cards
- draft a persona that can be invoked from natural language prompts
- prepare product context for `agentcart-shopping`
- validate whether a curator registration is safe to publish
- create a copy-paste prompt such as `agentcart-shopping에서 @junho-baek 페르소나로 이번 주 식비 3만원 자취 장바구니 짜줘`

## Required Disclosure Rule

Do not hide brand, sponsor, affiliate, or merchant relationships.

Before producing final drafts, identify whether the curator is:

- an independent creator
- an official brand persona
- a merchant or store persona
- a sponsored campaign persona
- an affiliate curator
- a mixed curator with both independent and commercial links

If the relationship is unclear, mark it as `unknown_commercial_relationship` and ask for confirmation before claiming independence.

## Required Output

Produce one `AgentCartRegistrationDraft` that contains registration-ready `personas` and `entries`.

```json
{
  "kind": "AgentCartRegistrationDraft",
  "accountEmail": "creator@example.com",
  "visibility": "curator_scoped",
  "personas": [],
  "entries": []
}
```

After the user approves the draft, register it with:

```sh
npm run agentcart -- register:draft <draft.json>
```

Draft objects still use the following protocol structures.

## Beta Registration Limits

Collect email before registration and put it in `accountEmail`.

Default free beta limits:

- 1 curator persona per account
- 30 product or link entries per account
- default visibility: `curator_scoped`
- default publication status: `draft`

Do not promise global search exposure. Free beta drafts are meant for curator-scoped copy-paste prompts first; public or global discovery requires later review, approval, or a paid/approved tier.

Do not split one creator across multiple emails to bypass limits. If a creator, brand, or operator asks to register more than 30 links, stop and propose a smaller curated set or a paid/approved tier instead.

### 1. CurationEntry

This is the registration-side object. Include:

- `kind: "CurationEntry"`
- source title and URL
- curator handle
- platform
- product URL
- fit rules
- avoid rules
- recommendation reason
- disclosure text
- risk flags
- source notes and evidence limits

### 2. RecommenderPersona

This is the callable persona object. Include:

- `kind: "RecommenderPersona"`
- handle
- display name
- commercial role
- advice mode, usually `insight_first`
- voice traits
- curation principles
- topics it can recommend
- topics it should avoid
- default one-liner
- disclosure policy

### 3. DisclosurePolicy

State what the agent must reveal before recommendations:

- affiliate relationship
- brand or merchant ownership
- sponsor or campaign relationship
- first-party product priority
- whether competitors may be included
- whether prices, stock, seller verification, medical claims, or warranty claims are unsupported

### 4. AgentProductContext Preview

Create an agent-facing preview that explains how `agentcart-shopping` should use the entry:

- why this product fits a user
- who should avoid it
- which claims are prohibited
- which actions are allowed
- when to ask before opening links
- what to disclose before showing recommendations

## Workflow

1. Collect identity: handle, display name, brand/store status, region, language, and public profile links.
2. Collect links: product URLs, campaign links, affiliate links, owned-shop links, and source captions.
3. Extract fit: who the curator thinks each product is for, the use case, budget context, timing, and category.
4. Extract avoid rules: allergy, age, compatibility, taste mismatch, price sensitivity, unsupported claims, or conditions where the item is a bad fit.
5. Define persona: curation principles, voice traits, default one-liner, commercial role, and boundaries.
6. Define disclosure: make commercial relationships explicit and short enough to show before recommendations.
7. Pressure check the draft before finalizing.

## Pressure Scenarios

Run these checks before returning the final registration draft:

- Messy creator caption with three affiliate links: split each link into its own `CurationEntry`; do not merge unrelated products into one card.
- Brand asks to look independent: keep the persona as an official or sponsored brand persona and disclose the relationship.
- Unsupported "best price", live stock, seller verification, warranty, or medical claims: move them to prohibited claims unless evidence is present.
- First-party links prioritized without disclosure: add first-party priority to `DisclosurePolicy`.
- Persona sounds useful but product evidence is thin: keep the voice, but mark weak context and avoid overconfident recommendation language.
- Creator asks to register 80 links for free: keep the draft under 30 entries and ask which links matter most.
- Brand wants public global exposure immediately: keep `visibility` as `curator_scoped` or `public_candidate`; do not promise publication.
- Operator proposes splitting one creator across multiple emails: refuse the bypass and keep one account identity.
- Entry lacks disclosure but the user wants fast import: do not register it until the relationship is clear.

## Safety Boundaries

- Do not invent products, prices, discounts, stock, seller verification, or campaign terms.
- Do not claim lowest price or best price on the internet.
- Do not claim a product is medically effective, legally compliant, authentic, safe for all users, or warranty-covered unless the provided evidence says so.
- Do not submit purchase links without disclosure.
- Do not treat a curator persona as seller verification.
- Do not rank products by commission rate.
- Ask for missing commercial relationship details when independence, sponsorship, or brand ownership is ambiguous.

## Output Skeleton

Return concise Markdown plus one JSON-like registration draft:

```json
{
  "kind": "AgentCartRegistrationDraft",
  "accountEmail": "junho@example.com",
  "visibility": "curator_scoped",
  "publicationStatus": "draft",
  "personas": [
    {
      "kind": "RecommenderPersona",
      "handle": "junho-baek",
      "displayName": "백준호",
      "personaName": "자취생 생존 큐레이터 백준호",
      "commercialRole": "affiliate_publisher",
      "adviceMode": "insight_first",
      "disclosurePolicy": {
        "requiredDisclosureText": "추천에는 커미션 링크가 포함될 수 있습니다.",
        "prohibitedClaims": ["lowest_price", "live_stock", "seller_verified"]
      }
    }
  ],
  "entries": [
    {
      "kind": "CurationEntry",
      "curator": { "handle": "junho-baek", "displayName": "백준호" },
      "title": "너구리 얼큰한맛 120g 5개",
      "originalUrl": "https://link.coupang.com/a/example",
      "category": "grocery",
      "bestFor": ["자취생 비상식량", "빠른 한 끼"],
      "notFor": ["라면을 피하는 사용자", "나트륨 섭취를 줄이는 사용자"],
      "curationNote": "보관이 쉽고 빠르게 한 끼를 해결할 수 있습니다.",
      "disclosureHint": "쿠팡 파트너스 링크이며 구매 시 링크 등록자가 수수료를 받을 수 있습니다."
    }
  ]
}
```
