import fs from "node:fs";
import path from "node:path";

const pagesDir = "references/conasoc.com/pages";
const outDir = "references/conasoc.com/raw";
const urls = new Map();

for (const file of fs.readdirSync(pagesDir)) {
  if (!file.endsWith(".html")) continue;
  const html = fs.readFileSync(path.join(pagesDir, file), "utf8");
  for (const match of html.matchAll(/https?:\/\/conasoc\.com\/wp-content\/[^"'<> )]+/g)) {
    const url = match[0]
      .replace(/&#038;/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/[,;]+$/g, "");
    urls.set(url.split("?")[0], url);
  }
}

const entries = [...urls.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const curlLines = [];

for (const [withoutQuery, url] of entries) {
  const rel = new URL(withoutQuery).pathname.replace(/^\//, "");
  const dest = `references/conasoc.com/site/${rel}`;
  curlLines.push(`url = "${url}"`);
  curlLines.push(`output = "${dest}"`);
  curlLines.push("create-dirs");
}

fs.writeFileSync(
  path.join(outDir, "asset-urls.txt"),
  entries.map(([, url]) => url).join("\n") + "\n",
);
fs.writeFileSync(path.join(outDir, "curl-assets.conf"), curlLines.join("\n") + "\n");

console.log(`${entries.length} asset urls`);
