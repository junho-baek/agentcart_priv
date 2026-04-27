const COMMISSION_DISCLOSURE =
  "아래 추천에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 일정액의 수수료를 받을 수 있습니다.";

const RISK_PENALTIES = {
  delivery_uncertainty: -8,
  health_claim_sensitive: -10,
  missing_disclosure: -40,
  non_https_url: -50,
};

const TOKEN_SYNONYMS = {
  leather: ["가죽"],
  wallet: ["지갑"],
  가죽: ["leather"],
  지갑: ["wallet"],
};

const AFFILIATE_PLATFORMS = new Set(["amazon", "coupang"]);
const QUERY_COMPOUND_NORMALIZATIONS = new Map([["가죽지갑", "가죽 지갑"]]);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPresent(value) {
  return String(value ?? "").trim().length > 0;
}

function normalizeHandle(handle) {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "");
}

function expandTokens(tokens) {
  const expandedTokens = new Set(tokens);

  for (const token of tokens) {
    for (const synonym of TOKEN_SYNONYMS[token] ?? []) {
      expandedTokens.add(synonym);
    }
  }

  return expandedTokens;
}

function cardPositiveText(card) {
  return [
    card.title,
    card.category,
    card.campaignHandle,
    ...normalizeArray(card.bestFor),
    ...normalizeArray(card.searchKeywords),
    ...normalizeArray(card.claimNotes),
    card.curationNote,
  ].join(" ");
}

function cardNotForText(card) {
  return normalizeArray(card.notFor).join(" ");
}

function relevanceScore(card, expandedQueryTokens) {
  const positiveTokens = expandTokens(tokenize(cardPositiveText(card)));
  let score = 0;

  for (const token of expandedQueryTokens) {
    if (positiveTokens.has(token)) {
      score += 10;
    }
  }

  return score;
}

function hasHttpsUrl(card) {
  try {
    return new URL(card.originalUrl).protocol === "https:";
  } catch {
    return false;
  }
}

function hasRiskFlag(card, riskFlag) {
  return normalizeArray(card.riskFlags).includes(riskFlag);
}

function needsSkincareSafetyNote(card) {
  return card.category === "skincare" || hasRiskFlag(card, "health_claim_sensitive");
}

function campaignLabelFor(card) {
  return normalizeArray(card.searchKeywords).find((keyword) => {
    const normalizedKeyword = String(keyword ?? "").trim();

    return isPresent(normalizedKeyword) && normalizedKeyword !== card.campaignHandle;
  });
}

function normalizeSearchArgs(queryOrCards, cardsOrQuery, context) {
  if (Array.isArray(queryOrCards) && !Array.isArray(cardsOrQuery)) {
    return {
      cards: queryOrCards,
      query: cardsOrQuery ?? "",
      context: context ?? {},
    };
  }

  return {
    query: queryOrCards ?? "",
    cards: Array.isArray(cardsOrQuery) ? cardsOrQuery : [],
    context: context ?? {},
  };
}

export function tokenize(value) {
  let normalizedValue = String(value ?? "");

  for (const [compound, replacement] of QUERY_COMPOUND_NORMALIZATIONS) {
    normalizedValue = normalizedValue.replaceAll(compound, replacement);
  }

  return normalizedValue
    .toLowerCase()
    .match(/[\p{Letter}\p{Number}]+/gu) ?? [];
}

export function scoreCard(card, queryTokens, context = {}) {
  const expandedQueryTokens = expandTokens(queryTokens);
  const notForTokens = expandTokens(tokenize(cardNotForText(card)));
  let score = relevanceScore(card, expandedQueryTokens);

  for (const token of expandedQueryTokens) {
    if (notForTokens.has(token)) {
      score -= 6;
    }
  }

  const budgetAmount = Number(context.budgetAmount);
  const priceAmount = Number(card.priceAmount);

  if (budgetAmount > 0 && Number.isFinite(budgetAmount) && Number.isFinite(priceAmount)) {
    if (priceAmount <= budgetAmount) {
      score += 18;
    } else {
      score -= 20;
      score -= Math.ceil(((priceAmount - budgetAmount) / budgetAmount) * 10);
    }
  }

  const riskFlags = new Set(normalizeArray(card.riskFlags));

  if (isPresent(card.disclosure)) {
    score += 5;
  } else if (AFFILIATE_PLATFORMS.has(card.platform)) {
    riskFlags.add("missing_disclosure");
  }

  if (!hasHttpsUrl(card)) {
    riskFlags.add("non_https_url");
  }

  for (const riskFlag of riskFlags) {
    score += RISK_PENALTIES[riskFlag] ?? 0;
  }

  return score;
}

function hasPositiveRelevance(card, queryTokens) {
  return relevanceScore(card, expandTokens(queryTokens)) > 0;
}

export function searchCards(queryOrCards, cardsOrQuery, context) {
  const { query, cards, context: searchContext } = normalizeSearchArgs(
    queryOrCards,
    cardsOrQuery,
    context
  );

  if (cards.length === 0) {
    return [];
  }

  const queryTokens = Array.isArray(query) ? query : tokenize(query);

  if (queryTokens.length === 0) {
    return [];
  }

  return cards
    .filter((card) => hasPositiveRelevance(card, queryTokens))
    .map((card) => ({
      card,
      score: scoreCard(card, queryTokens, searchContext),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return String(left.card.title ?? "").localeCompare(String(right.card.title ?? ""), "ko");
    })
    .slice(0, 3)
    .map(({ card }) => card);
}

function curatorPersonaFor(card, curatorPersonas = []) {
  const handle = normalizeHandle(card?.curator?.handle);

  return (Array.isArray(curatorPersonas) ? curatorPersonas : []).find(
    (persona) => normalizeHandle(persona?.handle) === handle
  );
}

function curatorOneLinerFor(card, persona) {
  if (isPresent(card.curatorOneLiner)) {
    return card.curatorOneLiner;
  }

  const categoryOneLiner = persona?.categoryOneLiners?.[card.category];

  if (isPresent(categoryOneLiner)) {
    return categoryOneLiner;
  }

  if (isPresent(persona?.defaultOneLiner)) {
    return persona.defaultOneLiner;
  }

  return card.curationNote;
}

export function formatRecommendationResponse(cards, query = "", options = {}) {
  const lines = [COMMISSION_DISCLOSURE];

  if (!Array.isArray(cards) || cards.length === 0) {
    return `${lines.join("\n")}\n\n아직 맞는 AgentCart 후보가 없습니다.`;
  }

  lines.push("");
  lines.push(`검색어: ${query}`);

  cards.forEach((card, index) => {
    const persona = curatorPersonaFor(card, options.curatorPersonas);
    const platformLabel = card.platform === "coupang" ? "[쿠팡 파트너스] " : "";
    const price =
      Number.isFinite(Number(card.priceAmount)) && isPresent(card.currency)
        ? ` (${Number(card.priceAmount).toLocaleString("ko-KR")} ${card.currency})`
        : "";

    lines.push("");
    lines.push(`${index + 1}. ${platformLabel}${card.title}${price}`);
    lines.push(`링크: ${card.originalUrl}`);

    const curatorOneLiner = curatorOneLinerFor(card, persona);
    if (isPresent(curatorOneLiner)) {
      lines.push(`큐레이터 한마디: ${curatorOneLiner}`);
    }

    if (isPresent(card.curationNote) && card.curationNote !== curatorOneLiner) {
      lines.push(`추천 이유: ${card.curationNote}`);
    }

    if (isPresent(card.campaignHandle)) {
      const campaignLabel = campaignLabelFor(card);
      const displayCampaign = isPresent(campaignLabel)
        ? `${card.campaignHandle} (${campaignLabel})`
        : card.campaignHandle;

      lines.push(`캠페인: ${displayCampaign}`);
    }

    for (const claimNote of normalizeArray(card.claimNotes)) {
      lines.push(`주의: ${claimNote}`);
    }

    if (needsSkincareSafetyNote(card)) {
      lines.push("스킨케어 안전: patch test first; this is not medical advice.");
    }

    lines.push(
      `큐레이터 페르소나: ${persona?.personaName ?? card.curator?.displayName ?? card.curator.handle} (@${card.curator.handle})`
    );
    lines.push(`열기 전 확인: agentcart open ${card.slug}`);
  });

  return lines.join("\n");
}
