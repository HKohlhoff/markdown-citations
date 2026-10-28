import fs from "node:fs";

const bundle = fs.readFileSync("main.js", "utf8");
const forbiddenImports = [
  "child_process",
  "node:child_process",
  "fs",
  "node:fs",
  "path",
  "node:path",
  "electron",
];
const found = forbiddenImports.filter((moduleName) =>
  bundle.includes(`require("${moduleName}")`) || bundle.includes(`require('${moduleName}')`),
);

if (found.length > 0) {
  throw new Error(`Desktop-only runtime imports found in main.js: ${found.join(", ")}`);
}
console.log("Mobile bundle contains no forbidden runtime imports.");
