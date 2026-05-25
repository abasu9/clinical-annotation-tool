import { supabase } from "./supabase";
import { parseCSV } from "./csv";
import { parseJSONL } from "./jsonl";
import { buildQuestion, collectImageRefs } from "./datasetFields";

export interface ParsedSample {
  post_id: string;
  question: string;
  image_urls: string[];
}

export function normalizeImageUrls(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          return arr.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        /* fall through to delimiter parsing */
      }
    }
    return s
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
}

export function extractSample(row: Record<string, unknown>): ParsedSample | null {
  const norm: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k) continue;
    norm[k.trim().toLowerCase()] = v;
  }
  const post_id = String(norm.post_id ?? "").trim();
  const question = buildQuestion(norm);
  if (!post_id || !question) return null;
  const localRefs = collectImageRefs(norm);
  const image_urls =
    localRefs.length > 0
      ? localRefs
      : normalizeImageUrls(
          norm.image_urls ??
            norm.image_paths ??
            norm.image_path ??
            norm.local_paths ??
            norm.local_path ??
            ""
        );
  return { post_id, question, image_urls };
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function parseDatasetFile(file: File): Promise<ParsedSample[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  const text = await readFileText(file);
  let rows: Record<string, unknown>[];
  if (ext === "csv") rows = parseCSV(text);
  else if (ext === "jsonl" || ext === "ndjson") rows = parseJSONL(text);
  else {
    throw new Error(
      "Unsupported file format. Use .csv or .jsonl. " +
        "(XLSX is not bundled in this prototype.)"
    );
  }
  const samples: ParsedSample[] = [];
  for (const row of rows) {
    const s = extractSample(row);
    if (s) samples.push(s);
  }
  return samples;
}

export interface ImportResult {
  datasetId: string;
  inserted: number;
}

export async function importDatasetFile(opts: {
  name: string;
  file: File;
  onProgress?: (inserted: number, total: number) => void;
}): Promise<ImportResult> {
  const { name, file, onProgress } = opts;
  const samples = await parseDatasetFile(file);
  if (samples.length === 0) {
    throw new Error(
      "No valid rows found. Required: post_id and question (or title/selftext), plus image_urls or local paths."
    );
  }

  const { data: ds, error: dsErr } = await supabase
    .from("datasets")
    .insert({
      name: name.trim(),
      uploaded_filename: file.name,
      total_samples: 0,
    })
    .select()
    .single();
  if (dsErr || !ds) {
    throw new Error(`Failed to create dataset: ${dsErr?.message ?? "unknown error"}`);
  }
  const datasetId = ds.id as string;

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < samples.length; i += BATCH) {
    const batch = samples.slice(i, i + BATCH).map((s) => ({
      dataset_id: datasetId,
      post_id: s.post_id,
      question: s.question,
      image_urls: s.image_urls,
    }));
    const { error } = await supabase.from("samples").insert(batch);
    if (error) {
      throw new Error(
        `Failed to insert samples (batch starting ${i + 1}): ${error.message}`
      );
    }
    inserted += batch.length;
    onProgress?.(inserted, samples.length);
  }

  await supabase
    .from("datasets")
    .update({ total_samples: inserted })
    .eq("id", datasetId);

  return { datasetId, inserted };
}
