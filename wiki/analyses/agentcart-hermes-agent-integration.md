# AgentCart Hermes Agent Integration

## Question

How should AgentCart matter operationally for Hermes Agent, Codex, and GStack if AgentCart skills are Markdown instructions rather than a standalone app surface?

## Short Answer

AgentCart should be operated as a context layer for autonomous agents.

The checked-in `skills/` files are portable operational contracts: they tell an agent how to load curator context, disclose commercial relationships, recommend registered cards, and stop before sensitive checkout gates. Codex, Hermes Agent, and GStack workflows can each import those contracts into their own skill stores, but AgentCart's durable source of truth remains the repository, registry API, and protocol objects.

Do not treat AgentCart as a destination marketplace or as a runtime-specific plugin. Treat it as the commerce context an autonomous agent reads before it recommends, opens, or registers product links.

## Skill Mapping

- `skills/agentcart-shopping-skill.md`: buyer-side recommendation workflow. It queries the registry, loads curator persona context, shows disclosure first, recommends registered cards, and asks before opening monetized links.
- `skills/agentcart-curator-registration-skill.md`: supply-side intake workflow. It turns creator, brand, merchant, or campaign material into an `AgentCartRegistrationDraft` with personas, entries, disclosure policy, fit rules, avoid rules, and publication defaults.
- `skills/agentcart-browser-purchase-assist-skill.md`: browser handoff workflow. It can inspect links and prepare checkout in a visible browser, but stops at OTP, CAPTCHA, payment password, card, address, and other sensitive gates.
- `docs/protocol/commerce-context-protocol.md` and the registry API: data contract. Skill text governs agent behavior; protocol objects and API responses provide the product, persona, disclosure, and risk context.

## Skill Store Boundary

- `skills/`: canonical AgentCart skill source inside the repository. Edit and review here first.
- `.agentcart/skills/`: workspace-local installer output from `agentcart install-skill`. Today this is mainly the generated shopping skill for targets such as `codex`, `claude`, and `openclaw`.
- `~/.codex/skills`: Codex operator skill store. Use this when Codex should discover AgentCart skills across sessions on the same machine.
- `~/.hermes/skills`: Hermes Agent operator skill store. Use this when Hermes Agent should run AgentCart-aware autonomous workflows from its own runtime and scheduling context.

The practical distinction is ownership and runtime scope. `~/.codex/skills` belongs to Codex sessions; `~/.hermes/skills` belongs to Hermes Agent sessions. They can contain mirrored AgentCart skills, but neither should become the canonical product source. AgentCart should publish or copy from `skills/` into each runtime store, then regenerate or resync when the repository skill changes.

## Autonomous Agent Workflow

When a user invokes AgentCart from Codex, Hermes Agent, or a GStack-managed workflow, the agent should:

1. Load the relevant AgentCart skill before using general shopping heuristics.
2. Resolve the curator handle, campaign handle, or shopping intent against the AgentCart registry.
3. Use registered cards and protocol context instead of inventing products.
4. Show disclosure before recommendations.
5. Explain fit, avoid rules, price snapshot limits, platform, curator persona, and risk flags.
6. Ask before opening monetized links.
7. Delegate visible checkout setup to purchase assist only after the user selects a specific card or link.
8. Stop at sensitive authentication, identity, payment, and final money-movement gates.

This makes AgentCart the context authority for the shopping decision while leaving action execution to the active agent runtime.

## Codex, Hermes, And GStack Roles

- Codex: best current surface for developing AgentCart, installing local skills, running the registry API, editing protocol docs, and testing recommendation behavior.
- Hermes Agent: best treated as an autonomous operator that can import the same AgentCart skills into `~/.hermes/skills`, run scheduled or longer-lived curator/recommendation workflows, and call the AgentCart registry as context.
- GStack: best treated as the orchestration layer around implementation, review, QA, deployment, and operational playbooks. GStack should consume AgentCart context and skills rather than duplicating commerce policy rules.

## Product Implications

- Add a future `hermes` installer target only if Hermes needs target-specific frontmatter, browser instructions, or workflow metadata.
- Keep runtime adapters thin. The hard product behavior should live in AgentCart skill text, registry schema, protocol objects, and tests.
- Version skill bundles so `~/.codex/skills` and `~/.hermes/skills` can be checked for drift.
- Preserve the browser-surface distinction: Hermes, Codex, or GStack may operate different browsers, but AgentCart purchase assist still requires visible user control and hard stops.

## Related Pages

- [Platform-Safe Affiliate Registry](../concepts/platform-safe-affiliate-registry.md)
- [Agent-Assisted Purchase Protocol](../concepts/agent-assisted-purchase-protocol.md)
- [AgentCart Platform Compliance And DB Strategy](agentcart-platform-compliance-and-db-strategy.md)
