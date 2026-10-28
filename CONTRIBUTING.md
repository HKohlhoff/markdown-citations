# Contributing

Markdown Citations uses TypeScript and the Obsidian API.

1. Start feature work from `develop` on a `feature/*` branch.
2. Keep domain logic independent from Obsidian where practical.
3. Use Obsidian Vault APIs for every vault read or write.
4. Do not introduce desktop-only runtime APIs.
5. Add focused tests for settings, parsing, citation representation, and safe
   document updates.
6. Run `npm test` and `npm run build:prod` before proposing a merge.

Do not include generated `main.js`, `release/`, local plugin data, test-vault
state, credentials, or unrelated vault content.
