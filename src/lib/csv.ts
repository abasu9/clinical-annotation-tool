import Papa from "papaparse";

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  return Papa.unparse(rows, { quotes: true, newline: "\n" });
}

export function parseCSV(text: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    // Surface only fatal errors; benign ones (extra delimiters in trailing rows)
    // are common in user-edited CSVs and we already skip empty rows.
    const fatal = result.errors.find((e) => e.type === "Delimiter" || e.type === "Quotes");
    if (fatal) {
      throw new Error(`CSV parse error on row ${fatal.row}: ${fatal.message}`);
    }
  }
  return result.data as Record<string, unknown>[];
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
