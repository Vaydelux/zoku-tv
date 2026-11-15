/**
 * Non-invasive provider-domain inventory audit.
 * Does not access movie/anime embed URLs, download content or verify playback.
 * DNS failures are double-checked; HTTP 403/404 are NOT treated as dead hosts.
 */
import { lookup } from "node:dns/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { EMBED_SERVER_CATALOG } from "../lib/embed";
import { ANIME_EMBED_SERVER_CATALOG } from "../lib/anime-embed";

type Entry = { source: "movie/tv" | "anime"; id: string; declared: string[]; urls: string[] };
const entries: Entry[] = [
  ...EMBED_SERVER_CATALOG.map(s => ({ source: "movie/tv" as const, id: s.id,
    declared: s.domains, urls: [s.movieTemplate, s.tvTemplate] })),
  ...ANIME_EMBED_SERVER_CATALOG.map(s => ({ source: "anime" as const, id: s.id,
    declared: s.domains, urls: [s.template] })),
];
const hosts = new Map<string, { serverIds: Set<string>; inTemplate: boolean }>();
const mismatches: string[] = [];
for (const e of entries) {
  const configured = new Set<string>();
  for (const template of e.urls) {
    // Relative player URLs are deployment-specific and not remotely auditable.
    if (!template.startsWith("https://")) {
      mismatches.push(`${e.source}/${e.id}: non-HTTPS or relative template ${template}`);
      continue;
    }
    try {
      configured.add(new URL(template).hostname.toLowerCase());
    } catch {
      mismatches.push(`${e.source}/${e.id}: invalid template ${template}`);
    }
  }
  for (const domain of e.declared) {
    const hostname = domain.toLowerCase();
    if (!hosts.has(hostname)) hosts.set(hostname, { serverIds: new Set(), inTemplate: false });
    hosts.get(hostname)!.serverIds.add(`${e.source}/${e.id}`);
  }
  for (const hostname of configured) {
    if (!hosts.has(hostname)) hosts.set(hostname, { serverIds: new Set(), inTemplate: false });
    const item = hosts.get(hostname)!;
    item.serverIds.add(`${e.source}/${e.id}`);
    item.inTemplate = true;
    if (!e.declared.includes(hostname)) {
      mismatches.push(`${e.source}/${e.id}: active template host ${hostname} missing from declared domains`);
    }
  }
}

type Audit = {
  host: string; ids: string[]; activeTemplate: boolean; dns: string;
  httpStatus?: number; outcome: string; detail?: string;
};
const throttle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function checkHost(host: string, data: { serverIds: Set<string>; inTemplate: boolean }): Promise<Audit> {
  const base = { host, ids: [...data.serverIds].sort(), activeTemplate: data.inTemplate };
  let ip = "";
  try {
    ip = (await lookup(host)).address;
  } catch (e) {
    const first = (e as NodeJS.ErrnoException).code || "UNKNOWN";
    if (first === "ENOTFOUND" || first === "ENODATA") {
      await throttle(450);
      try {
        ip = (await lookup(host)).address;
      } catch (second) {
        const code = (second as NodeJS.ErrnoException).code || "UNKNOWN";
        return {
          ...base, dns: `${first}/${code}`,
          outcome: code === first ? "UNRESOLVED_TWICE" : "INCONCLUSIVE",
          detail: "A DNS failure does not establish domain registration expiration",
        };
      }
    } else {
      return { ...base, dns: first, outcome: "INCONCLUSIVE", detail: "DNS lookup failed" };
    }
  }
  try {
    const response = await fetch(`https://${host}/`, {
      method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "ZokuDomainInventoryAudit/1.0" },
    });
    let outcome = "REACHABLE";
    if (response.status >= 500) outcome = "SERVER_ERROR";
    if ([401, 403, 404, 405, 429].includes(response.status)) outcome = "RESPONDS_RESTRICTED";
    return { ...base, dns: ip, httpStatus: response.status, outcome };
  } catch (err) {
    return { ...base, dns: ip, outcome: "HTTP_INCONCLUSIVE",
      detail: err instanceof Error ? err.message.slice(0, 140) : String(err) };
  }
}
const items = [...hosts].sort(([a], [b]) => a.localeCompare(b));
const results: Audit[] = new Array(items.length);
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= items.length) return;
    const [host, data] = items[index];
    results[index] = await checkHost(host, data);
  }
}
async function runAudit() {
await Promise.all(Array.from({ length: Math.min(8, items.length) }, () => worker()));
const stats: Record<string, number> = {};
for (const row of results) stats[row.outcome] = (stats[row.outcome] || 0) + 1;
const report = {
  timestamp: new Date().toISOString(), entries: entries.length, domains: results.length,
  limitations: "DNS and root-domain HEAD only. No embed/player playback tested. 403, 404, 429 and network timeouts do not prove an embed is broken.",
  mismatches, statistics: stats, results,
};
await mkdir("artifacts/server-domain-audit", { recursive: true });
await writeFile("artifacts/server-domain-audit/report.json", JSON.stringify(report, null, 2) + "\n");
const lines = [
  "# Zoku TV embed domain connectivity inventory", "",
  `Scan: ${report.timestamp} · Server entries: ${entries.length} · Unique configured domains: ${results.length}`,
  "", "Checks use DNS + one HTTPS HEAD request to the domain root only. A root-path 404 can still be a functioning embed. No playback was tested.",
  "", "| Domain | Server IDs | DNS | HTTPS HEAD | Classification |", "| --- | --- | --- | --- | --- |",
  ...results.map(r => `| ${r.host} | ${r.ids.join(", ")} | ${r.dns} | ${r.httpStatus ?? "—"} | ${r.outcome} |`),
  "", "## Configuration anomalies", ...mismatches.map(m => `- ${m}`), "",
  "## Interpretation", "Only a repeatedly unresolvable active host is a candidate for removal after independent confirmation. HTTP failures may reflect bots, geography, WAF, or HEAD restrictions.",
];
await writeFile("artifacts/server-domain-audit/report.md", lines.join("\n") + "\n");
for (const item of results) {
  console.log(`AUDIT ${item.outcome.padEnd(22)} ${item.host.padEnd(31)} ${item.httpStatus ?? ""} ${item.ids.join(",")}`);
}
console.log("SUMMARY", JSON.stringify({ stats, mismatches, count: results.length }));
}
runAudit().catch(error => { console.error(error); process.exitCode = 1; });
