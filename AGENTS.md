# LLM Wiki Rules

This file tells Codex how to maintain the wiki in this repository.

## Architecture

- `raw/` holds immutable sources. Read from it, but do not edit source contents.
- `wiki/` holds LLM-maintained Markdown pages.
- `wiki/index.md` is the content-oriented catalog.
- `wiki/log.md` is the append-only chronological log.

## Default Workflow

### Ingest

1. Read the new source from `raw/`.
2. Create or update a summary page under `wiki/sources/`.
3. Update the smallest set of related concept, entity, and overview pages.
4. Record contradictions explicitly instead of silently overwriting older claims.
5. Update `wiki/index.md`.
6. Append a log entry to `wiki/log.md`.

### Query

- Read `wiki/index.md` first, then the most relevant pages.
- Prefer answering from the wiki before falling back to raw sources.
- If the answer creates durable value, save it under `wiki/analyses/` or another relevant page.

### Lint

- Check for stale claims, contradictions, orphan pages, broken links, and mentioned-but-missing concepts.
- Suggest research gaps and new sources when coverage is weak.

## Conventions

- Use stable kebab-case filenames.
- Separate sourced facts from interpretation and open questions.
- Use Markdown links between pages.
- Keep `raw/` immutable unless the user explicitly asks for source reorganization.

## Notes

- Customize this file for the domain after initial setup.
- If your environment prefers `CLAUDE.md`, rename or regenerate this file accordingly.
