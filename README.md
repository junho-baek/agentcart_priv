# AgentCart

AgentCart is a commission-link shopping protocol for AI agents. It lets creators and brands register a curator persona and a set of shopping links so AI agents can recommend those products with the persona's taste, context, and required affiliate disclosure.

Curators register Coupang, Amazon, AliExpress, OliveYoung, self-owned shop links, and direct links with agent-readable context: who the product is best for, who should avoid it, why it is being recommended, the latest known price snapshot, disclosure text, and risk flags. Shopping agents can then recommend products with clear commission disclosure, curator persona context, direct links, reputation/trust temperature, price snapshot context, and policy or fit risk flags before opening any purchase link.

The core user experience is not a destination marketplace. It is a copy-paste curator funnel: a creator shares one natural-language prompt, the user pastes it into Codex, Claude, OpenClaw, or another AI agent, and AgentCart loads that creator's persona, event context, and registered product links.

AgentCart still supports general product search, but the primary growth loop is creator-led distribution. The product is closer to an agent-native Linktree or Inflearn-style profile link than a search engine: creators distribute prompts, users start conversations, and the agent turns the curator's taste into a shoppable recommendation.

```text
제가 추천하는 자취템은 AgentCart에 넣어뒀어요.
아래 문장을 Codex/Claude/OpenClaw에 붙여넣어보세요.

"agentcart-shopping에서 @junho-baek 페르소나로 이번 주 식비 3만원 자취 장바구니 짜줘"
```

The agent turns the curator's taste into a small set of registered product cards, then purchase assist can carry the cart to checkout while stopping at payment secrets and other hard authentication gates.

## Growth Model

AgentCart combines agent commerce with the creator economy. Consumers should be able to use curator personas and general product search freely; they are already viewing disclosed affiliate or merchant recommendations. The paying customer is the curator, brand, or merchant that wants their taste, campaign, or product catalog to be callable from AI agents.

The primary distribution unit is not a landing page. It is a copy-paste prompt that contains the curator id, event, intent, and shopping context.

Creator-side pull:

```text
나도 agentcart-shopping에서 검색되는 큐레이터가 되고 싶다.
내 인스타 링크가 아니라 내 페르소나를 사람들이 부르게 만들고 싶다.
```

Consumer-side modes:

- Curator prompt mode: `agentcart-shopping에서 @junho-baek 페르소나로 이번 주 식비 3만원 자취 장바구니 짜줘`
- Brand persona mode: `agentcart-shopping에서 @nike-running 페르소나로 첫 10km 러닝 준비물 추천해줘`
- General search mode: `agentcart-shopping에서 자취생 음식 추천해줘`

In general search mode, AgentCart can search across the whole registry, but each result should still reveal the curator/persona behind the recommendation.

Business model:

- Free consumer usage.
- Free curator launch period, e.g. 1 persona and 50 links for the first 3 months.
- Paid curator tiers for more links, multiple personas, campaign/event prompts, advanced analytics, team accounts, custom domains, and self-owned shop priority links.
- Brand or merchant tiers for official brand personas, seasonal campaign personas, attribution, and performance reporting.
- Retail partner tiers for self-owned shop integrations, product catalog sync, and conversion reporting.

Brand personas must be explicit. If a persona represents a brand, store, or sponsored campaign, AgentCart should disclose that relationship, whether the persona prioritizes first-party products, and whether recommendations include or exclude competing products.

## Local MVP

Use Node v24, then install dependencies and seed the local JSON registry:

```sh
npm install
npm run agentcart -- seed
```

Try the buyer recommendation flow:

```sh
npm run agentcart -- search "10만원 이하 가죽지갑" --budget 100000
npm run agentcart -- curator:room wallet_curator
npm run agentcart -- search "자취생 음식"
npm run agentcart -- curator:room junho-baek
npm run agentcart -- search "@junho-baek 이번 주 식비 3만원 자취 장바구니"
```

Register an agent-generated creator or brand draft:

```sh
npm run agentcart -- register:draft ./registration-draft.json
```

Install the open-source shopping skill and run the local registry API:

```sh
npm run agentcart -- install-skill --target codex
npm run serve:registry
```

Or ask an AI agent to install the published skill files directly:

```text
https://github.com/junho-baek/agentcart_priv/tree/main/skills
이 AgentCart skills 폴더를 Codex/Claude/OpenClaw에 설치해줘.
```

After installation, users can paste curator prompts such as:

```text
agentcart-shopping에서 @junho-baek 페르소나로 이번 주 식비 3만원 자취 장바구니 짜줘
```

## Commerce Context Protocol

AgentCart's protocol layer separates curator registration data from agent-facing product context. See `docs/protocol/commerce-context-protocol.md` for the first reference draft and `docs/protocol/examples/` for `CurationEntry`, `RecommenderPersona`, and `AgentProductContext` examples.

Inspect protocol objects locally:

```sh
npm run agentcart -- protocol:context <slug-or-id>
npm run agentcart -- protocol:persona <handle>
npm run agentcart -- protocol:validate docs/protocol/examples/agent-product-context.json
```

The checked-in `skills/agentcart-curator-registration-skill.md` draft defines how creators, brands, merchants, and campaigns should prepare curator personas and product links before `agentcart-shopping` recommends them. An agent can turn messy links and captions into an `AgentCartRegistrationDraft`, then save it with `register:draft`.

## Skills

- `skills/agentcart-shopping-skill.md`: the curator recommendation skill. It fetches registered cards, shows the commission disclosure first, includes direct links, and speaks through curator persona context such as `junho-baek`.
- `skills/agentcart-browser-purchase-assist-skill.md`: the visible browser purchase-assist skill. It opens selected links, can use explicitly authorized `.env.local` Coupang login credentials, adds items to cart, advances to checkout, and stops at payment password, OTP, CAPTCHA, card, address, and other sensitive gates.
- `skills/agentcart-curator-registration-skill.md`: the future creator, brand, merchant, and campaign registration skill. It drafts `CurationEntry`, `RecommenderPersona`, disclosure policy, and agent-facing context while keeping commercial relationships explicit.

The curator-persona model was inspired by `openclone`: a persona/room style experience where a user can talk with a recognizable point of view, then receive useful actions from that context. AgentCart adapts that idea for commerce by attaching persona voice, product cards, affiliate disclosure, and purchase-assist handoff to the same curator experience.

Skill-side gaps still not shipped:

- `install-skill` currently writes the shopping skill only; the purchase-assist skill is checked in as a canonical skill file, but does not yet have a CLI installer target.
- The curator registration skill is a checked-in draft, but does not yet have a CLI installer target.
- There is no curator admin/revenue analytics skill yet.
- Browser purchase assist is written for Codex in-app browser and `browser-use:browser`; other agent runtimes will need adapter notes.

## Expected Demo Output

```text
Seeded 13 AgentCart cards

아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.

검색어: 자취생 음식

1. [쿠팡 파트너스] 너구리 얼큰한맛 120g 5개
링크: https://link.coupang.com/a/evFgBR
큐레이터 한마디: 자취생 식품은 멋진 요리보다 반복 가능한 한 끼 루프를 먼저 만들어야 해요.
추천 이유: 보관이 쉽고 빠르게 한 끼를 해결할 수 있어 자취생 야식이나 비상식량 후보로 좋습니다.
큐레이터 페르소나: 자취생 생존 큐레이터 백준호 (@junho-baek)
열기 전 확인: agentcart open 너구리-얼큰한맛-120g-5개

Installed AgentCart skill: /absolute/path/to/AgentCart/.agentcart/skills/agentcart-codex.md
```

## Registry API

Start the API with `npm run serve:registry`. The default base URL is `http://127.0.0.1:8787`.

```sh
curl http://127.0.0.1:8787/health
```

```json
{ "ok": true, "service": "agentcart-registry" }
```

Search cards with disclosure and recommendation text:

```sh
curl "http://127.0.0.1:8787/api/search?q=10%EB%A7%8C%EC%9B%90%20%EC%9D%B4%ED%95%98%20%EA%B0%80%EC%A3%BD%EC%A7%80%EA%B0%91&budget=100000"
```

Fetch curator context, including persona metadata when available:

```sh
curl http://127.0.0.1:8787/api/curators/wallet_curator
curl http://127.0.0.1:8787/api/curators/junho-baek
```

Record recommendation feedback:

```sh
curl -X POST http://127.0.0.1:8787/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "seed-card-001",
    "curatorHandle": "wallet_curator",
    "helpful": true,
    "linkMatchedExpectation": true,
    "disclosureWasClear": true,
    "comment": "useful recommendation"
  }'
```

## Product Boundary

- AgentCart does not sell the product.
- AgentCart does not hide commission links.
- AgentCart does not rank by commission rate.
- AgentCart does not claim current lowest price.
- AgentCart can show direct monetized links after disclosure.
- AgentCart must identify brand, merchant, sponsored, or official campaign personas when that context is present.
- AgentCart opens purchase links only after user approval.
- AgentCart purchase assist can log in with explicitly authorized `.env.local` Coupang credentials and prepare the cart/checkout page.
- AgentCart stops at OTP, CAPTCHA, payment password, card entry, address edits, and other sensitive authentication or payment-secret steps. The user enters those directly.

## Purchase Assist Setup

Create a local `.env.local` from `.env.local.example` when using browser purchase assist:

```env
AGENTCART_COUPANG_EMAIL=
AGENTCART_COUPANG_PASSWORD=
AGENTCART_COUPANG_PAYMENT_PASSWORD=
```

`AGENTCART_COUPANG_PAYMENT_PASSWORD` is a placeholder only. Agents must not read or enter payment passwords. In the tested Coupang flow, AgentCart can add the curator-recommended products to cart, select the intended items, continue to `주문/결제`, and click `결제하기` only after current-turn confirmation. When Coupang shows `결제 비밀번호 6자리를 입력해주세요`, the agent stops and the user takes over.

## What Ships Today

- Local JSON registry.
- Seed cards.
- Seed curator personas.
- Keyword search/reranking.
- Curator rooms with persona context.
- Trust temperature.
- Feedback events.
- Node HTTP API.
- Skill installer.
- Landing install flow.

## Later

- Hosted creator and brand curator DB.
- Curator persona registry for creator, brand, merchant, and campaign personas.
- Curating link management DB for affiliate links, self-owned shop links, campaign links, and product metadata.
- CLI tools for curator registration, persona updates, link import, link validation, and campaign prompt generation.
- Registry API for curator/persona lookup, product card search, link attribution, feedback, and conversion events.
- Creator registration skill for Codex, Claude, and OpenClaw, including MCP or skill-based onboarding.
- Persona injection API so third-party agents can load a curator persona, curation principles, campaign context, disclosure policy, and allowed product links.
- Brand disclosure policy fields for official brand status, sponsored campaigns, first-party product priority, and competitor inclusion policy.
- Vector search recall.
- LLM reranking/evals.
- Affiliate postbacks.
- Buyer purchase history with explicit consent.
- No creator admin website in the first version. Use CLI, API, and skills first; build a web console after the registration and recommendation workflows are proven.
