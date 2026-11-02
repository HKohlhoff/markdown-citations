# Third-party notices

Markdown Citations 0.1.0 bundles the following runtime components:

| Component | Version | Purpose | License |
| --- | --- | --- | --- |
| `@citation-js/core` | 0.9.0 | CSL-JSON normalization | MIT |
| `@citation-js/plugin-bibtex` | 0.9.0 | BibTeX and BibLaTeX parsing | MIT |
| `citeproc-js` / `citeproc` | 2.4.63 | CSL citation and bibliography formatting | AGPL-3.0-or-later |

Their copyright notices and complete license texts are distributed in their npm
packages and source repositories. Citation.js is developed by Lars Willighagen
and contributors.

`citeproc-js` is used under the AGPL 3.0-or-later option stated in the
upstream source and license header. The npm package metadata still reports an
older `AGPL-1.0` identifier, while the distributed source header and upstream
`LICENSE` explicitly offer AGPL version 3 or later. The complete AGPLv3 text is
included in `LICENSES/citeproc-js-AGPL-3.0-or-later.txt`.

## Citation Style Language styles and locales

- Source: https://github.com/citation-style-language/styles
- Locale source: https://github.com/citation-style-language/locales
- Project: https://citationstyles.org/
- License: Creative Commons Attribution-ShareAlike 3.0 Unported
- Bundled styles: APA 7, Chicago 18 author-date, Cite Them Right 12
  (Harvard), MLA 9, IEEE, NLM/Vancouver, APS/Physical Review, an adapted
  AMS numeric style with alphabetical ordering, and an adapted localized
  ISO 690:2021 author-date style.
- Bundled locales: `de-DE`, `en-US`, `en-GB`, `es-ES`, `fr-FR`, `it-IT`,
  `ja-JP`, `nl-NL`, `pl-PL`, `pt-BR`, `ru-RU`, and `zh-CN`.

The style and locale files retain their original author and contributor metadata.
Adaptations add contributor credit and distinct identifiers, retaining CC BY-SA
3.0 terms. Changes and pinned upstream sources are recorded in
`resources/csl/README.md`. An
attribution and license notice is included in
`LICENSES/CSL-Styles-CC-BY-SA-3.0.md`. Every release must receive a production
dependency and bundled-content license audit.
