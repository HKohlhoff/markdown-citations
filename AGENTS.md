# AGENTS.md instructions

This repository contains the Obsidian plugin **Markdown Citations**.

## Purpose

Markdown Citations turns bibliographic data into readable, portable Markdown
citations and bibliographies. The generated Markdown must remain useful without
the plugin and must be suitable for direct publication with Flowershow.

## Architecture

- `src/model/`: Obsidian-independent domain types;
- `src/bibliography/`: bibliography loading, parsing, and normalization;
- `src/citation/`: citation engine interfaces and citation rendering;
- `src/document/`: note scanning and safe Markdown updates;
- `src/vault/`: Vault-API-only reads and writes;
- `src/ui/`: settings, source selection, and citation dialogs;
- `src/main.ts`: lifecycle and orchestration only.

Keep parsing, domain logic, rendering, Vault effects, and UI separated. Prefer
small pure helpers with focused tests. Preserve existing behavior unless a
change is requested.

## Vault and mobile safety

- Use Obsidian Vault APIs for every vault file and folder operation.
- Do not introduce Node/Electron runtime dependencies; the plugin must work on
  macOS, iPadOS, and iOS.
- Never rewrite ordinary Markdown links or text that is not unambiguously owned
  by Markdown Citations.
- User-triggered updates may replace only plugin-owned citation text and the
  configured bibliography block.
- Keep ownership markers readable and unobtrusive.
- Do not add network access, telemetry, or live synchronization without an
  explicit request and corresponding privacy documentation.

## Product decisions

- Readable Markdown is the default citation mode; Pandoc citation syntax is an
  optional per-note or global mode.
- BibTeX/BibLaTeX and CSL-JSON are supported input formats and normalize to one
  internal model.
- Zotero is optional. Multiple bibliography files and a local vault library are
  first-class sources.
- CSL styles are open-ended; APA 7 is the default, not a hard-coded formatter.
- Global settings may be overridden through documented frontmatter fields.

## Quality and Git

Before completing code changes, run `npm test` and `npm run build:prod` where
possible. Use the shared vault
`/Users/Holger/SynologyDrive/Obsidian/Obsidian-PluginTests` for runtime checks,
deploying only to its `.obsidian/plugins/markdown-citations` folder. Do not
modify other plugins or vault content while testing unless explicitly asked.

Use GitFlow: released states live on `main`, integration happens on `develop`,
and feature work branches from `develop`. Do not push, tag, publish, create a
remote repository, or change an existing remote without explicit approval.
Keep `release/`, `main.js`, local plugin data, and test-vault state out of Git.
