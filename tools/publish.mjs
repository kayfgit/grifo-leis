// Usage: node publish.mjs <build-dir> <data-repo-dir> [report.md]
// Copies freshly built laws into the public data repo (kayfgit/grifo-leis) that the app downloads from.
// A law is published only when it passed the build checks and did not change shape compared with the
// version already published; otherwise the published version stays and the report says why.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { checkAgainstPrevious } from "./quality.mjs";

export function planPublish(build, problems, prevManifest) {
  const prev = new Map((prevManifest?.laws ?? []).map((l) => [l.id, l]));
  const laws = [];
  const changed = [];
  const failed = [];
  for (const entry of build) {
    const before = prev.get(entry.id);
    const issues = [...(problems[entry.id] ?? []), ...(before ? checkAgainstPrevious(entry, before) : [])];
    if (issues.length) {
      failed.push({ id: entry.id, short: entry.short, issues });
      if (before) laws.push(before);
      continue;
    }
    if (!before || before.hash !== entry.hash) {
      changed.push({ id: entry.id, short: entry.short, isNew: !before });
      laws.push(entry);
    } else {
      // Same text: keep the old "updated" date, but take catalog edits (tab, names) from the config.
      laws.push({ ...entry, updated: before.updated });
    }
  }
  const removed = [...prev.keys()].filter((id) => !build.some((b) => b.id === id));
  return { laws, changed, failed, removed };
}

export function reportMarkdown({ changed, failed, removed }, date) {
  const lines = [`# Atualização das leis (${date})`, ""];
  lines.push(changed.length ? `Atualizadas: ${changed.map((c) => c.short + (c.isNew ? " (nova)" : "")).join(", ")}` : "Nenhuma lei mudou.");
  if (removed.length) lines.push("", `Removidas do catálogo: ${removed.join(", ")}`);
  if (failed.length) {
    lines.push("", "## Não publicadas (a versão anterior continua no app)", "");
    for (const f of failed) lines.push(`- **${f.short}** (${f.id}): ${f.issues.join("; ")}`);
    lines.push("", "Confira a página no Planalto e ajuste o parser ou `last` em `scripts/laws/laws.config.mjs`.");
  }
  return lines.join("\n") + "\n";
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const [buildDir, repoDir, reportFile] = process.argv.slice(2);
  if (!buildDir || !repoDir) {
    console.error("Usage: node publish.mjs <build-dir> <data-repo-dir> [report.md]");
    process.exit(1);
  }
  const build = JSON.parse(readFileSync(join(buildDir, "laws.json"), "utf8"));
  const problems = existsSync(join(buildDir, "problems.json"))
    ? JSON.parse(readFileSync(join(buildDir, "problems.json"), "utf8"))
    : {};
  const manifestPath = join(repoDir, "manifest.json");
  const prevManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  const result = planPublish(build, problems, prevManifest);

  mkdirSync(join(repoDir, "laws"), { recursive: true });
  for (const c of result.changed) copyFileSync(join(buildDir, `${c.id}.json`), join(repoDir, "laws", `${c.id}.json`));
  for (const id of result.removed) rmSync(join(repoDir, "laws", `${id}.json`), { force: true });
  const catalogChanged = JSON.stringify(prevManifest?.laws ?? null) !== JSON.stringify(result.laws);
  if (catalogChanged) {
    writeFileSync(manifestPath, JSON.stringify({ schema: 1, generated: new Date().toISOString(), laws: result.laws }, null, 1));
  }
  const today = new Date().toLocaleDateString("sv-SE");
  const report = reportMarkdown(result, today);
  if (reportFile) writeFileSync(reportFile, report);
  console.log(report);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${catalogChanged ? "true" : "false"}\nfailed=${result.failed.length}\n`);
  }
}
