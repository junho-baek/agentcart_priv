# AgentCart Curator Channel Flywheel

## Thesis

AgentCart becomes valuable to commission creators when their product links can appear inside agent recommendations, not just inside human-facing profile pages.

This makes AgentCart a recommendation distribution layer, not a commission-link dashboard.

## Mechanism

Creator flow:

```text
Creator registers product links
-> adds explanations, disclosures, target buyer context, and purchase metadata
-> AgentCart turns them into agent-readable product cards
-> cards can be grouped into a curator channel
```

Buyer-agent flow:

```text
Buyer asks a shopping question
-> agent queries AgentCart registry or a trusted curator channel
-> agent reviews fit, disclosure, price snapshot, link safety, and risk
-> agent recommends options
-> buyer approves before opening the purchase URL
```

The creator gets distribution because their links can become candidates in agent recommendations. The buyer gets value because the agent does not blindly open creator links; it runs a shopping protocol first.

## Why Supabase Helps

Supabase adds the account and ownership layer needed for this funnel:

- Creator profile.
- Approved channels.
- Product submissions.
- Affiliate disclosure.
- Recommendation and click event history.
- Seller/creator analytics.

This makes AgentCart useful to creators because it can show whether their links were recommended, clicked, and eventually converted through explicit import or platform postback.

## Curator Channels

A curator channel is not just a page. It is an agent-readable feed.

Examples:

- `mom-birthday-gifts-under-100k`
- `creator-junho-desk-setup`
- `safe-skincare-for-sensitive-skin`
- `travel-gear-for-ai-builders`

Each channel can expose:

- channel description
- curation policy
- affiliate disclosure
- product cards
- fit tags
- not-for tags
- freshness status
- risk policy

## Product Boundary

AgentCart should allow agents to query curator channels, but it must not auto-recommend everything in a channel.

Hard rules:

- Ranking is based on buyer fit and trust checks, not commission.
- Commission relationship is disclosed.
- Product cards include stale price warnings.
- Buyer approval is required before opening purchase links.
- Curator channel is an input source, not the final judge.

## Strategic Sentence

```text
AgentCart lets commission creators turn product links into agent-readable recommendation channels.
```

Even sharper:

```text
Your affiliate links, callable by shopping agents.
```

## Flywheel

```text
More creators register product cards
-> more agent-readable inventory
-> better buyer recommendations
-> more qualified clicks
-> creators see recommendation analytics
-> more creators bring links and channels
```

The flywheel only works if buyer trust stays intact. If AgentCart becomes pay-to-rank or hidden affiliate spam, the network dies.
