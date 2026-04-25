# AgentCart

AgentCart is a commission-link shopping protocol for AI agents.

Curators register Coupang, Amazon, AliExpress, OliveYoung, and direct links with agent-readable context: who the product is best for, who it is not for, why it is being recommended, the latest known price snapshot, disclosure text, and risk flags. Shopping agents can then recommend products with clear commission disclosure, curator persona context, direct links, reputation/trust temperature, price snapshot context, and policy or fit risk flags before opening any purchase link.

The core user experience is not "AI search." It is a curator funnel: a user asks a trusted curator persona for help, the agent turns that taste into a small set of registered product cards, then purchase assist can carry the cart to checkout while stopping at payment secrets and other hard authentication gates.

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
```

Install the open-source shopping skill and run the local registry API:

```sh
npm run agentcart -- install-skill --target codex
npm run serve:registry
```

## Skills

- `skills/agentcart-shopping-skill.md`: the curator recommendation skill. It fetches registered cards, shows the commission disclosure first, includes direct links, and speaks through curator persona context such as `junho-baek`.
- `skills/agentcart-browser-purchase-assist-skill.md`: the visible browser purchase-assist skill. It opens selected links, can use explicitly authorized `.env.local` Coupang login credentials, adds items to cart, advances to checkout, and stops at payment password, OTP, CAPTCHA, card, address, and other sensitive gates.

The curator-persona model was inspired by `openclone`: a persona/room style experience where a user can talk with a recognizable point of view, then receive useful actions from that context. AgentCart adapts that idea for commerce by attaching persona voice, product cards, affiliate disclosure, and purchase-assist handoff to the same curator experience.

Skill-side gaps still not shipped:

- `install-skill` currently writes the shopping skill only; the purchase-assist skill is checked in as a canonical skill file, but does not yet have a CLI installer target.
- There is no separate curator persona builder skill yet.
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

- Hosted DB.
- Vector search recall.
- LLM reranking/evals.
- Curator accounts.
- Curator persona builder.
- Affiliate postbacks.
- Buyer purchase history with explicit consent.
