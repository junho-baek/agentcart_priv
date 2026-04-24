import assert from "node:assert/strict";
import test from "node:test";

import { calculateTrustTemperature, getCuratorRoom } from "../src/registry/curator.js";

function walletCard(overrides = {}) {
  return {
    id: overrides.id ?? "wallet-card",
    slug: overrides.slug ?? "wallet-card",
    title: overrides.title ?? "블랙 소가죽 반지갑",
    platform: overrides.platform ?? "coupang",
    priceSnapshot: overrides.priceSnapshot ?? "69,000 KRW",
    curator: {
      handle: overrides.curatorHandle ?? "wallet_curator",
      displayName: overrides.displayName ?? "Wallet Curator",
    },
    bestFor: overrides.bestFor ?? ["남자 선물", "가죽지갑"],
    notFor: overrides.notFor ?? ["초슬림 지갑 선호"],
    curationNote: overrides.curationNote ?? "카드 수납이 많고 선물 포장이 무난함",
    disclosure: overrides.disclosure ?? "구매 시 수수료를 받을 수 있습니다.",
    riskFlags: overrides.riskFlags ?? [],
  };
}

function feedbackEvent(overrides = {}) {
  return {
    cardId: overrides.cardId ?? "wallet-card",
    curatorHandle: overrides.curatorHandle ?? "wallet_curator",
    helpful: overrides.helpful ?? false,
  };
}

test("calculateTrustTemperature combines disclosure, context, risk, and helpful feedback", () => {
  const cards = [
    walletCard({ id: "wallet-1", slug: "wallet-1" }),
    walletCard({ id: "wallet-2", slug: "wallet-2", title: "브라운 슬림 카드지갑" }),
  ];
  const feedbackEvents = [
    feedbackEvent({ helpful: true }),
    feedbackEvent({ helpful: true }),
    feedbackEvent({ helpful: false }),
  ];

  assert.equal(
    calculateTrustTemperature({ cards, feedbackEvents, verifiedViolationCount: 0 }),
    88
  );
});

test("getCuratorRoom normalizes handles and returns a room summary for matching cards", () => {
  const registry = {
    cards: [
      walletCard({ id: "wallet-1", slug: "wallet-1" }),
      walletCard({ id: "wallet-2", slug: "wallet-2", title: "브라운 슬림 카드지갑" }),
      walletCard({
        id: "desk-1",
        slug: "desk-1",
        title: "화이트 무선 충전 스탠드",
        curatorHandle: "desk_setup",
      }),
    ],
    feedbackEvents: [
      feedbackEvent({ helpful: true }),
      feedbackEvent({ helpful: true }),
      feedbackEvent({ helpful: false }),
      feedbackEvent({ curatorHandle: "desk_setup", helpful: false }),
    ],
  };

  const room = getCuratorRoom(registry, "@wallet_curator");

  assert.equal(room.handle, "wallet_curator");
  assert.equal(room.displayName, "Wallet Curator");
  assert.equal(room.roomSlug, "wallet_curator");
  assert.equal(room.cards.length, 2);
  assert.ok(room.trustTemperature > 80);
  assert.deepEqual(Object.keys(room.cards[0]), [
    "id",
    "slug",
    "title",
    "platform",
    "priceSnapshot",
    "bestFor",
    "notFor",
    "riskFlags",
  ]);
});

test("getCuratorRoom returns null for unknown handles", () => {
  assert.equal(getCuratorRoom({ cards: [], feedbackEvents: [] }, "unknown"), null);
});

test("verified violations lower trust temperature", () => {
  const cards = [walletCard()];
  const feedbackEvents = [feedbackEvent({ helpful: true })];

  assert.equal(
    calculateTrustTemperature({ cards, feedbackEvents, verifiedViolationCount: 2 }),
    calculateTrustTemperature({ cards, feedbackEvents, verifiedViolationCount: 0 }) - 20
  );
});
