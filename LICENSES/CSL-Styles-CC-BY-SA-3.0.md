# Citation Style Language styles and locales

The bundled CSL style and locale files are taken from the official Citation
Style Language repositories:

https://github.com/citation-style-language/styles
https://github.com/citation-style-language/locales

They are licensed under the Creative Commons Attribution-ShareAlike 3.0
Unported license:

https://creativecommons.org/licenses/by-sa/3.0/

Original copyright and contributor information is retained inside every
bundled CSL file. Adapted files add credit for the adaptation and remain under
CC BY-SA 3.0. Changes and upstream snapshots are recorded in
`resources/csl/README.md`.

Citation Style Language project: https://citationstyles.org/

## Adaptations distributed with this plugin

New source snapshot: citation-style-language/styles, validated branch v1.0.2,
commit `7bf7ec05bc31509d640c9a3ccf8f561f2b3d748b`, retrieved 2026-10-28.

- `iso690-author-date-localized.csl` derives from `iso690-author-date-en.csl`,
  whose metadata identifies ISO 690:2021(E). English term overrides are scoped
  to English, the default locale is German, and the selected CSL locale supplies
  German terms. Title, self identifier, template link, timestamp, and adaptation
  contributor credit were updated. This is not a certified conformity assessment.
- `ams-numeric-alphabetical.csl` derives from
  `american-mathematical-society-numeric.csl`. It adds bibliography sorting by
  author, date, and title, with a distinct title, self identifier, template link,
  timestamp, and adaptation contributor credit.

Adaptations by Holger Kohlhoff retain all original author/contributor credits
and are distributed under CC BY-SA 3.0. APS and NLM/Vancouver are distributed
unchanged from this snapshot.
