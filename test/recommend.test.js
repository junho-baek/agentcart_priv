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
    ["가죽 미니 카드지갑", "블랙 소가죽 반지갑", "고가 명품 가죽 장지갑"]
  );
});

test("searchCards normalizes Korean leather wallet compound queries for shared recall", () => {
  const cards = [
    ...fixtureCards(),
    recommendationCard({
      title: "브라운 슬림 카드지갑",
      category: "wallet",
      originalUrl: "https://www.amazon.com/dp/B0CARDWALLET",
      priceAmount: 42000,
      curator: { handle: "wallet_curator" },
      bestFor: ["슬림 지갑 선호", "카드 위주 수납", "가벼운 생일 선물"],
      notFor: ["현금 수납 많음"],
      searchKeywords: ["브라운 카드지갑", "슬림 월렛", "카드 홀더"],
      curationNote: "주머니에 부담이 적은 카드 중심 지갑",
      disclosure: "추천 링크에는 커미션이 포함될 수 있습니다.",
    }),
  ];

  const results = searchCards("10만원 이하 가죽지갑", cards, {
    budgetAmount: 100000,
  });

  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((card) => card.title),
    ["블랙 소가죽 반지갑", "브라운 슬림 카드지갑", "고가 명품 가죽 장지갑"]
  );
});

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
  assert.match(response, /링크: https:\/\/link\.coupang\.com\/a\/evvpLi/);
  assert.match(response, /큐레이터 페르소나: wallet_curator \(@wallet_curator\)/);
  assert.match(response, /열기 전 확인: agentcart open 블랙-소가죽-반지갑/);
  assert.match(response, /큐레이터 한마디: 카드 수납이 많고 선물 포장이 무난함/);
});

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

test("formatRecommendationResponse uses curator persona one-liners when available", () => {
  const [wallet] = searchCards("10만원 이하 leather wallet 추천해줘!", fixtureCards(), {
    budgetAmount: 100000,
  });

  const response = formatRecommendationResponse(
    [wallet],
    "10만원 이하 leather wallet 추천해줘!",
    {
      curatorPersonas: [
        {
          handle: "wallet_curator",
          personaName: "지갑 선물 큐레이터",
          defaultOneLiner: "처음 선물은 취향보다 실패 확률을 먼저 줄이는 게 좋아요.",
        },
      ],
    }
  );

  assert.match(response, /큐레이터 한마디: 처음 선물은 취향보다 실패 확률을 먼저 줄이는 게 좋아요\./);
  assert.match(response, /추천 이유: 카드 수납이 많고 선물 포장이 무난함/);
  assert.match(response, /큐레이터 페르소나: 지갑 선물 큐레이터 \(@wallet_curator\)/);
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

test("direct exact-match cards are not penalized for empty affiliate disclosure", () => {
  const cards = [
    recommendationCard({
      title: "비건 레더 미니 지갑",
      category: "wallet",
      originalUrl: "https://brand.example/products/vegan-mini-wallet",
      priceAmount: 52000,
      curator: { handle: "vegan_pick" },
      bestFor: ["비건 선물", "미니 지갑"],
      notFor: ["천연 가죽 선호"],
      searchKeywords: ["비건", "지갑"],
      curationNote: "동물성 소재를 피하는 지갑 선물에 맞음",
    }),
    recommendationCard({
      title: "클래식 가죽 반지갑",
      category: "wallet",
      originalUrl: "https://link.coupang.com/a/classic-wallet",
      priceAmount: 49000,
      curator: { handle: "wallet_curator" },
      bestFor: ["가죽지갑"],
      notFor: ["비건 소재 선호"],
      searchKeywords: ["지갑"],
      curationNote: "무난한 기본 지갑",
    }),
    recommendationCard({
      title: "브라운 카드 월렛",
      category: "wallet",
      originalUrl: "https://www.amazon.com/dp/B000000001",
      priceAmount: 45000,
      curator: { handle: "global_wallets" },
      bestFor: ["카드지갑"],
      notFor: ["비건 소재 선호"],
      searchKeywords: ["wallet"],
      curationNote: "해외 배송 지갑",
    }),
  ];

  const results = searchCards("비건 지갑", cards, { budgetAmount: 60000 });

  assert.equal(results[0].title, "비건 레더 미니 지갑");
});

test("no-match queries return no cards so formatted output uses the empty state", () => {
  const results = searchCards("축구공", fixtureCards(), { budgetAmount: 100000 });
  const response = formatRecommendationResponse(results, "축구공");

  assert.deepEqual(results, []);
  assert.match(response, /아직 맞는 AgentCart 후보가 없습니다\./);
});

test("scoreCard ignores invalid budgets without adding budget_exceeded behavior", () => {
  const [wallet] = fixtureCards();
  const queryTokens = tokenize("가죽 지갑");
  const scoreWithoutBudget = scoreCard(wallet, queryTokens, {});
  const zeroBudgetScore = scoreCard(wallet, queryTokens, { budgetAmount: 0 });
  const negativeBudgetScore = scoreCard(wallet, queryTokens, { budgetAmount: -100 });
  const infiniteBudgetScore = scoreCard(wallet, queryTokens, { budgetAmount: Infinity });

  assert.ok(Number.isFinite(zeroBudgetScore));
  assert.ok(Number.isFinite(negativeBudgetScore));
  assert.ok(Number.isFinite(infiniteBudgetScore));
  assert.equal(zeroBudgetScore, scoreWithoutBudget);
  assert.equal(negativeBudgetScore, scoreWithoutBudget);
  assert.equal(infiniteBudgetScore, scoreWithoutBudget);
  assert.deepEqual(wallet.riskFlags, []);
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
