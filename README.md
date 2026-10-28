# Markdown Citations

Markdown Citations is an Obsidian plugin for creating readable, portable
citations and bibliographies from BibTeX, BibLaTeX, and CSL-JSON sources.

The project is at the beginning of development. Version 0.1.0 establishes the
mobile-compatible plugin shell, persisted settings, quality checks, and the
architecture for the first citation prototype.

## Goals

- produce Markdown that remains readable without the plugin;
- publish the same notes directly with Flowershow;
- offer optional Pandoc citation syntax for later PDF/LaTeX workflows;
- support multiple bibliography files and a local vault library;
- use CSL styles instead of implementing citation rules ourselves;
- work on macOS, iPadOS, and iOS without Node or Electron runtime APIs.

The complete product decisions and open technical questions are recorded in
[KONZEPT.md](KONZEPT.md).

## Current scaffold

The plugin currently loads in Obsidian, stores normalized settings, exposes a
settings tab, and provides a small setup-status command. Bibliography parsing
and citation insertion are intentionally reserved for the next development
step.

## Development

Requirements:

- Node.js 20.19 or newer;
- npm;
- Obsidian for runtime checks.

Install dependencies and verify the project:

```sh
npm install
npm test
npm run build:prod
```

Deploy a production build to an explicitly selected test vault:

```sh
OBSIDIAN_PLUGINS_DIR="/path/to/vault/.obsidian/plugins" npm run build:prod:deploy
```

For this project the shared runtime test vault is
`/Users/Holger/SynologyDrive/Obsidian/Obsidian-PluginTests`. Deployment must
target only its `.obsidian/plugins/markdown-citations` folder.

## Repository workflow

The project uses GitFlow:

- `main` contains released states;
- `develop` is the integration branch;
- `feature/*` branches start from `develop`;
- release and hotfix branches are merged with explicit merge commits.

No remote repository or release is created automatically.

## Privacy

Markdown Citations is designed for local processing. The scaffold contains no
telemetry, analytics, network requests, or external service integration.

## License

Copyright © 2026 Holger Kohlhoff.

Markdown Citations is licensed under the GNU Affero General Public License,
version 3 or later. Third-party components retain their own licenses. The
planned citation dependencies require a fresh license audit before the first
public release.
