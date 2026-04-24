function normalizeHandle(handle) {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "");
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function hasDisclosure(card) {
  return hasText(card?.disclosure) || hasText(card?.disclosureText);
}

function hasContext(card) {
  return (
    normalizeList(card?.bestFor).length > 0 &&
    normalizeList(card?.notFor).length > 0 &&
    hasText(card?.curationNote)
  );
}

function clampTemperature(value) {
  return Math.max(0, Math.min(100, value));
}

function priceSnapshotFor(card) {
  if (card?.priceSnapshot !== undefined) {
    return card.priceSnapshot;
  }

  const priceAmount = Number(card?.priceAmount);

  if (!Number.isFinite(priceAmount)) {
    return undefined;
  }

  const currency = hasText(card?.currency) ? ` ${card.currency}` : "";

  return `${priceAmount.toLocaleString("ko-KR")}${currency}`;
}

function verifiedViolationCountFor(registry, handle) {
  if (Number.isFinite(Number(registry?.verifiedViolationCount))) {
    return Number(registry.verifiedViolationCount);
  }

  if (!Array.isArray(registry?.verifiedViolations)) {
    return 0;
  }

  return registry.verifiedViolations.filter(
    (violation) => normalizeHandle(violation?.curatorHandle) === handle
  ).length;
}

export function calculateTrustTemperature({
  cards,
  feedbackEvents = [],
  verifiedViolationCount = 0,
}) {
  const curatorCards = Array.isArray(cards) ? cards : [];
  const feedback = Array.isArray(feedbackEvents) ? feedbackEvents : [];
  const baselineScore = 5;
  const disclosureScore =
    curatorCards.length > 0 && curatorCards.every(hasDisclosure) ? 25 : 10;
  const contextScore = curatorCards.length > 0 && curatorCards.every(hasContext) ? 25 : 10;
  const noRiskCards = curatorCards.filter((card) => normalizeList(card?.riskFlags).length === 0);
  const riskScore =
    curatorCards.length > 0 ? Math.round((noRiskCards.length / curatorCards.length) * 20) : 0;
  const feedbackScore =
    feedback.length > 0
      ? Math.round((feedback.filter((event) => event?.helpful).length / feedback.length) * 20)
      : 15;
  const violationPenalty = Math.min(30, Number(verifiedViolationCount) * 10 || 0);

  return clampTemperature(
    baselineScore + disclosureScore + contextScore + riskScore + feedbackScore - violationPenalty
  );
}

export function getCuratorRoom(registry, handle) {
  const normalizedHandle = normalizeHandle(handle);
  const cards = Array.isArray(registry?.cards) ? registry.cards : [];
  const curatorCards = cards.filter(
    (card) => normalizeHandle(card?.curator?.handle) === normalizedHandle
  );

  if (!normalizedHandle || curatorCards.length === 0) {
    return null;
  }

  const feedbackEvents = (Array.isArray(registry?.feedbackEvents) ? registry.feedbackEvents : []).filter(
    (event) => normalizeHandle(event?.curatorHandle) === normalizedHandle
  );
  const firstCard = curatorCards[0];

  return {
    handle: normalizedHandle,
    displayName: firstCard.curator?.displayName ?? normalizedHandle,
    roomSlug: normalizedHandle,
    trustTemperature: calculateTrustTemperature({
      cards: curatorCards,
      feedbackEvents,
      verifiedViolationCount: verifiedViolationCountFor(registry, normalizedHandle),
    }),
    cards: curatorCards.map((card) => ({
      id: card.id,
      slug: card.slug,
      title: card.title,
      platform: card.platform,
      priceSnapshot: priceSnapshotFor(card),
      bestFor: normalizeList(card.bestFor),
      notFor: normalizeList(card.notFor),
      riskFlags: normalizeList(card.riskFlags),
    })),
  };
}
