# Release checklist

- [ ] The release starts from an approved `release/*` branch.
- [ ] `manifest.json`, `package.json`, and `versions.json` agree.
- [ ] `npm test` passes.
- [ ] `npm run build:prod` passes.
- [ ] Desktop, iPad, and iPhone runtime checks pass.
- [ ] Citation output remains readable without the plugin.
- [ ] Normal Markdown links and unrelated vault files remain untouched.
- [ ] Runtime dependency and CSL-style licenses are audited.
- [ ] `THIRD_PARTY_NOTICES.md` is current.
- [ ] The release is merged to `main` and back to `develop` with `--no-ff`.
- [ ] An annotated version tag is created only after explicit approval.
