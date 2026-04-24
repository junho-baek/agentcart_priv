import { randomUUID } from "node:crypto";

const COUPANG_DISCLOSURE =
  "구매 시 링크 등록자가 쿠팡 파트너스 활동에 따른 일정액의 수수료를 받을 수 있습니다.";

const AMAZON_DISCLOSURE =
  "As an Amazon Associate, the link registrant may earn from qualifying purchases.";

const PLATFORM_DISCLOSURES = {
  coupang: COUPANG_DISCLOSURE,
  amazon: AMAZON_DISCLOSURE,
};

export function detectPlatform(originalUrl) {
  let url;

  try {
    url = new URL(originalUrl);
  } catch {
    return "unknown";
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "link.coupang.com" || hostname.endsWith(".coupang.com")) {
    return "coupang";
  }

  if (hostname === "amazon.com" || hostname.endsWith(".amazon.com")) {
    return "amazon";
  }

  if (hostname === "aliexpress.com" || hostname.endsWith(".aliexpress.com")) {
    return "aliexpress";
  }

  if (hostname === "oliveyoung.co.kr" || hostname.endsWith(".oliveyoung.co.kr")) {
    return "oliveyoung";
  }

  return "direct";
}

export function normalizeDisclosure(platform, disclosure = "") {
  const trimmedDisclosure = String(disclosure ?? "").trim();

  if (trimmedDisclosure) {
    return trimmedDisclosure;
  }

  return PLATFORM_DISCLOSURES[platform] ?? "";
}

export function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export function buildEmbeddingText(card) {
  const bestFor = normalizeArray(card.bestFor);
  const notFor = normalizeArray(card.notFor);
  const parts = [
    `${String(card.title ?? "").trim()}.`,
    `category: ${String(card.category ?? "").trim()}.`,
    `platform: ${String(card.platform ?? "").trim()}.`,
    `best for: ${bestFor.join(", ")}.`,
    `not for: ${notFor.join(", ")}.`,
    `note: ${String(card.curationNote ?? "").trim()}.`,
  ];

  return parts.join(" ");
}

export function validateCard(card) {
  const errors = [];
  const originalUrl = String(card?.originalUrl ?? "").trim();

  if (!String(card?.title ?? "").trim()) {
    errors.push("title_required");
  }

  if (!originalUrl) {
    errors.push("original_url_required");
  } else {
    try {
      new URL(originalUrl);
    } catch {
      errors.push("valid_url_required");
    }
  }

  if (!String(card?.curator?.handle ?? "").trim()) {
    errors.push("curator_handle_required");
  }

  if (normalizeArray(card?.bestFor).length === 0) {
    errors.push("best_for_required");
  }

  if (normalizeArray(card?.notFor).length === 0) {
    errors.push("not_for_required");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\u0000-\u007F]/g, (character) => {
      if (!/\p{Script=Latin}/u.test(character)) {
        return character;
      }

      return character.normalize("NFKD");
    })
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createCard(input) {
  const platform = input.platform ?? detectPlatform(input.originalUrl);
  const card = {
    id: input.id ?? randomUUID(),
    title: String(input.title ?? "").trim(),
    slug: input.slug ?? slugify(input.title),
    originalUrl: String(input.originalUrl ?? "").trim(),
    platform,
    category: String(input.category ?? "").trim(),
    curator: {
      ...input.curator,
      handle: String(input.curator?.handle ?? "").trim(),
    },
    bestFor: normalizeArray(input.bestFor),
    notFor: normalizeArray(input.notFor),
    curationNote: String(input.curationNote ?? "").trim(),
    disclosure: normalizeDisclosure(platform, input.disclosure),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  return {
    ...card,
    embeddingText: buildEmbeddingText(card),
  };
}
