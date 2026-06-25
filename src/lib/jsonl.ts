export function toJSONL(rows: Record<string, unknown>[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

export function parseJSONL(text: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === "object") out.push(obj as Record<string, unknown>);
    } catch (err) {
      throw new Error(`Invalid JSON on line ${idx + 1}: ${(err as Error).message}`);
    }
  });
  return out;
}

/** Parse a JSON array of sample objects, or a single object wrapper with a samples/rows array. */
export function parseJSON(text: string): Record<string, unknown>[] {
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["samples", "rows", "data"]) {
      const arr = obj[key];
      if (Array.isArray(arr)) {
        return arr.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
      }
    }
  }
  throw new Error("JSON file must be an array of samples, or an object with a samples/rows/data array.");
}
