import http from "node:http";

import { getCuratorPersona, getCuratorRoom } from "../registry/curator.js";
import { createFeedbackEvent } from "../registry/feedback.js";
import {
  buildAgentProductContext,
  buildRecommenderPersona,
  normalizeHandle,
} from "../registry/protocol.js";
import {
  FREE_BETA_LIMITS,
  cardInputFromCurationEntry,
  entriesFromRegistrationDraft,
  normalizeAccountEmail,
  personaInputFromRecommenderPersona,
  personasFromRegistrationDraft,
  validateRegistrationDraft,
} from "../registry/registration.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import {
  addCard,
  addCuratorPersona,
  countAccountCards,
  loadRegistry,
  registryPathFor,
  saveRegistry,
  upsertAccount,
} from "../registry/store.js";

const DISCLOSURE =
  "추천 결과에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 수수료를 받을 수 있습니다.";
const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_ALLOWED_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"];

function corsHeadersFor(origin, allowedOrigins) {
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-AgentCart-Account-Email",
  };

  if (!origin) {
    return {
      ...headers,
      "Access-Control-Allow-Origin": "*",
    };
  }

  if (allowedOrigins.has(origin)) {
    return {
      ...headers,
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }

  return null;
}

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bodyTooLarge = false;

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      if (bodyTooLarge) {
        return;
      }

      body += chunk;

      if (body.length > MAX_BODY_BYTES) {
        body = "";
        bodyTooLarge = true;
      }
    });
    request.on("end", () => {
      if (bodyTooLarge) {
        reject(new Error("body_too_large"));
        return;
      }

      resolve(body);
    });
    request.on("error", reject);
  });
}

async function parseJsonBody(request) {
  const body = await readRequestBody(request);

  try {
    return body.trim() ? JSON.parse(body) : {};
  } catch {
    throw new Error("invalid_json");
  }
}

function routeParts(pathname) {
  try {
    return pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch (error) {
    if (error instanceof URIError) {
      return null;
    }

    throw error;
  }
}

export function createServer({ registryPath, allowedOrigins = DEFAULT_ALLOWED_ORIGINS } = {}) {
  const activeRegistryPath = registryPath ?? registryPathFor();
  const allowedOriginSet = new Set(allowedOrigins);
  let feedbackWriteQueue = Promise.resolve();

  function enqueueFeedbackWrite(writeFeedback) {
    const write = feedbackWriteQueue.then(writeFeedback, writeFeedback);
    feedbackWriteQueue = write.catch(() => {});

    return write;
  }

  return http.createServer(async (request, response) => {
    const corsHeaders = corsHeadersFor(request.headers.origin, allowedOriginSet);

    if (!corsHeaders) {
      sendJson(response, 403, { error: "origin_not_allowed" });
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    try {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, service: "agentcart-registry" }, corsHeaders);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/search") {
        const registry = await loadRegistry(activeRegistryPath);
        const query = url.searchParams.get("q") ?? "";
        const curatorHandle = normalizeHandle(url.searchParams.get("curator"));
        const context = {};

        if (url.searchParams.has("budget")) {
          context.budgetAmount = Number(url.searchParams.get("budget"));
        }

        const candidateCards = curatorHandle
          ? (Array.isArray(registry.cards) ? registry.cards : []).filter(
              (card) => normalizeHandle(card.curator?.handle) === curatorHandle
            )
          : registry.cards;
        const cards = searchCards(query, candidateCards, context);

        sendJson(response, 200, {
          disclosure: DISCLOSURE,
          responseText: formatRecommendationResponse(cards, query, {
            curatorPersonas: registry.curatorPersonas,
          }),
          results: cards.map((card) => ({ card })),
        }, corsHeaders);
        return;
      }

      const parts = routeParts(url.pathname);

      if (parts === null) {
        sendJson(response, 404, { error: "not_found" }, corsHeaders);
        return;
      }

      if (request.method === "GET" && parts.length === 3 && parts[0] === "api" && parts[1] === "cards") {
        const registry = await loadRegistry(activeRegistryPath);
        const cardIdOrSlug = parts[2];
        const card = (Array.isArray(registry.cards) ? registry.cards : []).find(
          (candidate) => candidate.id === cardIdOrSlug || candidate.slug === cardIdOrSlug
        );

        if (!card) {
          sendJson(response, 404, { error: "card_not_found" }, corsHeaders);
          return;
        }

        sendJson(response, 200, { card }, corsHeaders);
        return;
      }

      if (
        request.method === "GET" &&
        parts.length === 4 &&
        parts[0] === "api" &&
        parts[1] === "protocol" &&
        parts[2] === "context"
      ) {
        const registry = await loadRegistry(activeRegistryPath);
        const cardIdOrSlug = parts[3];
        const card = (Array.isArray(registry.cards) ? registry.cards : []).find(
          (candidate) => candidate.id === cardIdOrSlug || candidate.slug === cardIdOrSlug
        );

        if (!card) {
          sendJson(response, 404, { error: "context_not_found" }, corsHeaders);
          return;
        }

        const persona = getCuratorPersona(registry, card.curator?.handle);
        sendJson(response, 200, {
          context: buildAgentProductContext(card, { persona }),
        }, corsHeaders);
        return;
      }

      if (
        request.method === "GET" &&
        parts.length === 4 &&
        parts[0] === "api" &&
        parts[1] === "protocol" &&
        parts[2] === "personas"
      ) {
        const registry = await loadRegistry(activeRegistryPath);
        const persona = getCuratorPersona(registry, parts[3]);

        if (!persona) {
          sendJson(response, 404, { error: "persona_not_found" }, corsHeaders);
          return;
        }

        sendJson(response, 200, { persona: buildRecommenderPersona(persona) }, corsHeaders);
        return;
      }

      if (
        request.method === "GET" &&
        parts.length === 3 &&
        parts[0] === "api" &&
        parts[1] === "curators"
      ) {
        const registry = await loadRegistry(activeRegistryPath);
        const room = getCuratorRoom(registry, parts[2]);

        if (!room) {
          sendJson(response, 404, { error: "curator_not_found" }, corsHeaders);
          return;
        }

        sendJson(response, 200, { room }, corsHeaders);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/feedback") {
        let body;

        try {
          body = await parseJsonBody(request);
        } catch (error) {
          if (error.message === "body_too_large") {
            sendJson(response, 413, { error: "body_too_large" }, corsHeaders);
            return;
          }

          if (error.message === "invalid_json") {
            sendJson(response, 400, { error: "invalid_json" }, corsHeaders);
            return;
          }

          throw error;
        }

        let event;

        try {
          event = createFeedbackEvent(body);
        } catch (error) {
          sendJson(response, 400, { error: error.message }, corsHeaders);
          return;
        }

        await enqueueFeedbackWrite(async () => {
          const registry = await loadRegistry(activeRegistryPath);
          registry.feedbackEvents = Array.isArray(registry.feedbackEvents)
            ? registry.feedbackEvents
            : [];
          registry.feedbackEvents.push(event);
          await saveRegistry(activeRegistryPath, registry);
        });

        sendJson(response, 201, { event }, corsHeaders);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/register-draft") {
        let draft;

        try {
          draft = await parseJsonBody(request);
        } catch (error) {
          if (error.message === "body_too_large") {
            sendJson(response, 413, { error: "body_too_large" }, corsHeaders);
            return;
          }

          if (error.message === "invalid_json") {
            sendJson(response, 400, { error: "invalid_json" }, corsHeaders);
            return;
          }

          throw error;
        }

        const accountEmail = normalizeAccountEmail(
          draft.accountEmail ?? request.headers["x-agentcart-account-email"]
        );
        const validation = validateRegistrationDraft(draft, {
          ...FREE_BETA_LIMITS,
          accountEmail,
        });

        if (!validation.ok) {
          sendJson(response, 400, {
            error: validation.errors[0],
            errors: validation.errors,
          }, corsHeaders);
          return;
        }

        const registry = await loadRegistry(activeRegistryPath);
        const existingAccountCardCount = countAccountCards(registry, accountEmail);

        if (existingAccountCardCount + validation.entryCount > FREE_BETA_LIMITS.maxEntries) {
          sendJson(response, 400, {
            error: "account_entry_limit_exceeded",
            errors: ["account_entry_limit_exceeded"],
          }, corsHeaders);
          return;
        }

        const personas = personasFromRegistrationDraft(draft);
        const entries = entriesFromRegistrationDraft(draft);
        const registeredPersonas = [];
        const registeredCards = [];

        await upsertAccount(activeRegistryPath, {
          email: accountEmail,
          plan: "free_beta",
          maxPersonas: FREE_BETA_LIMITS.maxPersonas,
          maxEntries: FREE_BETA_LIMITS.maxEntries,
        });

        for (const persona of personas) {
          registeredPersonas.push(
            await addCuratorPersona(activeRegistryPath, {
              ...personaInputFromRecommenderPersona(persona),
              accountEmail,
            })
          );
        }

        for (const entry of entries) {
          registeredCards.push(
            await addCard(activeRegistryPath, {
              ...cardInputFromCurationEntry(entry),
              accountEmail,
              visibility: entry.visibility ?? draft.visibility ?? "curator_scoped",
              publicationStatus: entry.publicationStatus ?? draft.publicationStatus ?? "draft",
            })
          );
        }

        sendJson(response, 201, {
          registered: {
            accountEmail,
            personas: registeredPersonas.length,
            cards: registeredCards.length,
          },
        }, corsHeaders);
        return;
      }

      sendJson(response, 404, { error: "not_found" }, corsHeaders);
    } catch {
      sendJson(response, 500, { error: "internal_error" }, corsHeaders);
    }
  });
}
