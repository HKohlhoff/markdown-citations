# Konzept: Markdown Citations

## Ziel

Markdown Citations wird ein eigenständiges, veröffentlichbares Obsidian-Plugin
für Quellenverweise und Literaturverzeichnisse. Das sichtbare Ergebnis steht
vollständig in der Markdown-Datei und kann deshalb ohne zusätzliche
Serververarbeitung mit Flowershow veröffentlicht werden.

## Verbindliche Produktentscheidungen

- Markdown ist der Standardmodus. Zitate werden als lesbare Markdown-Links mit
  stabilen Citekeys geschrieben und verweisen auf Einträge im
  Literaturverzeichnis.
- Pandoc-Zitiersyntax ist ein optionaler globaler oder notizbezogener Modus für
  den späteren LaTeX-/PDF-Exporter.
- APA 7 ist der voreingestellte CSL-Stil, aber keine technische Beschränkung.
  Weitere CSL-Stile und Sprachen müssen frei wählbar sein.
- Globale Einstellungen können pro Notiz durch dokumentierte Frontmatter-Felder
  überschrieben werden.
- BibTeX/BibLaTeX und CSL-JSON sind gleichwertige Eingabeformate. Intern werden
  alle Quellen in ein gemeinsames CSL-JSON-Datenmodell normalisiert.
- Zotero ist optional. Mehrere gemischte Bibliografiedateien und eine vom
  Plugin verwaltete lokale CSL-JSON-Bibliothek werden unterstützt.
- Beim Aktualisieren wird die Notiz von oben nach unten analysiert. Dadurch
  bleiben Reihenfolge, numerische Stile und Literaturverzeichnis konsistent.
- Das Literaturverzeichnis wird standardmäßig an der Cursorposition eingefügt
  und anschließend dort aktualisiert. Notizende und Platzhalter sind weitere
  Optionen.
- Ein kleiner Einfügedialog bietet Quellensuche, optionale Seiten- oder
  Abschnittsangaben und eine wissenschaftliche oder redaktionelle Darstellung.
- Ein einfacher Vorlagenmodus darf flexible Verweise erzeugen, aber keine zweite
  Zitierengine mit eigener komplexer Regelsprache werden.

## Vorgesehene technische Grundlage

- `@citation-js/core` für das gemeinsame bibliografische Datenmodell;
- `@citation-js/plugin-bibtex` für BibTeX/BibLaTeX;
- eine CSL-Engine wie `citeproc-js` hinter einer austauschbaren Schnittstelle;
- ausschließlich Obsidian-Vault-APIs für Dateien und Ordner.

Die konkreten Abhängigkeiten werden erst nach einem technischen und
lizenzrechtlichen Prototyp festgeschrieben.

## Markdown-Repräsentation

Ein einfaches Zitat soll beispielsweise so aussehen:

```markdown
[(Müller, 2024)](#ref-mueller2024)
```

Der Literatureintrag erhält das passende stabile Ankerziel. Zusatzinformationen
wie Seitenzahlen sollen lesbar und zuverlässig rekonstruierbar bleiben.
Linktitel sind ein möglicher Speicherort, müssen aber noch in Obsidian und
Flowershow getestet werden. Mehrfachzitate, narrative Zitate und numerische
Stile benötigen eine eigene kompakte Repräsentation.

Normale Markdown-Links dürfen niemals verändert werden. Das Plugin bearbeitet
nur Inhalte, die es eindeutig als eigene Zitate oder als eigenes
Literaturverzeichnis erkennt.

## Plattformen

Das Plugin muss ab dem ersten Prototyp auf macOS, iPadOS und iOS funktionieren.
Es erhält `isDesktopOnly: false`, verwendet keine Node-/Electron-Laufzeit-APIs
und arbeitet mit vorhandenen Bibliografien und CSL-Stilen offline.

## Lizenzrichtung

Der eigene Code wird vorläufig unter `AGPL-3.0-or-later` entwickelt. Vor einer
Veröffentlichung sind zwingend zu prüfen:

1. die Lizenzdatei der konkret eingebundenen citeproc-Version;
2. alle Produktionsabhängigkeiten des fertigen Bundles;
3. Urheber- und Lizenzhinweise der ausgelieferten CSL-Stile;
4. die Kompatibilität aller Bestandteile mit der Projektlizenz.

## Erster technischer Meilenstein

1. eine konfigurierte Bibliografiedatei über die Vault-API lesen;
2. BibTeX/BibLaTeX oder CSL-JSON normalisieren;
3. eine Quelle in einem mobilen Dialog suchen;
4. ein einfaches Markdown-Zitat an der Cursorposition einfügen;
5. ein verlinktes Literaturverzeichnis erzeugen und sicher aktualisieren.

Danach folgen Seitenzahlen, mehrere Quellen, weitere CSL-Stile,
Frontmatter-Überschreibungen und der Pandoc-Modus.
