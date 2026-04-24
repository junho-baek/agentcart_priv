import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  addCard,
  createEmptyRegistry,
  loadRegistry,
  registryPathFor,
  saveRegistry,
  seedRegistry,
} from "../src/registry/store.js";

test("createEmptyRegistry returns the initial registry shape with matching timestamps", () => {
  const timestamp = "2026-04-24T00:00:00.000Z";

  assert.deepEqual(createEmptyRegistry(timestamp), {
    version: 1,
    cards: [],
    feedbackEvents: [],
    recommendationEvents: [],
    clickEvents: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  });
});

test("saveRegistry and loadRegistry round-trip JSON at registryPathFor", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "agentcart-store-"));

  try {
    const registryPath = registryPathFor(tempDir);
    const registry = createEmptyRegistry("2026-04-24T00:00:00.000Z");
    registry.cards.push({ title: "블랙 소가죽 반지갑" });

    await saveRegistry(registryPath, registry);

    const loadedRegistry = await loadRegistry(registryPath);
    assert.equal(loadedRegistry.cards[0].title, "블랙 소가죽 반지갑");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("addCard validates and persists a normalized Coupang wallet card", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "agentcart-store-"));

  try {
    const registryPath = registryPathFor(tempDir);
    const card = await addCard(registryPath, {
      title: "블랙 소가죽 반지갑",
      category: "wallet",
      originalUrl: "https://link.coupang.com/a/evvpLi",
      curator: { handle: "wallet_curator" },
      bestFor: "남자 선물,10만원 이하",
      notFor: "초슬림 지갑 선호",
      curationNote: "선물용으로 무난함",
    });

    const loadedRegistry = await loadRegistry(registryPath);

    assert.equal(card.platform, "coupang");
    assert.deepEqual(card.bestFor, ["남자 선물", "10만원 이하"]);
    assert.deepEqual(card.notFor, ["초슬림 지갑 선호"]);
    assert.equal(loadedRegistry.cards.length, 1);
    assert.equal(loadedRegistry.cards[0].curator.handle, "wallet_curator");
    assert.deepEqual(loadedRegistry.cards[0].bestFor, ["남자 선물", "10만원 이하"]);
    assert.deepEqual(loadedRegistry.cards[0].notFor, ["초슬림 지갑 선호"]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("seedRegistry installs checked-in inventory", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "agentcart-store-"));

  try {
    const registryPath = registryPathFor(tempDir);
    const registry = await seedRegistry(registryPath);
    const titles = registry.cards.map((card) => card.title);
    const platforms = new Set(registry.cards.map((card) => card.platform));
    const riskFlags = new Set(registry.cards.flatMap((card) => card.riskFlags));
    const persistedRegistry = JSON.parse(await readFile(registryPath, "utf8"));

    assert.ok(registry.cards.length >= 10);
    assert.ok(titles.includes("블랙 소가죽 반지갑"));
    assert.ok(titles.includes("브라운 슬림 카드지갑"));
    assert.ok(platforms.has("coupang"));
    assert.ok(platforms.has("amazon"));
    assert.ok(platforms.has("aliexpress"));
    assert.ok(platforms.has("oliveyoung"));
    assert.ok(platforms.has("direct"));
    assert.ok(riskFlags.has("delivery_uncertainty"));
    assert.ok(riskFlags.has("health_claim_sensitive"));
    assert.equal(persistedRegistry.cards.length, registry.cards.length);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
