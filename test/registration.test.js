import assert from "node:assert/strict";
import test from "node:test";

import {
  FREE_BETA_LIMITS,
  accountIdForEmail,
  entriesFromRegistrationDraft,
  normalizeAccountEmail,
  personasFromRegistrationDraft,
  validateRegistrationDraft,
} from "../src/registry/registration.js";

function makeEntry(index = 1, overrides = {}) {
  return {
    kind: "CurationEntry",
    title: `테스트 상품 ${index}`,
    originalUrl: `https://link.coupang.com/a/test${index}`,
    category: "grocery",
    curator: { handle: "junho-baek", displayName: "백준호" },
    bestFor: ["자취생 비상식량"],
    notFor: ["나트륨 민감"],
    curationNote: "보관하기 쉽고 빠르게 한 끼를 만들 수 있습니다.",
    disclosureHint:
      "쿠팡 파트너스 링크이며 구매 시 링크 등록자가 수수료를 받을 수 있습니다.",
    ...overrides,
  };
}

function makePersona(overrides = {}) {
  return {
    kind: "RecommenderPersona",
    handle: "junho-baek",
    displayName: "백준호",
    personaName: "자취생 생존 큐레이터 백준호",
    adviceMode: "insight_first",
    commercialRole: "affiliate_publisher",
    disclosurePolicy: {
      requiredDisclosureText:
        "추천에는 커미션 링크가 포함될 수 있으며 구매 시 수수료를 받을 수 있습니다.",
    },
    ...overrides,
  };
}

function makeDraft(overrides = {}) {
  return {
    kind: "AgentCartRegistrationDraft",
    accountEmail: " Creator@Example.COM ",
    personas: [makePersona()],
    entries: [makeEntry()],
    ...overrides,
  };
}

test("normalizes beta account email and derives a stable account id", () => {
  assert.equal(normalizeAccountEmail(" Creator@Example.COM "), "creator@example.com");
  assert.equal(accountIdForEmail(" Creator@Example.COM "), "acct_creator_example_com");
});

test("extracts personas and entries from registration drafts and arrays", () => {
  const draft = makeDraft();

  assert.equal(personasFromRegistrationDraft(draft).length, 1);
  assert.equal(entriesFromRegistrationDraft(draft).length, 1);
  assert.equal(personasFromRegistrationDraft([makePersona(), makeEntry()]).length, 1);
  assert.equal(entriesFromRegistrationDraft([makePersona(), makeEntry()]).length, 1);
});

test("validates a free beta registration draft within account limits", () => {
  assert.deepEqual(validateRegistrationDraft(makeDraft(), FREE_BETA_LIMITS), {
    ok: true,
    errors: [],
    accountEmail: "creator@example.com",
    entryCount: 1,
    personaCount: 1,
  });
});

test("requires account email before registration", () => {
  assert.deepEqual(validateRegistrationDraft(makeDraft({ accountEmail: "" })), {
    ok: false,
    errors: ["account_email_required"],
    accountEmail: "",
    entryCount: 1,
    personaCount: 1,
  });
});

test("rejects drafts above free beta entry and persona limits", () => {
  const tooManyEntries = Array.from({ length: 31 }, (_, index) => makeEntry(index + 1));
  const tooManyPersonas = [makePersona(), makePersona({ handle: "brand", personaName: "Brand" })];

  assert.deepEqual(validateRegistrationDraft(makeDraft({ entries: tooManyEntries })), {
    ok: false,
    errors: ["entry_limit_exceeded"],
    accountEmail: "creator@example.com",
    entryCount: 31,
    personaCount: 1,
  });
  assert.deepEqual(validateRegistrationDraft(makeDraft({ personas: tooManyPersonas })), {
    ok: false,
    errors: ["persona_limit_exceeded"],
    accountEmail: "creator@example.com",
    entryCount: 1,
    personaCount: 2,
  });
});

test("returns deterministic errors for unsafe curation entries", () => {
  const result = validateRegistrationDraft(
    makeDraft({
      entries: [
        makeEntry(1, {
          curator: { handle: "" },
          disclosureHint: "",
        }),
      ],
    })
  );

  assert.deepEqual(result, {
    ok: false,
    errors: ["entry_0_curator_handle_required", "entry_0_disclosure_required"],
    accountEmail: "creator@example.com",
    entryCount: 1,
    personaCount: 1,
  });
});
