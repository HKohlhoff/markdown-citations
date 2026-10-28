# Third-party notices

Markdown Citations 0.1.0 bundles the following runtime components:

| Component | Version | Purpose | License |
| --- | --- | --- | --- |
| `@citation-js/core` | 0.9.0 | CSL-JSON normalization | MIT |
| `@citation-js/plugin-bibtex` | 0.9.0 | BibTeX and BibLaTeX parsing | MIT |

Their copyright notices and complete license texts are distributed in their npm
packages and source repositories. Citation.js is developed by Lars Willighagen
and contributors.

## Citation Style Language styles

- Source: https://github.com/citation-style-language/styles
- Project: https://citationstyles.org/
- License: Creative Commons Attribution-ShareAlike 3.0 Unported
- Bundled styles: APA 7, Chicago 18 author-date, Cite Them Right 12
  (Harvard), MLA 9, IEEE, Elsevier Vancouver, and DIN 1505-2 author-date.

The style files retain their original author and contributor metadata. An
attribution and license notice is included in
`LICENSES/CSL-Styles-CC-BY-SA-3.0.md`. The prototype does not yet bundle a CSL
rendering engine or locale files. Every release must receive a production
dependency and bundled-content license audit.
