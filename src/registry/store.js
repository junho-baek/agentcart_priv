import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCard, validateCard } from "./schema.js";

const SEED_CREATED_AT = "2026-04-24T00:00:00.000Z";
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(MODULE_DIR, "..", "..");
const SEED_CARDS_PATH = join(PROJECT_DIR, "data", "seed-cards.json");
const SEED_CURATOR_PERSONAS_PATH = join(PROJECT_DIR, "data", "seed-curator-personas.json");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nextTimestampAfter(previousTimestamp) {
  const now = new Date();
  const previousTime = Date.parse(previousTimestamp);

  if (Number.isFinite(previousTime) && now.getTime() <= previousTime) {
    return new Date(previousTime + 1).toISOString();
  }

  return now.toISOString();
}

function createStoredCard(input, createdAt) {
  const normalizedInput = {
    ...input,
    bestFor: normalizeList(input.bestFor),
    notFor: normalizeList(input.notFor),
    searchKeywords: normalizeList(input.searchKeywords),
    riskFlags: normalizeList(input.riskFlags),
    createdAt: createdAt ?? input.createdAt,
  };
  const card = createCard(normalizedInput);

  return {
    ...card,
    updatedAt: input.updatedAt ?? createdAt ?? card.createdAt,
    priceAmount: normalizedInput.priceAmount,
    currency: normalizedInput.currency,
    searchKeywords: normalizedInput.searchKeywords,
    riskFlags: normalizedInput.riskFlags,
  };
}

export function registryPathFor(workDir = process.cwd()) {
  const baseDir = isAbsolute(workDir) ? workDir : join(process.cwd(), workDir);

  return join(baseDir, ".agentcart", "registry.json");
}

export function createEmptyRegistry(now = new Date().toISOString()) {
  return {
    version: 1,
    cards: [],
    curatorPersonas: [],
    feedbackEvents: [],
    recommendationEvents: [],
    clickEvents: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeHandle(handle) {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "");
}

function createStoredCuratorPersona(input, createdAt) {
  return {
    handle: normalizeHandle(input.handle),
    displayName: String(input.displayName ?? "").trim(),
    personaName: String(input.personaName ?? "").trim(),
    tagline: String(input.tagline ?? "").trim(),
    greeting: String(input.greeting ?? "").trim(),
    adviceMode: String(input.adviceMode ?? "insight_first").trim(),
    commercialRole: String(input.commercialRole ?? "affiliate_publisher").trim(),
    voiceTraits: normalizeList(input.voiceTraits),
    curationPrinciples: normalizeList(input.curationPrinciples),
    defaultOneLiner: String(input.defaultOneLiner ?? "").trim(),
    categoryOneLiners:
      input.categoryOneLiners && typeof input.categoryOneLiners === "object"
        ? input.categoryOneLiners
        : {},
    disclosureText: String(input.disclosureText ?? "").trim(),
    firstPartyPriority: Boolean(input.firstPartyPriority),
    competitorInclusionPolicy: String(input.competitorInclusionPolicy ?? "may_include").trim(),
    sponsoredCampaign: input.sponsoredCampaign ?? false,
    officialBrandPersona: Boolean(input.officialBrandPersona),
    conflictPolicy: String(input.conflictPolicy ?? "").trim(),
    createdAt: input.createdAt ?? createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}

export async function loadRegistry(path = registryPathFor()) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return createEmptyRegistry();
    }

    throw error;
  }
}

export async function saveRegistry(path, registry) {
  const registryToSave = {
    ...registry,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(registryToSave, null, 2)}\n`, "utf8");

  return registryToSave;
}

export async function addCard(path, input) {
  const registry = await loadRegistry(path);
  let card = createStoredCard(input);
  const { ok, errors } = validateCard(card);

  if (!ok) {
    throw new Error(`Invalid card: ${errors.join(", ")}`);
  }

  const existingIndex = registry.cards.findIndex(
    (existingCard) => existingCard.id === card.id || existingCard.slug === card.slug
  );

  if (existingIndex === -1) {
    registry.cards.push(card);
  } else {
    const existingCard = registry.cards[existingIndex];
    card = {
      ...card,
      id: existingCard.id,
      createdAt: existingCard.createdAt,
      updatedAt: nextTimestampAfter(existingCard.updatedAt ?? existingCard.createdAt),
    };
    registry.cards[existingIndex] = card;
  }

  await saveRegistry(path, registry);

  return card;
}

export async function addCuratorPersona(path, input) {
  const registry = await loadRegistry(path);
  const createdAt = new Date().toISOString();
  let persona = createStoredCuratorPersona(input, createdAt);

  if (!persona.handle) {
    throw new Error("Invalid curator persona: handle_required");
  }

  if (!persona.personaName) {
    throw new Error("Invalid curator persona: persona_name_required");
  }

  const curatorPersonas = Array.isArray(registry.curatorPersonas)
    ? registry.curatorPersonas
    : [];
  const existingIndex = curatorPersonas.findIndex(
    (existingPersona) => normalizeHandle(existingPersona.handle) === persona.handle
  );

  if (existingIndex === -1) {
    curatorPersonas.push(persona);
  } else {
    const existingPersona = curatorPersonas[existingIndex];
    persona = {
      ...persona,
      createdAt: existingPersona.createdAt,
      updatedAt: nextTimestampAfter(existingPersona.updatedAt ?? existingPersona.createdAt),
    };
    curatorPersonas[existingIndex] = persona;
  }

  registry.curatorPersonas = curatorPersonas;
  await saveRegistry(path, registry);

  return persona;
}

export async function seedRegistry(path = registryPathFor(), options = {}) {
  const seedCards =
    options.seedItems ?? JSON.parse(await readFile(SEED_CARDS_PATH, "utf8"));
  const seedCuratorPersonas =
    options.seedCuratorPersonas ??
    JSON.parse(await readFile(SEED_CURATOR_PERSONAS_PATH, "utf8"));
  const validatedSeedCards = seedCards.map((seedCard, index) => {
    const card = createStoredCard(seedCard, SEED_CREATED_AT);
    const { ok, errors } = validateCard(card);

    if (!ok) {
      throw new Error(`Invalid seed card at index ${index}: ${errors.join(", ")}`);
    }

    return card;
  });
  const registry = await loadRegistry(path);
  const existingCards = Array.isArray(registry.cards) ? registry.cards : [];
  const cards = [...existingCards];
  const existingCuratorPersonas = Array.isArray(registry.curatorPersonas)
    ? registry.curatorPersonas
    : [];
  const curatorPersonas = [...existingCuratorPersonas];

  for (const seedCard of validatedSeedCards) {
    const existingIndex = cards.findIndex(
      (existingCard) =>
        existingCard.id === seedCard.id || existingCard.slug === seedCard.slug
    );

    if (existingIndex === -1) {
      cards.push(seedCard);
      continue;
    }

    const existingCard = cards[existingIndex];
    cards[existingIndex] = {
      ...seedCard,
      id: existingCard.id,
      createdAt: existingCard.createdAt,
      updatedAt: nextTimestampAfter(existingCard.updatedAt ?? existingCard.createdAt),
    };
  }

  registry.cards = cards;
  for (const seedCuratorPersona of seedCuratorPersonas.map((persona) =>
    createStoredCuratorPersona(persona, SEED_CREATED_AT)
  )) {
    const existingIndex = curatorPersonas.findIndex(
      (persona) => normalizeHandle(persona.handle) === seedCuratorPersona.handle
    );

    if (existingIndex === -1) {
      curatorPersonas.push(seedCuratorPersona);
      continue;
    }

    const existingPersona = curatorPersonas[existingIndex];
    curatorPersonas[existingIndex] = {
      ...seedCuratorPersona,
      createdAt: existingPersona.createdAt ?? seedCuratorPersona.createdAt,
      updatedAt: nextTimestampAfter(existingPersona.updatedAt ?? existingPersona.createdAt),
    };
  }

  registry.curatorPersonas = curatorPersonas;
  registry.feedbackEvents = Array.isArray(registry.feedbackEvents)
    ? registry.feedbackEvents
    : [];
  registry.recommendationEvents = Array.isArray(registry.recommendationEvents)
    ? registry.recommendationEvents
    : [];
  registry.clickEvents = Array.isArray(registry.clickEvents) ? registry.clickEvents : [];

  return saveRegistry(path, registry);
}
