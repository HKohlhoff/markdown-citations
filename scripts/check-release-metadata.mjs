import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const concept = fs.readFileSync("KONZEPT.md", "utf8");
const buildSource = fs.readFileSync("build.mjs", "utf8");
const errors = [];

if (manifest.id !== "markdown-citations") errors.push("Unexpected plugin id.");
if (manifest.name !== "Markdown Citations") errors.push("Unexpected plugin name.");
if (manifest.version !== pkg.version) errors.push("Manifest and package versions differ.");
if (versions[manifest.version] !== manifest.minAppVersion) {
  errors.push("versions.json does not match manifest.");
}
if (process.env.EXPECTED_RELEASE_TAG && process.env.EXPECTED_RELEASE_TAG !== manifest.version) {
  errors.push("Release tag does not match manifest version.");
}
if (manifest.isDesktopOnly !== false) errors.push("Plugin must not be desktop-only.");
if (pkg.license !== "AGPL-3.0-or-later") errors.push("Unexpected license.");
if (!readme.includes("Flowershow")) errors.push("README must describe Flowershow portability.");
if (!concept.includes("macOS, iPadOS und iOS")) errors.push("Concept must retain the mobile requirement.");
if (!buildSource.includes("citationJsMobileShim")) {
  errors.push("Citation.js synchronous network loading must remain excluded from the mobile bundle.");
}
if (!fs.existsSync("scripts/check-mobile-bundle.mjs")) {
  errors.push("Mobile bundle validation script is missing.");
}
if (!fs.existsSync("LICENSES/Citation.js-MIT.md")) {
  errors.push("Bundled Citation.js license text is missing.");
}
if (!fs.existsSync("LICENSES/CSL-Styles-CC-BY-SA-3.0.md")) {
  errors.push("Bundled CSL styles attribution is missing.");
}
if (!fs.existsSync("LICENSES/citeproc-js-AGPL-3.0-or-later.txt")) {
  errors.push("Bundled citeproc-js license text is missing.");
}

const styleFiles = fs.readdirSync("resources/csl/styles")
  .filter((file) => file.endsWith(".csl"));
if (styleFiles.length < 5) errors.push("At least five bundled CSL styles are required.");
for (const file of styleFiles) {
  const style = fs.readFileSync(`resources/csl/styles/${file}`, "utf8");
  if (!style.includes("<title>")) errors.push(`${file} has no CSL title metadata.`);
  if (!style.includes("creativecommons.org/licenses/by-sa/3.0")) {
    errors.push(`${file} does not retain its CC BY-SA 3.0 rights metadata.`);
  }
}

const localeFiles = fs.readdirSync("resources/csl/locales")
  .filter((file) => file.endsWith(".xml"))
  .sort();
const expectedLocaleFiles = [
  "de-DE", "en-GB", "en-US", "es-ES", "fr-FR", "it-IT", "ja-JP", "nl-NL", "pl-PL", "pt-BR", "ru-RU", "zh-CN",
].map((locale) => `locales-${locale}.xml`).sort();
if (JSON.stringify(localeFiles) !== JSON.stringify(expectedLocaleFiles)) {
  errors.push("Bundled CSL locale files do not match the supported locale set.");
}
for (const file of localeFiles) {
  const locale = fs.readFileSync(`resources/csl/locales/${file}`, "utf8");
  if (!locale.includes("creativecommons.org/licenses/by-sa/3.0")) {
    errors.push(`${file} does not retain its CC BY-SA 3.0 rights metadata.`);
  }
}

const sourceFiles = fs.readdirSync("src", { recursive: true })
  .filter((path) => typeof path === "string" && path.endsWith(".ts"))
  .filter((path) => path !== "ui/vault-path-modal.ts");
const sourceText = sourceFiles.map((path) => fs.readFileSync(`src/${path}`, "utf8")).join("\n");
for (const api of ["getAllLoadedFiles(", "getFiles(", "getMarkdownFiles("]) {
  if (sourceText.includes(api)) errors.push(`Source must not enumerate the complete vault with ${api}`);
}

const pickerSource = fs.readFileSync("src/ui/vault-path-modal.ts", "utf8");
if (!pickerSource.includes("SuggestModal") || !pickerSource.includes("getFiles()")) {
  errors.push("Vault file enumeration must remain isolated in the user-opened picker.");
}

if (errors.length > 0) throw new Error(errors.join("\n"));
console.log("Release metadata is consistent.");
