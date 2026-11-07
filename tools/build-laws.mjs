// Usage: node build-laws.mjs <raw-html-dir> <out-dir>
// Parses each downloaded planalto page into <out-dir>/<id>.json and writes laws.json (the catalog the app reads)
// and problems.json (laws that failed the checks in quality.mjs). Exits non-zero when any law has problems.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { extractLines, buildLaw, decode } from "./parse.mjs";
import { checkExpected, contentHash, lawStats } from "./quality.mjs";
import { LAWS } from "./laws.config.mjs";

const [rawDir, outDir] = process.argv.slice(2);
if (!rawDir || !outDir) {
  console.error("Usage: node build-laws.mjs <raw-html-dir> <out-dir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const fetched = new Date().toLocaleDateString("sv-SE");
const catalog = [];
const problems = {};
for (const law of LAWS) {
  let items;
  try {
    items = buildLaw(extractLines(decode(readFileSync(join(rawDir, `${law.id}.htm`)))), { annex: law.annex });
  } catch (err) {
    problems[law.id] = [`não foi possível ler a página: ${err.message}`];
    console.log(`${law.id.padEnd(8)} ERROR ${err.message}`);
    continue;
  }
  // eslint-disable-next-line no-unused-vars
  const { last, annex, ...meta } = law;
  const data = { ...meta, fetched, items };
  const stats = lawStats(items);
  writeFileSync(join(outDir, `${law.id}.json`), JSON.stringify(data));
  catalog.push({
    id: law.id,
    tab: law.tab,
    short: law.short,
    topic: law.topic,
    title: law.title,
    articles: stats.articles,
    maxArt: stats.maxArt,
    hash: contentHash(data),
    updated: fetched,
  });
  const issues = checkExpected(stats, last);
  if (issues.length) problems[law.id] = issues;
  console.log(
    `${law.id.padEnd(8)} arts=${String(stats.articles).padStart(5)} max=${String(stats.maxArt).padStart(4)}` +
      (issues.length ? `  <-- ${issues.join("; ")}` : ""),
  );
}
writeFileSync(join(outDir, "laws.json"), JSON.stringify(catalog));
writeFileSync(join(outDir, "problems.json"), JSON.stringify(problems, null, 1));
if (Object.keys(problems).length) {
  console.error(`\nCheck these laws: ${Object.keys(problems).join(", ")}`);
  process.exitCode = 1;
}
