# Changelog

All notable changes to Markdown Citations will be documented in this file.

## Unreleased

- Add a mobile-friendly local CSL-JSON reference manager with create, edit,
  preview, and confirmed-delete workflows.
- Build local references from standard CSL attributes, preserve unknown fields,
  keep existing citekeys stable, reject cross-library duplicates, and create
  the configured vault file/folders through Obsidian APIs.
- Preview local citations and bibliography entries with the active bundled or
  custom vault CSL style and locale.
- Refine the local-library settings row and reference editor with separate
  actions, content-sized right-aligned fields, and a compact bibliographic
  details row for volume, issue, edition, and pages.

- Protect fenced-code, inline-code, and comment examples from bibliography
  replacement; reject incomplete or duplicated ownership markers.
- Verify rebased publication links independently of Vault effects and document
  how to detach a publication copy without losing its citation data.

- Add Create / update publication note: assemble supported embeds into the
  sibling <master>_publishVersion.md with master-wide citation formatting,
  numbering, unique citation IDs, and a shared bibliography.
- Rebuild only the owned publication output, preserving source notes and
  protecting unrelated destinations, unsaved edits, and changing inputs.

- Preselect the stored local style and locale without conflicting with Modal's
  internal selection state; offer separate save-only and save-and-update actions.

- Add a current-note style/language dialog with named styles, custom CSL picker,
  global inheritance, and explicit frontmatter saving; show only a notice when
  local overrides are disabled.
- Group local style and locale inside markdown-citations alongside citation
  data; migrate the old top-level prototype properties during updates.

- Add opt-in per-note frontmatter overrides for citation style and locale only;
  masters use only their own overrides. All other preferences remain global.
- Handle portable bibliography anchor navigation within Obsidian and suppress
  misleading missing-heading hover previews for resolved citation links.
- Support Cmd/Ctrl-click on CodeMirror citation spans in source mode and live
  preview, including Obsidian's mousedown navigation path.
- Use consistent .bib and .json (CSL-JSON) file labels in settings and pickers.

- Remove the unused Pandoc citation-mode selector and stored mode setting;
  document Pandoc authoring/export as a separate workflow outside this plugin.

- Describe bibliography inputs by format (.bib and CSL-JSON), independently of
  the software that produced them.
- Show the current update description automatically once per manifest version,
  acknowledging it only after user dismissal and preserving manual reopening.

- Add the shared About section with **Show last update** and **Show readme**;
  render bundled repository documentation offline without creating vault notes.
- Expand the master workflow documentation with command behavior, cleanup
  examples, shared-chapter safety, and explicit prototype limitations.

- Follow nested note, heading, and block embeds for a shared master bibliography.
- Rebuild a master frontmatter index with file-scoped citation IDs and prune
  references from removed embeds while preserving chapter files.
- Abort incomplete master updates on missing targets, cycles, or invalid data;
  document that embedded chapter labels and cross-note links are not yet rewritten.
- Remove unused local citation records during explicit citation updates.

- Replace obsolete DIN 1505-2 with an explicitly adapted ISO 690:2021
  author-date style with German and English terms.
- Replace Elsevier Vancouver with general NLM/Vancouver and migrate existing
  style settings without automatically rewriting notes.
- Add APS/Physical Review for physics and an explicitly adapted alphabetical
  AMS numeric preset for mathematics; retain IEEE for engineering and computing.
- Put the Add bibliography button in an unframed centered action row and leave
  the optional local library file empty by default.

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
- Store citation details in per-note frontmatter with short link identifiers;
  migrate and remove the old inline citation metadata comments.
- Make **Update citations** reformat citations and the bibliography together,
  preserving per-occurrence locators, prefixes, suffixes, and citation forms.
- Exclude frontmatter, comments, and code examples from citation discovery.
- Escape numeric citation labels inside Markdown links to avoid Obsidian's
  wikilink interpretation and visible link targets.
- Use a readable author fallback for narrative citations in numeric styles.
- Keep DIN access-date separators as literal text after URL line breaks rather
  than turning them into Markdown list items.

## 0.1.0 - 2026-10-28

- Create the independent Markdown Citations project scaffold.
- Add mobile-compatible Obsidian lifecycle and persisted settings.
- Record the product architecture and first prototype milestone.
- Add tests, metadata validation, production build, and test-vault deployment.
- Load and normalize BibTeX, BibLaTeX, and CSL-JSON bibliography files.
- Add mobile-friendly source search and readable Markdown citation insertion.
- Add safe generation and replacement of an owned bibliography block.
