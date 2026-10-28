# Markdown Citations

Markdown Citations is an Obsidian plugin for creating readable, portable
citations and bibliographies from BibTeX, BibLaTeX, and CSL-JSON sources.

Version 0.1.0 is the first working prototype. It loads BibTeX, BibLaTeX, and
CSL-JSON files through the Obsidian Vault API, offers a mobile-friendly source
search, inserts a readable linked citation, and creates or updates an owned
bibliography block.

The settings page provides searchable Vault file and folder selectors, wide
path fields, and a dropdown containing seven bundled CSL styles: APA 7,
Chicago author-date, Harvard Cite Them Right, MLA 9, IEEE, Vancouver, and DIN
1505-2. Custom `.csl` files stored in the vault can also be selected.

## Goals

- produce Markdown that remains readable without the plugin;
- publish the same notes directly with Flowershow;
- offer optional Pandoc citation syntax for later PDF/LaTeX workflows;
- support multiple bibliography files and a local vault library;
- use CSL styles instead of implementing citation rules ourselves;
- work on macOS, iPadOS, and iOS without Node or Electron runtime APIs.

The complete product decisions and open technical questions are recorded in
[KONZEPT.md](KONZEPT.md).

## Prototype workflow

1. Select one or more bibliography files in the plugin settings.
2. Run **Markdown Citations: Insert citation** in an open Markdown note.
3. Search by author, title, year, or citekey and select a source.
4. Run **Markdown Citations: Update bibliography**.

The current citation label and bibliography entry are deliberately simple
author-year prototypes. Correct CSL formatting, locators such as page numbers,
and narrative or multiple citations are the next development stages.

The bibliography is bounded by two ownership markers. Only this owned block is
replaced during an update; normal Markdown links and unrelated text remain
untouched.

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

The private development repository is
<https://github.com/HKohlhoff/markdown-citations>. Pushes, tags, and releases
are never created automatically by the local build.

## Privacy

Markdown Citations is designed for local processing. The scaffold contains no
telemetry, analytics, network requests, or external service integration.

## License

Copyright © 2026 Holger Kohlhoff.

Markdown Citations is licensed under the GNU Affero General Public License,
version 3 or later. Third-party components retain their own licenses. The
planned citation dependencies require a fresh license audit before the first
public release.
