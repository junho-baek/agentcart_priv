# AgentCart Commerce Context Protocol

AgentCart is an agent-readable commerce context protocol for product links, recommender personas, disclosure policies, and purchase-assist boundaries.

The protocol separates what humans register from what agents consume:

- `CurationEntry`: human-friendly source data from a creator, brand, merchant, or campaign.
- `AgentProductContext`: normalized product context that an AI agent can safely read before recommending or opening a link.
- `RecommenderPersona`: an insight-first commercial actor persona that explains judgment criteria, incentives, and recommendation style.
- `DisclosurePolicy`: the required disclosure and conflict rules that travel with the recommendation.
- `PersonaInjection`: the API or skill contract for loading persona context into an agent conversation.

## CurationEntry

`CurationEntry` is the registration object. It should be easy for a creator or brand operator to generate through a skill, CLI, or future admin UI.

Required fields:

- `kind`: always `CurationEntry`
- `id`: stable source entry id
- `title`: product or offer title
- `originalUrl`: affiliate, marketplace, self-owned shop, or direct product URL
- `platform`: detected or declared commerce platform
- `category`: curator-defined product category
- `curator`: handle and display name for the source recommender
- `bestFor`: user situations where the product fits
- `notFor`: user situations where the product should be avoided
- `curationNote`: human-authored reason for inclusion
- `disclosureHint`: source-level disclosure text or relationship hint

Optional fields:

- `campaignHandle`
- `priceSnapshot`
- `searchKeywords`
- `curatorOneLiner`
- `claimNotes`
- `riskFlags`
- `sourceMetadata`

## AgentProductContext

`AgentProductContext` is the agent-facing object. It is stricter than `CurationEntry` and should contain everything an agent needs to explain a recommendation without inventing claims.

Required fields:

- `kind`: always `AgentProductContext`
- `contextId`: stable context id
- `product`: title, category, platform, and optional price snapshot
- `links`: original URL and relationship metadata
- `recommendationContext`: curator note, one-liner, and search keywords
- `recommender`: handle, display name, persona name, and commercial role
- `disclosure`: required disclosure text and relationship type
- `fitRules`: best-for and not-for lists
- `risk`: risk flags and prohibited claims
- `allowedActions`: safe agent actions such as explain, compare, show link, or ask before opening
- `freshness`: timestamp and source version information when available

Agents must not treat `AgentProductContext` as proof of lowest price, live stock, seller verification, warranty status, or medical efficacy unless evidence explicitly states it.

## RecommenderPersona

`RecommenderPersona` is an insight-first commercial actor persona. It is not just tone.

Required fields:

- `kind`: always `RecommenderPersona`
- `handle`
- `displayName`
- `personaName`
- `adviceMode`: `insight_first`, `shopping_assist`, `brand_guide`, or `campaign_host`
- `commercialRole`: `independent_curator`, `brand_official`, `merchant`, `sponsored_campaign`, or `affiliate_publisher`
- `voiceTraits`
- `curationPrinciples`
- `disclosurePolicy`

Recommended behavior:

1. Start with advice and judgment criteria when the user is exploring.
2. Move to product recommendations when the user asks for shopping help or gives constraints.
3. Always disclose commercial incentives before monetized recommendations.
4. Identify brand, merchant, sponsored, or campaign relationships.
5. Keep claims grounded in registered product context.

## DisclosurePolicy

`DisclosurePolicy` describes the commercial relationship that must be shown to the user.

Fields:

- `relationshipType`: `affiliate`, `sponsored`, `official_brand`, `merchant`, `direct`, or `unknown`
- `requiredDisclosureText`
- `linkRegistrant`
- `firstPartyPriority`: whether first-party products are prioritized
- `competitorInclusionPolicy`: `may_include`, `excluded`, `only_if_requested`, or `unknown`
- `sponsoredCampaign`: boolean or campaign id
- `officialBrandPersona`: boolean
- `regionalComplianceNotes`

Disclosure policy is part of the recommendation, not a footer.

## PersonaInjection

Persona injection is the surface by which a third-party agent loads AgentCart context.

An agent should be able to request:

- persona identity and voice
- advice mode
- curation principles
- disclosure policy
- campaign context
- allowed product contexts
- purchase-assist boundaries

Initial implementations can use local CLI, API routes, and skill instructions. MCP can be added later as a transport. The protocol should remain transport-independent.

## Action Boundaries

Agent-facing context should include allowed and prohibited actions.

Default allowed actions:

- explain recommendation
- compare registered cards
- show direct monetized link after disclosure
- ask for approval before opening a purchase URL
- hand off to purchase assist

Default prohibited actions:

- hide affiliate, brand, merchant, or sponsor relationship
- rank by commission rate
- claim lowest price or live availability without evidence
- claim seller verification without evidence
- enter OTP, CAPTCHA, payment password, card number, or sensitive profile data
- complete a paid purchase without current-turn action-time confirmation
