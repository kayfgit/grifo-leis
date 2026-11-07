// Checks that catch a badly parsed law before it reaches the app, and the content hash the app uses
// to tell whether a law changed.
import { createHash } from "node:crypto";

/** Article count, highest article number (outside the ADCT) and duplicate keys of a parsed law. */
export function lawStats(items) {
  const arts = items.filter((i) => i.k && !/(intro|preambulo)/.test(i.k));
  const nums = arts.filter((a) => !a.k.startsWith("adct-")).map((a) => parseInt(a.k.split("-")[1], 10));
  return {
    articles: arts.length,
    maxArt: nums.length ? Math.max(...nums) : 0,
    dupes: arts.filter((a) => a.k.includes("~")).map((a) => a.k),
  };
}

/** Short hash of the law's content. The download date is left out so unchanged laws keep their hash. */
export function contentHash(law) {
  return createHash("sha256")
    .update(JSON.stringify({ title: law.title, items: law.items }))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Against the article number we expect the law to reach (laws.config.mjs `last`). Laws grow, so a few
 * articles more is fine; fewer means the page was cut short, and far more means text from other laws
 * leaked in.
 */
export function checkExpected(stats, last) {
  const problems = [];
  if (stats.articles === 0) problems.push("nenhum artigo encontrado");
  if (last && stats.maxArt < last) problems.push(`termina no art. ${stats.maxArt}, esperado pelo menos ${last}`);
  if (last && stats.maxArt > Math.ceil(last * 1.2) + 5)
    problems.push(`vai até o art. ${stats.maxArt}, muito além do esperado (${last})`);
  if (stats.dupes.length) problems.push(`artigos repetidos: ${stats.dupes.slice(0, 5).join(", ")}`);
  return problems;
}

/** Against the version already published: sudden drops or jumps mean the page changed shape. */
export function checkAgainstPrevious(stats, prev) {
  const problems = [];
  if (stats.articles < Math.floor(prev.articles * 0.9))
    problems.push(`artigos caíram de ${prev.articles} para ${stats.articles}`);
  if (stats.maxArt < Math.floor(prev.maxArt * 0.98) - 1)
    problems.push(`último artigo caiu de ${prev.maxArt} para ${stats.maxArt}`);
  if (stats.maxArt > Math.ceil(prev.maxArt * 1.2) + 10)
    problems.push(`último artigo saltou de ${prev.maxArt} para ${stats.maxArt}`);
  return problems;
}
