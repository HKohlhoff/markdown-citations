# Using Zotero with Markdown Citations

This guide explains how to use Zotero with the **Markdown Citations** Obsidian plugin. The plugin reads a bibliography file exported from Zotero, inserts formatted citations into your note, and generates a bibliography containing the sources cited in that note.

There are two separate update mechanisms: Zotero can automatically keep the **exported bibliography file** current, while you use a command in Obsidian to update the **bibliography written into your Markdown note**.

Requires Obsidian **1.13.0 or later** on desktop, iPhone, or iPad. Zotero and
Better BibTeX run on your desktop; the Obsidian plugin works offline with the
exported files. Zotero is optional for the plugin, but used throughout this guide.

## 1. Export your references from Zotero

For an automatically updated export, install the [Better BibTeX add-on for Zotero](https://retorque.re/zotero-better-bibtex/).

In Zotero:

1. Right-click the library or collection you want to use.
2. Choose **Export Library…** or **Export Collection…**.
3. Select one of these formats:
   - **Better BibTeX** or **Better BibLaTeX** for a `.bib` file.
   - **Better CSL JSON** for a `.json` file.
4. Enable **Keep updated**.
5. Save the file directly into a folder inside your Obsidian vault, for example `References/Zotero.json` or `References/Zotero.bib`.

Better BibTeX will then re-export the selected library or collection when its contents change. Zotero needs to be running for this automatic export to take place. You can review the export under **Zotero Settings → Better BibTeX → Automatic exports**. If updates do not appear, check whether automatic export
is paused or configured to wait until Zotero is idle.

Both `.bib` and CSL-JSON work with Markdown Citations. For JSON, make sure you select **Better CSL JSON**, rather than a generic Zotero JSON export.

Saving directly into the vault avoids having to copy the file again after each update. If you initially export elsewhere, copy it into the vault and arrange for subsequent exports to update that same vault file.

Keep citation keys stable after inserting citations. If necessary, pin them in
Better BibTeX before citing. Changing a key later breaks its connection to
existing citations. When using several exports or a local library, keys must be
unique across all configured sources. Avoid adding the same collection in both
`.bib` and `.json` form: duplicate keys are reported and later duplicates ignored.
Do not edit Zotero exports through the local-library manager; Zotero may
overwrite those edits on its next export.

## 2. Configure Markdown Citations in Obsidian

Install and enable **Markdown Citations**, then open **Settings → Markdown Citations**.

The settings are:

| Setting | What it does |
| --- | --- |
| **Bibliography files → Add bibliography file** | Select your exported `.bib` or CSL-JSON file. You can add multiple files. Paths are relative to the vault, for example `References/Zotero.json`. |
| **Local library → Library file** | Optional: a separate CSL-JSON file for references created and edited inside Obsidian. Leave this empty if Zotero supplies all your references. Add your Zotero export under **Bibliography files** instead. |
| **Manage references** | Opens the manager for the optional local library. It does not edit the Zotero exports configured under Bibliography files. |
| **Allow frontmatter overrides** | Allows individual notes to override the citation style and language. Off by default. Source files and bibliography placement remain global settings. |
| **Default citation style** | Select the formatting style, such as APA, Chicago author-date, Harvard, MLA, IEEE, or Vancouver. You can also select a custom `.csl` file stored in the vault. |
| **Default locale** | Select the language used for citation terms and date formatting. For an English note, choose US or UK English as appropriate. |
| **Bibliography position** | Choose **End of note** to insert the bibliography at the end of the Markdown file. The initial default is **Cursor position**. |
| **Insert bibliography heading** | Enable this to generate a heading above the bibliography. Disable it if you already have your own heading. |
| **Bibliography heading** | Enter the heading text, for example `References` or `Bibliography`. |
| **About → Last update → Show last update** | Displays the release notes. |
| **About → README → Show readme** | Opens the full documentation inside Obsidian. |
| **About → Zotero guide → Show Zotero guide** | Opens this step-by-step guide, bundled with the plugin for offline use. |

For your workflow, start with one Zotero export under **Bibliography files**, your preferred style and language, **End of note**, and the heading **References**.

Bibliography position controls the **first insertion**. Once a bibliography exists, later updates replace it at its existing location.

To choose a different style or language for one note, enable **Allow frontmatter
overrides** and run **Markdown Citations: Set note citation style and language**.
Choose **Save to frontmatter and update citations** to apply the selection.
**Use global default** restores inheritance. Only style and language can be
overridden; sources and bibliography settings stay global.

## 3. Insert citations into your note

Open and save a Markdown note, then place the cursor where the citation should appear.

1. Open Obsidian’s command palette.
2. Run **Markdown Citations: Insert citation**.
3. Search by author, title, year, or citation key.
4. Select the source.
5. Choose a parenthetical or narrative citation and optionally add a page number, section, prefix, or suffix.
6. Insert the citation.

Repeat this for the sources you cite. One citation link represents one source;
combined multi-source citation clusters are not supported. After adding or
removing citations, **Update citations** also refreshes existing labels and
numeric numbering together with the bibliography.

Citation details are stored under `markdown-citations` in the note’s frontmatter.
The plugin manages this data and the marked bibliography block. Keep them intact
so later updates can recover pages and other details. To cite in another note,
insert the citation there again; copying only its visible link omits its metadata.

Use this command rather than typing Pandoc citations such as `[@smith2024]`: Markdown Citations does not currently convert that syntax into its managed citations.

## 4. Generate the bibliography

When you have inserted your citations, run:

**Markdown Citations: Insert / update bibliography**

The plugin scans the note’s recognised citations and writes a formatted bibliography containing the cited sources. It does not simply list every reference in your Zotero export.

With **Bibliography position → End of note**, the first bibliography is inserted at the end of the file. Its ordering and formatting follow the selected citation style.

After adding or removing citations, run the command again to refresh the bibliography. If you change the citation style or language, run **Markdown Citations: Update citations** to reformat both the existing citations and the bibliography.

When bibliographic details change in Zotero, wait for the export to finish (and
for it to sync if needed), then run **Update citations** in each affected note.
This refreshes citation text as well as the bibliography. Export changes do not
automatically rewrite your notes.

## 5. Publish the completed note

The citations and bibliography are written into the actual Markdown file. You can therefore publish the completed note with the Obsidian publishing plugin.

Before publishing, run the relevant update command so the note contains the current bibliography. Publishing itself does not trigger Markdown Citations to regenerate it.

For a document assembled from `![[Chapter]]` embeds, run the commands in the
master. **Create / update publication note** generates a separate sibling
`Master_publishVersion.md` with consistent citations and one bibliography.
The working master’s embedded chapter labels are not reformatted globally by
**Update citations**. Regeneration replaces the generated publication note, so
edit the master and chapters instead. See the README for the full workflow.

## 6. Use the same sources on iPhone and iPad

Sync the exported bibliography and any custom `.csl` file into the same
vault-relative paths on every device. With **Obsidian Sync**, enable
**Settings → Sync → Selective sync → Sync all other types** for these files.
Check excluded folders and confirm that the files have arrived. Configure Sync
separately on each device.

To transfer the plugin, also enable **Installed community plugin list** and
**Active community plugin list** under **Vault configuration sync**. Enable
**Community plugin settings** if you want the configured bibliography paths and
other plugin preferences transferred too; otherwise configure them locally.
Wait for synchronization, then fully restart Obsidian on the receiving device.

On mobile, Markdown Citations reads the synced export without a live Zotero
connection. Changes made in Zotero on mobile reach this workflow only after
Zotero on the desktop has synced them and Better BibTeX has updated the export.
The plugin itself provides no Zotero account connection or synchronization.

## If it still does not work

Check these points:

- The export file is physically inside the vault.
- It is selected under **Bibliography files**.
- A `.json` file contains CSL-JSON, not another JSON export format.
- The desired reference belongs to the Zotero library or collection being exported.
- Zotero has finished updating the export file.
- Citations were inserted using **Markdown Citations: Insert citation**.
- You have run **Insert / update bibliography**.
- If the bibliography appears in the middle of the note, check the placement setting and whether an existing bibliography is already there.

On mobile, the plugin can read the same exported file once it has synced into the vault. The automatic Zotero export is performed on your desktop; Markdown Citations does not require a running connection to Zotero.

When asking for help, include the exact error message, selected export format,
plugin version, and configured vault-relative path. Avoid sharing private
bibliography contents unless needed.

## References

- [Markdown Citations — source code and documentation](https://github.com/HKohlhoff/markdown-citations)
- [Better BibTeX — automatic export](https://retorque.re/zotero-better-bibtex/exporting/auto/)
- [Obsidian Sync — settings and selective syncing](https://obsidian.md/help/sync/settings)
- [Better BibTeX — complete documentation](https://retorque.re/zotero-better-bibtex/index.print.html)

