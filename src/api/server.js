import http from "node:http";

import { getCuratorRoom } from "../registry/curator.js";
import { createFeedbackEvent } from "../registry/feedback.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import { loadRegistry, registryPathFor, saveRegistry } from "../registry/store.js";

const DISCLOSURE =
  "추천 결과에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 수수료를 받을 수 있습니다.";
const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_ALLOWED_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"];

function corsHeadersFor(origin, allowedOrigins) {
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
        const context = {};

        if (url.searchParams.has("budget")) {
          context.budgetAmount = Number(url.searchParams.get("budget"));
        }

        const cards = searchCards(query, registry.cards, context);

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

      sendJson(response, 404, { error: "not_found" }, corsHeaders);
    } catch {
      sendJson(response, 500, { error: "internal_error" }, corsHeaders);
    }
  });
}
