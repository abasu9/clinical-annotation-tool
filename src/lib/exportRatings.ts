import { downloadFile, toCSV } from "./csv";
import { toJSONL } from "./jsonl";
import type { RatingExportRow } from "./data";
import { IAA_ANNOTATORS, type IaaCode } from "./iaaAnnotators";

export type RatingExportFormat = "csv" | "jsonl";

/** Group rating rows by evaluator code (nf, c, sz, s, w). */
export function groupRatingsByEvaluator(
  rows: RatingExportRow[]
): Map<IaaCode | "unknown", RatingExportRow[]> {
  const map = new Map<IaaCode | "unknown", RatingExportRow[]>();
  for (const code of IAA_ANNOTATORS.map((a) => a.code)) {
    map.set(code, []);
  }
  map.set("unknown", []);

  for (const r of rows) {
    const key = (r.evaluator_code as IaaCode | null) ?? "unknown";
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return map;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download one file per evaluator, e.g. iaa_ratings_nf.csv, iaa_ratings_c.csv.
 * Skips codes with no rows. Staggers downloads so the browser allows them.
 */
export async function downloadRatingsPerAnnotator(
  rows: RatingExportRow[],
  format: RatingExportFormat
): Promise<{ files: number; rows: number }> {
  const groups = groupRatingsByEvaluator(rows);
  let files = 0;
  let totalRows = 0;

  for (const [code, group] of groups) {
    if (code === "unknown" && group.length === 0) continue;
    if (group.length === 0) continue;

    const flat = group as unknown as Record<string, unknown>[];
    const filename =
      format === "csv"
        ? `iaa_ratings_${code}.csv`
        : `iaa_ratings_${code}.jsonl`;
    const body = format === "csv" ? toCSV(flat) : toJSONL(flat);
    const mime =
      format === "csv" ? "text/csv" : "application/x-ndjson";

    downloadFile(filename, body, mime);
    files += 1;
    totalRows += group.length;
    await sleep(200);
  }

  return { files, rows: totalRows };
}
