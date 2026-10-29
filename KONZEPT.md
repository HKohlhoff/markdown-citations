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
- Pandoc-Zitiersyntax, Konvertierungsbefehle und die eigentliche Exportstrecke
  gehören nicht zu diesem Plugin. Die README erläutert die Abgrenzung und
  die Verwendung eigener Pandoc-Zitier-/Exportwerkzeuge.
- APA 7 ist der voreingestellte CSL-Stil, aber keine technische Beschränkung.
  Weitere CSL-Stile und Sprachen müssen frei wählbar sein.
- Globale Einstellungen können pro Notiz durch dokumentierte Frontmatter-Felder
  überschrieben werden.
- BibTeX/BibLaTeX und CSL-JSON sind gleichwertige Eingabeformate. Intern werden
  alle Quellen in ein gemeinsames CSL-JSON-Datenmodell normalisiert.
- Zotero ist optional. Mehrere gemischte Bibliografiedateien und eine vom
  Plugin verwaltete lokale CSL-JSON-Bibliothek werden unterstützt.
- Eigene Referenzen werden über bibliografische CSL-Attribute aufgebaut und als
  portables CSL-JSON gespeichert. Eine Vorschau mit dem aktiven CSL-Stil zeigt
  die resultierende Zitat- und Literaturdarstellung; die Datenpflege wird nicht
  zu einer zweiten Formatierungsengine.
- Beim Aktualisieren wird die Notiz von oben nach unten analysiert. Dadurch
  bleiben Reihenfolge, numerische Stile und Literaturverzeichnis konsistent.
- Das Literaturverzeichnis wird standardmäßig an der Cursorposition eingefügt
  und anschließend dort aktualisiert. Das Notizende ist eine weitere Option;
  ein vorhandener Platzhalter wird ohne zusätzliche Einstellung automatisch
  bevorzugt. Die Überschrift kann unabhängig davon ein- oder ausgeschaltet
  werden.
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
Ein eigener Frontmatter-Bereich `markdown-citations` speichert Citekey,
Zitierform, Locator und Zusätze je Zitatstelle. Der normale Markdown-Link
enthält nur eine kurze Kennung als Linktitel (`"mc:c1"`), um die Zitatstelle
auch bei mehrfach zitierter Quelle eindeutig zuzuordnen. Neue Zitate erzeugen
keine Metadatenkommentare im Fließtext. Alte Kommentare werden bei **Update
citations** verlustfrei in die Frontmatter übernommen und entfernt. Der Befehl
aktualisiert Zitate und Literaturverzeichnis gemeinsam. Narrative und
numerische Zitate verwenden dieselbe Repräsentation. Mehrere Quellen werden
vorerst als eigenständige Zitate nacheinander eingefügt; gemeinsame
Mehrfachzitat-Cluster gehören bewusst nicht zum Kernumfang.

Normale Markdown-Links dürfen niemals verändert werden. Das Plugin bearbeitet
nur Inhalte, die es eindeutig als eigene Zitate oder als eigenes
Literaturverzeichnis erkennt.

## Master und eingebettete Kapitel

Der erste Master-Ausbau folgt Notizeinbettungen rekursiv an ihrer Position im
Text. Überschriften- und Blockeinbettungen zählen nur mit dem ausgewählten
Inhalt. Quellen werden dedupliziert, die Lesereihenfolge bleibt für die
CSL-Engine erhalten. Dateien werden mit Obsidian-Auflösung und Vault-API gelesen.

Die lokalen Zitatdetails bleiben in der Kapitel-Frontmatter. Im Master steht
unter `markdown-citations.master` ein jeweils neu aufgebauter Index aus
Quelldatei, lokaler Zitatkennung, Citekey, Details und Anzahl der Einbettungen
sowie dem zuletzt verwendeten Stil und der Sprache. Beim Entfernen von
Einbettungen werden nur die Master-Zuordnungen und das gemeinsame Verzeichnis
bereinigt. Fehlende Dateien/Abschnitte, Kreisverweise und ungültige Daten
führen zum Abbruch, bevor der bisherige Master ersetzt wird.

Kapiteltexte bleiben unverändert. **Create / update publication note** baut eine
separate Datei neben dem Master auf: `Master_publishVersion.md`. Die unterstützten
Einbettungen werden darin durch Text ersetzt, Zitatkennungen neu vergeben und
alle Zitate mit einem gemeinsamen Verzeichnis im Master-Stil formatiert.
Erneutes Ausführen ersetzt die gesamte erzeugte Fassung, einschließlich eigener
Änderungen darin. Die Herkunft steht in `markdown-citations.publication.source`;
nur eine so zugeordnete eigene Ausgabe darf ersetzt werden. Fremde gleichnamige
Dateien und ungespeicherte Ausgabeänderungen werden nicht überschrieben.

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

1. [x] eine konfigurierte Bibliografiedatei über die Vault-API lesen;
2. [x] BibTeX/BibLaTeX oder CSL-JSON normalisieren;
3. [x] eine Quelle in einem mobilen Dialog suchen;
4. [x] ein einfaches Markdown-Zitat an der Cursorposition einfügen;
5. [x] ein verlinktes Literaturverzeichnis erzeugen und sicher aktualisieren.
6. [x] eigene Referenzen in einer lokalen CSL-JSON-Bibliothek erstellen,
   bearbeiten, mit dem aktiven Stil vorab anzeigen und sicher löschen.

Der erste Prototyp verwendet citeproc-js lokal für CSL-formatierte Einzelzitate,
Seiten- und Abschnittsangaben sowie Literaturverzeichnisse. Der gemeinsame
Update-Befehl formatiert vorhandene Zitate und Verzeichnis neu. Dokumentierte
`style` und `locale` unter `markdown-citations` überschreiben ausschließlich Zitierstil und Sprache
nur bei aktivem
Einstellungsschalter (standardmäßig aus); bei Mastern zählen dessen eigene
Eigenschaften. Die verwalteten Zitatdaten bleiben unabhängig davon aktiv.
