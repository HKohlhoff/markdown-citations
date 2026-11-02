# Markdown Citations

Markdown Citations creates finished, portable Markdown citations and
bibliographies from BibTeX, BibLaTeX, and CSL-JSON files. The generated text
remains readable when the plugin is disabled and can be published directly with
the rest of the note.

Bibliography files and local references stay inside the Obsidian vault. Citation
processing runs locally without telemetry, accounts, or network requests.
Markdown Citations works on desktop and mobile and requires Obsidian 1.13.0 or
later. Version 1.0.0 is the initial public release.

## Features

- **Bibliography sources:** Search multiple `.bib` and `.json` (CSL-JSON) files
  by author, title, year, or citekey.
- **Citations:** Insert parenthetical or narrative citations with optional
  locators, prefixes, and suffixes.
- **Bibliography:** Generate and safely update a readable Markdown bibliography
  containing the sources cited in the current note.
- **Local references:** Create and edit references in an optional local CSL-JSON
  library without requiring Zotero or another reference manager.
- **CSL formatting:** Choose from nine bundled CSL styles or select a custom
  `.csl` file stored in the vault. Format citations with twelve bundled CSL
  locales, fully offline.
- **Per-note formatting:** Override citation style and locale for individual
  notes when explicitly enabled.
- **Portable output:** Keep generated Markdown usable in Obsidian, Flowershow,
  and other Markdown workflows without a proprietary citation format.

### Advanced workflow: masters and publication notes

For longer documents split across embedded chapter notes, Markdown Citations
also provides an optional document-wide workflow:

- **Master bibliography:** Collect citations from a master note and its embedded
  chapters into one shared bibliography without rewriting the chapter files.
- **Publication note:** Create a separate, assembled Markdown note with expanded
  embeds, consistently formatted citations, and one document-wide bibliography.

## Installation

Install Markdown Citations directly from **Settings → Community plugins →
Browse** in Obsidian.

For a manual installation, download `main.js`, `manifest.json`, and `styles.css`
from a GitHub release and place them in:

```text
<vault>/.obsidian/plugins/markdown-citations/
```

Then reload Obsidian and enable **Markdown Citations** under Community plugins.

## Quick start

1. Open the Markdown Citations settings and select one or more bibliography
   files in `.bib` or `.json` (CSL-JSON) format.
2. Choose the default citation style and locale.
3. Run **Markdown Citations: Insert citation** in an open Markdown note.
4. Search for a source, choose the citation form, and optionally add a page,
   section, prefix, or suffix.
5. Run **Markdown Citations: Insert / update bibliography**.
6. Run **Markdown Citations: Update citations** after changing a style or
   locale to reformat existing citations and the bibliography together.

Markdown Citations inserts one source per citation link. Multiple sources can
be inserted as consecutive citations; combined citation clusters are not
supported.

## Citation styles and locales

The plugin bundles APA 7, Chicago author-date, Harvard Cite Them Right, MLA 9,
IEEE, NLM/Vancouver, ISO 690:2021 (localized adaptation), APS/Physical Review,
and AMS numeric (alphabetical adaptation). Custom `.csl` files stored in the
vault can also be selected.

IEEE covers engineering and computing; APS covers physics. The AMS adaptation
uses mathematical bibliography formatting with alphabetical reference ordering;
APS numbers references in first-citation order. ISO 690 uses the upstream 2021
author-date style with language-specific terms, rather than the older German
CSL based on DIN ISO 690:2013.

The citation processor includes twelve offline CSL locales: German, US and UK
English, Spanish, French, Italian, Japanese, Dutch, Polish, Brazilian
Portuguese, Russian, and Simplified Chinese. A locale supplies translated terms,
date forms, and language-specific typographic conventions; the selected CSL
style still determines the structure and formatting of the citation.

The two adapted styles are clearly labeled and documented in
[`resources/csl/README.md`](resources/csl/README.md). They are localized or
sorted adaptations, not claims of certified standards compliance.

## Local references

Markdown Citations can maintain an optional local CSL-JSON library inside the
vault. Use **Markdown Citations: Manage local references**, **Create local
reference**, or **Manage references** beside the local library path in settings.
If no path has been chosen yet, opening the manager or editor does not create a
file or change the settings. Saving the first reference creates
`MarkdownCitations.json` in the vault root and stores that path. A destination
folder selected in settings uses the same filename in that folder.

### Bibliography JSON or managed local library?

Both use the same portable CSL-JSON data format, but they serve different
workflows:

- Add an existing `.json (CSL-JSON)` file under **Bibliography files** when it
  comes from Zotero or another application. Markdown Citations reads it as a
  source but does not offer its records in **Manage local references**.
- Configure one file under **Local library** when references should be created,
  edited, and deleted inside Obsidian. This is the file managed by the reference
  dialog. Only one managed local-library file can be active at a time.
- Both kinds of files can be active together with any number of `.bib` files.
  Their citekeys share one namespace and therefore must be unique.

The file and folder buttons beside **Library file** open a path dialog for an
existing CSL-JSON file or the destination folder for `MarkdownCitations.json`.
Enter the exact vault-relative path; the plugin validates only that path and
does not enumerate the vault. The trash button only clears the configured path;
it never deletes the file.

### Create a reference in the dialog

1. Run **Create local reference** or choose **Create reference** in the manager.
2. Select the reference type and enter title, authors, publication date, and
   language.
3. Complete the type-specific fields shown in the basic form. For example, a
   book asks for edition, publisher, and ISBN; a web page for URL and access
   date; software for version, URL, and DOI.
4. Open **Show advanced fields** only when additional publication details,
   identifiers, editors, or access information are needed.
5. Check the citation and bibliography preview. Its style selector is temporary
   and does not modify the global plugin style or the stored reference.
6. Choose **Create reference**. The plugin writes the entry to the configured
   local CSL-JSON file and reports its generated citekey.

The reference editor always starts with reference type, title, authors,
publication date, and language. The language initially follows the global
locale, but serves a different purpose: it describes the referenced work,
whereas the global or note-specific locale controls the language of generated
citations.

The remaining basic fields adapt to the selected reference type:

| Reference type | Basic publication fields |
| --- | --- |
| Book | Edition, publisher, ISBN |
| Journal article | Journal, volume, issue, pages, DOI |
| Book chapter | Book title, editors, pages, ISBN |
| Conference paper | Proceedings, conference, pages, DOI |
| Thesis | Thesis type, university |
| Report | Institution, report number |
| Web page | URL, access date |
| Dataset | Version, publisher, DOI |
| Software | Version, URL, DOI |

Open **Show advanced fields** for additional supported publication details,
identifiers, editors, event information, publisher data, and access information.
Dates accept `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; DOI URLs are normalized to
their DOI identifier.

Enter authors and editors one per line, with family name first:

```text
Müller, Anna
Schmidt, Boris
```

Enter an institution or project without a comma so that it remains a literal
organisation name:

```text
Open Research Group
```

The plugin creates a readable citekey from the first author or organisation,
year, and title, transliterates it for portability, and adds a numeric suffix
when necessary. The citekey remains fixed on later edits so existing citation
links stay valid.

The live preview shows both the citation and bibliography entry using the
current global locale and CSL style, including a custom `.csl` file from the
vault. Its directly visible style selector can temporarily preview any bundled
style or a custom vault `.csl` file without changing global settings or
reference data. The preview renders the finished Markdown, including italics.
CSL determines punctuation, quotation marks, ordering, labels, italics, and
which supplied attributes are displayed. The editor therefore remains a
bibliographic data editor rather than introducing a second formatting language.

The local library remains ordinary, indented CSL-JSON and can be read or edited
by other tools. When Markdown Citations edits an existing entry, additional CSL
fields it does not expose are preserved. Existing citekeys cannot be renamed
because notes may already link to them. Deleting a local reference
does not delete citation links from notes; those links can no longer be updated
unless the same citekey is restored. Generated citekeys are kept unique across
the configured bibliography files and local library.

### CSL-JSON file example

A CSL-JSON bibliography normally uses a JSON array in which each object is one
bibliographic record; the parser also accepts a single record object. The
managed local library is always written as an indented array. `id` and
`citation-key` identify the record; Markdown Citations writes the same generated
value to both fields:

```json
[
  {
    "type": "book",
    "id": "mueller-2026-portable-zitate",
    "citation-key": "mueller-2026-portable-zitate",
    "title": "Portable Zitate",
    "author": [
      { "family": "Müller", "given": "Anna" }
    ],
    "issued": { "date-parts": [[2026]] },
    "edition": "2",
    "publisher": "Beispielverlag",
    "publisher-place": "Berlin",
    "ISBN": "978-3-00-000000-0",
    "language": "de-DE"
  }
]
```

The file may also be edited with another tool. Keep `id` and `citation-key`
stable after a citation has been inserted; changing either value breaks the
connection from existing notes. Standard CSL fields not shown by the dialog are
retained when the plugin later edits that record. Invalid JSON, duplicate or
unsafe citekeys, and missing types are reported before a managed update is
written. The reference dialog additionally requires a title before saving.

## Portable Markdown and Flowershow

The bibliography files are source data. The published note itself contains the
finished, readable Markdown citation and bibliography, including ordinary links
to stable HTML anchors such as `#ref-mueller-2026-portable-zitate`. Flowershow
does not need Markdown Citations, citeproc, Zotero, or access to the CSL-JSON
file to display that generated result. This separation is deliberate: the
published result is the same Markdown that remains readable in the vault when
the plugin is disabled.

### Citation metadata and safe updates

After changing the citation style or language, run **Update citations** to
reformat citations and the bibliography together. Citation details such as
locators, prefixes, and suffixes are stored in the note's `markdown-citations`
frontmatter field. Each link carries a short title such as `"mc:c1"` to identify
its citation instance. There are no inline metadata comments in new citations.
Legacy inline metadata comments are migrated to frontmatter and removed on update;
older plain links are adopted when their visible details can be recovered.
Unrecognized citations are preserved and reported instead of losing details.

For example, two occurrences of the same source can retain different pages:

```yaml
markdown-citations:
  version: 1
  citations:
    c1:
      citeKey: mueller2024
      locatorType: page
      locator: "23"
    c2:
      citeKey: mueller2024
      locatorType: page
      locator: "27"
```

The corresponding links use `(#ref-mueller2024 "mc:c1")` and
`(#ref-mueller2024 "mc:c2")`. Obsidian's property editor does not offer nested
field editing; the plugin manages this field. Other YAML fields and their
formatting are preserved. Invalid or unsupported citation data stops an update
before the note is changed. Copying a citation to another note requires its
frontmatter entry as well; inserting it anew is the simplest approach.

The bibliography is bounded by two ownership markers. Only this owned block is
replaced during an update; normal Markdown links and unrelated text remain
untouched.

## Per-note settings

Enable **Allow frontmatter overrides** in settings to use these optional note
properties under `markdown-citations`. The switch is **off by default**. When
off, local style and locale choices are ignored and global settings apply;
managed citation data remains active.

Use **Markdown Citations: Set note citation style and language** in the current
note. The dialog offers all bundled choices and a path dialog for custom CSL
files. **Save to frontmatter** changes only the properties;
**Save to frontmatter and update citations** also reformats the note immediately.
**Use global default** removes the local property and restores inheritance.

| Property | Value |
| --- | --- |
| `markdown-citations.style` | Bundled style ID, e.g. `apa`, `ieee`, `chicago-author-date`, or a vault-relative custom `.csl` file path. |
| `markdown-citations.locale` | Bundled locale ID: `de-DE`, `en-US`, `en-GB`, `es-ES`, `fr-FR`, `it-IT`, `ja-JP`, `nl-NL`, `pl-PL`, `pt-BR`, `ru-RU`, or `zh-CN`. |

```yaml
---
markdown-citations:
  style: chicago-author-date
  locale: de-DE
---
```

Only citation style and locale can be overridden locally. Sources, the local
library, heading, heading visibility, and insertion position always use global
settings. Omitted or blank style/locale properties fall back to globals.
Invalid enabled values stop the command with an explanation before modifying
the note.

The overrides apply to previews, inserted citations, updates, and bibliography
commands. Editing them manually does not reformat existing text; run **Update
citations** afterwards. The plugin manages the other fields in the same
`markdown-citations` group and preserves unrelated frontmatter.

For a master, only the master's overrides govern the shared bibliography and
index. Embedded chapters' style/language overrides are ignored during aggregation.
Opening and updating a chapter separately uses that chapter's own properties.

### Citation links in Obsidian

Citation links point to portable HTML anchors in the bibliography. While the
plugin is enabled, clicking a citation in Obsidian jumps to the matching entry
in the same note: click in reading mode, or use Cmd-click (macOS) / Ctrl-click
in the editor, including live preview and source mode. Normal editor clicks
still place the cursor for editing. Obsidian normally interprets
such fragments as headings, so the plugin provides this navigation and
suppresses its misleading missing-heading hover preview. Web publication uses
the ordinary HTML anchors. Cross-note links from embedded chapters still have
the limitations described below.

## Advanced usage

### Master documents with embedded chapters

#### Start from the master

For a document split into chapters, place the bibliography in the master and
run the commands **in that master**, not in an individual chapter. For example:

```text
Book/
  Master.md
  Introduction.md
  Main chapter.md
  Appendix.md
```

The body of `Master.md` can contain:

```markdown
# My document

![[Introduction]]
![[Main chapter]]
![[Appendix#Sources and methods]]
```

Insert citations while writing the individual chapters. Then open the master
and run **Insert / update bibliography**. The bibliography will include the
sources cited in those included parts, as well as sources cited directly in
the master. There is no need to copy chapter citations into the master's text.

| Command run in the master | Result |
| --- | --- |
| **Insert / update bibliography** | Collect the included citations, rebuild the master index, and create/update the common bibliography. Existing citation labels are preserved. |
| **Update citations** | Do the same collection and bibliography update, and also reformat citation links physically written in the master. Embedded chapter text is not rewritten. |
| **Create / update publication note** | Assemble a separate sibling Markdown file with embedded text, consistently formatted citations, and one shared bibliography. |

#### What is included

Both bibliography commands follow `![[Note]]` embeds recursively in reading
order. Paths and aliases use Obsidian's own link resolution. Heading and block
embeds such as `![[Chapter#Section]]` and `![[Chapter#^block]]` contribute only
the selected fragment. Images, ordinary wikilinks, code examples, comments,
frontmatter, and existing bibliography blocks do not add sources.

Only explicit `![[...]]` note embeds are followed. Notes merely linked with
`[[...]]`, Markdown-form note embeds, and content generated by Dataview or
other plugins do not expand the document. The master uses the effective style
and locale—global settings or its own enabled overrides—and records that choice
in its index.

#### Where citation data lives

The master's `markdown-citations.master` field is a rebuilt index containing
the effective style and locale, included document paths, and file-scoped
citation records. Citation details remain in their source chapters; the master
stores only the snapshot needed for its shared bibliography. Repeated embeds do
not duplicate bibliography entries, and each master keeps an independent index.
Changes in a source chapter are picked up on the next explicit update.

#### Removing or changing an embedding

Removing an embed or changing a selected section removes stale master records
and bibliography entries on the next update. A source still cited elsewhere
remains. The removed chapter and its citation metadata are never changed, so
multiple masters can safely share the same chapter. **Update citations** also
removes unused local citation records from the active note while preserving
other frontmatter.

Updates are explicit: editing a chapter or removing an embed does not trigger
live synchronization. Run one of the commands again when ready. A reported
error leaves the previous master content intact; fix the target/data and retry.

#### Errors and current limits

Missing notes, missing selected sections/blocks, cycles, missing bibliography
sources, invalid citation records, and excessive recursion stop the update
before the active editor changes. Save notes before using heading/block embeds
so Obsidian's section metadata matches their content.

The master bibliography workflow reads chapters without rewriting them.
**Update citations** reformats citations physically present in the master and
generates the shared bibliography, but embedded chapter labels retain their
saved formatting and numbers. Numeric chapter labels are not yet globally renumbered across the master.
Use **Create / update publication note** when the assembled document needs
consistent labels and working bibliography links.

### Publication notes

Run **Markdown Citations: Create / update publication note** in the original
master. `Book/Master.md` produces **`Book/Master_publishVersion.md`**, next to
the master. The file opens after generation. No external exporter is required;
the command also works on mobile.

The command recursively replaces supported note embeds with their selected
text. Child frontmatter and child bibliography blocks are omitted. Citations
from every included part are reformatted using the master's effective style
and language; numeric styles receive one consistent numbering across the
assembled document. Locators, prefixes, suffixes, and narrative forms remain
attached to the correct citation, even when chapters share local IDs. Citation
links and bibliography anchors now live in the same note.

The original master and chapters are read without modification. Other master
frontmatter properties are retained in the output, together with the citation
registry and ownership information needed to update the generated file safely.

**Regenerating means rebuilding the entire generated file from the current
sources and replacing its previous contents.** Edit the original master or
chapters: manual edits in a saved publication version are replaced next time.
There is no live synchronization. Run the command in the original master again
after changes; the publication itself cannot be used as input to this command.

The publication can be reformatted independently as a standalone citation note,
but regenerating it from the master replaces those local output changes. To keep
a separate edition, copy it under another filename and remove the copied
`markdown-citations.publication` ownership subsection. Keep the generated
output's ownership information intact.

An existing destination is replaced only if its publication ownership matches
this master. An unrelated file with the same name, unsaved output edits,
missing notes/sources, invalid citation details, cycles, or detected changes
during generation stop the command before replacement. Never remove or alter
the ownership field if you want the plugin to update its generated file.

Resolved inline Markdown and wiki links from nested folders are rebased for
the output location. Media remain linked to their existing vault files and
are not copied. Only the supported wiki note embeds are assembled: dynamic
plugin content, reference-style Markdown links, and other Obsidian-specific
syntax are not converted into standard Markdown. Unresolved ordinary links
remain as written. Check these separately for your publishing system.

## Pandoc

Markdown Citations creates finished, readable Markdown rather than native
Pandoc citation syntax and is therefore not intended to manage citations for a
Pandoc-based export workflow.

## About and built-in documentation

At the bottom of the settings, **About** offers **Show last update** and
**Show readme**, following the same convention as Canvas HTML Exporter.

- **Show last update** opens the current version's features, usage notes,
  and known limits from the repository's `Last Update.md`.
- **Show readme** renders this exact repository README, bundled at build time.
  Images are omitted in the dialog, while documentation and support links
  remain usable. Relative documentation links point to this repository.
  Opening an external link requires network access; reading the bundled
  documentation does not.

Both dialogs work on desktop and mobile, can be closed with **Close** or Escape,
and create no documentation files in the vault. The update description opens
automatically once for each new plugin version and is marked as read only after
it is closed. **Show last update** can reopen it at any time.

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

## Repository workflow

The project uses GitFlow:

- `main` contains released states;
- `develop` is the integration branch;
- `feature/*` branches start from `develop`;
- release and hotfix branches are merged with explicit merge commits.

The source repository is
<https://github.com/HKohlhoff/markdown-citations>. Local production builds do
not push, tag, or publish releases.

## Privacy

Markdown Citations processes bibliography files, citations, styles, and locales
locally. It contains no telemetry, analytics, network requests, or external
service integration. Network access occurs only when the user explicitly opens
an external documentation or support link.

## Support and feedback

Report bugs and request features through the
[GitHub issue tracker](https://github.com/HKohlhoff/markdown-citations/issues).
If Markdown Citations is useful to you, you can
[support its continued development on Ko-fi](https://ko-fi.com/hokdev).

## License

Copyright © 2026 Holger Kohlhoff.

Markdown Citations is licensed under the GNU Affero General Public License,
version 3 or later. Third-party components retain their own licenses. The
currently bundled citation dependencies, CSL styles, and locales are recorded
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `LICENSES/`.
