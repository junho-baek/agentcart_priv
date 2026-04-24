# Amazon Associates Program Policies

## Source

- [Amazon Associates Program Policies](https://affiliate-program.amazon.com/help/operating/policies?ac-ms-src=ac-nav)
- Checked: 2026-04-24

## Sourced Facts

- Associates must identify their approved site in the application, and Amazon evaluates whether that site is eligible.
- Special Links must include the assigned Associates ID or tag and must be accessed directly from the associate's site.
- Amazon says product prices and availability change, and sites may only show those values if Amazon serves the displayed data or if the publisher obtains it through Creators API or PA API and follows the license.
- Amazon prohibits inaccurate, overbroad, deceptive, or misleading claims about a product, Amazon site, policy, promotion, or price.
- Amazon restricts use of Special Links and Program Content in client-side software, plugins, toolbars, unapproved device contexts, and some app contexts.
- Amazon's Program Content license is limited, revocable, non-transferable, and non-sublicensable.
- Amazon restricts caching Program Content and requires refresh rules for content obtained through approved APIs.
- Amazon policies explicitly mention that Program Content, Creators API, PA API, and Data Feeds cannot be used to develop or improve machine-learning/foundation-model technology without approval.

## AgentCart Interpretation

- Treat Amazon as a high-risk platform profile until the contributor proves the submitted link is tied to an approved Amazon Associates site or approved channel.
- Do not scrape or store Amazon prices, availability, star ratings, reviews, images, or Program Content as current facts unless obtained through a permitted API path.
- Store `price_snapshot` only as a contributor-submitted historical snapshot with `captured_at`, not as "current Amazon price."
- Do not cloak Amazon destinations behind opaque redirects. Keep original URL, final URL, source domain, and disclosure visible to the buyer agent.
- Do not let the agent auto-open Amazon affiliate links to increase commission. Require buyer selection and explicit `open` action.

## Open Questions

- Whether the hosted AgentCart registry itself must be registered as the contributor's Amazon "Site" before Special Links are displayed through AgentCart.
- Whether each agent skill installation context counts as a "site", software application, or approved mobile application under Amazon policy.
