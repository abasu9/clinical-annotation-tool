/** Shared helpers for arctic_data.jsonl and legacy sample formats. */

export function buildQuestion(row: Record<string, unknown>): string {
  const q = String(row.question ?? "").trim();
  if (q) return q;
  const title = String(row.title ?? "").trim();
  const selftext = String(row.selftext ?? "").trim();
  if (title && selftext) return `${title}\n\n${selftext}`;
  return title || selftext;
}

export function collectImageRefs(row: Record<string, unknown>): string[] {
  const refs: string[] = [];

  const push = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === "object" && "local_path" in (x as object)) {
          const lp = String((x as { local_path?: string }).local_path ?? "").trim();
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
    push(row[key]);
  }
  push(row.downloaded_images);

  return [...new Set(refs)];
}
