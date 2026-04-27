export const FREE_BETA_LIMITS = {
  maxPersonas: 1,
  maxEntries: 30,
};

export function normalizeAccountEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function accountIdForEmail(email) {
  const normalizedEmail = normalizeAccountEmail(email);

  return `acct_${normalizedEmail.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function entryDisclosure(entry) {
  return String(entry?.disclosureHint ?? entry?.disclosure ?? "").trim();
}

export function entriesFromRegistrationDraft(draft) {
  if (Array.isArray(draft)) {
    return draft.filter((item) => item?.kind === "CurationEntry" || item?.title);
  }

  if (draft?.kind === "CurationEntry") {
    return [draft];
  }

  return [
    ...toArray(draft?.entries),
    ...toArray(draft?.curationEntries),
  ].filter((entry) => entry?.kind === "CurationEntry" || entry?.title);
}

export function personasFromRegistrationDraft(draft) {
  if (Array.isArray(draft)) {
    return draft.filter((item) => item?.kind === "RecommenderPersona" || item?.handle);
  }

  if (draft?.kind === "RecommenderPersona") {
    return [draft];
  }

  return [
    ...toArray(draft?.personas),
    ...toArray(draft?.recommenderPersonas),
  ].filter((persona) => persona?.kind === "RecommenderPersona" || persona?.handle);
}

export function validateRegistrationDraft(draft, options = {}) {
  const limits = {
    ...FREE_BETA_LIMITS,
    ...options,
  };
  const errors = [];
  const accountEmail = normalizeAccountEmail(options.accountEmail ?? draft?.accountEmail);
  const entries = entriesFromRegistrationDraft(draft);
  const personas = personasFromRegistrationDraft(draft);

  if (!accountEmail) {
    errors.push("account_email_required");
  }

  if (personas.length > limits.maxPersonas) {
    errors.push("persona_limit_exceeded");
  }

  if (entries.length > limits.maxEntries) {
    errors.push("entry_limit_exceeded");
  }

  entries.forEach((entry, index) => {
    if (!hasText(entry?.curator?.handle ?? entry?.curatorHandle)) {
      errors.push(`entry_${index}_curator_handle_required`);
    }

    if (!entryDisclosure(entry)) {
      errors.push(`entry_${index}_disclosure_required`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    accountEmail,
    entryCount: entries.length,
    personaCount: personas.length,
  };
}

export function cardInputFromCurationEntry(entry) {
  return {
    title: entry.title,
    originalUrl: entry.originalUrl ?? entry.productUrl,
    curator: {
      handle: entry.curator?.handle ?? entry.curatorHandle,
      displayName: entry.curator?.displayName ?? entry.curatorDisplayName,
    },
    category: entry.category,
    bestFor: entry.bestFor ?? entry.fit,
    notFor: entry.notFor ?? entry.avoid,
    curationNote: entry.curationNote ?? entry.recommendationReason ?? entry.note,
    disclosure: entry.disclosureHint ?? entry.disclosure,
    priceAmount: entry.priceAmount,
    currency: entry.currency,
    searchKeywords: entry.searchKeywords,
    riskFlags: entry.riskFlags,
    accountEmail: entry.accountEmail,
    visibility: entry.visibility,
    publicationStatus: entry.publicationStatus,
  };
}

export function personaInputFromRecommenderPersona(persona) {
  return {
    handle: persona.handle,
    displayName: persona.displayName,
    personaName: persona.personaName,
    tagline: persona.tagline,
    greeting: persona.greeting,
    adviceMode: persona.adviceMode,
    commercialRole: persona.commercialRole,
    voiceTraits: persona.voiceTraits,
    curationPrinciples: persona.curationPrinciples,
    defaultOneLiner: persona.defaultOneLiner,
    categoryOneLiners: persona.categoryOneLiners,
    disclosureText:
      persona.disclosureText ?? persona.disclosurePolicy?.requiredDisclosureText,
    accountEmail: persona.accountEmail,
    firstPartyPriority: persona.disclosurePolicy?.firstPartyPriority,
    competitorInclusionPolicy: persona.disclosurePolicy?.competitorInclusionPolicy,
    sponsoredCampaign: persona.disclosurePolicy?.sponsoredCampaign,
    officialBrandPersona: persona.disclosurePolicy?.officialBrandPersona,
    conflictPolicy: persona.conflictPolicy,
  };
}
