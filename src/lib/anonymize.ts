/**
 * Blind labels for the rating UI — never show real dataset / annotator names.
 */

export function ratingDatasetLabel(index: number): string {
  return `Pilot study ${index + 1}`;
}

export function ratingDatasetInitials(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Stable Annotator 1…N mapping from sorted unique annotator IDs. */
export function buildAnnotatorDisplayMap(
  annotatorIds: Iterable<string>
): Map<string, number> {
  const unique = Array.from(new Set(annotatorIds)).sort((a, b) =>
    a.localeCompare(b)
  );
  const map = new Map<string, number>();
  unique.forEach((id, i) => map.set(id, i + 1));
  return map;
}
