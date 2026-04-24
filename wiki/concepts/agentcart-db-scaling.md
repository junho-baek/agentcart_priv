# AgentCart DB Scaling

## Thesis

For a viral affiliate/product registry, the first scaling problem is not "choose Supabase vs MongoDB." It is separating hot write intake from the read-heavy published registry.

## Recommended Shape

1. Raw submissions: append-only queue or log.
2. Review workers: normalize links, expand redirects, classify platform, run scam/disclosure/policy checks.
3. Canonical registry: SQLite/libSQL shards for published products, links, contributors, and risk summaries.
4. Agent JSON: object storage or CDN files keyed by product slug/version.
5. Search: FTS/search index over compact product metadata.
6. Events: separate click/open/read event log, not the canonical registry.

## Why SQLite/LibSQL Fits Early

- Published product reads are high-volume and relatively simple.
- A registry shard can be replicated cheaply and cached near agents.
- SQLite WAL handles mixed reads/writes better than rollback journal, but one database still has a single writer.
- Shards let AgentCart avoid one global write lock and keep operational cost low.

## Where NoSQL Helps

- Raw submitted payloads.
- Redirect traces.
- Click/open/read telemetry.
- Policy audit blobs.
- Model/review run artifacts.

## Where NoSQL Is Weaker

- Canonical product identity.
- Contributor-link-product relationships.
- Policy decision history that needs auditable joins.
- Ranking explanations and review state transitions.

## Related Pages

- [SQLite, Turso, And D1 Scaling Notes](../sources/sqlite-wal-turso-d1-scaling.md)
