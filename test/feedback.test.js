import assert from "node:assert/strict";
import test from "node:test";

import { createFeedbackEvent, summarizeFeedback } from "../src/registry/feedback.js";

test("createFeedbackEvent records recommendation quality feedback with a compact timestamp id", () => {
  const event = createFeedbackEvent(
    {
      cardId: "wallet-card",
      curatorHandle: "wallet_curator",
      helpful: true,
      linkMatchedExpectation: false,
      disclosureWasClear: true,
      comment: "  recommendation was useful, product page differed  ",
    },
    new Date("2026-04-24T00:00:00.000Z")
  );

  assert.deepEqual(event, {
    id: "fb_wallet-card_20260424000000",
    cardId: "wallet-card",
    curatorHandle: "wallet_curator",
    helpful: true,
    linkMatchedExpectation: false,
    disclosureWasClear: true,
    comment: "recommendation was useful, product page differed",
    createdAt: "2026-04-24T00:00:00.000Z",
  });
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
