import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCard, validateCard } from "./schema.js";

const SEED_CREATED_AT = "2026-04-24T00:00:00.000Z";
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(MODULE_DIR, "..", "..");
const SEED_CARDS_PATH = join(PROJECT_DIR, "data", "seed-cards.json");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const card = createStoredCard(input);
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
    registry.cards[existingIndex] = card;
  }

  await saveRegistry(path, registry);

  return card;
}

export async function seedRegistry(path = registryPathFor()) {
  const seedCards = JSON.parse(await readFile(SEED_CARDS_PATH, "utf8"));
  const registry = createEmptyRegistry(SEED_CREATED_AT);
  registry.cards = seedCards.map((seedCard) => createStoredCard(seedCard, SEED_CREATED_AT));

  return saveRegistry(path, registry);
}
