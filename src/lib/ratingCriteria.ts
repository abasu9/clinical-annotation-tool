/** Likert scale: 1 (low) – 5 (high) */

export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;

export type LikertValue = 1 | 2 | 3 | 4 | 5 | null;

export interface DescriptionCriteriaScores {
  completeness: LikertValue;
  independence: LikertValue;
}

export interface SummaryCriteriaScores {
  informativeness: LikertValue;
  completeness: LikertValue;
  combination: LikertValue;
  fluency: LikertValue;
}

export interface AnnotatorRatingScores {
  description: DescriptionCriteriaScores;
  summary: SummaryCriteriaScores;
}

export const EMPTY_DESCRIPTION_SCORES: DescriptionCriteriaScores = {
  completeness: null,
  independence: null,
};

export const EMPTY_SUMMARY_SCORES: SummaryCriteriaScores = {
  informativeness: null,
  completeness: null,
  combination: null,
  fluency: null,
};

export const EMPTY_ANNOTATOR_SCORES: AnnotatorRatingScores = {
  description: { ...EMPTY_DESCRIPTION_SCORES },
  summary: { ...EMPTY_SUMMARY_SCORES },
};

export const DESCRIPTION_CRITERIA = [
  {
    key: "completeness" as const,
    label: "Completeness",
    help: "Covers size, shape, location, count, color, texture, border, symmetry, and distribution where visible.",
  },
  {
    key: "independence" as const,
    label: "Independence",
    help: "Written without reference to the user’s question — only what is visible in the image.",
  },
] as const;

export const SUMMARY_CRITERIA = [
  {
    key: "informativeness" as const,
    label: "Informativeness",
    help: "Clinically useful content that helps answer the concern.",
  },
  {
    key: "completeness" as const,
    label: "Completeness",
    help: "Nothing important from the image or post is missing.",
  },
  {
    key: "combination" as const,
    label: "Combination",
    help: "Image description and user concern are both present and integrated.",
  },
  {
    key: "fluency" as const,
    label: "Fluency",
    help: "Clear, grammatical, easy to read and concise.",
  },
] as const;

/** Annotator IDs treated as AI (excluded from rating). Comma-separated via env. */
export function getAiAnnotatorIds(): Set<string> {
  const raw =
    (import.meta.env.VITE_AI_ANNOTATOR_IDS as string | undefined) ??
    "ai,AI,gpt,claude,chatgpt";
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) set.add(id.toLowerCase());
  }
  return set;
}

export function isAiAnnotatorId(annotatorId: string): boolean {
  const lower = annotatorId.trim().toLowerCase();
  if (!lower) return false;
  const configured = getAiAnnotatorIds();
  if (configured.has(lower)) return true;
  return lower.startsWith("ai_") || lower.endsWith("_ai") || lower.includes("_ai_");
}

export function allScoresFilled(scores: AnnotatorRatingScores): boolean {
  return (
    scores.description.completeness != null &&
    scores.description.independence != null &&
    scores.summary.informativeness != null &&
    scores.summary.completeness != null &&
    scores.summary.combination != null &&
    scores.summary.fluency != null
  );
}
