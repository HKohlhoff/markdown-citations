import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const concept = fs.readFileSync("KONZEPT.md", "utf8");
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

const sourceFiles = fs.readdirSync("src", { recursive: true })
  .filter((path) => typeof path === "string" && path.endsWith(".ts"));
const sourceText = sourceFiles.map((path) => fs.readFileSync(`src/${path}`, "utf8")).join("\n");
for (const api of ["getAllLoadedFiles(", "getFiles(", "getMarkdownFiles("]) {
  if (sourceText.includes(api)) errors.push(`Source must not enumerate the complete vault with ${api}`);
}

if (errors.length > 0) throw new Error(errors.join("\n"));
console.log("Release metadata is consistent.");
