# AgentCart Registry MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a same-day AgentCart MVP where Claude, Codex, OpenClaw, or any agent can install an open skill, query a commission-link registry, recommend 3 products with disclosure and curator reputation, and open the final shopping link only after user approval.

**Architecture:** Keep the current Vite landing page and Node CLI. Add a local-first registry stored as JSON under `.agentcart/registry.json`, a small Node HTTP API for agent skill calls, a deterministic keyword recommendation engine, a curator-room view, feedback events, and generated skill markdown. The JSON store is deliberately shaped so it can later move to hosted Postgres, Turso/libSQL, or vector DB search without changing the public agent card schema.

**Tech Stack:** Node.js ESM, Node built-in `node:test`, Node built-in `http`, Vite for the landing page, JSON registry for the first deployable MVP.

---

## Product Decision Locked In

AgentCart is not a web shopping mall and not a page builder.

AgentCart is a commission-link shopping protocol for AI agents.

The final frontend is the agent chat: Claude, Codex, OpenClaw, ChatGPT-style agents, or future agent surfaces. The web landing page exists to install the open-source skill and explain the protocol. The hosted registry exists to store the commission-link inventory, curator context, trust metadata, feedback events, and later vector-search data.

Today, the product must make this demo work:

```text
User:
AgentCart로 10만원 이하 가죽지갑 추천해줘.

AgentCart skill:
1. Shows commission disclosure before recommendations.
2. Calls the registry search API.
3. Returns exactly 3 recommendations.
4. Explains why each fits and who should avoid it.
5. Shows curator handle, curator temperature, and room command.
6. Marks Coupang, Amazon, AliExpress, OliveYoung, or direct links clearly.
7. Opens a purchase link only after the user chooses one.
8. Records optional post-purchase recommendation feedback.
```

## Scope Check

This plan intentionally builds one cohesive MVP:

- Commission-link card schema.
- Local registry store.
- Seed inventory.
- Keyword recommendation engine.
- Curator rooms and trust temperature.
- Feedback events.
- HTTP search API.
- CLI commands.
- Agent skill markdown.
- Landing page install copy.

Do not add vector DB today. Do not add a real hosted account system today. Do not add browser automation or auto-purchase today. Keep the data shape vector-ready by storing `embeddingText`, `bestFor`, `notFor`, `curationNote`, and `searchKeywords`.

## File Structure

- Create: `src/registry/schema.js`
  - Owns platform detection, card validation, disclosure defaults, and text normalization.
- Create: `src/registry/store.js`
  - Owns `.agentcart/registry.json` load/save/seed/add operations.
- Create: `src/registry/recommend.js`
  - Owns tokenization, keyword scoring, risk penalties, and 3-card response formatting.
- Create: `src/registry/curator.js`
  - Owns curator-room summaries and trust temperature calculation.
- Create: `src/registry/feedback.js`
  - Owns recommendation feedback event validation and reputation inputs.
- Create: `src/registry/skill.js`
  - Owns generated AgentCart skill markdown for generic, Codex, Claude, and OpenClaw targets.
- Create: `src/api/server.js`
  - Owns the HTTP API for `/health`, `/api/search`, `/api/cards/:id`, `/api/curators/:handle`, and `/api/feedback`.
- Create: `src/cli/commands.js`
  - Owns CLI argument parsing and command dispatch.
- Modify: `cli.js`
  - Keep as the executable wrapper, delegate to `src/cli/commands.js`.
- Create: `data/seed-cards.json`
  - Seed cards for leather wallet demo plus varied product examples across Coupang, Amazon, AliExpress, OliveYoung, and direct links.
- Create: `skills/agentcart-shopping-skill.md`
  - Canonical checked-in skill text used by `install-skill`.
- Create: `test/schema.test.js`
- Create: `test/store.test.js`
- Create: `test/recommend.test.js`
- Create: `test/curator.test.js`
- Create: `test/feedback.test.js`
- Create: `test/server.test.js`
- Create: `test/cli.test.js`
- Create: `test/skill.test.js`
- Create: `test/landing.test.js`
- Modify: `package.json`
  - Add `test`, `serve:registry`, and keep current Vite commands.
- Modify: `web/index.html`
  - Reposition landing around open-source skill installation.
- Modify: `web/main.js`
  - Add install/demo strings for EN/KO/ZH/JA.
- Modify: `web/styles.css`
  - Style install commands and agent-chat demo.
- Modify: `web/README.md`
  - Explain landing and local registry API commands.
- Create: `README.md`
  - Add root-level MVP instructions and demo flow.

---

### Task 1: Test Harness And Scripts

**Files:**
- Modify: `package.json`
- Create: `test/schema.test.js`

- [ ] **Step 1: Add the failing schema test**

Create `test/schema.test.js`:

```js
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
```

- [ ] **Step 2: Add the test script**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "vite web --host 0.0.0.0",
    "build": "vite build web",
    "test": "node --test test/*.test.js",
    "agentcart": "node cli.js",
    "login": "node cli.js login",
    "serve:registry": "node cli.js serve --port 8787",
    "preview": "vite preview web --host 0.0.0.0"
  }
}
```

- [ ] **Step 3: Run the test and verify it fails**

Run:

```bash
npm test -- test/schema.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/schema.js'`.

- [ ] **Step 4: Commit**

```bash
git add package.json test/schema.test.js
git commit -m "test: add registry schema coverage"
```

---

### Task 2: Commission-Link Card Schema

**Files:**
- Create: `src/registry/schema.js`
- Test: `test/schema.test.js`

- [ ] **Step 1: Implement schema helpers**

Create `src/registry/schema.js`:

```js
const PLATFORM_HOSTS = [
  { platform: "coupang", hosts: ["coupang.com", "link.coupang.com"] },
  { platform: "amazon", hosts: ["amazon.com", "amzn.to"] },
  { platform: "aliexpress", hosts: ["aliexpress.com", "s.click.aliexpress.com"] },
  { platform: "oliveyoung", hosts: ["oliveyoung.co.kr"] },
];

const DEFAULT_DISCLOSURES = {
  coupang: "구매 시 링크 등록자가 쿠팡 파트너스 활동에 따른 일정액의 수수료를 받을 수 있습니다.",
  amazon: "구매 시 링크 등록자가 Amazon Associates 또는 제휴 프로그램에 따른 수수료를 받을 수 있습니다.",
  aliexpress: "구매 시 링크 등록자가 AliExpress 제휴 프로그램에 따른 수수료를 받을 수 있습니다.",
  oliveyoung: "구매 시 링크 등록자가 제휴 활동에 따른 수수료를 받을 수 있습니다.",
  direct: "구매 시 링크 등록자 또는 판매자가 경제적 이익을 얻을 수 있습니다.",
};

export function detectPlatform(originalUrl) {
  try {
    const host = new URL(originalUrl).hostname.replace(/^www\./, "");
    const match = PLATFORM_HOSTS.find((entry) =>
      entry.hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))
    );
    return match?.platform ?? "direct";
  } catch {
    return "unknown";
  }
}

export function normalizeDisclosure(platform, disclosureText) {
  const trimmed = String(disclosureText ?? "").trim();
  if (trimmed) return trimmed;
  return DEFAULT_DISCLOSURES[platform] ?? DEFAULT_DISCLOSURES.direct;
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildEmbeddingText(card) {
  const bestFor = normalizeArray(card.bestFor).join(", ");
  const notFor = normalizeArray(card.notFor).join(", ");
  const note = String(card.curationNote ?? "").trim();
  return `${card.title}. category: ${card.category}. platform: ${card.platform}. best for: ${bestFor}. not for: ${notFor}. note: ${note}.`;
}

export function validateCard(card) {
  const errors = [];

  if (!String(card.title ?? "").trim()) errors.push("title_required");
  if (!String(card.originalUrl ?? "").trim()) errors.push("original_url_required");
  if (!String(card.curator?.handle ?? "").trim()) errors.push("curator_handle_required");
  if (normalizeArray(card.bestFor).length === 0) errors.push("best_for_required");
  if (normalizeArray(card.notFor).length === 0) errors.push("not_for_required");

  if (card.originalUrl) {
    try {
      const parsed = new URL(card.originalUrl);
      if (parsed.protocol !== "https:") errors.push("https_required");
    } catch {
      errors.push("valid_url_required");
    }
  }

  return { ok: errors.length === 0, errors };
}

export function createCard(input, now = new Date()) {
  const platform = detectPlatform(input.originalUrl);
  const bestFor = normalizeArray(input.bestFor);
  const notFor = normalizeArray(input.notFor);
  const id = input.id ?? `card_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const curatorHandle = String(input.curator?.handle ?? input.curatorHandle ?? "").replace(/^@/, "");
  const card = {
    id,
    slug: input.slug ?? slugify(`${curatorHandle}-${input.title}`),
    title: String(input.title ?? "").trim(),
    category: String(input.category ?? "general").trim(),
    platform,
    originalUrl: String(input.originalUrl ?? "").trim(),
    finalUrl: String(input.finalUrl ?? input.originalUrl ?? "").trim(),
    commissionType: input.commissionType ?? "affiliate",
    disclosureText: normalizeDisclosure(platform, input.disclosureText),
    priceSnapshot: {
      amount: Number(input.priceSnapshot?.amount ?? input.priceAmount ?? 0),
      currency: input.priceSnapshot?.currency ?? input.currency ?? "KRW",
      capturedAt: input.priceSnapshot?.capturedAt ?? now.toISOString(),
    },
    curator: {
      id: input.curator?.id ?? `cur_${curatorHandle || "unknown"}`,
      handle: curatorHandle,
      displayName: input.curator?.displayName ?? curatorHandle,
      roomSlug: input.curator?.roomSlug ?? curatorHandle,
    },
    bestFor,
    notFor,
    searchKeywords: normalizeArray(input.searchKeywords),
    curationNote: String(input.curationNote ?? "").trim(),
    riskFlags: normalizeArray(input.riskFlags),
    createdAt: input.createdAt ?? now.toISOString(),
    updatedAt: input.updatedAt ?? now.toISOString(),
  };
  card.embeddingText = buildEmbeddingText(card);
  return card;
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
```

- [ ] **Step 2: Run schema tests**

Run:

```bash
npm test -- test/schema.test.js
```

Expected: PASS for all 4 tests.

- [ ] **Step 3: Commit**

```bash
git add src/registry/schema.js test/schema.test.js
git commit -m "feat: define commission link card schema"
```

---

### Task 3: Registry Store And Seed Inventory

**Files:**
- Create: `src/registry/store.js`
- Create: `data/seed-cards.json`
- Create: `test/store.test.js`
- Test: `test/store.test.js`

- [ ] **Step 1: Write the failing store tests**

Create `test/store.test.js`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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

test("createEmptyRegistry returns the durable registry shape", () => {
  assert.deepEqual(createEmptyRegistry("2026-04-24T00:00:00.000Z"), {
    version: 1,
    cards: [],
    feedbackEvents: [],
    recommendationEvents: [],
    clickEvents: [],
    createdAt: "2026-04-24T00:00:00.000Z",
    updatedAt: "2026-04-24T00:00:00.000Z",
  });
});

test("saveRegistry and loadRegistry round-trip JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentcart-store-"));
  const path = registryPathFor(dir);
  const registry = createEmptyRegistry("2026-04-24T00:00:00.000Z");
  registry.cards.push({ id: "card_1", title: "테스트 지갑" });

  await saveRegistry(path, registry);
  const loaded = await loadRegistry(path);

  assert.equal(loaded.cards[0].title, "테스트 지갑");
});

test("addCard validates and persists a normalized card", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentcart-add-"));
  const path = registryPathFor(dir);
  const card = await addCard(path, {
    title: "블랙 소가죽 반지갑",
    category: "wallet",
    originalUrl: "https://link.coupang.com/a/evvpLi",
    curator: { handle: "wallet_curator" },
    bestFor: "남자 선물,10만원 이하",
    notFor: "초슬림 지갑 선호",
    curationNote: "선물용으로 무난함",
  });

  const loaded = await loadRegistry(path);
  assert.equal(card.platform, "coupang");
  assert.equal(loaded.cards.length, 1);
  assert.equal(loaded.cards[0].curator.handle, "wallet_curator");
});

test("seedRegistry installs the checked-in inventory", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentcart-seed-"));
  const path = registryPathFor(dir);

  const registry = await seedRegistry(path);
  const titles = registry.cards.map((card) => card.title);

  assert.equal(registry.cards.length >= 10, true);
  assert.equal(titles.includes("블랙 소가죽 반지갑"), true);
  assert.equal(titles.includes("브라운 슬림 카드지갑"), true);

  const raw = JSON.parse(await readFile(path, "utf8"));
  assert.equal(raw.cards.length, registry.cards.length);
});
```

- [ ] **Step 2: Run the store tests and verify failure**

Run:

```bash
npm test -- test/store.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/store.js'`.

- [ ] **Step 3: Create seed inventory**

Create `data/seed-cards.json`:

```json
[
  {
    "title": "블랙 소가죽 반지갑",
    "category": "wallet",
    "originalUrl": "https://link.coupang.com/a/evvpLi",
    "priceAmount": 69000,
    "currency": "KRW",
    "curator": {
      "handle": "wallet_curator",
      "displayName": "가죽소품 큐레이터"
    },
    "bestFor": ["남자 선물", "가죽지갑", "10만원 이하", "실용적인 선물"],
    "notFor": ["초슬림 지갑 선호", "비건 소재 선호"],
    "searchKeywords": ["지갑", "가죽", "남자", "선물", "반지갑", "쿠팡"],
    "curationNote": "카드 수납과 선물 무난함을 기준으로 고른 블랙 반지갑입니다.",
    "riskFlags": []
  },
  {
    "title": "브라운 슬림 카드지갑",
    "category": "wallet",
    "originalUrl": "https://www.amazon.com/dp/B000000001",
    "priceAmount": 42000,
    "currency": "KRW",
    "curator": {
      "handle": "wallet_curator",
      "displayName": "가죽소품 큐레이터"
    },
    "bestFor": ["카드지갑", "얇은 지갑", "가벼운 선물", "10만원 이하"],
    "notFor": ["지폐 수납 많이 필요", "동전 수납 필요"],
    "searchKeywords": ["지갑", "카드지갑", "가죽", "슬림", "아마존"],
    "curationNote": "부피가 작고 출퇴근용 카드지갑으로 쓰기 좋은 링크입니다.",
    "riskFlags": []
  },
  {
    "title": "선물 포장 남성 장지갑",
    "category": "wallet",
    "originalUrl": "https://www.aliexpress.com/item/1005000000000001.html",
    "priceAmount": 32000,
    "currency": "KRW",
    "curator": {
      "handle": "budget_finder",
      "displayName": "가성비 탐색가"
    },
    "bestFor": ["저렴한 선물", "장지갑", "예산 절약"],
    "notFor": ["빠른 배송 필요", "브랜드 선물 선호"],
    "searchKeywords": ["지갑", "장지갑", "가성비", "알리", "선물"],
    "curationNote": "가격은 낮지만 배송 변동성이 있어 급한 선물에는 맞지 않습니다.",
    "riskFlags": ["delivery_uncertainty"]
  },
  {
    "title": "올리브영 핸드크림 선물 세트",
    "category": "beauty",
    "originalUrl": "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000001",
    "priceAmount": 26000,
    "currency": "KRW",
    "curator": {
      "handle": "gift_editor",
      "displayName": "선물 에디터"
    },
    "bestFor": ["가벼운 선물", "여자친구 선물", "직장 동료 선물"],
    "notFor": ["향에 민감한 사람", "무향 제품 선호"],
    "searchKeywords": ["핸드크림", "선물", "올리브영", "뷰티"],
    "curationNote": "부담 없는 가격대의 선물 후보입니다.",
    "riskFlags": []
  },
  {
    "title": "무선 목 어깨 마사지기",
    "category": "wellness",
    "originalUrl": "https://link.coupang.com/a/massage01",
    "priceAmount": 89000,
    "currency": "KRW",
    "curator": {
      "handle": "parent_gift",
      "displayName": "부모님 선물 큐레이터"
    },
    "bestFor": ["부모님 선물", "엄마 생일", "10만원 이하", "실용적인 선물"],
    "notFor": ["의료 효과 기대", "강한 압박 싫어함"],
    "searchKeywords": ["마사지기", "부모님", "엄마", "생일", "쿠팡"],
    "curationNote": "의료기기처럼 설명하면 안 되고 피로 완화용 선물로만 제안해야 합니다.",
    "riskFlags": ["health_claim_sensitive"]
  },
  {
    "title": "데스크용 USB-C 허브",
    "category": "electronics",
    "originalUrl": "https://www.amazon.com/dp/B000000002",
    "priceAmount": 54000,
    "currency": "KRW",
    "curator": {
      "handle": "desk_setup",
      "displayName": "데스크 셋업 큐레이터"
    },
    "bestFor": ["노트북 사용자", "개발자 선물", "데스크 셋업"],
    "notFor": ["게이밍 장비 선호", "무선 액세서리만 선호"],
    "searchKeywords": ["USB-C", "허브", "개발자", "데스크", "아마존"],
    "curationNote": "맥북이나 USB-C 노트북 사용자를 위한 실용 링크입니다.",
    "riskFlags": []
  },
  {
    "title": "가벼운 여행용 파우치 6종",
    "category": "travel",
    "originalUrl": "https://www.aliexpress.com/item/1005000000000002.html",
    "priceAmount": 18000,
    "currency": "KRW",
    "curator": {
      "handle": "travel_pack",
      "displayName": "여행 짐 큐레이터"
    },
    "bestFor": ["여행 준비", "가성비 선물", "정리용품"],
    "notFor": ["고급 소재 선호", "내일 바로 필요"],
    "searchKeywords": ["여행", "파우치", "정리", "알리"],
    "curationNote": "배송 시간이 변수라 여행 일정이 임박한 사람에게는 피해야 합니다.",
    "riskFlags": ["delivery_uncertainty"]
  },
  {
    "title": "프리미엄 다이어리 커버",
    "category": "stationery",
    "originalUrl": "https://brand.example/products/diary-cover",
    "priceAmount": 78000,
    "currency": "KRW",
    "curator": {
      "handle": "work_tools",
      "displayName": "작업도구 큐레이터"
    },
    "bestFor": ["새해 선물", "문구 덕후", "직장인 선물"],
    "notFor": ["디지털 노트만 사용", "가벼운 선물 선호"],
    "searchKeywords": ["다이어리", "문구", "커버", "직장인"],
    "curationNote": "직접 판매 링크라 배송/반품 정책을 확인하고 열어야 합니다.",
    "riskFlags": []
  },
  {
    "title": "화이트 무선 충전 스탠드",
    "category": "electronics",
    "originalUrl": "https://link.coupang.com/a/charger01",
    "priceAmount": 39000,
    "currency": "KRW",
    "curator": {
      "handle": "desk_setup",
      "displayName": "데스크 셋업 큐레이터"
    },
    "bestFor": ["책상 정리", "아이폰 사용자", "실용적인 선물"],
    "notFor": ["유선 고속충전 선호", "케이스 두꺼운 사용자"],
    "searchKeywords": ["충전기", "무선충전", "데스크", "쿠팡"],
    "curationNote": "책상 위 사용성을 기준으로 고른 링크입니다.",
    "riskFlags": []
  },
  {
    "title": "비건 레더 미니 지갑",
    "category": "wallet",
    "originalUrl": "https://brand.example/products/vegan-mini-wallet",
    "priceAmount": 58000,
    "currency": "KRW",
    "curator": {
      "handle": "wallet_curator",
      "displayName": "가죽소품 큐레이터"
    },
    "bestFor": ["비건 소재 선호", "미니 지갑", "가벼운 선물"],
    "notFor": ["천연가죽 선호", "지폐 수납 많이 필요"],
    "searchKeywords": ["지갑", "비건", "미니", "선물"],
    "curationNote": "천연가죽을 피하는 사람에게 제안할 수 있는 대체 후보입니다.",
    "riskFlags": []
  }
]
```

- [ ] **Step 4: Implement store operations**

Create `src/registry/store.js`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createCard, validateCard } from "./schema.js";

const DEFAULT_REGISTRY_PATH = ".agentcart/registry.json";
const SEED_PATH = "data/seed-cards.json";

export function registryPathFor(workDir = process.cwd()) {
  return resolve(workDir, DEFAULT_REGISTRY_PATH);
}

export function createEmptyRegistry(now = new Date().toISOString()) {
  return {
    version: 1,
    cards: [],
    feedbackEvents: [],
    recommendationEvents: [],
    clickEvents: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadRegistry(path = registryPathFor()) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return createEmptyRegistry();
  }
}

export async function saveRegistry(path, registry) {
  await mkdir(dirname(path), { recursive: true });
  const nextRegistry = {
    ...registry,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(path, `${JSON.stringify(nextRegistry, null, 2)}\n`);
  return nextRegistry;
}

export async function addCard(path, input) {
  const registry = await loadRegistry(path);
  const card = createCard(input);
  const validation = validateCard(card);
  if (!validation.ok) {
    throw new Error(`Invalid card: ${validation.errors.join(", ")}`);
  }
  registry.cards = registry.cards.filter((existing) => existing.id !== card.id && existing.slug !== card.slug);
  registry.cards.push(card);
  await saveRegistry(path, registry);
  return card;
}

export async function seedRegistry(path = registryPathFor()) {
  const seedItems = JSON.parse(await readFile(resolve(SEED_PATH), "utf8"));
  const registry = createEmptyRegistry();
  registry.cards = seedItems.map((item) => createCard(item, new Date("2026-04-24T00:00:00.000Z")));
  await saveRegistry(path, registry);
  return registry;
}
```

- [ ] **Step 5: Run store tests**

Run:

```bash
npm test -- test/store.test.js
```

Expected: PASS for all 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/registry/store.js data/seed-cards.json test/store.test.js
git commit -m "feat: add local registry store and seed cards"
```

---

### Task 4: Recommendation Engine

**Files:**
- Create: `src/registry/recommend.js`
- Create: `test/recommend.test.js`

- [ ] **Step 1: Write recommendation tests**

Create `test/recommend.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { createCard } from "../src/registry/schema.js";
import {
  formatRecommendationResponse,
  searchCards,
  scoreCard,
  tokenize,
} from "../src/registry/recommend.js";

const cards = [
  createCard({
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
  createCard({
    title: "화이트 무선 충전 스탠드",
    category: "electronics",
    originalUrl: "https://link.coupang.com/a/charger01",
    priceAmount: 39000,
    curator: { handle: "desk_setup" },
    bestFor: ["책상 정리", "아이폰 사용자"],
    notFor: ["유선 충전 선호"],
    searchKeywords: ["충전기", "무선충전", "데스크"],
    curationNote: "책상 위 사용성을 기준으로 고른 링크",
  }),
  createCard({
    title: "고가 명품 가죽 장지갑",
    category: "wallet",
    originalUrl: "https://brand.example/products/luxury-wallet",
    priceAmount: 240000,
    curator: { handle: "luxury_pick" },
    bestFor: ["명품 선물", "가죽지갑"],
    notFor: ["10만원 이하 예산"],
    searchKeywords: ["지갑", "가죽", "명품"],
    curationNote: "가격대가 높아 예산 제한이 있으면 제외해야 함",
  }),
];

test("tokenize keeps Korean and English shopping words", () => {
  assert.deepEqual(tokenize("10만원 이하 leather wallet 추천해줘!"), [
    "10만원",
    "이하",
    "leather",
    "wallet",
    "추천해줘",
  ]);
});

test("scoreCard rewards fit and penalizes over-budget cards", () => {
  const query = "10만원 이하 가죽지갑 남자 선물";
  const walletScore = scoreCard(cards[0], { query, budget: 100000 });
  const expensiveScore = scoreCard(cards[2], { query, budget: 100000 });

  assert.equal(walletScore.score > expensiveScore.score, true);
  assert.equal(expensiveScore.reasons.includes("budget_exceeded"), true);
});

test("searchCards returns exactly the best 3 or fewer cards", () => {
  const results = searchCards(cards, { query: "가죽지갑 추천", budget: 100000 });

  assert.equal(results[0].card.title, "블랙 소가죽 반지갑");
  assert.equal(results.length, 3);
});

test("formatRecommendationResponse includes disclosure before recommendations", () => {
  const results = searchCards(cards, { query: "가죽지갑 추천", budget: 100000 });
  const response = formatRecommendationResponse(results, { query: "가죽지갑 추천", budget: 100000 });

  assert.equal(response.includes("구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다."), true);
  assert.equal(response.includes("1. 블랙 소가죽 반지갑 [쿠팡 파트너스]"), true);
  assert.equal(response.includes("셀러룸 보기: agentcart curator:room wallet_curator"), true);
});
```

- [ ] **Step 2: Run recommendation tests and verify failure**

Run:

```bash
npm test -- test/recommend.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/recommend.js'`.

- [ ] **Step 3: Implement recommendation engine**

Create `src/registry/recommend.js`:

```js
const PLATFORM_LABELS = {
  coupang: "쿠팡 파트너스",
  amazon: "Amazon 제휴",
  aliexpress: "AliExpress 제휴",
  oliveyoung: "OliveYoung 제휴",
  direct: "직접 링크",
  unknown: "출처 확인 필요",
};

const RISK_PENALTIES = {
  delivery_uncertainty: -8,
  health_claim_sensitive: -10,
  missing_disclosure: -40,
  non_https_url: -50,
};

export function tokenize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}만원달러원]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function scoreCard(card, context) {
  const queryTokens = new Set(tokenize(context.query));
  const cardTokens = tokenize([
    card.title,
    card.category,
    card.platform,
    card.bestFor?.join(" "),
    card.notFor?.join(" "),
    card.searchKeywords?.join(" "),
    card.curationNote,
  ].join(" "));

  let score = 0;
  const reasons = [];

  for (const token of cardTokens) {
    if (queryTokens.has(token)) {
      score += 8;
      reasons.push(`matched_${token}`);
    }
  }

  if (context.budget && card.priceSnapshot?.amount > context.budget) {
    score -= 35;
    reasons.push("budget_exceeded");
  }

  if (context.budget && card.priceSnapshot?.amount <= context.budget) {
    score += 10;
    reasons.push("within_budget");
  }

  for (const flag of card.riskFlags ?? []) {
    score += RISK_PENALTIES[flag] ?? -4;
    reasons.push(`risk_${flag}`);
  }

  if (card.disclosureText) {
    score += 4;
    reasons.push("disclosure_present");
  }

  return { card, score, reasons: [...new Set(reasons)] };
}

export function searchCards(cards, context) {
  return cards
    .map((card) => scoreCard(card, context))
    .sort((a, b) => b.score - a.score || a.card.title.localeCompare(b.card.title))
    .slice(0, 3);
}

export function formatRecommendationResponse(results, context) {
  const lines = [
    "아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.",
    "",
    `질문: ${context.query}`,
  ];

  if (context.budget) {
    lines.push(`예산: ${context.budget.toLocaleString("ko-KR")}원 이하`);
  }

  lines.push("");

  results.forEach((result, index) => {
    const card = result.card;
    const label = PLATFORM_LABELS[card.platform] ?? PLATFORM_LABELS.unknown;
    const price = card.priceSnapshot?.amount
      ? `${card.priceSnapshot.amount.toLocaleString("ko-KR")} ${card.priceSnapshot.currency}`
      : "가격 스냅샷 없음";
    const avoid = card.notFor?.length ? card.notFor.join(", ") : "명시된 제외 대상 없음";

    lines.push(`${index + 1}. ${card.title} [${label}]`);
    lines.push(`- 왜 맞는지: ${card.curationNote}`);
    lines.push(`- 가격 스냅샷: ${price} (${card.priceSnapshot?.capturedAt ?? "capturedAt 없음"})`);
    lines.push(`- 피해야 할 경우: ${avoid}`);
    lines.push(`- 등록자: @${card.curator.handle}`);
    lines.push(`- 셀러룸 보기: agentcart curator:room ${card.curator.handle}`);
    lines.push(`- 열기 전 확인: agentcart open ${card.slug}`);
    lines.push("");
  });

  lines.push("선택한 링크를 열기 전에는 커미션 링크 고지를 다시 확인해야 합니다.");
  return lines.join("\n");
}
```

- [ ] **Step 4: Run recommendation tests**

Run:

```bash
npm test -- test/recommend.test.js
```

Expected: PASS for all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/registry/recommend.js test/recommend.test.js
git commit -m "feat: add keyword recommendation engine"
```

---

### Task 5: Curator Rooms And Trust Temperature

**Files:**
- Create: `src/registry/curator.js`
- Create: `test/curator.test.js`

- [ ] **Step 1: Write curator tests**

Create `test/curator.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { createCard } from "../src/registry/schema.js";
import { calculateTrustTemperature, getCuratorRoom } from "../src/registry/curator.js";

const cards = [
  createCard({
    title: "블랙 소가죽 반지갑",
    category: "wallet",
    originalUrl: "https://link.coupang.com/a/evvpLi",
    curator: { handle: "wallet_curator", displayName: "가죽소품 큐레이터" },
    bestFor: ["남자 선물"],
    notFor: ["비건 소재 선호"],
    curationNote: "고지와 맥락이 있는 카드",
    riskFlags: [],
  }),
  createCard({
    title: "비건 레더 미니 지갑",
    category: "wallet",
    originalUrl: "https://brand.example/products/vegan-mini-wallet",
    curator: { handle: "wallet_curator", displayName: "가죽소품 큐레이터" },
    bestFor: ["비건 소재 선호"],
    notFor: ["천연가죽 선호"],
    curationNote: "대체 소재 카드",
    riskFlags: [],
  }),
];

test("calculateTrustTemperature combines disclosure, context, feedback, and violations", () => {
  const score = calculateTrustTemperature({
    cards,
    feedbackEvents: [
      { curatorHandle: "wallet_curator", helpful: true },
      { curatorHandle: "wallet_curator", helpful: true },
      { curatorHandle: "wallet_curator", helpful: false },
    ],
    verifiedViolationCount: 0,
  });

  assert.equal(score, 88);
});

test("getCuratorRoom returns room summary and card list", () => {
  const room = getCuratorRoom(
    {
      cards,
      feedbackEvents: [{ curatorHandle: "wallet_curator", helpful: true }],
      recommendationEvents: [],
      clickEvents: [],
    },
    "wallet_curator"
  );

  assert.equal(room.handle, "wallet_curator");
  assert.equal(room.displayName, "가죽소품 큐레이터");
  assert.equal(room.cards.length, 2);
  assert.equal(room.trustTemperature > 80, true);
});
```

- [ ] **Step 2: Run curator tests and verify failure**

Run:

```bash
npm test -- test/curator.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/curator.js'`.

- [ ] **Step 3: Implement curator rooms**

Create `src/registry/curator.js`:

```js
export function calculateTrustTemperature({ cards, feedbackEvents = [], verifiedViolationCount = 0 }) {
  const disclosureScore = cards.every((card) => card.disclosureText) ? 25 : 10;
  const contextScore = cards.every((card) => card.bestFor?.length && card.notFor?.length && card.curationNote) ? 25 : 10;
  const lowRiskCount = cards.filter((card) => (card.riskFlags ?? []).length === 0).length;
  const riskScore = cards.length ? Math.round((lowRiskCount / cards.length) * 20) : 0;
  const helpfulCount = feedbackEvents.filter((event) => event.helpful).length;
  const feedbackScore = feedbackEvents.length
    ? Math.round((helpfulCount / feedbackEvents.length) * 20)
    : 15;
  const violationPenalty = Math.min(30, verifiedViolationCount * 10);

  return Math.max(0, Math.min(100, disclosureScore + contextScore + riskScore + feedbackScore - violationPenalty));
}

export function getCuratorRoom(registry, handle) {
  const normalizedHandle = String(handle ?? "").replace(/^@/, "");
  const cards = registry.cards.filter((card) => card.curator?.handle === normalizedHandle);
  const feedbackEvents = registry.feedbackEvents.filter((event) => event.curatorHandle === normalizedHandle);
  const firstCard = cards[0];

  if (!firstCard) {
    return null;
  }

  return {
    handle: normalizedHandle,
    displayName: firstCard.curator.displayName,
    roomSlug: firstCard.curator.roomSlug,
    trustTemperature: calculateTrustTemperature({
      cards,
      feedbackEvents,
      verifiedViolationCount: 0,
    }),
    cards: cards.map((card) => ({
      id: card.id,
      slug: card.slug,
      title: card.title,
      platform: card.platform,
      priceSnapshot: card.priceSnapshot,
      bestFor: card.bestFor,
      notFor: card.notFor,
      riskFlags: card.riskFlags,
    })),
  };
}
```

- [ ] **Step 4: Run curator tests**

Run:

```bash
npm test -- test/curator.test.js
```

Expected: PASS for both tests.

- [ ] **Step 5: Commit**

```bash
git add src/registry/curator.js test/curator.test.js
git commit -m "feat: add curator room reputation"
```

---

### Task 6: Feedback Events

**Files:**
- Create: `src/registry/feedback.js`
- Create: `test/feedback.test.js`

- [ ] **Step 1: Write feedback tests**

Create `test/feedback.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { createFeedbackEvent, summarizeFeedback } from "../src/registry/feedback.js";

test("createFeedbackEvent records recommendation quality, not retailer product review", () => {
  const event = createFeedbackEvent({
    cardId: "card_1",
    curatorHandle: "wallet_curator",
    helpful: true,
    linkMatchedExpectation: true,
    disclosureWasClear: true,
    comment: "추천 이유가 좋아서 골랐음",
  }, new Date("2026-04-24T00:00:00.000Z"));

  assert.deepEqual(event, {
    id: "fb_card_1_20260424000000",
    cardId: "card_1",
    curatorHandle: "wallet_curator",
    helpful: true,
    linkMatchedExpectation: true,
    disclosureWasClear: true,
    comment: "추천 이유가 좋아서 골랐음",
    createdAt: "2026-04-24T00:00:00.000Z",
  });
});

test("summarizeFeedback returns counts for curator reputation", () => {
  const summary = summarizeFeedback([
    { helpful: true, linkMatchedExpectation: true, disclosureWasClear: true },
    { helpful: false, linkMatchedExpectation: true, disclosureWasClear: false },
  ]);

  assert.deepEqual(summary, {
    total: 2,
    helpful: 1,
    linkMatchedExpectation: 2,
    disclosureWasClear: 1,
  });
});
```

- [ ] **Step 2: Run feedback tests and verify failure**

Run:

```bash
npm test -- test/feedback.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/feedback.js'`.

- [ ] **Step 3: Implement feedback events**

Create `src/registry/feedback.js`:

```js
function compactTimestamp(date) {
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export function createFeedbackEvent(input, now = new Date()) {
  const cardId = String(input.cardId ?? "").trim();
  const curatorHandle = String(input.curatorHandle ?? "").replace(/^@/, "").trim();
  if (!cardId) throw new Error("card_id_required");
  if (!curatorHandle) throw new Error("curator_handle_required");

  return {
    id: `fb_${cardId}_${compactTimestamp(now)}`,
    cardId,
    curatorHandle,
    helpful: Boolean(input.helpful),
    linkMatchedExpectation: Boolean(input.linkMatchedExpectation),
    disclosureWasClear: Boolean(input.disclosureWasClear),
    comment: String(input.comment ?? "").trim(),
    createdAt: now.toISOString(),
  };
}

export function summarizeFeedback(events) {
  return {
    total: events.length,
    helpful: events.filter((event) => event.helpful).length,
    linkMatchedExpectation: events.filter((event) => event.linkMatchedExpectation).length,
    disclosureWasClear: events.filter((event) => event.disclosureWasClear).length,
  };
}
```

- [ ] **Step 4: Run feedback tests**

Run:

```bash
npm test -- test/feedback.test.js
```

Expected: PASS for both tests.

- [ ] **Step 5: Commit**

```bash
git add src/registry/feedback.js test/feedback.test.js
git commit -m "feat: add recommendation feedback events"
```

---

### Task 7: Registry HTTP API

**Files:**
- Create: `src/api/server.js`
- Create: `test/server.test.js`

- [ ] **Step 1: Write API tests**

Create `test/server.test.js`:

```js
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createServer } from "../src/api/server.js";
import { registryPathFor, seedRegistry } from "../src/registry/store.js";

async function withServer(fn) {
  const dir = await mkdtemp(join(tmpdir(), "agentcart-api-"));
  const registryPath = registryPathFor(dir);
  await seedRegistry(registryPath);
  const server = createServer({ registryPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /health returns ok", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, service: "agentcart-registry" });
  });
});

test("GET /api/search returns recommendations", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent("10만원 이하 가죽지갑")}&budget=100000`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.results.length, 3);
    assert.equal(body.results[0].card.title, "블랙 소가죽 반지갑");
    assert.equal(body.disclosure.includes("커미션 링크"), true);
  });
});

test("GET /api/curators/:handle returns curator room", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/curators/wallet_curator`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.handle, "wallet_curator");
    assert.equal(body.cards.length >= 2, true);
  });
});

test("POST /api/feedback records feedback event", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cardId: "card_test",
        curatorHandle: "wallet_curator",
        helpful: true,
        linkMatchedExpectation: true,
        disclosureWasClear: true,
        comment: "좋았음",
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.event.curatorHandle, "wallet_curator");
  });
});
```

- [ ] **Step 2: Run API tests and verify failure**

Run:

```bash
npm test -- test/server.test.js
```

Expected: FAIL with `Cannot find module '../src/api/server.js'`.

- [ ] **Step 3: Implement API server**

Create `src/api/server.js`:

```js
import { createServer as createHttpServer } from "node:http";

import { createFeedbackEvent } from "../registry/feedback.js";
import { getCuratorRoom } from "../registry/curator.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import { loadRegistry, saveRegistry } from "../registry/store.js";

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer({ registryPath }) {
  return createHttpServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        sendJson(res, 200, { ok: true });
        return;
      }

      const url = new URL(req.url, "http://127.0.0.1");

      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { ok: true, service: "agentcart-registry" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/search") {
        const registry = await loadRegistry(registryPath);
        const query = url.searchParams.get("q") ?? "";
        const budget = Number(url.searchParams.get("budget") ?? 0);
        const results = searchCards(registry.cards, { query, budget });
        sendJson(res, 200, {
          disclosure: "아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.",
          responseText: formatRecommendationResponse(results, { query, budget }),
          results,
        });
        return;
      }

      const cardMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
      if (req.method === "GET" && cardMatch) {
        const registry = await loadRegistry(registryPath);
        const card = registry.cards.find((item) => item.id === cardMatch[1] || item.slug === cardMatch[1]);
        if (!card) {
          sendJson(res, 404, { error: "card_not_found" });
          return;
        }
        sendJson(res, 200, { card });
        return;
      }

      const curatorMatch = url.pathname.match(/^\/api\/curators\/([^/]+)$/);
      if (req.method === "GET" && curatorMatch) {
        const registry = await loadRegistry(registryPath);
        const room = getCuratorRoom(registry, decodeURIComponent(curatorMatch[1]));
        if (!room) {
          sendJson(res, 404, { error: "curator_not_found" });
          return;
        }
        sendJson(res, 200, room);
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/feedback") {
        const registry = await loadRegistry(registryPath);
        const event = createFeedbackEvent(await readJson(req));
        registry.feedbackEvents.push(event);
        await saveRegistry(registryPath, registry);
        sendJson(res, 201, { event });
        return;
      }

      sendJson(res, 404, { error: "not_found" });
    } catch (error) {
      sendJson(res, 500, {
        error: "internal_error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
```

- [ ] **Step 4: Run API tests**

Run:

```bash
npm test -- test/server.test.js
```

Expected: PASS for all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/api/server.js test/server.test.js
git commit -m "feat: add registry search API"
```

---

### Task 8: CLI Commands

**Files:**
- Create: `src/cli/commands.js`
- Modify: `cli.js`
- Create: `test/cli.test.js`

- [ ] **Step 1: Write CLI tests**

Create `test/cli.test.js`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { run } from "../src/cli/commands.js";

async function runCli(args, workDir) {
  const stdout = [];
  const stderr = [];
  const code = await run(args, {
    workDir,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  return { code, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
}

test("seed and search produce the leather wallet demo", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-cli-"));
  assert.equal((await runCli(["seed"], workDir)).code, 0);

  const result = await runCli(["search", "10만원 이하 가죽지갑", "--budget", "100000"], workDir);

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("블랙 소가죽 반지갑"), true);
  assert.equal(result.stdout.includes("커미션 링크"), true);
});

test("curator:room shows curator inventory", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-room-"));
  await runCli(["seed"], workDir);

  const result = await runCli(["curator:room", "wallet_curator"], workDir);

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("@wallet_curator"), true);
  assert.equal(result.stdout.includes("큐레이터 온도"), true);
});

test("submit adds a new commission link card", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-submit-"));
  const result = await runCli([
    "submit",
    "--title", "테스트 지갑",
    "--url", "https://link.coupang.com/a/testWallet",
    "--curator", "test_curator",
    "--category", "wallet",
    "--best-for", "테스트 선물,가죽지갑",
    "--not-for", "초슬림 선호",
    "--note", "테스트용 추천 카드",
  ], workDir);

  assert.equal(result.code, 0);
  assert.equal(result.stdout.includes("Registered card"), true);

  const raw = await readFile(join(workDir, ".agentcart/registry.json"), "utf8");
  assert.equal(raw.includes("테스트 지갑"), true);
});
```

- [ ] **Step 2: Run CLI tests and verify failure**

Run:

```bash
npm test -- test/cli.test.js
```

Expected: FAIL with `Cannot find module '../src/cli/commands.js'`.

- [ ] **Step 3: Implement CLI commands**

Create `src/cli/commands.js`:

```js
import { createServer } from "../api/server.js";
import { getCuratorRoom } from "../registry/curator.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import { addCard, loadRegistry, registryPathFor, seedRegistry } from "../registry/store.js";
import { writeSkill } from "../registry/skill.js";

function getFlag(args, name, fallback = undefined) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function printHelp(out) {
  out(`AgentCart CLI

Usage:
  agentcart seed
  agentcart serve [--port 8787]
  agentcart search "<query>" [--budget 100000]
  agentcart submit --title <title> --url <url> --curator <handle> --category <category> --best-for <csv> --not-for <csv> --note <text>
  agentcart curator:room <handle>
  agentcart install-skill --target generic|codex|claude|openclaw [--output <path>]
  agentcart open <slug> [--dry-run]
`);
}

export async function run(args, options = {}) {
  const workDir = options.workDir ?? process.cwd();
  const out = options.stdout ?? console.log;
  const err = options.stderr ?? console.error;
  const registryPath = registryPathFor(workDir);
  const command = args[0];

  if (!command || command === "help" || hasFlag(args, "--help")) {
    printHelp(out);
    return 0;
  }

  if (command === "seed") {
    const registry = await seedRegistry(registryPath);
    out(`Seeded ${registry.cards.length} AgentCart cards`);
    return 0;
  }

  if (command === "search") {
    const query = args[1] ?? "";
    const budget = Number(getFlag(args, "--budget", "0"));
    const registry = await loadRegistry(registryPath);
    const results = searchCards(registry.cards, { query, budget });
    out(formatRecommendationResponse(results, { query, budget }));
    return 0;
  }

  if (command === "submit") {
    const card = await addCard(registryPath, {
      title: getFlag(args, "--title"),
      originalUrl: getFlag(args, "--url"),
      curator: { handle: getFlag(args, "--curator") },
      category: getFlag(args, "--category", "general"),
      bestFor: getFlag(args, "--best-for", ""),
      notFor: getFlag(args, "--not-for", ""),
      curationNote: getFlag(args, "--note", ""),
      disclosureText: getFlag(args, "--disclosure", ""),
    });
    out(`Registered card: ${card.title} (${card.slug})`);
    return 0;
  }

  if (command === "curator:room") {
    const registry = await loadRegistry(registryPath);
    const room = getCuratorRoom(registry, args[1]);
    if (!room) {
      err("Curator room not found");
      return 1;
    }
    out(`@${room.handle} - ${room.displayName}`);
    out(`큐레이터 온도: ${room.trustTemperature}/100`);
    for (const card of room.cards) {
      out(`- ${card.title} [${card.platform}] ${card.slug}`);
    }
    return 0;
  }

  if (command === "install-skill") {
    const target = getFlag(args, "--target", "generic");
    const output = getFlag(args, "--output", "");
    const path = await writeSkill({ target, output, workDir });
    out(`Installed AgentCart skill: ${path}`);
    return 0;
  }

  if (command === "serve") {
    const port = Number(getFlag(args, "--port", "8787"));
    const server = createServer({ registryPath });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    out(`AgentCart registry API listening on http://127.0.0.1:${port}`);
    return 0;
  }

  err(`Unknown command: ${command}`);
  printHelp(err);
  return 1;
}
```

Modify `cli.js`:

```js
#!/usr/bin/env node
import { run } from "./src/cli/commands.js";

const code = await run(process.argv.slice(2));
process.exit(code);
```

- [ ] **Step 4: Run CLI tests**

Run:

```bash
npm test -- test/cli.test.js
```

Expected: FAIL only because `src/registry/skill.js` is not created yet.

- [ ] **Step 5: Commit after Task 9 creates skill.js**

Use Task 9's commit instead of committing this task in isolation, because `commands.js` imports `writeSkill`.

---

### Task 9: Agent Skill Generation

**Files:**
- Create: `src/registry/skill.js`
- Create: `skills/agentcart-shopping-skill.md`
- Create: `test/skill.test.js`
- Test: `test/cli.test.js`

- [ ] **Step 1: Write skill tests**

Create `test/skill.test.js`:

```js
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { makeSkillMarkdown, writeSkill } from "../src/registry/skill.js";

test("makeSkillMarkdown states the consumer viral protocol", () => {
  const markdown = makeSkillMarkdown({ target: "codex", apiBaseUrl: "http://127.0.0.1:8787" });

  assert.equal(markdown.includes("AgentCart는 커미션 링크 중심의 쇼핑 프로토콜입니다."), true);
  assert.equal(markdown.includes("추천 시작 전에 커미션 링크 고지를 먼저 표시하세요."), true);
  assert.equal(markdown.includes("최종 프론트엔드는 에이전트 채팅입니다."), true);
  assert.equal(markdown.includes("GET http://127.0.0.1:8787/api/search"), true);
});

test("writeSkill writes a target-specific skill file", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "agentcart-skill-"));
  const path = await writeSkill({ target: "claude", output: "", workDir });
  const body = await readFile(path, "utf8");

  assert.equal(path.endsWith(".agentcart/skills/agentcart-claude.md"), true);
  assert.equal(body.includes("AgentCart"), true);
});
```

- [ ] **Step 2: Run skill tests and verify failure**

Run:

```bash
npm test -- test/skill.test.js
```

Expected: FAIL with `Cannot find module '../src/registry/skill.js'`.

- [ ] **Step 3: Implement skill generation**

Create `src/registry/skill.js`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const TARGETS = new Set(["generic", "codex", "claude", "openclaw"]);

export function makeSkillMarkdown({ target = "generic", apiBaseUrl = "http://127.0.0.1:8787" } = {}) {
  if (!TARGETS.has(target)) throw new Error(`unsupported_skill_target: ${target}`);
  return `# AgentCart Shopping Skill

AgentCart는 커미션 링크 중심의 쇼핑 프로토콜입니다.
최종 프론트엔드는 에이전트 채팅입니다.

## When To Use

Use this skill when the user asks for product recommendations, gift ideas, shopping comparison, or asks to inspect a curator room.

## Core Promise

You are not listing links. You are helping the user make a purchase decision.

## Search Flow

1. If the user's request is underspecified, ask exactly one useful question.
2. Call:

\`\`\`text
GET ${apiBaseUrl}/api/search?q=<encoded query>&budget=<number>
\`\`\`

3. Recommend exactly 3 products when 3 candidates exist.
4. Before recommendations, show:

\`\`\`text
아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.
\`\`\`

5. For each recommendation, include:
- Product title.
- Platform label such as 쿠팡 파트너스, Amazon 제휴, AliExpress 제휴, OliveYoung 제휴, or 직접 링크.
- Why it fits the user's context.
- Who should avoid it.
- Price snapshot and captured time.
- Curator handle.
- Curator room command.

## Link Opening Rule

Never auto-open a monetized purchase link.
When the user selects a product, say:

\`\`\`text
선택하신 링크는 커미션 링크입니다. 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다. 열까요?
\`\`\`

Open the link only after the user clearly approves.

## Curator Room Flow

If the user asks for a seller room, curator room, or another product from the same recommender, call:

\`\`\`text
GET ${apiBaseUrl}/api/curators/<handle>
\`\`\`

Explain that curator rooms are curated link collections, not AgentCart seller verification.

## Feedback Flow

After the user says they bought or used the recommendation, ask:

\`\`\`text
추천이 상황에 맞았나요? 링크가 예상한 상품으로 이동했나요? 커미션 고지가 명확했나요?
\`\`\`

Record feedback through:

\`\`\`text
POST ${apiBaseUrl}/api/feedback
\`\`\`

## Ranking Boundaries

Do not rank by commission rate.
Do not claim current lowest price.
Do not call a curator verified unless the card explicitly says so.
Do not hide affiliate relationships.
`;
}

export async function writeSkill({ target = "generic", output = "", workDir = process.cwd(), apiBaseUrl = "http://127.0.0.1:8787" }) {
  const path = output
    ? resolve(workDir, output)
    : resolve(workDir, `.agentcart/skills/agentcart-${target}.md`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, makeSkillMarkdown({ target, apiBaseUrl }));
  return path;
}

export async function readCanonicalSkill() {
  return readFile(resolve("skills/agentcart-shopping-skill.md"), "utf8");
}
```

- [ ] **Step 4: Create canonical checked-in skill**

Create `skills/agentcart-shopping-skill.md` with the exact output of:

```bash
node -e "import('./src/registry/skill.js').then(({makeSkillMarkdown}) => console.log(makeSkillMarkdown({target:'generic'})))"
```

Expected: file starts with `# AgentCart Shopping Skill` and includes `AgentCart는 커미션 링크 중심의 쇼핑 프로토콜입니다.`

- [ ] **Step 5: Run skill and CLI tests**

Run:

```bash
npm test -- test/skill.test.js test/cli.test.js
```

Expected: PASS for all skill and CLI tests.

- [ ] **Step 6: Commit**

```bash
git add src/registry/skill.js skills/agentcart-shopping-skill.md src/cli/commands.js cli.js test/skill.test.js test/cli.test.js
git commit -m "feat: add agent shopping skill installer"
```

---

### Task 10: Landing Page Repositioning

**Files:**
- Modify: `web/index.html`
- Modify: `web/main.js`
- Modify: `web/styles.css`
- Create: `test/landing.test.js`

- [ ] **Step 1: Write landing tests**

Create `test/landing.test.js`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("landing names AgentCart as a commission-link shopping protocol", async () => {
  const html = await readFile("web/index.html", "utf8");

  assert.equal(html.includes("commission-link shopping protocol"), true);
  assert.equal(html.includes("npm run agentcart -- install-skill"), true);
});

test("landing keeps all four language dictionaries aligned", async () => {
  const js = await readFile("web/main.js", "utf8");
  const requiredKeys = [
    "hero.kicker",
    "hero.title1",
    "hero.title2",
    "hero.subtitle",
    "install.title",
    "install.command",
    "demo.chatUser",
    "demo.chatAgent",
  ];

  for (const key of requiredKeys) {
    const occurrences = js.match(new RegExp(`"${key}"`, "g")) ?? [];
    assert.equal(occurrences.length, 4, `${key} should exist in en, ko, zh, ja`);
  }
});
```

- [ ] **Step 2: Run landing tests and verify failure**

Run:

```bash
npm test -- test/landing.test.js
```

Expected: FAIL because the landing does not yet include `commission-link shopping protocol` or the new i18n keys.

- [ ] **Step 3: Update hero and install section**

Modify `web/index.html`:

```html
<meta
  name="description"
  content="AgentCart is an open-source commission-link shopping protocol for AI agents."
/>
<title>AgentCart - Commission-Link Shopping Protocol</title>
```

Change the hero copy keys so the rendered English text says:

```text
AgentCart is the commission-link shopping protocol for AI agents.
```

Add this section after the hero:

```html
<section id="install" class="panel install-panel">
  <div>
    <p class="section-kicker" data-i18n="install.kicker">Open-source skill</p>
    <h2 data-i18n="install.title">Install the shopping skill where your agent already lives.</h2>
    <p data-i18n="install.body">
      AgentCart's frontend is the agent chat. Install the skill, run the registry API,
      and let Claude, Codex, or OpenClaw recommend with disclosure and curator context.
    </p>
  </div>
  <div class="install-command">
    <code id="install-command" data-i18n="install.command">npm run agentcart -- install-skill --target codex</code>
    <button type="button" id="copy-install" data-i18n="install.copy">Copy install</button>
  </div>
</section>
```

Add this chat demo copy inside the existing demo section:

```html
<div class="chat-demo" aria-label="AgentCart recommendation demo">
  <p class="chat-line user" data-i18n="demo.chatUser">AgentCart로 10만원 이하 가죽지갑 추천해줘.</p>
  <p class="chat-line agent" data-i18n="demo.chatAgent">먼저 커미션 링크 고지를 표시하고, 맥락에 맞는 3개만 추천할게요.</p>
</div>
```

- [ ] **Step 4: Update language dictionaries and copy button**

Modify `web/main.js`:

```js
const copyInstallButton = document.querySelector("#copy-install");
const installCommand = document.querySelector("#install-command");
```

Add these keys to the English dictionary:

```js
"install.kicker": "Open-source skill",
"install.title": "Install the shopping skill where your agent already lives.",
"install.body": "AgentCart's frontend is the agent chat. Install the skill, run the registry API, and let Claude, Codex, or OpenClaw recommend with disclosure and curator context.",
"install.command": "npm run agentcart -- install-skill --target codex",
"install.copy": "Copy install",
"install.copied": "Install command copied",
"install.fallback": "Copy this command manually",
"demo.chatUser": "AgentCart로 10만원 이하 가죽지갑 추천해줘.",
"demo.chatAgent": "먼저 커미션 링크 고지를 표시하고, 맥락에 맞는 3개만 추천할게요."
```

Add these keys to the Korean dictionary:

```js
"install.kicker": "오픈소스 스킬",
"install.title": "에이전트가 이미 있는 채팅창에 쇼핑 스킬을 설치하세요.",
"install.body": "AgentCart의 최종 프론트엔드는 에이전트 채팅입니다. 스킬을 설치하고 registry API를 실행하면 Claude, Codex, OpenClaw가 고지와 큐레이터 맥락을 포함해 추천할 수 있습니다.",
"install.command": "npm run agentcart -- install-skill --target codex",
"install.copy": "설치 명령 복사",
"install.copied": "설치 명령 복사됨",
"install.fallback": "명령어를 직접 복사하세요",
"demo.chatUser": "AgentCart로 10만원 이하 가죽지갑 추천해줘.",
"demo.chatAgent": "먼저 커미션 링크 고지를 표시하고, 맥락에 맞는 3개만 추천할게요."
```

Add these keys to the Chinese dictionary:

```js
"install.kicker": "开源技能",
"install.title": "把购物技能装到你的智能体聊天里。",
"install.body": "AgentCart 的最终前端是智能体聊天。安装技能并运行 registry API 后，Claude、Codex 或 OpenClaw 可以带着披露信息和策展人上下文进行推荐。",
"install.command": "npm run agentcart -- install-skill --target codex",
"install.copy": "复制安装命令",
"install.copied": "安装命令已复制",
"install.fallback": "请手动复制此命令",
"demo.chatUser": "用 AgentCart 推荐 10 万韩元以内的皮钱包。",
"demo.chatAgent": "我会先披露佣金链接，再只推荐 3 个符合上下文的选择。"
```

Add these keys to the Japanese dictionary:

```js
"install.kicker": "オープンソーススキル",
"install.title": "エージェントがすでにいるチャットにショッピングスキルを入れる。",
"install.body": "AgentCart の最終フロントエンドはエージェントチャットです。スキルをインストールして registry API を動かすと、Claude、Codex、OpenClaw が開示とキュレーター文脈つきで推薦できます。",
"install.command": "npm run agentcart -- install-skill --target codex",
"install.copy": "インストールをコピー",
"install.copied": "インストールコマンドをコピーしました",
"install.fallback": "このコマンドを手動でコピーしてください",
"demo.chatUser": "AgentCartで10万ウォン以下の革財布をおすすめして。",
"demo.chatAgent": "まずコミッションリンクの開示を表示し、文脈に合う3件だけを推薦します。"
```

Add this listener:

```js
copyInstallButton?.addEventListener("click", async () => {
  const text = installCommand.textContent.trim();
  copyText(copyInstallButton, text, "install.copied", "install.fallback", "install.copy");
});
```

- [ ] **Step 5: Add install and chat styles**

Modify `web/styles.css` and add:

```css
.install-panel {
  align-items: center;
}

.install-command {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(18, 23, 31, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

.install-command code {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-demo {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.chat-line {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid rgba(18, 23, 31, 0.12);
  background: rgba(255, 255, 255, 0.7);
}

.chat-line.user {
  justify-self: end;
  max-width: 32rem;
}

.chat-line.agent {
  justify-self: start;
  max-width: 36rem;
}
```

- [ ] **Step 6: Run landing tests and build**

Run:

```bash
npm test -- test/landing.test.js
npm run build
```

Expected: landing tests PASS and Vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/main.js web/styles.css test/landing.test.js
git commit -m "copy: reposition landing around skill install"
```

---

### Task 11: Root README And Local Demo Script

**Files:**
- Create: `README.md`
- Modify: `web/README.md`

- [ ] **Step 1: Create root README**

Create `README.md`:

```md
# AgentCart

AgentCart is a commission-link shopping protocol for AI agents.

It lets curators register Coupang, Amazon, AliExpress, OliveYoung, and direct shopping links with context. AgentCart turns those links into agent-readable cards so Claude, Codex, OpenClaw, or another agent can recommend products with disclosure, curator reputation, price snapshots, and risk flags.

## Local MVP

```sh
npm install
npm run agentcart -- seed
npm run agentcart -- search "10만원 이하 가죽지갑" --budget 100000
npm run agentcart -- curator:room wallet_curator
npm run agentcart -- install-skill --target codex
npm run serve:registry
```

Registry API:

```text
GET http://127.0.0.1:8787/health
GET http://127.0.0.1:8787/api/search?q=10%EB%A7%8C%EC%9B%90%20%EC%9D%B4%ED%95%98%20%EA%B0%80%EC%A3%BD%EC%A7%80%EA%B0%91&budget=100000
GET http://127.0.0.1:8787/api/curators/wallet_curator
POST http://127.0.0.1:8787/api/feedback
```

## Product Boundary

- AgentCart does not sell the product.
- AgentCart does not hide commission links.
- AgentCart does not rank by commission rate.
- AgentCart does not claim current lowest price.
- AgentCart opens purchase links only after user approval.

## What Ships Today

- Local JSON registry.
- Seed commission-link cards.
- Keyword search and deterministic reranking.
- Curator rooms.
- Trust temperature.
- Recommendation feedback events.
- Node HTTP API.
- Agent skill markdown installer.
- Landing page install flow.

## Later

- Hosted DB.
- Vector search recall.
- LLM reranking with evals.
- Curator account login.
- Affiliate platform postbacks.
- Buyer purchase history with explicit user consent.
```

- [ ] **Step 2: Update web README**

Replace `web/README.md` with:

```md
# AgentCart Landing

Single-page landing site for installing the AgentCart open-source shopping skill.

## Run

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Build

```sh
npm run build
```

The production output is written to `web/dist/`.

## Registry Demo

```sh
npm run agentcart -- seed
npm run serve:registry
npm run agentcart -- install-skill --target codex
```
```

- [ ] **Step 3: Run docs-adjacent verification**

Run:

```bash
npm run agentcart -- help
npm run agentcart -- seed
npm run agentcart -- search "10만원 이하 가죽지갑" --budget 100000
npm run agentcart -- curator:room wallet_curator
npm run agentcart -- install-skill --target codex
```

Expected:

```text
Seeded 10 AgentCart cards
```

Search output includes:

```text
아래 추천에는 커미션 링크가 포함될 수 있으며
1. 블랙 소가죽 반지갑 [쿠팡 파트너스]
```

Curator output includes:

```text
@wallet_curator - 가죽소품 큐레이터
큐레이터 온도:
```

- [ ] **Step 4: Commit**

```bash
git add README.md web/README.md
git commit -m "docs: add AgentCart registry MVP usage"
```

---

### Task 12: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS across schema, store, recommendation, curator, feedback, server, CLI, skill, and landing tests.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: Vite build succeeds and writes `web/dist/`.

- [ ] **Step 3: Run the agent-chat demo from scratch**

Run:

```bash
rm -rf .agentcart
npm run agentcart -- seed
npm run agentcart -- search "10만원 이하 가죽지갑" --budget 100000
npm run agentcart -- curator:room wallet_curator
npm run agentcart -- install-skill --target codex
```

Expected search output includes:

```text
아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.

1. 블랙 소가죽 반지갑 [쿠팡 파트너스]
```

Expected skill output path:

```text
Installed AgentCart skill: /Users/baekjunho/project_dir/AgentCart/.agentcart/skills/agentcart-codex.md
```

- [ ] **Step 4: Run the API smoke test**

Start the server:

```bash
npm run serve:registry
```

In a second terminal:

```bash
curl 'http://127.0.0.1:8787/health'
curl 'http://127.0.0.1:8787/api/search?q=10%EB%A7%8C%EC%9B%90%20%EC%9D%B4%ED%95%98%20%EA%B0%80%EC%A3%BD%EC%A7%80%EA%B0%91&budget=100000'
curl 'http://127.0.0.1:8787/api/curators/wallet_curator'
```

Expected:

```text
{"ok":true,"service":"agentcart-registry"}
```

Search JSON includes `"블랙 소가죽 반지갑"`.

- [ ] **Step 5: Commit final verification note if any docs changed during verification**

If verification changes no tracked docs, do not create an empty commit. If README commands need correction, commit:

```bash
git add README.md web/README.md
git commit -m "docs: fix registry MVP verification commands"
```

---

## Out Of Scope Today

- Hosted production DB.
- Vector DB or embedding generation.
- LLM API calls inside the registry.
- Real affiliate platform conversion postbacks.
- OAuth or user accounts.
- Automated checkout or browser purchase flow.
- Public curator profile pages beyond agent-readable curator-room JSON.
- Legal approval of every affiliate program policy.

## Self-Review

**Spec coverage:** The plan covers local registry DB, search API, open-source skill install, CLI submission/search, curator room, reputation temperature, feedback events, landing install copy, and the core leather wallet demo.

**Placeholder scan:** This plan avoids undefined future work inside implementation tasks. Deferred scope is listed only in the "Out Of Scope Today" section with explicit items.

**Type consistency:** The public card fields are consistent across tasks: `id`, `slug`, `title`, `category`, `platform`, `originalUrl`, `finalUrl`, `commissionType`, `disclosureText`, `priceSnapshot`, `curator`, `bestFor`, `notFor`, `searchKeywords`, `curationNote`, `riskFlags`, `embeddingText`.

**Today success criteria:**

- `npm test` passes.
- `npm run build` passes.
- `npm run agentcart -- search "10만원 이하 가죽지갑" --budget 100000` returns a compelling 3-item recommendation.
- `npm run serve:registry` exposes `/api/search`.
- `npm run agentcart -- install-skill --target codex` writes a usable skill file.
- Landing page tells users to install the open-source skill, not to browse a shopping mall.
