# Changelog

All notable changes to Markdown Citations will be documented in this file.

## Unreleased

- Rework the settings page with searchable Vault file and folder pickers.
- Add seven bundled CSL citation styles and custom Vault CSL selection.
- Improve settings layout for wide desktop fields and mobile screens.
- Add a citation details dialog for locators, narrative citations, prefixes,
  and suffixes.
- Make bibliography headings optional, detect placeholders automatically, and
  render bibliography entries as paragraphs instead of a bullet list.
- Normalize blank lines around generated bibliography blocks.
- Rename the bibliography command to **Insert / update bibliography** and add
  a blank line between the ownership marker and an optional heading.
- Put a trailing bibliography DOI or URL on its own portable Markdown line.
- Keep bibliography link targets inline so they do not add empty visual rows.
- Use the selected CSL style for the citation dialog preview.
- Keep URLs on their own line when CSL appends details such as an original
  publication date.

## 0.1.0 - 2026-10-28

- Create the independent Markdown Citations project scaffold.
- Add mobile-compatible Obsidian lifecycle and persisted settings.
- Record the product architecture and first prototype milestone.
- Add tests, metadata validation, production build, and test-vault deployment.
- Load and normalize BibTeX, BibLaTeX, and CSL-JSON bibliography files.
- Add mobile-friendly source search and readable Markdown citation insertion.
- Add safe generation and replacement of an owned bibliography block.
