const KNOWN_KINDS = new Set([
  "CurationEntry",
  "RecommenderPersona",
  "AgentProductContext",
]);

const DEFAULT_PROHIBITED_CLAIMS = [
  "lowest_price",
  "live_stock",
  "seller_verified",
  "warranty_verified",
  "medical_or_health_effect",
];

const DEFAULT_ALLOWED_ACTIONS = [
  "explain",
  "compare_registered_cards",
  "show_link_after_disclosure",
  "ask_before_opening",
  "handoff_to_purchase_assist",
];

function normalizeList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

export function normalizeHandle(handle) {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "");
}

function priceSnapshotFor(card) {
  if (card?.priceSnapshot !== undefined) {
    return card.priceSnapshot;
  }

  const amount = Number(card?.priceAmount);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  const currency = hasText(card?.currency) ? ` ${card.currency}` : "";

  return `${amount.toLocaleString("ko-KR")}${currency}`;
}

function relationshipTypeFor({ card, persona } = {}) {
  const role = String(persona?.commercialRole ?? "").trim();

  if (role === "brand_official") {
    return "official_brand";
  }

  if (role === "merchant") {
    return "merchant";
  }

  if (role === "sponsored_campaign") {
    return "sponsored";
  }

  if (hasText(card?.disclosure) || hasText(persona?.disclosureText)) {
    return "affiliate";
  }

  return "unknown";
}

export function buildCurationEntry(card) {
  const curatorHandle = normalizeHandle(card?.curator?.handle);

  return {
    kind: "CurationEntry",
    id: String(card?.id ?? card?.slug ?? "").trim(),
    title: String(card?.title ?? "").trim(),
    originalUrl: String(card?.originalUrl ?? "").trim(),
    platform: String(card?.platform ?? "unknown").trim(),
    category: String(card?.category ?? "").trim(),
    curator: {
      handle: curatorHandle,
      displayName: String(card?.curator?.displayName ?? curatorHandle).trim(),
    },
    priceSnapshot: priceSnapshotFor(card),
    bestFor: normalizeList(card?.bestFor),
    notFor: normalizeList(card?.notFor),
    searchKeywords: normalizeList(card?.searchKeywords),
    campaignHandle: String(card?.campaignHandle ?? "").trim(),
    curationNote: String(card?.curationNote ?? "").trim(),
    curatorOneLiner: String(card?.curatorOneLiner ?? "").trim(),
    claimNotes: normalizeList(card?.claimNotes),
    riskFlags: normalizeList(card?.riskFlags),
    disclosureHint: String(card?.disclosure ?? card?.disclosureText ?? "").trim(),
    sourceMetadata: {
      cardSlug: String(card?.slug ?? "").trim(),
      createdAt: card?.createdAt,
      updatedAt: card?.updatedAt,
    },
  };
}

export function buildRecommenderPersona(persona = {}) {
  const handle = normalizeHandle(persona.handle);
  const relationshipType = relationshipTypeFor({ persona });
  const requiredDisclosureText = String(persona.disclosureText ?? "").trim();

  return {
    kind: "RecommenderPersona",
    handle,
    displayName: String(persona.displayName ?? handle).trim(),
    personaName: String(persona.personaName ?? persona.displayName ?? handle).trim(),
    tagline: String(persona.tagline ?? "").trim(),
    greeting: String(persona.greeting ?? "").trim(),
    adviceMode: String(persona.adviceMode ?? "insight_first").trim(),
    commercialRole: String(persona.commercialRole ?? "affiliate_publisher").trim(),
    voiceTraits: normalizeList(persona.voiceTraits),
    expertise: persona.expertise && typeof persona.expertise === "object" ? persona.expertise : {},
    worldview: String(persona.worldview ?? "").trim(),
    curationPrinciples: normalizeList(persona.curationPrinciples),
    defaultOneLiner: String(persona.defaultOneLiner ?? "").trim(),
    disclosurePolicy: {
      relationshipType,
      requiredDisclosureText,
      linkRegistrant: handle,
      firstPartyPriority: Boolean(persona.firstPartyPriority),
      competitorInclusionPolicy: String(persona.competitorInclusionPolicy ?? "may_include").trim(),
      sponsoredCampaign: persona.sponsoredCampaign ?? false,
      officialBrandPersona:
        Boolean(persona.officialBrandPersona) ||
        String(persona.commercialRole ?? "") === "brand_official",
    },
    conflictPolicy: String(persona.conflictPolicy ?? "").trim(),
  };
}

export function buildAgentProductContext(card, { persona } = {}) {
  const curationEntry = buildCurationEntry(card);
  const recommenderPersona = persona ? buildRecommenderPersona(persona) : null;
  const relationshipType = relationshipTypeFor({ card, persona: recommenderPersona });
  const requiredDisclosureText =
    String(card?.disclosure ?? "").trim() ||
    String(recommenderPersona?.disclosurePolicy?.requiredDisclosureText ?? "").trim();

  return {
    kind: "AgentProductContext",
    contextId: `context-${curationEntry.id || curationEntry.sourceMetadata.cardSlug}`,
    product: {
      title: curationEntry.title,
      platform: curationEntry.platform,
      category: curationEntry.category,
      priceSnapshot: curationEntry.priceSnapshot,
    },
    links: {
      originalUrl: curationEntry.originalUrl,
      relationshipType,
    },
    recommendationContext: {
      campaignHandle: curationEntry.campaignHandle,
      curationNote: curationEntry.curationNote,
      curatorOneLiner:
        curationEntry.curatorOneLiner || String(recommenderPersona?.defaultOneLiner ?? "").trim(),
      searchKeywords: curationEntry.searchKeywords,
    },
    recommender: {
      handle: curationEntry.curator.handle,
      displayName: recommenderPersona?.displayName ?? curationEntry.curator.displayName,
      personaName: recommenderPersona?.personaName,
      commercialRole: recommenderPersona?.commercialRole ?? "affiliate_publisher",
      adviceMode: recommenderPersona?.adviceMode ?? "insight_first",
    },
    disclosure: {
      relationshipType,
      requiredDisclosureText,
      firstPartyPriority: Boolean(recommenderPersona?.disclosurePolicy?.firstPartyPriority),
      competitorInclusionPolicy:
        recommenderPersona?.disclosurePolicy?.competitorInclusionPolicy ?? "may_include",
    },
    fitRules: {
      bestFor: curationEntry.bestFor,
      notFor: curationEntry.notFor,
    },
    risk: {
      riskFlags: curationEntry.riskFlags,
      claimNotes: curationEntry.claimNotes,
      prohibitedClaims: DEFAULT_PROHIBITED_CLAIMS,
    },
    allowedActions: DEFAULT_ALLOWED_ACTIONS,
    freshness: {
      sourceCreatedAt: curationEntry.sourceMetadata.createdAt,
      sourceUpdatedAt: curationEntry.sourceMetadata.updatedAt,
    },
  };
}

export function validateProtocolObject(object) {
  const errors = [];
  const kind = String(object?.kind ?? "").trim();

  if (!KNOWN_KINDS.has(kind)) {
    errors.push("unknown_kind");
    return { ok: false, errors };
  }

  if (kind === "CurationEntry") {
    if (!hasText(object.id)) errors.push("id_required");
    if (!hasText(object.title)) errors.push("title_required");
    if (!hasText(object.originalUrl)) errors.push("original_url_required");
    if (!hasText(object.curator?.handle)) errors.push("curator_handle_required");
  }

  if (kind === "RecommenderPersona") {
    if (!hasText(object.handle)) errors.push("handle_required");
    if (!hasText(object.personaName)) errors.push("persona_name_required");
    if (!hasText(object.adviceMode)) errors.push("advice_mode_required");
    if (!hasText(object.commercialRole)) errors.push("commercial_role_required");
  }

  if (kind === "AgentProductContext") {
    if (!hasText(object.contextId)) errors.push("context_id_required");
    if (!hasText(object.product?.title)) errors.push("product_title_required");
    if (!hasText(object.links?.originalUrl)) errors.push("original_url_required");
    if (!hasText(object.recommender?.handle)) errors.push("recommender_handle_required");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
