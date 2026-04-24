# SQLite, Turso, And D1 Scaling Notes

## Sources

- [SQLite Write-Ahead Logging](https://sqlite.org/wal.html)
- [Turso Embedded Replicas](https://docs.turso.tech/features/embedded-replicas/introduction)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- Checked: 2026-04-24

## Sourced Facts

- SQLite WAL allows readers and writers to proceed concurrently because readers do not block writers and a writer does not block readers.
- SQLite WAL still has only one writer at a time.
- WAL requires checkpointing; long-running reads or checkpoint starvation can grow the WAL and hurt performance.
- Turso embedded replicas serve reads from a local replica and send default writes to the remote primary, with syncing back to the local database.
- Cloudflare D1 has per-database limits and is designed for horizontal scale across multiple smaller databases.
- Cloudflare D1 documentation says each individual D1 database is inherently single-threaded and processes queries one at a time.

## AgentCart Interpretation

- SQLite is good for a read-heavy published registry, not for dumping every viral submission into one writer.
- Use append-only raw submission intake, queue review, and publish compact registry shards.
- Keep large agent-readable JSON in object storage/CDN and only index searchable metadata in SQLite/libSQL.
- Use NoSQL or object storage for events, raw payloads, redirect traces, and audit blobs; keep canonical product/link/review state relational.

## Open Questions

- Best shard key: platform, category, locale, contributor, or hybrid.
- Whether search should be SQLite FTS, Tantivy/Meilisearch, or hosted vector/search service after MVP.
