# AgentCart

AgentCart is a commission-link shopping protocol for AI agents.

Curators register Coupang, Amazon, AliExpress, OliveYoung, and direct links with agent-readable context: who the product is best for, who it is not for, why it is being recommended, the latest known price snapshot, disclosure text, and risk flags. Shopping agents can then recommend products with clear commission disclosure, curator reputation/trust temperature, price snapshot context, and policy or fit risk flags before opening any purchase link.

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
```

Install the open-source shopping skill and run the local registry API:

```sh
npm run agentcart -- install-skill --target codex
npm run serve:registry
```

## Expected Demo Output

```text
Seeded 10 AgentCart cards

아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.

검색어: 10만원 이하 가죽지갑

1. [쿠팡 파트너스] 블랙 소가죽 반지갑 (69,000 KRW)
추천 이유: 군더더기 없는 블랙 소가죽 디자인이라 첫 지갑 선물이나 직장인 선물로 무난합니다.
셀러룸 보기: agentcart curator:room wallet_curator
열기 전 확인: agentcart open 블랙-소가죽-반지갑

Installed AgentCart skill: .agentcart/skills/agentcart-codex.md
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

Fetch a curator room:

```sh
curl http://127.0.0.1:8787/api/curators/wallet_curator
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
- AgentCart opens purchase links only after user approval.

## What Ships Today

- Local JSON registry.
- Seed cards.
- Keyword search/reranking.
- Curator rooms.
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
- Affiliate postbacks.
- Buyer purchase history with explicit consent.
