import assert from "node:assert/strict";
import test from "node:test";

import { createFeedbackEvent, summarizeFeedback } from "../src/registry/feedback.js";

test("createFeedbackEvent records recommendation quality feedback with a compact timestamp id", () => {
  const event = createFeedbackEvent(
    {
      id: "fb_card_1_20260424000000",
      cardId: "card_1",
      curatorHandle: "wallet_curator",
      helpful: true,
      linkMatchedExpectation: false,
      disclosureWasClear: true,
      comment: "  recommendation was useful, product page differed  ",
    },
    new Date("2026-04-24T00:00:00.000Z")
  );

  assert.deepEqual(event, {
    id: "fb_card_1_20260424000000",
    cardId: "card_1",
    curatorHandle: "wallet_curator",
    helpful: true,
    linkMatchedExpectation: false,
    disclosureWasClear: true,
    comment: "recommendation was useful, product page differed",
    createdAt: "2026-04-24T00:00:00.000Z",
  });
});

test("createFeedbackEvent generates non-colliding default ids within the same second", () => {
  const now = new Date("2026-04-24T00:00:00.000Z");
  const first = createFeedbackEvent({
    cardId: "wallet-card",
    curatorHandle: "wallet_curator",
  }, now);
  const second = createFeedbackEvent({
    cardId: "wallet-card",
    curatorHandle: "wallet_curator",
  }, now);

  assert.notEqual(first.id, second.id);
  assert.match(first.id, /^fb_wallet-card_20260424000000_/);
  assert.match(second.id, /^fb_wallet-card_20260424000000_/);
});

test("createFeedbackEvent requires card id and curator handle", () => {
  assert.throws(
    () =>
      createFeedbackEvent({
        curatorHandle: "wallet_curator",
      }),
    /card_id_required/
  );
  assert.throws(
    () =>
      createFeedbackEvent({
        cardId: "wallet-card",
      }),
    /curator_handle_required/
  );
});

test("createFeedbackEvent normalizes curator handles without leading at signs", () => {
  const event = createFeedbackEvent(
    {
      cardId: "wallet-card",
      curatorHandle: "@wallet_curator",
      helpful: false,
    },
    new Date("2026-04-24T00:00:00.000Z")
  );

  assert.equal(event.curatorHandle, "wallet_curator");
});

test("createFeedbackEvent parses false-like boolean strings explicitly", () => {
  const event = createFeedbackEvent(
    {
      cardId: "wallet-card",
      curatorHandle: "wallet_curator",
      helpful: "false",
      linkMatchedExpectation: "0",
      disclosureWasClear: "no",
    },
    new Date("2026-04-24T00:00:00.000Z")
  );

  assert.equal(event.helpful, false);
  assert.equal(event.linkMatchedExpectation, false);
  assert.equal(event.disclosureWasClear, false);
});

test("createFeedbackEvent parses true-like boolean strings explicitly", () => {
  const trueForms = [true, "true", "1", "yes"];

  for (const value of trueForms) {
    const event = createFeedbackEvent(
      {
        cardId: "wallet-card",
        curatorHandle: "wallet_curator",
        helpful: value,
        linkMatchedExpectation: value,
        disclosureWasClear: value,
      },
      new Date("2026-04-24T00:00:00.000Z")
    );

    assert.equal(event.helpful, true);
    assert.equal(event.linkMatchedExpectation, true);
    assert.equal(event.disclosureWasClear, true);
  }
});

test("summarizeFeedback counts recommendation quality signals", () => {
  const summary = summarizeFeedback([
    {
      helpful: true,
      linkMatchedExpectation: true,
      disclosureWasClear: true,
    },
    {
      helpful: false,
      linkMatchedExpectation: true,
      disclosureWasClear: false,
    },
    {
      helpful: true,
      linkMatchedExpectation: false,
      disclosureWasClear: true,
    },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    helpful: 2,
    linkMatchedExpectation: 2,
    disclosureWasClear: 2,
  });
});
