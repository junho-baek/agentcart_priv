import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEmbeddingText,
  detectPlatform,
  normalizeDisclosure,
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
    "블랙 소가죽 반지갑. category: wallet. platform: coupang. best for: 남자 선물, 10만원 이하. not for: 초슬림 지갑 선호. note: 카드 수납이 많고 선물 포장이 무난함."
  );
});
