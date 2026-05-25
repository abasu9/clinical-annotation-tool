#!/usr/bin/env node
/**
 * prepare-dataset.mjs
 *
 * Converts a JSONL dataset (with columns like local_path / image_paths) into
 * the import-ready JSONL the app expects (post_id, question, image_urls[]).
 *
 * It can also:
 *   - Scan a local images folder and fan out one row per post into ALL
 *     matching files (e.g. <post_id>_0.jpg, _1.jpg, _2.jpg …).
 *   - Prepend an R2 URL base so the output is browser-loadable from R2.
 *
 * Usage:
 *   node scripts/prepare-dataset.mjs \
 *     --input  /path/to/data_sample_100.jsonl \
 *     --images /path/to/images_sample_100 \
 *     --base   https://YOUR-R2-BUCKET.example.com/images_sample_100 \
 *     --output sample_data/data_sample_100.prepared.jsonl
 *
 * Flags:
 *   --input    JSONL or NDJSON input (required)
 *   --output   Output JSONL path (required)
 *   --images   Local images folder to scan for fan-out (optional)
 *   --base     URL prefix to prepend to each image filename (optional)
 *   --include  Comma-separated extensions (default: jpg,jpeg,png,webp)
 *   --quiet    Suppress per-row warnings
 *
 * No external dependencies. Node 18+.
 */
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.output) {
  console.error(
    "Usage: node scripts/prepare-dataset.mjs --input <jsonl> --output <out.jsonl> " +
      "[--images <dir>] [--base <url>] [--include jpg,jpeg,png,webp]"
  );
  process.exit(1);
}

const include = String(args.include || "jpg,jpeg,png,webp")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function basenameNoExt(file) {
  const ext = path.extname(file);
  return file.slice(0, file.length - ext.length);
}

function postIdFromFilename(name) {
  const base = basenameNoExt(name);
  // strip an optional trailing _<digits> → "1r66sgl_3" → "1r66sgl"
  const m = base.match(/^(.*?)(?:_\d+)?$/);
  return m ? m[1] : base;
}

let filesByPost = new Map();
if (args.images) {
  if (!fs.existsSync(args.images)) {
    console.error(`Images dir not found: ${args.images}`);
    process.exit(1);
  }
  const entries = fs
    .readdirSync(args.images, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((f) => include.includes(path.extname(f).slice(1).toLowerCase()));
  for (const f of entries) {
    const pid = postIdFromFilename(f);
    if (!filesByPost.has(pid)) filesByPost.set(pid, []);
    filesByPost.get(pid).push(f);
  }
  for (const arr of filesByPost.values()) arr.sort();
  if (!args.quiet) {
    console.error(
      `Scanned ${entries.length} image files across ${filesByPost.size} post_id prefixes.`
    );
  }
}

const baseUrl = args.base ? String(args.base).replace(/\/+$/, "") : "";

function toUrl(ref) {
  if (/^https?:\/\//i.test(ref)) return ref;
  const filename = path.basename(String(ref).replace(/\\/g, "/"));
  if (!baseUrl) return filename;
  return `${baseUrl}/${filename}`.replace(/ /g, "%20");
}

function buildQuestion(obj) {
  const q = String(obj.question ?? "").trim();
  if (q) return q;
  const title = String(obj.title ?? "").trim();
  const selftext = String(obj.selftext ?? "").trim();
  if (title && selftext) return `${title}\n\n${selftext}`;
  return title || selftext;
}

function collectRawImageRefs(obj) {
  const refs = [];
  const push = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === "object" && x.local_path) {
          const lp = String(x.local_path).trim();
          if (lp) refs.push(lp);
        } else {
          const s = String(x).trim();
          if (s && !/^https?:\/\//i.test(s)) refs.push(s);
        }
      }
      return;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s || /^https?:\/\//i.test(s)) return;
      if (s.startsWith("[")) {
        try {
          const arr = JSON.parse(s);
          if (Array.isArray(arr)) {
            push(arr);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      refs.push(...s.split(";").map((p) => p.trim()).filter(Boolean));
    }
  };
  for (const key of [
    "image_urls",
    "image_paths",
    "image_path",
    "local_paths",
    "local_path",
  ]) {
    push(obj?.[key]);
  }
  push(obj?.downloaded_images);
  return refs;
}

const inputText = fs.readFileSync(args.input, "utf8");
const lines = inputText.split(/\r?\n/).filter((l) => l.trim());

let written = 0;
let warned = 0;
const outLines = [];
for (let i = 0; i < lines.length; i++) {
  let obj;
  try {
    obj = JSON.parse(lines[i]);
  } catch (err) {
    console.error(`Skipping line ${i + 1}: invalid JSON (${err.message})`);
    continue;
  }
  const post_id = String(obj.post_id ?? "").trim();
  const question = buildQuestion(obj);
  if (!post_id || !question) {
    if (!args.quiet)
      console.error(`Skipping line ${i + 1}: missing post_id or question/title/selftext`);
    continue;
  }

  const raw = collectRawImageRefs(obj);
  const fromRow = raw.map((r) => path.basename(String(r).replace(/\\/g, "/")));

  const fromFolder = filesByPost.get(post_id) ?? [];
  const merged = Array.from(new Set([...fromRow, ...fromFolder]));

  if (merged.length === 0 && !args.quiet) {
    warned++;
    console.error(`Note: ${post_id} has no images on row or folder.`);
  }

  const image_urls = merged.map(toUrl).filter((u) => /^https?:\/\//i.test(u));

  outLines.push(JSON.stringify({ post_id, question, image_urls }));
  written++;
}

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, outLines.join("\n") + "\n");
console.error(`Wrote ${written} rows to ${args.output}`);
if (!args.quiet && warned > 0) {
  console.error(`(${warned} rows had no images — they'll show the broken-image placeholder.)`);
}
