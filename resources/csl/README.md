# Bundled citation styles

Upstream project: https://citationstyles.org/

Repository: https://github.com/citation-style-language/styles

All styles retain their original author/contributor metadata and CC BY-SA 3.0
license. The newly selected styles below were retrieved on 2026-10-28 from
the validated CSL v1.0.2 branch at commit
`7bf7ec05bc31509d640c9a3ccf8f561f2b3d748b`.

| Bundled file | Upstream file | Changes |
| --- | --- | --- |
| `american-physics-society.csl` | `american-physics-society.csl` | Unmodified APS / Physical Review style |
| `nlm-citation-sequence.csl` | `nlm-citation-sequence.csl` | Unmodified general NLM/Vancouver style |
| `iso690-author-date-localized.csl` | `iso690-author-date-en.csl` | Local adaptation described below |
| `ams-numeric-alphabetical.csl` | `american-mathematical-society-numeric.csl` | Local adaptation described below |

## ISO 690:2021 localized adaptation

The upstream English author-date file explicitly identifies ISO 690:2021(E)
as its basis. In contrast, the upstream German file still identifies
DIN ISO 690:2013-10. This plugin therefore adapts the 2021 base:

- use a new title, self identifier, template link, timestamp, and contributor;
- set the default language to German;
- scope upstream English term overrides to `xml:lang="en"` so German output
  uses the selected German CSL locale and English output retains those terms.

Citation and bibliography rules otherwise remain unchanged from that base.
The dropdown labels the style as adapted. This is a localization of the CSL
implementation, not a certified conformity assessment of ISO 690:2021.

## AMS numeric alphabetical adaptation

The upstream numeric file supplies AMS bibliography formatting but does not
declare bibliography sorting. To provide the alphabetical bibliography expected
by this preset, the adaptation adds sorting by author, issued date, and title.
The CSL processor assigns citation numbers consistently with that ordering.
It retains the upstream author and contributor credits, adds adaptation credit,
and uses its own title, self identifier, template link, and timestamp.

This is explicitly an adapted preset, not a claim that all mathematics journals
use one identical style. Journal-specific instructions take precedence.

## Removed presets and compatibility

DIN 1505-2 and Elsevier Vancouver are no longer bundled. The settings normalizer
maps `din-1505-2` to `iso690-author-date-localized` and `elsevier-vancouver` to
`nlm-citation-sequence`. Custom CSL paths are preserved. Notes change only after
a user-started update.
