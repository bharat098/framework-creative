#!/usr/bin/env node
/* =====================================================================
   FRAMEWORK CREATIVE — CANVA → WEBSITE LIBRARY SYNC
   ---------------------------------------------------------------------
   Reads every design in one Canva folder (and its sub-folders), exports
   new or changed designs as JPGs into assets/library/, removes designs
   that left the folder, and rewrites js/library.js.

   Runs in GitHub Actions (see .github/workflows/canva-sync.yml).
   Node 18+ only, no npm packages.

   Environment variables
     CANVA_CLIENT_ID, CANVA_CLIENT_SECRET   from your Canva integration
     CANVA_REFRESH_TOKEN                    from scripts/canva-auth.mjs (rotates every run)
     CANVA_FOLDER_ID                        the website folder's ID
     TOKEN_OUT        file path where the NEW refresh token is written (required)
     MAX_PAGES        pages exported per design (default 5)
     LONG_EDGE        longest side of exported images in px (default 1600)
     JPG_QUALITY      1–100 (default 82)
     CANVA_API_BASE   override for testing (default https://api.canva.com/rest)

   Canva API references (checked October 2026):
     POST /v1/oauth/token · GET /v1/folders/{id}/items
     POST /v1/exports     · GET /v1/exports/{id}
   ===================================================================== */
import { mkdir, readFile, writeFile, rm, access, appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIB_DIR = join(ROOT, "assets", "library");
const MANIFEST = join(LIB_DIR, "manifest.json");
const LIB_JS = join(ROOT, "js", "library.js");

const env = (k, d) => (process.env[k] ?? d ?? "").toString().trim();
const API = env("CANVA_API_BASE", "https://api.canva.com/rest").replace(/\/$/, "");
const MAX_PAGES = Math.max(1, parseInt(env("MAX_PAGES", "5"), 10) || 5);
const LONG_EDGE = Math.min(4000, Math.max(400, parseInt(env("LONG_EDGE", "1600"), 10) || 1600));
const QUALITY = Math.min(100, Math.max(1, parseInt(env("JPG_QUALITY", "82"), 10) || 82));
const IN_ACTIONS = env("GITHUB_ACTIONS") === "true";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const mask = (v) => { if (IN_ACTIONS && v) console.log(`::add-mask::${v}`); };
const exists = (p) => access(p).then(() => true, () => false);

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

/* ---------- HTTP helpers ---------- */
async function api(path, { method = "GET", token, body, retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < retries) {
      const wait = (parseInt(res.headers.get("retry-after") || "0", 10) || 20) * 1000;
      log(`  rate-limited, waiting ${Math.round(wait / 1000)}s…`);
      await sleep(wait);
      continue;
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      const err = new Error(`${method} ${path} → HTTP ${res.status}: ${(json && (json.message || json.code)) || text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }
}

/* ---------- 1. Access token (refresh tokens are single-use: save the new one first) ---------- */
async function getAccessToken() {
  const id = env("CANVA_CLIENT_ID"), secret = env("CANVA_CLIENT_SECRET"), refresh = env("CANVA_REFRESH_TOKEN");
  const out = env("TOKEN_OUT");
  if (!id || !secret || !refresh) fail("Missing CANVA_CLIENT_ID, CANVA_CLIENT_SECRET or CANVA_REFRESH_TOKEN.");
  if (!out) fail("TOKEN_OUT is not set — the rotated refresh token would be lost.");
  mask(secret); mask(refresh);

  const res = await fetch(`${API}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    fail(`Canva token refresh failed (HTTP ${res.status}). If this keeps happening, run scripts/canva-auth.mjs again and update the CANVA_REFRESH_TOKEN secret.`);
  }
  mask(json.access_token); mask(json.refresh_token);
  if (json.refresh_token) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, json.refresh_token, { mode: 0o600 });
  }
  return json.access_token;
}

/* ---------- 2. Walk the folder ---------- */
async function listFolder(token, folderId, hint, depth = 0, acc = []) {
  let continuation = "";
  do {
    const q = new URLSearchParams({ item_types: "design,folder", limit: "100" });
    if (continuation) q.set("continuation", continuation);
    const page = await api(`/v1/folders/${encodeURIComponent(folderId)}/items?${q}`, { token });
    for (const item of page.items || []) {
      if (item.type === "design" && item.design) acc.push({ ...item.design, _hint: hint });
      else if (item.type === "folder" && item.folder && depth < 3) {
        await listFolder(token, item.folder.id, item.folder.name || hint, depth + 1, acc);
      }
    }
    continuation = page.continuation || "";
  } while (continuation);
  return acc;
}

/* ---------- 3. Decide the format label ---------- */
const HINTS = [
  [/insta|post|social|feed|square/i, "Instagram post"],
  [/stor(y|ies)|reel/i, "Story"],
  [/present|deck|slide/i, "Presentation"],
  [/doc|menu|flyer|brochure|report|a4|letter/i, "Document"],
  [/poster|invit/i, "Poster"],
  [/banner|backdrop|cover|landscape|header/i, "Banner"],
];
function classify(d) {
  for (const [re, label] of HINTS) if (d._hint && re.test(d._hint)) return label;
  const w = d.thumbnail?.width || 1, h = d.thumbnail?.height || 1, r = h / w, pages = d.page_count || 1;
  if (r > 1.6) return "Story";
  if (r >= 1.36 && r <= 1.47) return "Document";
  if (r > 1.3) return "Poster";
  if (r >= 0.95) return "Instagram post";
  if (pages > 1 && r < 0.7) return "Presentation";
  return "Banner";
}

/* ---------- 4. Export one design ---------- */
async function exportDesign(token, d) {
  const w = d.thumbnail?.width || 1, h = d.thumbnail?.height || 1;
  const pages = Array.from({ length: Math.min(d.page_count || 1, MAX_PAGES) }, (_, i) => i + 1);
  const format = { type: "jpg", quality: QUALITY, pages };
  if (w >= h) format.width = LONG_EDGE; else format.height = LONG_EDGE;

  const created = await api("/v1/exports", { method: "POST", token, body: { design_id: d.id, format } });
  let job = created.job;
  const started = Date.now();
  while (job && job.status === "in_progress") {
    if (Date.now() - started > 180000) throw new Error("export timed out after 3 minutes");
    await sleep(2500);
    job = (await api(`/v1/exports/${encodeURIComponent(job.id)}`, { token })).job;
  }
  if (!job || job.status !== "success") {
    throw new Error(`export ${job ? job.status : "missing"}${job?.error ? ` (${job.error.code}: ${job.error.message})` : ""}`);
  }

  const dir = join(LIB_DIR, d.id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < (job.urls || []).length; i++) {
    const res = await fetch(job.urls[i]);
    if (!res.ok) throw new Error(`download of page ${i + 1} failed (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const name = `${i + 1}.jpg`;
    await writeFile(join(dir, name), buf);
    files.push(`assets/library/${d.id}/${name}`);
  }
  if (!files.length) throw new Error("export returned no files");
  return files;
}

/* ---------- Main ---------- */
async function main() {
  const folderId = env("CANVA_FOLDER_ID");
  if (!folderId) fail("CANVA_FOLDER_ID is not set.");

  const token = await getAccessToken();
  log("✔ Connected to Canva");

  const designs = await listFolder(token, folderId, "");
  log(`✔ Found ${designs.length} design(s) in the folder`);

  await mkdir(LIB_DIR, { recursive: true });
  let manifest = { designs: {} };
  try { manifest = JSON.parse(await readFile(MANIFEST, "utf8")); } catch { /* first run */ }
  manifest.designs ||= {};

  // Safety net: an empty result usually means a wrong folder ID or a permissions problem.
  // Don't wipe a populated library because of it (set ALLOW_EMPTY=1 to really clear it).
  if (!designs.length && Object.keys(manifest.designs).length && env("ALLOW_EMPTY") !== "1") {
    fail("The Canva folder returned no designs, so nothing was changed. Check CANVA_FOLDER_ID (or set ALLOW_EMPTY=1 to clear the library on purpose).");
  }

  const next = {};
  const report = { added: [], updated: [], kept: 0, removed: [], failed: [] };
  let exportsThisMinute = 0, windowStart = Date.now();

  for (const d of designs) {
    const prev = manifest.designs[d.id];
    const unchanged = prev && prev.updated_at === d.updated_at && prev.files?.length &&
      (await Promise.all(prev.files.map((f) => exists(join(ROOT, f))))).every(Boolean);
    const meta = {
      title: (d.title || "").trim() || "Untitled design",
      type: classify(d),
      width: d.thumbnail?.width || 1,
      height: d.thumbnail?.height || 1,
      updated_at: d.updated_at,
    };
    if (unchanged) { next[d.id] = { ...prev, ...meta }; report.kept++; continue; }

    // Stay under the export rate limit (20 per minute per user)
    if (exportsThisMinute >= 18) {
      const wait = 61000 - (Date.now() - windowStart);
      if (wait > 0) { log(`  pausing ${Math.ceil(wait / 1000)}s for Canva's rate limit…`); await sleep(wait); }
      exportsThisMinute = 0; windowStart = Date.now();
    }
    exportsThisMinute++;

    try {
      log(`  exporting “${meta.title}”…`);
      const files = await exportDesign(token, d);
      next[d.id] = { ...meta, files };
      (prev ? report.updated : report.added).push(meta.title);
    } catch (e) {
      console.warn(`  ⚠ ${meta.title}: ${e.message}`);
      report.failed.push(`${meta.title} — ${e.message}`);
      if (prev) next[d.id] = prev; // keep the last good version
    }
  }

  // Remove designs that are no longer in the folder
  for (const id of Object.keys(manifest.designs)) {
    if (!next[id]) {
      await rm(join(LIB_DIR, id), { recursive: true, force: true });
      report.removed.push(manifest.designs[id].title || id);
    }
  }

  const changed = report.added.length || report.updated.length || report.removed.length;
  const updated = changed || !manifest.updated ? new Date().toISOString() : manifest.updated;
  const out = { updated, designs: next };
  await writeFile(MANIFEST, JSON.stringify(out, null, 2) + "\n");

  // Keep the folder's order (Canva lists most recently modified first)
  const items = designs.filter((d) => next[d.id]).map((d) => {
    const m = next[d.id];
    return { id: d.id, title: m.title, type: m.type, width: m.width, height: m.height, pages: m.files, updated: new Date((m.updated_at || 0) * 1000).toISOString() };
  });
  const js = `/* =====================================================================
   FRAMEWORK CREATIVE — DESIGN LIBRARY DATA
   GENERATED by scripts/canva-sync.mjs — do not edit by hand.
   Add or remove designs in the Canva website folder instead.
   ===================================================================== */
window.FC_LIBRARY = ${JSON.stringify({ updated, source: "canva", items }, null, 2)};
`;
  await writeFile(LIB_JS, js);

  const summary = [
    `### Canva library sync`,
    `- In folder: **${designs.length}**  ·  added: **${report.added.length}**  ·  updated: **${report.updated.length}**  ·  unchanged: **${report.kept}**  ·  removed: **${report.removed.length}**  ·  failed: **${report.failed.length}**`,
    ...report.added.map((t) => `- ➕ ${t}`),
    ...report.updated.map((t) => `- 🔄 ${t}`),
    ...report.removed.map((t) => `- ➖ ${t}`),
    ...report.failed.map((t) => `- ⚠️ ${t}`),
  ].join("\n");
  log("\n" + summary.replace(/\*\*/g, ""));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
  if (report.failed.length && !report.added.length && !report.updated.length && !report.kept) process.exitCode = 1;
}

main().catch((e) => fail(e.stack || e.message));
