import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createServer } from "../src/api/server.js";
import { loadRegistry, seedRegistry } from "../src/registry/store.js";

async function withSeededServer(run) {
  const tempDir = await mkdtemp(join(tmpdir(), "agentcart-server-"));
  const registryPath = join(tempDir, "registry.json");
  await seedRegistry(registryPath);

  const server = createServer({ registryPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run({ baseUrl, registryPath });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();

  return { response, body };
}

test("health route returns registry service status", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const { response, body } = await fetchJson(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true, service: "agentcart-registry" });
  });
});

test("search returns top card wrappers, disclosure, and CLI instructions", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const url = new URL("/api/search", baseUrl);
    url.searchParams.set("q", "10만원 이하 가죽지갑");
    url.searchParams.set("budget", "100000");

    const { response, body } = await fetchJson(url);

    assert.equal(response.status, 200);
    assert.equal(body.results.length, 3);
    assert.ok(body.results[0].card.title);
    assert.match(body.disclosure, /커미션 링크/);
    assert.match(body.responseText, /커미션 링크/);
    assert.match(body.responseText, /셀러룸 보기: agentcart curator:room/);
    assert.match(body.responseText, /열기 전 확인: agentcart open/);
  });
});

test("no-match search returns an empty result list without a server error", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const url = new URL("/api/search", baseUrl);
    url.searchParams.set("q", "축구공");

    const { response, body } = await fetchJson(url);

    assert.equal(response.status, 200);
    assert.deepEqual(body.results, []);
  });
});

test("card lookup succeeds by slug and id and reports missing cards", async () => {
  await withSeededServer(async ({ baseUrl, registryPath }) => {
    const registry = await loadRegistry(registryPath);
    const card = registry.cards[0];
    const bySlug = await fetchJson(`${baseUrl}/api/cards/${encodeURIComponent(card.slug)}`);
    const byId = await fetchJson(`${baseUrl}/api/cards/${encodeURIComponent(card.id)}`);
    const missing = await fetchJson(`${baseUrl}/api/cards/missing-card`);

    assert.equal(bySlug.response.status, 200);
    assert.equal(bySlug.body.card.title, card.title);
    assert.equal(byId.response.status, 200);
    assert.equal(byId.body.card.slug, card.slug);
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { error: "card_not_found" });
  });
});

test("curator room route succeeds for seed curators and reports missing curators", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const found = await fetchJson(`${baseUrl}/api/curators/@wallet_curator`);
    const missing = await fetchJson(`${baseUrl}/api/curators/unknown_curator`);

    assert.equal(found.response.status, 200);
    assert.equal(found.body.room.handle, "wallet_curator");
    assert.ok(found.body.room.cards.length > 0);
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { error: "curator_not_found" });
  });
});

test("feedback POST persists events and invalid input returns 400", async () => {
  await withSeededServer(async ({ baseUrl, registryPath }) => {
    const registry = await loadRegistry(registryPath);
    const card = registry.cards[0];
    const created = await fetchJson(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        curatorHandle: card.curator.handle,
        helpful: true,
        linkMatchedExpectation: true,
        disclosureWasClear: true,
        comment: "useful recommendation",
      }),
    });
    const persistedRegistry = await loadRegistry(registryPath);
    const malformed = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const malformedBody = await malformed.json();
    const missing = await fetchJson(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curatorHandle: card.curator.handle }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.body.event.cardId, card.id);
    assert.equal(persistedRegistry.feedbackEvents.length, 1);
    assert.equal(persistedRegistry.feedbackEvents[0].id, created.body.event.id);
    assert.equal(malformed.status, 400);
    assert.deepEqual(malformedBody, { error: "invalid_json" });
    assert.equal(missing.response.status, 400);
    assert.deepEqual(missing.body, { error: "card_id_required" });
  });
});

test("parallel feedback POSTs persist every event", async () => {
  await withSeededServer(async ({ baseUrl, registryPath }) => {
    const registry = await loadRegistry(registryPath);
    const card = registry.cards[0];
    const feedbackCount = 20;
    const posts = Array.from({ length: feedbackCount }, (_, index) =>
      fetchJson(`${baseUrl}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          curatorHandle: card.curator.handle,
          helpful: index % 2 === 0,
          comment: `parallel feedback ${index}`,
        }),
      })
    );

    const results = await Promise.all(posts);
    const persistedRegistry = await loadRegistry(registryPath);

    assert.deepEqual(
      results.map(({ response }) => response.status),
      Array(feedbackCount).fill(201)
    );
    assert.equal(persistedRegistry.feedbackEvents.length, feedbackCount);
    assert.equal(
      new Set(persistedRegistry.feedbackEvents.map((event) => event.id)).size,
      feedbackCount
    );
  });
});

test("oversized feedback body returns deterministic JSON 413", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(1_000_001),
    });
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.deepEqual(body, { error: "body_too_large" });
  });
});

test("malformed percent-encoded route segments return not found", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const { response, body } = await fetchJson(`${baseUrl}/api/cards/%E0%A4%A`);

    assert.equal(response.status, 404);
    assert.deepEqual(body, { error: "not_found" });
  });
});

test("OPTIONS preflight returns 204 and unknown routes return 404", async () => {
  await withSeededServer(async ({ baseUrl }) => {
    const options = await fetch(`${baseUrl}/api/search`, { method: "OPTIONS" });
    const missing = await fetchJson(`${baseUrl}/api/unknown`);

    assert.equal(options.status, 204);
    assert.equal(options.headers.get("access-control-allow-origin"), "*");
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { error: "not_found" });
  });
});
