import assert from "node:assert/strict";
import test from "node:test";

import { createCard } from "../src/registry/schema.js";
import {
  formatRecommendationResponse,
  scoreCard,
  searchCards,
  tokenize,
} from "../src/registry/recommend.js";

function recommendationCard(input) {
  return {
    ...createCard(input),
    priceAmount: input.priceAmount,
    currency: input.currency ?? "KRW",
    searchKeywords: input.searchKeywords ?? [],
    riskFlags: input.riskFlags ?? [],
  };
}

function fixtureCards() {
  return [
    recommendationCard({
      title: "블랙 소가죽 반지갑",
      category: "wallet",
      originalUrl: "https://link.coupang.com/a/evvpLi",
      priceAmount: 69000,
      curator: { handle: "wallet_curator" },
      bestFor: ["남자 선물", "가죽지갑", "10만원 이하"],
      notFor: ["초슬림 지갑 선호"],
      searchKeywords: ["지갑", "가죽", "남자", "선물"],
      curationNote: "카드 수납이 많고 선물 포장이 무난함",
    }),
    recommendationCard({
      title: "화이트 무선 충전 스탠드",
      category: "electronics",
      originalUrl: "https://link.coupang.com/a/charging",
      priceAmount: 39000,
      curator: { handle: "desk_setup" },
      bestFor: ["책상 정리", "무선 충전"],
      notFor: ["지갑 선물"],
      searchKeywords: ["charging"],
      curationNote: "책상 위에 세워두기 좋은 충전 스탠드",
    }),
    recommendationCard({
      title: "고가 명품 가죽 장지갑",
      category: "wallet",
      originalUrl: "https://luxury.example/products/long-wallet",
      priceAmount: 240000,
      curator: { handle: "luxury_pick" },
      bestFor: ["명품 선물", "가죽지갑"],
      notFor: ["10만원 이하 예산"],
      searchKeywords: ["지갑", "가죽", "명품"],
      curationNote: "명품 브랜드 선물을 찾는 사람에게 맞음",
    }),
  ];
}

test("tokenize splits Korean and English query terms while preserving money tokens", () => {
  assert.deepEqual(tokenize("10만원 이하 leather wallet 추천해줘!"), [
    "10만원",
    "이하",
    "leather",
    "wallet",
    "추천해줘",
  ]);
});

test("scoreCard rewards relevance, budget fit, and disclosure while penalizing risk", () => {
  const [wallet, charger, luxuryWallet] = fixtureCards();
  const context = { budgetAmount: 100000 };
  const queryTokens = tokenize("10만원 이하 leather wallet 추천해줘!");
  const riskyWallet = {
    ...wallet,
    riskFlags: ["delivery_uncertainty", "health_claim_sensitive"],
    disclosure: "",
  };

  assert.ok(scoreCard(wallet, queryTokens, context) > scoreCard(charger, queryTokens, context));
  assert.ok(scoreCard(wallet, queryTokens, context) > scoreCard(luxuryWallet, queryTokens, context));
  assert.ok(scoreCard(wallet, queryTokens, context) > scoreCard(riskyWallet, queryTokens, context));
});

test("searchCards sorts by score descending then title and returns top three", () => {
  const cards = [
    ...fixtureCards(),
    recommendationCard({
      title: "가죽 미니 카드지갑",
      category: "wallet",
      originalUrl: "https://brand.example/products/card-wallet",
      priceAmount: 59000,
      curator: { handle: "minimal_pick" },
      bestFor: ["가죽지갑", "10만원 이하"],
      notFor: ["장지갑 선호"],
      searchKeywords: ["wallet", "leather"],
      curationNote: "작은 가방에 넣기 쉬운 카드지갑",
      disclosure: "추천 링크에는 커미션이 포함될 수 있습니다.",
    }),
  ];

  const results = searchCards("10만원 이하 leather wallet 추천해줘!", cards, {
    budgetAmount: 100000,
  });

  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((card) => card.title),
    ["가죽 미니 카드지갑", "블랙 소가죽 반지갑", "화이트 무선 충전 스탠드"]
  );
});

test("formatRecommendationResponse discloses commission and includes open and curator commands", () => {
  const [wallet] = searchCards("10만원 이하 leather wallet 추천해줘!", fixtureCards(), {
    budgetAmount: 100000,
  });

  const response = formatRecommendationResponse([wallet], "10만원 이하 leather wallet 추천해줘!");

  assert.ok(
    response.startsWith(
      "아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다."
    )
  );
  assert.match(response, /\[쿠팡 파트너스\] 블랙 소가죽 반지갑/);
  assert.match(response, /셀러룸 보기: agentcart curator:room wallet_curator/);
  assert.match(response, /열기 전 확인: agentcart open 블랙-소가죽-반지갑/);
  assert.match(response, /카드 수납이 많고 선물 포장이 무난함/);
});

test("empty search and formatting return a clear empty state with disclosure", () => {
  assert.deepEqual(searchCards("wallet", [], { budgetAmount: 100000 }), []);
  assert.deepEqual(searchCards([], "wallet", { budgetAmount: 100000 }), []);

  const response = formatRecommendationResponse([], "wallet");

  assert.ok(
    response.startsWith(
      "아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다."
    )
  );
  assert.match(response, /아직 맞는 AgentCart 후보가 없습니다\./);
});

test("scoreCard does not boost affiliate platforms by themselves", () => {
  const coupangCard = recommendationCard({
    title: "가죽 지갑 A",
    category: "wallet",
    originalUrl: "https://link.coupang.com/a/wallet-a",
    priceAmount: 69000,
    curator: { handle: "wallet_curator" },
    bestFor: ["가죽지갑", "10만원 이하"],
    notFor: ["장지갑 선호"],
    searchKeywords: ["wallet", "leather"],
    curationNote: "가죽 지갑 추천",
    disclosure: "커미션 링크입니다.",
  });
  const directCard = recommendationCard({
    title: "가죽 지갑 B",
    category: "wallet",
    originalUrl: "https://brand.example/products/wallet-b",
    priceAmount: 69000,
    curator: { handle: "wallet_curator" },
    bestFor: ["가죽지갑", "10만원 이하"],
    notFor: ["장지갑 선호"],
    searchKeywords: ["wallet", "leather"],
    curationNote: "가죽 지갑 추천",
    disclosure: "커미션 링크입니다.",
  });
  const queryTokens = tokenize("10만원 이하 leather wallet 추천해줘!");

  assert.equal(
    scoreCard(coupangCard, queryTokens, { budgetAmount: 100000 }),
    scoreCard(directCard, queryTokens, { budgetAmount: 100000 })
  );
});
