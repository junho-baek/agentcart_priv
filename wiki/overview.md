# Overview

## Scope

This wiki captures AgentCart, an agent-commerce middle DB and product registry for shopping agents.

It focuses on product positioning, agent-readable product data, affiliate/product-link compliance, review/risk workflows, and the lightweight DB architecture needed if link submissions go viral.

## Current Thesis

AgentCart is not a page builder. It is an agent-safe product and affiliate-link registry: sellers and creators register product links, disclosures, price snapshots, claims, and agent-readable JSON; buyer agents query the registry, review risk, recommend products, and open the original purchase URL only after user approval.

The platform model is viable, but "we are only a platform" is not enough. AgentCart influences search, summaries, disclosure, ranking, and link opening, so policy compliance must be built into the product.

For infrastructure, start with append-only raw submissions, review workers, and SQLite/libSQL-style published registry shards. Use object storage/CDN for large agent JSON and a separate event log for click/open telemetry.

Operationally, AgentCart should be a context layer for autonomous agents. The checked-in skills describe how Codex, Hermes Agent, or GStack-managed workflows load curator context, disclose incentives, recommend registered cards, and stop before sensitive checkout gates.

## Open Questions

- Do Amazon, Coupang, Naver, and AliExpress allow AgentCart-hosted skill cards or registry pages as approved media/channel surfaces?
- Which platform product data can be cached, and for how long, without API approval?
- How should agent-generated recommendations be classified under endorsement and advertising rules?
- What is the best shard key for the published registry: platform, locale, category, contributor, or hybrid?
- Should `install-skill` add a Hermes Agent target or keep Hermes support as a documented copy/sync workflow?

## Key Pages

- [Platform-Safe Affiliate Registry](concepts/platform-safe-affiliate-registry.md)
- [AgentCart DB Scaling](concepts/agentcart-db-scaling.md)
- [AgentCart Platform Compliance And DB Strategy](analyses/agentcart-platform-compliance-and-db-strategy.md)
- [AgentCart Hermes Agent Integration](analyses/agentcart-hermes-agent-integration.md)
