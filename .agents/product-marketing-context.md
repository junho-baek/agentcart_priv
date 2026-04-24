# Product Marketing Context

*Last updated: 2026-04-24*

## Product Overview

**One-liner:** AgentCart is the start of agent commerce: sellers provide product links with context, and buyers receive recommendations through an agent shopping protocol.

**What it does:** AgentCart is a middle DB and skill layer for agent commerce. Sellers and creators provide product links, affiliate disclosures, price snapshots, claims, and context. Buyer agents query AgentCart, ask context questions, compare options through a reasonable buying protocol, recommend products, and open the original purchase link only after approval.

**Product category:** Agent commerce registry, shopping agent skill layer, affiliate/product link registry, agent-readable product database.

**Product type:** SaaS/API/CLI plus agent skills; eventually a hosted registry and analytics platform.

**Business model:** Open-source trust layer plus hosted commerce graph. Potential revenue from seller plans, analytics, marketplace distribution, and usage-based agent/API traffic. Commission handling must be transparent and policy-aware.

## Target Audience

**Target companies:** Affiliate creators, small brands, DTC sellers, smart store sellers, commerce agencies, AI-agent power users, agent app builders.

**Decision-makers:** Solo creators, sellers/founders, growth marketers, affiliate managers, developer-founders building agent commerce surfaces.

**Primary use case:** Make a product or affiliate link discoverable and recommendable by AI shopping agents.

**Jobs to be done:**

- Provide my product or affiliate link with enough context for agents to understand it.
- Let a buyer's agent recommend my product through a reasonable buying protocol without hiding disclosure or stale price risk.
- Track how often agents recommend, click, and convert my registered links.

**Use cases:**

- Seller says: "$에이전트카트 사용해서 내 제품 등록하고 싶어."
- Buyer says: "$에이전트카트 사용해서 엄마 생일 선물 추천해줘."
- Seller checks: "내 커미션 링크 추천 횟수/클릭 수/전환률 보여줘."
- Buyer asks: "내 구매 이력과 추천 내역을 보여줘."

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Seller / creator | More agent-driven discovery and clicks | Their links are invisible to AI agents | Register links as agent-readable product cards |
| Buyer | Safer recommendations and less research work | Agents can recommend blind links or stale prices | Ask context, review links, open only after approval |
| Agent builder | Reliable shopping data and skill UX | Web scraping and affiliate rules are messy | A structured registry/API/skill layer |
| Platform operator | Trust, policy, and scalable data | Viral link submissions can become spam or compliance risk | Review queue, policy profiles, lightweight DB strategy |

## Problems & Pain Points

**Core problem:** Product and affiliate links are built for humans and web pages, not for shopping agents.

**Why alternatives fall short:**

- Link-in-bio tools create human landing pages, not agent-readable product cards.
- Affiliate links are hard for agents to verify, disclose, and rank safely.
- Product pages often have stale prices, unclear claims, redirects, and platform-specific policy constraints.
- Sellers do not know how agents will describe or recommend their products.

**What it costs them:** Missed agent-driven discovery, low trust, compliance risk, manual product research, and poor analytics into agent recommendations.

**Emotional tension:** Sellers fear being invisible in the agent era. Buyers worry agents will recommend scammy or stale links. Builders fear affiliate compliance traps.

## Competitive Landscape

**Direct:** Future agent-commerce registries and product skill networks — fall short if they hide affiliate incentives or skip policy review.

**Secondary:** Link-in-bio tools, storefront builders, affiliate dashboards — fall short because they optimize for human clicks, not agent recommendations.

**Indirect:** Retailer search, social commerce videos, personal shopping assistants — fall short because they are fragmented and not portable across agents.

## Differentiation

**Key differentiators:**

- Single `$에이전트카트` entry point for seller registration, buyer recommendation, account info, gifting, and analytics.
- Agent-readable product card format with policy/disclosure/price-snapshot awareness.
- Seller registration through Codex, Claude, OpenClaw, or browser/CLI flows.
- Buyer flow asks context questions before recommending.
- Open-source trust layer with hosted commerce graph.

**How we do it differently:** AgentCart treats the product card, not the landing page, as the core asset. The page is only a preview or share surface.

**Why that's better:** Agents can search, compare, explain, and safely open purchase links. Sellers can see how agents interpret their products.

**Why customers choose us:** They want their products and links to be visible in AI-agent shopping flows without becoming a shady redirect network.

## Objections

| Objection | Response |
|-----------|----------|
| "Isn't this just a page builder?" | No. The core asset is an agent-readable product registry and skill layer; pages are previews. |
| "Can a platform handle affiliate links safely?" | Only with policy profiles, disclosure, contributor checks, source-domain transparency, and no forced redirects. |
| "Can you track purchases?" | We can track recommendations/clicks directly; conversions require affiliate platform postbacks, seller import, or explicit user connection. |

**Anti-persona:** Anyone trying to hide redirects, fake reviews, bypass affiliate rules, scrape prohibited retailer data, or auto-open monetized links.

## Switching Dynamics

**Push:** Existing links are invisible to agents; current affiliate dashboards do not explain agent recommendations.

**Pull:** One skill/registry layer lets links become searchable and recommendable by shopping agents.

**Habit:** Sellers are used to posting links on social, link-in-bio pages, and affiliate dashboards.

**Anxiety:** Terms-of-service risk, stale prices, attribution accuracy, and whether agents will actually use the registry.

## Customer Language

**How they describe the problem:**

- "에이전트 커머스의 시작."
- "판매자는 링크와 설명을 제공하고, 구매자는 에이전트의 합리적인 구매 프로토콜을 통해 추천을 받는다."
- "내 제휴 링크를 AI 쇼핑 에이전트가 추천할 수 있게 등록하고 싶어."
- "$에이전트카트 사용해서 내 제품 등록하고 싶어."
- "엄마 생일 선물 10만원 이하로 뭐가 좋을까?"

**How they describe us:**

- "에이전트 커머스의 상품 스킬 레이어."
- "제휴 링크를 에이전트가 추천할 수 있는 상품 스킬로 등록해주는 서비스."
- "쇼핑 에이전트가 구매 전에 들르는 검문소이자 상품 등록소."

**Words to use:** AgentCart, 에이전트카트, product registry, agent-readable product card, shopping agent, skill layer, link registration, reviewed recommendation, CLI login, seller skill, buyer skill.

**Words to avoid:** Page builder as primary category, hidden redirect, guaranteed commission, current price unless verified, verified seller unless evidence exists.

**Glossary:**

| Term | Meaning |
|------|---------|
| Agent-readable product card | Structured product JSON/card that agents can search, compare, and recommend |
| Seller skill | Agent workflow that registers a seller's product link |
| Buyer skill | Agent workflow that asks context and recommends reviewed products |
| Policy profile | Platform-specific rules for Amazon, Coupang, Naver, AliExpress, direct sellers |
| Price snapshot | Historical price captured at registration or review time, not guaranteed current price |

## Brand Voice

**Tone:** Futuristic, playful, agent-native, trustworthy.

**Style:** Short, direct, demo-first, slightly mischievous but not unserious.

**Personality:** Cute infra, curious, confident, transparent, developer-friendly.

## Proof Points

**Metrics:** MVP stage; no live metrics yet.

**Customers:** None yet.

**Testimonials:**

> "내 제휴 링크를 AI 쇼핑 에이전트가 추천할 수 있게 등록하세요." — positioning line

**Value themes:**

| Theme | Proof |
|-------|-------|
| Agent-native | CLI, skill URL, Codex/Claude/OpenClaw flows |
| Trust-aware | Disclosure, price snapshot, no auto-open defaults |
| Seller-friendly | Link registration, login, future analytics |
| Buyer-friendly | Context questions, gifting, recommendation history |

## Goals

**Business goal:** Own the agent-commerce product graph while open-sourcing the trust layer.

**Conversion action:** Seller registers a product link or sends seller-skill command to their agent; buyer copies/installs AgentCart skill.

**Current metrics:** MVP stage; track registered links, published cards, recommendations, clicks, and conversion signals when available.
