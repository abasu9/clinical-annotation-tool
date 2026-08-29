import type { Dataset } from "./supabase";

/** Annotator row without PIN (safe for lists). */
export interface AnnotatorProfile {
  id: string;
  login_id: string;
  display_name: string;
  login_aliases: string[];
  name_includes: string[];
}

/** Admin-only annotator row including PIN. */
export interface AnnotatorAdminProfile extends AnnotatorProfile {
  pin: string;
}

function normalizeLogin(loginId: string): string {
  return loginId.trim().toLowerCase();
}

export function annotatorForLogin(
  loginId: string,
  annotators: AnnotatorProfile[]
): AnnotatorProfile | undefined {
  const key = normalizeLogin(loginId);
  return annotators.find(
    (a) =>
      normalizeLogin(a.login_id) === key ||
      a.login_aliases.some((alias) => normalizeLogin(alias) === key)
  );
}

export function cleanDisplayName(displayName: string): string {
  return displayName.replace(/\s*\(login:\s*[^)]+\)\s*$/i, "").trim();
}

export function labelForAnnotatorLogin(
  loginId: string | null | undefined,
  annotators: AnnotatorProfile[] = []
): string {
  if (!loginId) return "—";
  const match = annotatorForLogin(loginId, annotators);
  return match ? cleanDisplayName(match.display_name) : loginId;
}

/** True when a logged-in annotator may open this dataset. */
export function datasetMatchesAnnotator(
  dataset: Dataset,
  annotatorId: string,
  annotators: AnnotatorProfile[]
): boolean {
  const annotator = annotatorForLogin(annotatorId, annotators);
  if (!annotator) return false;

  if (dataset.assigned_annotator_id) {
    return (
      normalizeLogin(dataset.assigned_annotator_id) ===
      normalizeLogin(annotator.login_id)
    );
  }

  const name = dataset.name.toLowerCase();
  return annotator.name_includes.some((frag) =>
    name.includes(frag.toLowerCase())
  );
}

/** Datasets assigned to this annotator for the Annotation picker. */
export function filterDatasetsForAnnotator(
  annotatorId: string,
  datasets: Dataset[],
  annotators: AnnotatorProfile[]
): Dataset[] {
  if (!annotatorForLogin(annotatorId, annotators)) return [];
  return datasets.filter((d) =>
    datasetMatchesAnnotator(d, annotatorId, annotators)
  );
}

/** Suggest name_includes from display name (e.g. "Dr Smith" → "smith"). */
export function suggestNameIncludes(displayName: string): string[] {
  const last = displayName.trim().split(/\s+/).pop();
  if (!last) return [];
  const frag = last.replace(/^dr\.?$/i, "").trim().toLowerCase();
  return frag ? [frag] : [];
}
