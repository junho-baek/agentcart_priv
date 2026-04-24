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

export function createFeedbackEvent(input, now = new Date()) {
  const cardId = String(input?.cardId ?? "").trim();
  const curatorHandle = normalizeHandle(input?.curatorHandle);

  if (!cardId) {
    throw new Error("card_id_required");
  }

  if (!curatorHandle) {
    throw new Error("curator_handle_required");
  }

  return {
    id: `fb_${cardId}_${compactTimestamp(now)}`,
    cardId,
    curatorHandle,
    helpful: Boolean(input?.helpful),
    linkMatchedExpectation: Boolean(input?.linkMatchedExpectation),
    disclosureWasClear: Boolean(input?.disclosureWasClear),
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
