import { randomUUID } from "node:crypto";

function compactTimestamp(date) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (number) => String(number).padStart(2, "0");

  return [
    value.getUTCFullYear(),
    pad(value.getUTCMonth() + 1),
    pad(value.getUTCDate()),
    pad(value.getUTCHours()),
    pad(value.getUTCMinutes()),
    pad(value.getUTCSeconds()),
  ].join("");
}

function normalizeHandle(handle) {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "");
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalizedValue)) {
    return false;
  }

  return false;
}

export function createFeedbackEvent(input, now = new Date()) {
  const cardId = String(input?.cardId ?? "").trim();
  const curatorHandle = normalizeHandle(input?.curatorHandle);
  const timestamp = compactTimestamp(now);

  if (!cardId) {
    throw new Error("card_id_required");
  }

  if (!curatorHandle) {
    throw new Error("curator_handle_required");
  }

  return {
    id: input?.id ?? `fb_${cardId}_${timestamp}_${randomUUID()}`,
    cardId,
    curatorHandle,
    helpful: parseBoolean(input?.helpful),
    linkMatchedExpectation: parseBoolean(input?.linkMatchedExpectation),
    disclosureWasClear: parseBoolean(input?.disclosureWasClear),
    comment: String(input?.comment ?? "").trim(),
    createdAt: (now instanceof Date ? now : new Date(now)).toISOString(),
  };
}

export function summarizeFeedback(events) {
  const feedbackEvents = Array.isArray(events) ? events : [];

  return feedbackEvents.reduce(
    (summary, event) => ({
      total: summary.total + 1,
      helpful: summary.helpful + (event?.helpful ? 1 : 0),
      linkMatchedExpectation:
        summary.linkMatchedExpectation + (event?.linkMatchedExpectation ? 1 : 0),
      disclosureWasClear: summary.disclosureWasClear + (event?.disclosureWasClear ? 1 : 0),
    }),
    {
      total: 0,
      helpful: 0,
      linkMatchedExpectation: 0,
      disclosureWasClear: 0,
    }
  );
}
