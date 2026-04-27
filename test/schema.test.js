import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmbeddingText,
  createCard,
  detectPlatform,
  normalizeDisclosure,
  slugify,
  validateCard,
} from "../src/registry/schema.js";

test("detectPlatform recognizes the first supported commerce platforms", () => {
  assert.equal(detectPlatform("https://link.coupang.com/a/evvpLi"), "coupang");
  assert.equal(detectPlatform("https://www.amazon.com/dp/B000000001"), "amazon");
  assert.equal(detectPlatform("https://www.aliexpress.com/item/100500.html"), "aliexpress");
  assert.equal(detectPlatform("https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A0001"), "oliveyoung");
  assert.equal(detectPlatform("https://brand.example/products/wallet"), "direct");
  assert.equal(detectPlatform("not a url"), "unknown");
});

test("normalizeDisclosure returns platform-safe Korean disclosure text", () => {
  assert.equal(
    normalizeDisclosure("coupang", ""),
    "구매 시 링크 등록자가 쿠팡 파트너스 활동에 따른 일정액의 수수료를 받을 수 있습니다."
  );
  assert.equal(
    normalizeDisclosure("amazon", "This is an affiliate link."),
    "This is an affiliate link."
  );
});

test("validateCard rejects missing curator, URL, title, and context", () => {
  const result = validateCard({
    title: "",
    originalUrl: "",
    curator: { handle: "" },
    bestFor: [],
    notFor: [],
  });

  assert.deepEqual(result.ok, false);
  assert.deepEqual(result.errors, [
    "title_required",
    "original_url_required",
    "curator_handle_required",
    "best_for_required",
    "not_for_required",
  ]);
});

test("validateCard rejects malformed non-empty URLs", () => {
  const result = validateCard({
    title: "블랙 소가죽 반지갑",
    originalUrl: "not a url",
    curator: { handle: "gift-curator" },
    bestFor: ["남자 선물"],
    notFor: ["초슬림 지갑 선호"],
  });

  assert.deepEqual(result.ok, false);
  assert.deepEqual(result.errors, ["valid_url_required"]);
});

test("slugify strips Latin diacritics and preserves Korean syllables", () => {
  assert.equal(slugify("Café wallet"), "cafe-wallet");
  assert.equal(slugify("온열 목 마사지기"), "온열-목-마사지기");
});

test("createCard produces a Korean slug and embedding text for Korean-only titles", () => {
  const card = createCard({
    title: "온열 목 마사지기",
    originalUrl: "https://brand.example/products/massager",
    category: "massager",
    curator: { handle: "gift-curator" },
    bestFor: ["부모님 선물"],
    notFor: ["휴대용 선호"],
    curationNote: "집에서 쓰기 좋은 온열 기능",
  });

  assert.equal(card.slug, "온열-목-마사지기");
  assert.match(card.embeddingText, /온열 목 마사지기/);
});

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

test("buildEmbeddingText is stable and vector-ready", () => {
  const text = buildEmbeddingText({
    title: "블랙 소가죽 반지갑",
    category: "wallet",
    platform: "coupang",
    bestFor: ["남자 선물", "10만원 이하"],
    notFor: ["초슬림 지갑 선호"],
    curationNote: "카드 수납이 많고 선물 포장이 무난함",
  });

  assert.equal(
    text,
    "블랙 소가죽 반지갑. category: wallet. platform: coupang. campaign: . best for: 남자 선물, 10만원 이하. not for: 초슬림 지갑 선호. note: 카드 수납이 많고 선물 포장이 무난함. claims: ."
  );
});
