# Markdown Citations

Markdown Citations creates readable, portable citations and bibliographies from
bibliography files in **.bib** or **.json (CSL-JSON)** format. It does not matter which
application created the files or where the bibliographic data originated.
`.bib` files may use BibTeX or BibLaTeX syntax; JSON files must contain CSL-JSON
bibliographic records rather than arbitrary JSON data.

Version 0.1.0 is the first working prototype. It loads .bib and .json (CSL-JSON)
files through the Obsidian Vault API, offers a mobile-friendly source
search, formats citations and bibliographies locally with citeproc-js, writes
the finished result as portable Markdown, and creates or updates an owned
bibliography block.

The settings page provides searchable Vault file and folder selectors, wide
path fields, and a dropdown containing nine bundled CSL styles: APA 7,
Chicago author-date, Harvard Cite Them Right, MLA 9, IEEE, NLM/Vancouver,
ISO 690:2021 (localized adaptation), APS/Physical Review, and AMS numeric
(alphabetical adaptation). Custom `.csl` files stored in the vault can also be
selected. The optional local library file is empty by default.

IEEE covers engineering and computing; APS covers physics. The AMS adaptation
uses mathematical bibliography formatting with alphabetical reference ordering;
APS numbers references in first-citation order. ISO 690 uses the upstream 2021
author-date style with language-specific terms, rather than the older German
CSL based on DIN ISO 690:2013. Existing DIN and Elsevier style settings migrate
to ISO 690 and general NLM/Vancouver respectively. No notes are automatically
reformatted when settings migrate: run **Update citations** when desired.

The two adapted styles are clearly labeled and documented in
`resources/csl/README.md`; they are not claims of certified standards compliance.

## Goals

- produce Markdown that remains readable without the plugin;
- publish the same notes directly with Flowershow;
- support multiple bibliography files and a local vault library;
- use CSL styles instead of implementing citation rules ourselves;
- work on macOS, iPadOS, and iOS without Node or Electron runtime APIs.

The complete product decisions and open technical questions are recorded in
[KONZEPT.md](KONZEPT.md).

## Prototype workflow

1. Select one or more bibliography files in the plugin settings.
2. Run **Markdown Citations: Insert citation** in an open Markdown note.
3. Search by author, title, year, or citekey and select a source.
4. Choose the citation form and optionally add a page, section, prefix, or
   suffix. The preview uses the selected CSL style.
5. Run **Markdown Citations: Insert / update bibliography**.

The selected CSL style now formats single citations, locators, and bibliography
entries. Multiple sources can be inserted as consecutive independent citations;
combined citation clusters are deliberately outside the initial core scope.
The plugin always inserts finished, readable Markdown citations.

## Local references

Markdown Citations can maintain an optional local CSL-JSON library inside the
vault. Use **Markdown Citations: Manage local references**, **Create local
reference**, or **Manage references** beside the local library path in settings.
If no path has been chosen yet, the first of these actions creates
`MarkdownCitations.json` in the vault root and stores that path in the plugin
settings. A destination folder selected in settings uses the same filename in
that folder.

The reference editor starts with the essential attributes: reference type,
title, authors, publication date, and language. **Show advanced fields** adds
editors, container title, volume, issue, edition, pages, publisher and place,
ISBN, DOI, URL, and access date. Enter one author or editor per line. Use
`Family, Given` for a person and a line without a comma for an organisation.
Dates accept `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`; DOI URLs are normalized to
their DOI identifier.

The plugin creates a readable citekey from the first author or organisation,
year, and title, transliterates it for portability, and adds a numeric suffix
when necessary. The citekey remains fixed on later edits so existing citation
links stay valid.

The live preview shows both the citation and bibliography entry using the
current global locale and CSL style, including a custom `.csl` file from the
vault. **Change preview style** can temporarily preview any bundled style or a
custom vault `.csl` file without changing global settings or reference data.
CSL determines punctuation, ordering, labels, italics, and which supplied
attributes are displayed. The editor therefore remains a bibliographic data
editor rather than introducing a second formatting language.

The local library remains ordinary, indented CSL-JSON and can be read or edited
by other tools. When Markdown Citations edits an existing entry, additional CSL
fields it does not expose are preserved. Existing citekeys cannot be renamed
because notes may already link to them. Deleting a local reference
does not delete citation links from notes; those links can no longer be updated
unless the same citekey is restored. Generated citekeys are kept unique across
the configured bibliography files and local library.

After changing the citation style or language, run **Update citations** to
reformat citations and the bibliography together. Citation details such as
locators, prefixes, and suffixes are stored in the note's `markdown-citations`
frontmatter field. Each link carries a short title such as `"mc:c1"` to identify
its citation instance. There are no inline metadata comments in new citations.
Existing prototype comments are migrated to frontmatter and removed on update;
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
off, local style/language choices are ignored and global settings apply. Managed citation
data remains active either way.

Use **Markdown Citations: Set note citation style and language** in the current
note to choose the style by its full name and select the language from a
dropdown, just as in settings. The dialog also offers a vault picker for custom
CSL files. **Save to frontmatter** writes only `style` and `locale` under
`markdown-citations`; it
does not reformat the text. Run **Update citations** afterwards, or choose
**Save to frontmatter and update citations** to save and refresh the current
note's citations and bibliography together. Existing local values are selected
when the dialog opens. **Use global
default** removes the corresponding local property so the note inherits that
global preference. Cancel leaves the note unchanged. With overrides disabled,
the command only displays a message explaining which switch to enable.

| Property | Value |
| --- | --- |
| `markdown-citations.style` | Bundled style ID, e.g. `apa`, `ieee`, `chicago-author-date`, or a vault-relative custom `.csl` file path. |
| `markdown-citations.locale` | `de-DE`, `en-US`, or `en-GB`. |

```yaml
---
markdown-citations:
  style: chicago-author-date
  locale: de-DE
---
```

Only citation style and language can be overridden locally. Sources, the local
library, heading, heading visibility, and insertion position always use global
settings. Omitted or blank style/language properties fall back to globals.
Invalid enabled values stop the command with an explanation before modifying
the note.

These properties apply to citation previews, inserted
citations, and bibliography commands. Run **Update citations** after editing
them to refresh existing output; editing properties alone does not trigger an
update. Global preferences are never overwritten. The same `markdown-citations`
group also holds managed `version`, `citations`, and optional `master` fields;
those do not need manual editing. Style and language survive citation updates.
Old top-level prototype properties migrate into this group on the next citation
update or when saving through the dialog.

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

## Masters with embedded chapters

### Start from the master

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

### What is included

Both bibliography commands follow `![[Note]]` embeds recursively in reading
order. Paths and aliases use Obsidian's own link resolution. Heading and block
embeds such as `![[Chapter#Section]]` and `![[Chapter#^block]]` contribute only
the selected fragment. Images, ordinary wikilinks, code examples, comments,
frontmatter, and existing bibliography blocks do not add sources.

Only explicit `![[...]]` note embeds are followed in this prototype. Notes merely
linked with `[[...]]`, Markdown-form note embeds, and content generated by
Dataview or other plugins do not expand the document. The master uses the
effective style and language (global settings or its own enabled overrides) and records that choice in its
index; the index is a snapshot, not an automatic per-note style override.

### Where citation data lives

The master's `markdown-citations.master` field is a rebuilt index containing
the effective style/locale, embedded document paths, and citation records keyed
by source path plus local citation ID. The actual locator, prefix, suffix, and
citation-form data remain with the source chapter; the index snapshots these
details for the current master. Repeated embeddings count occurrences without
duplicating bibliography entries. Each master has its own independent index.

For example, `c1` in `Introduction.md` and `c1` in `Main chapter.md` identify
different citation locations. Their original frontmatter records stay in their
respective files. The master index distinguishes them by **file path + local
citation ID**, including their separate page locators. Editing a page number
in a source chapter is reflected in its master index after the next update.

### Removing or changing an embedding

Removing an embed or changing a selected section removes stale master records
and bibliography entries on the next update. A source still cited elsewhere
remains. Removing the last embed leaves an empty chapter index rather than
reusing old data. **Update citations** also removes unused local citation
records from the active note's frontmatter. Other YAML fields are preserved.

If you remove `![[Main chapter]]`, the next update removes its index records and
any bibliography entries no longer cited in the remaining included content.
If the same source also appears in `Introduction.md`, its bibliography entry
stays. Replacing a full-note embed with a heading/block embed reduces the index
to that selected content. The removed chapter's file and citation metadata are
never deleted. Multiple masters can therefore share the same chapter safely.

Updates are explicit: editing a chapter or removing an embed does not trigger
live synchronization. Run one of the commands again when ready. A reported
error leaves the previous master content intact; fix the target/data and retry.

### Errors and current limits

Missing notes, missing selected sections/blocks, cycles, missing bibliography
sources, invalid citation records, and excessive recursion stop the update
before the active editor changes. Save notes before using heading/block embeds
so Obsidian's section metadata matches their content.

This first master stage reads chapters without rewriting them. **Update
citations** reformats citations physically present in the master and generates
the shared bibliography with all collected sources, but embedded chapter labels
retain their saved formatting and numbers. Thus numeric chapter labels are
not yet globally renumbered across the master, and links from embedded chapters
to the master bibliography need an assembled output. Use **Create / update
publication note** for that output; shared chapters cannot store different
labels for multiple masters at once.

### Create the publication version

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
frontmatter properties are retained in the output. Its `markdown-citations`
group contains a fresh citation registry, the effective style/language, and
`publication.source` identifying its original master. Existing master indexes
are not copied into the assembled registry.

**Regenerating means rebuilding the entire generated file from the current
sources and replacing its previous contents.** Edit the original master or
chapters: manual edits in a saved publication version are replaced next time.
There is no live synchronization. Run the command in the original master again
after changes; the publication itself cannot be used as input to this command.

The publication is also a standalone citation note: with overrides enabled,
**Set note citation style and language** can change its own local style, and
**Save to frontmatter and update citations** reformats its entire assembled
text and bibliography together. This does not change the original master.
Regenerating from the master replaces these local output changes as well.
Keep an independent copy under another filename if you want to retain a separate
edition permanently.

A differently named copy is never the original master's output destination.
For a completely independent ordinary citation note, remove the entire
`markdown-citations.publication` subsection (including `source`) from the copy.
Keep `style`, `locale`, and `citations`; local style changes and citation updates
continue to work. The original generated output should retain its ownership.

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

## Pandoc and book-writing workflows

Pandoc citation syntax, conversion to that syntax, and running a document
exporter are deliberately outside this plugin's scope. There is no citation-mode
selector. Older saved `citationMode` values are ignored and omitted the next
time plugin settings are saved. Existing notes are never converted as part of
that settings cleanup.

For a manuscript that Pandoc should format into a book, you can author native
Pandoc citations such as `[@mueller2024, p. 23]` directly. A dedicated citation
plugin can help search a `.bib`/CSL-JSON library and insert this syntax, but is
not required to type it. The chosen export workflow must then supply the
bibliography, CSL style, and citation processor. It must also assemble Obsidian
embeds and prepare any target-specific math, figures, and cross-references.
Inserting a citation is not itself an export pipeline.

Finished Markdown Citations text can be passed to a converter as ordinary
formatted text. That does not make it a native Pandoc citation, and citation
links may need target-specific handling. To let Pandoc reformat these citations,
an external conversion step would need to transform the owned citation links,
preserve locators/prefixes/suffixes, omit the pre-generated bibliography, and
provide the bibliography/style inputs. Only plugin-owned metadata should be
removed from an export copy; title, author, language, and other useful
frontmatter should be retained. Shared embedded notes should not be rewritten
implicitly. This plugin does not perform that conversion.

## About and built-in documentation

At the bottom of the settings, **About** offers **Show last update** and
**Show readme**, following the same convention as Canvas HTML Exporter.

- **Show last update** opens the current prototype's features, usage notes,
  and known limits from the repository's `Last Update.md`.
- **Show readme** renders this exact repository README, bundled at build time.
  Images are omitted in the dialog, while documentation and support links
  remain usable. Relative documentation links point to this repository's
  development branch. Opening an external link requires network access;
  reading the bundled documentation does not.

Both dialogs work on desktop and mobile, can be closed with **Close** or Escape,
and create no notes or other documentation files in the vault. Disabling the
plugin closes its open documentation dialogs and releases their renderers.
The update description also opens automatically after the workspace is ready
when the plugin is first enabled or its version changes. It is marked as read
only after you close it, and that acknowledgement is stored in plugin data
for the exact manifest version. It will not reappear on every start or hot
reload of that same version. Disabling the plugin while the dialog is open
does not acknowledge it. **Show last update** always lets you reopen it manually;
repeated requests while it is already open reuse that one dialog.

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
currently bundled citation dependencies, CSL styles, and locales are recorded
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `LICENSES/`. Every
release still requires a fresh production dependency and bundled-content audit.
