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
