import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentProductContext,
  buildCurationEntry,
  buildRecommenderPersona,
  validateProtocolObject,
} from "../src/registry/protocol.js";

const card = {
  id: "card-001",
  slug: "neoguri",
  title: "너구리 얼큰한맛 120g 5개",
  platform: "coupang",
  category: "grocery",
  originalUrl: "https://link.coupang.com/a/evFgBR",
  curator: { handle: "@junho-baek", displayName: "백준호" },
  priceAmount: 4500,
  currency: "KRW",
  bestFor: ["자취생 음식", "비상식량"],
  notFor: ["나트륨 민감"],
  searchKeywords: ["자취생 라면", "간편식"],
  curationNote: "보관이 쉽고 빠르게 한 끼를 해결할 수 있습니다.",
  disclosure: "구매 시 링크 등록자가 수수료를 받을 수 있습니다.",
  riskFlags: ["nutrition_balance"],
  updatedAt: "2026-04-28T00:00:00.000Z",
};

const persona = {
  handle: "junho-baek",
  displayName: "백준호",
  personaName: "자취생 생존 큐레이터 백준호",
  tagline: "실제로 먹게 되는 장바구니를 만듭니다.",
  greeting: "안녕하세요, 백준호입니다.",
  voiceTraits: ["실용적", "생활 밀착"],
  curationPrinciples: ["실제로 먹게 되는 식품을 우선합니다."],
  defaultOneLiner: "생활 루프가 먼저입니다.",
  disclosureText: "이 큐레이터의 추천에는 커미션 링크가 포함될 수 있습니다.",
};

test("buildCurationEntry maps a card into human registration context", () => {
  const entry = buildCurationEntry(card);

  assert.equal(entry.kind, "CurationEntry");
  assert.equal(entry.id, "card-001");
  assert.equal(entry.title, card.title);
  assert.equal(entry.originalUrl, card.originalUrl);
  assert.equal(entry.curator.handle, "junho-baek");
  assert.deepEqual(entry.bestFor, ["자취생 음식", "비상식량"]);
  assert.deepEqual(entry.notFor, ["나트륨 민감"]);
  assert.equal(entry.disclosureHint, card.disclosure);
});

test("buildRecommenderPersona creates an insight-first commercial actor persona", () => {
  const recommenderPersona = buildRecommenderPersona(persona);

  assert.equal(recommenderPersona.kind, "RecommenderPersona");
  assert.equal(recommenderPersona.handle, "junho-baek");
  assert.equal(recommenderPersona.adviceMode, "insight_first");
  assert.equal(recommenderPersona.commercialRole, "affiliate_publisher");
  assert.match(recommenderPersona.disclosurePolicy.requiredDisclosureText, /커미션 링크/);
});

test("buildAgentProductContext maps a card and persona into agent-facing context", () => {
  const context = buildAgentProductContext(card, { persona });

  assert.equal(context.kind, "AgentProductContext");
  assert.equal(context.contextId, "context-card-001");
  assert.equal(context.recommender.handle, "junho-baek");
  assert.equal(context.recommender.personaName, "자취생 생존 큐레이터 백준호");
  assert.equal(context.disclosure.relationshipType, "affiliate");
  assert.deepEqual(context.fitRules.bestFor, ["자취생 음식", "비상식량"]);
  assert.deepEqual(context.risk.riskFlags, ["nutrition_balance"]);
  assert.ok(context.allowedActions.includes("ask_before_opening"));
  assert.ok(context.risk.prohibitedClaims.includes("lowest_price"));
});

test("validateProtocolObject accepts known protocol objects and rejects unknown kinds", () => {
  assert.deepEqual(validateProtocolObject(buildCurationEntry(card)), {
    ok: true,
    errors: [],
  });
  assert.deepEqual(validateProtocolObject({ kind: "Bad" }), {
    ok: false,
    errors: ["unknown_kind"],
  });
});
