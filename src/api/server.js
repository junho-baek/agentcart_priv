import http from "node:http";

import { getCuratorRoom } from "../registry/curator.js";
import { createFeedbackEvent } from "../registry/feedback.js";
import { formatRecommendationResponse, searchCards } from "../registry/recommend.js";
import { loadRegistry, registryPathFor, saveRegistry } from "../registry/store.js";

const DISCLOSURE =
  "추천 결과에는 커미션 링크가 포함될 수 있으며, 구매 시 링크 등록자가 수수료를 받을 수 있습니다.";
const MAX_BODY_BYTES = 1_000_000;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > MAX_BODY_BYTES) {
        reject(new Error("body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
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
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function normalizeSearchQuery(query) {
  return String(query ?? "").replaceAll("가죽지갑", "가죽 지갑");
}

export function createServer({ registryPath } = {}) {
  const activeRegistryPath = registryPath ?? registryPathFor();

  return http.createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    try {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, service: "agentcart-registry" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/search") {
        const registry = await loadRegistry(activeRegistryPath);
        const query = url.searchParams.get("q") ?? "";
        const context = {};

        if (url.searchParams.has("budget")) {
          context.budgetAmount = Number(url.searchParams.get("budget"));
        }

        const cards = searchCards(normalizeSearchQuery(query), registry.cards, context);

        sendJson(response, 200, {
          disclosure: DISCLOSURE,
          responseText: formatRecommendationResponse(cards, query),
          results: cards.map((card) => ({ card })),
        });
        return;
      }

      const parts = routeParts(url.pathname);

      if (request.method === "GET" && parts.length === 3 && parts[0] === "api" && parts[1] === "cards") {
        const registry = await loadRegistry(activeRegistryPath);
        const cardIdOrSlug = parts[2];
        const card = (Array.isArray(registry.cards) ? registry.cards : []).find(
          (candidate) => candidate.id === cardIdOrSlug || candidate.slug === cardIdOrSlug
        );

        if (!card) {
          sendJson(response, 404, { error: "card_not_found" });
          return;
        }

        sendJson(response, 200, { card });
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
          sendJson(response, 404, { error: "curator_not_found" });
          return;
        }

        sendJson(response, 200, { room });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/feedback") {
        let body;

        try {
          body = await parseJsonBody(request);
        } catch (error) {
          if (error.message === "invalid_json") {
            sendJson(response, 400, { error: "invalid_json" });
            return;
          }

          throw error;
        }

        let event;

        try {
          event = createFeedbackEvent(body);
        } catch (error) {
          sendJson(response, 400, { error: error.message });
          return;
        }

        const registry = await loadRegistry(activeRegistryPath);
        registry.feedbackEvents = Array.isArray(registry.feedbackEvents) ? registry.feedbackEvents : [];
        registry.feedbackEvents.push(event);
        await saveRegistry(activeRegistryPath, registry);

        sendJson(response, 201, { event });
        return;
      }

      sendJson(response, 404, { error: "not_found" });
    } catch {
      sendJson(response, 500, { error: "internal_error" });
    }
  });
}
