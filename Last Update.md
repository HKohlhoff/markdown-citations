# Markdown Citations 1.0.3 — Community directory release

Markdown Citations 1.0.3 formats portable Markdown citations and bibliographies
locally with CSL styles. Source and style dialogs now validate one exact
vault-relative path without enumerating the vault. Citation behavior is
unchanged from 1.0.0.

## Everyday use

1. Select your bibliography files in **.bib** or **.json (CSL-JSON)** format. The
   application used to create them is irrelevant.
2. Run **Insert citation** and optionally enter a page, section, prefix, or suffix.
3. Run **Insert / update bibliography** to place a bibliography.
4. After changing style or language, run **Update citations** to update the
   active note's citations and bibliography together.

Citation details live in the note's `markdown-citations` frontmatter. Short link
titles identify individual citations. Old inline metadata comments migrate to
frontmatter during updates. Numeric citation links now render correctly in
Obsidian, and DOI/URL lines are separate from the bibliographic text.

## Local references

**Manage local references** now creates and edits an ordinary CSL-JSON library
inside the vault. **Create local reference** opens the editor directly. The
settings page provides the same manager beside the local-library path. Opening
these dialogs no longer creates or configures a file. If no path is configured,
saving the first reference creates `MarkdownCitations.json` in the vault root.

The calm basic form begins with type, title, authors, publication date, and
language, then adapts its important publication fields to the selected type.
Books, journal articles, chapters, conference papers, theses, reports, web
pages, datasets, and software therefore expose the details most useful for that
source without opening **Show advanced fields**. The editor now also stores CSL
conference, genre or thesis type, and report-number attributes. The plugin
generates a readable, collision-safe citekey automatically and keeps it stable
on later edits.

A live citation and bibliography preview renders the finished Markdown instead
of showing formatting markers. Its directly visible selector previews any
bundled style or a custom vault `.csl` file without changing global settings or
stored data. CSL remains responsible for punctuation, quotation marks, and the
final appearance; the reference data stays portable and independent of the
chosen style.

Additional CSL fields from externally edited records are retained. Existing
citekeys stay fixed to protect links in notes, generated keys avoid duplicates
in configured libraries, and deletion requires confirmation. Deleting a library
record intentionally leaves existing note text unchanged.

The README now contains the complete setup and entry workflow, person and
organisation examples, a multi-record CSL-JSON example, and an explanation of
which generated Markdown is published with Flowershow.

## Masters and embedded chapters

Both bibliography commands follow full-note, heading, and block embeds,
including nested embeds. Run the command in the master to build its shared
bibliography and frontmatter index.

Remove an embed and update again: its obsolete index records and unused sources
disappear from the master. Sources still cited elsewhere remain. Chapter files
are read without being changed. Missing targets, cycles, and invalid data stop
the update before replacing the master.

**Working-master limitation:** Embedded chapter labels are not yet reformatted or
globally renumbered within the original master. Use the separate publication
version for consistent chapter citations and links.

## Publication version

Run **Create / update publication note** in `Master.md` to create the sibling
**Master_publishVersion.md**. Supported full-note, heading, and block embeds
are assembled into that file. All citations use the master's effective style
and language, including shared numeric numbering and a single bibliography.
Pages and other citation details remain intact. Original notes are unchanged.

Every regeneration rebuilds and replaces the entire generated version. Edit
the sources rather than the generated output. Only an output marked for this
master can be replaced; unrelated same-named files and unsaved output edits are
protected. Missing inputs, invalid citation data, and cycles stop generation.
Media stay linked to their vault files; dynamic plugin content and other
unsupported syntax are not converted. The command works offline and on mobile.

## Styles and settings

Twelve CSL locales are now bundled for fully offline citation formatting:
German, US and UK English, Spanish, French, Italian, Japanese, Dutch, Polish,
Brazilian Portuguese, Russian, and Simplified Chinese. The same choices are
available globally, for enabled note overrides, and when assigning the language
of a local reference.

**Allow frontmatter overrides** is off by default. Enable it to use the active
note's `style` and `locale` properties inside `markdown-citations`. Only style and language can be
overridden locally; all other preferences remain global. Omitted values use global
settings; disabling the switch ignores these properties without disabling
citation metadata. Masters use their own overrides and leave chapter settings
and text unchanged. Run **Update citations** after changing properties.

The new **Set note citation style and language** command offers named styles
and languages in dropdowns and saves the selection to frontmatter. Choose
**Use global default** to remove a local override. With overrides switched off,
the command only displays an explanatory message. Existing local choices are
preselected. **Save to frontmatter** only saves the selection;
**Save to frontmatter and update citations** also refreshes the note's citations
and bibliography immediately.

Citation links now navigate to their HTML bibliography anchors within Obsidian
in reading mode and the editor, without the misleading missing-heading preview.
Published anchors include a portable scroll margin so their bibliography entry
remains visible below fixed website headers. In Obsidian reading mode, the
plugin selects the visible rendered anchor and centers it in the note view.

Nine bundled styles cover APA, Chicago author-date, Harvard Cite Them Right,
MLA, IEEE, NLM/Vancouver, APS/Physical Review, an adapted alphabetical AMS
numeric style, and an adapted localized ISO 690:2021 author-date style.
Existing DIN/Elsevier choices migrate to ISO 690/NLM respectively. Styles only
change note content after a user-started update.

The optional local library file is empty by default. File and folder path
dialogs validate only the exact vault-relative path entered by the user. The
former unused citation-mode selector has been removed; the plugin always writes
finished Markdown. Pandoc citation syntax and export belong to a separate
authoring/export workflow, as explained in the README.

## Documentation

At the bottom of the settings, **About → Show readme** opens the complete bundled
README; **Show last update** reopens this description. Both dialogs work offline
and leave no documentation notes in your vault. Close them with **Close** or
Escape. Disabling the plugin closes its open documentation dialogs.

This description opens automatically once per plugin version, including the
first activation. It is marked as read only after you close it; the marker is
stored in plugin data for that exact version. Starting Obsidian or hot-reloading
the same version does not show it again after acknowledgement. Disabling the
plugin while the dialog is open does not mark it as read. You can reopen it
anytime with **Show last update**.

If Markdown Citations helps your work, you can
[support its development on Ko-fi](https://ko-fi.com/hokdev).
