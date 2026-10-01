// Files dist/ needs besides the bundles: the popup page, and wa-js's license notices. Apache-2.0
// asks for its license to ship with the bundled copy of it, and dist/main.js points to them.
import { copyFileSync } from "node:fs";

const wa = "node_modules/@wppconnect/wa-js";
for (const [from, to] of [
  ["static/popup.html", "popup.html"],
  [`${wa}/LICENSE`, "wa-js.LICENSE.txt"],
  [`${wa}/dist/wppconnect-wa.js.LICENSE.txt`, "wppconnect-wa.js.LICENSE.txt"],
])
  copyFileSync(from, `dist/${to}`);
