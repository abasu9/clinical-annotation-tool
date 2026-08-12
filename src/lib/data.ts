import {
  supabase,
  Annotation,
  Dataset,
  Rating,
  Sample,
} from "./supabase";
import { isAiAnnotatorId } from "./ratingCriteria";
import {
  allIaaAnnotatorIds,
  codeForAnnotatorId,
  IAA_INCLUDED_DATASET_NAMES,
  resolveIaaCode,
  type IaaCode,
} from "./iaaAnnotators";

export interface DatasetProgress {
  total_samples: number;
  submitted: number;
  draft: number;
  skipped: number;
  out_of_expertise: number;
  remaining: number;
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Dataset[];
}

export async function fetchDatasetProgress(
  datasetId: string,
  totalSamples: number,
  annotatorId?: string
): Promise<DatasetProgress> {
  let q = supabase
    .from("annotations")
    .select("status, sample_id")
    .eq("dataset_id", datasetId);
  if (annotatorId) q = q.eq("annotator_id", annotatorId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Pick<Annotation, "status" | "sample_id">[];
  let submitted = 0,
    draft = 0,
    skipped = 0,
    out_of_expertise = 0;
  const processedSampleIds = new Set<string>();
  for (const r of rows) {
    if (r.status === "submitted") {
      submitted += 1;
      processedSampleIds.add(r.sample_id);
    } else if (r.status === "draft") {
      draft += 1;
    } else if (r.status === "skipped") {
      skipped += 1;
      processedSampleIds.add(r.sample_id);
    } else if (r.status === "out_of_expertise") {
      out_of_expertise += 1;
      processedSampleIds.add(r.sample_id);
    }
  }
  // When scoped to a single annotator, draft also reduces remaining;
  // when global, draft does not count as remaining-done.
  const finishedSamples = annotatorId
    ? submitted + skipped + out_of_expertise + draft
    : processedSampleIds.size;
  const remaining = Math.max(0, totalSamples - finishedSamples);
  return {
    total_samples: totalSamples,
    submitted,
    draft,
    skipped,
    out_of_expertise,
    remaining,
  };
}

export async function fetchSamples(datasetId: string): Promise<Sample[]> {
  const { data, error } = await supabase
    .from("samples")
    .select("*")
    .eq("dataset_id", datasetId)
    .order("created_at", { ascending: true })
    .order("post_id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Sample[];
}

export async function fetchAnnotationsForAnnotator(
  datasetId: string,
  annotatorId: string
): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("annotator_id", annotatorId);
  if (error) throw error;
  return (data ?? []) as Annotation[];
}

/** Submitted human annotations eligible for rating (excludes AI annotators). */
export function isRateableAnnotation(a: Annotation): boolean {
  if (a.status !== "submitted") return false;
  if (isAiAnnotatorId(a.annotator_id)) return false;
  if (a.image_status !== "Yes") return false;
  const desc = (a.objective_image_description ?? "").trim();
  const summary = (a.final_multimodal_clinical_summary ?? "").trim();
  return desc.length > 0 && summary.length > 0;
}

export async function fetchSubmittedAnnotationsForDataset(
  datasetId: string
): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("status", "submitted")
    .eq("image_status", "Yes");
  if (error) throw error;
  return ((data ?? []) as Annotation[]).filter(isRateableAnnotation);
}

export async function fetchRatingsForEvaluator(
  datasetId: string,
  evaluatorId: string
): Promise<Rating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("dataset_id", datasetId)
    .eq("evaluator_id", evaluatorId);
  if (error) throw error;
  return (data ?? []) as Rating[];
}

export interface UpsertRatingInput {
  sample_id: string;
  dataset_id: string;
  post_id: string;
  evaluator_id: string;
  rated_annotator_id: string;
  desc_completeness: number | null;
  desc_independence: number | null;
  sum_informativeness: number | null;
  sum_completeness: number | null;
  sum_combination: number | null;
  sum_fluency: number | null;
  status: "draft" | "submitted";
}

export async function upsertRating(input: UpsertRatingInput): Promise<Rating> {
  const { data, error } = await supabase
    .from("ratings")
    .upsert(input, {
      onConflict: "sample_id,evaluator_id,rated_annotator_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Rating;
}

export async function upsertRatings(
  inputs: UpsertRatingInput[]
): Promise<Rating[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from("ratings")
    .upsert(inputs, {
      onConflict: "sample_id,evaluator_id,rated_annotator_id",
    })
    .select();
  if (error) throw error;
  return (data ?? []) as Rating[];
}

export interface RatingProgress {
  total_rateable_samples: number;
  submitted: number;
  draft: number;
  remaining: number;
}

/**
 * Progress for an evaluator: a sample counts as submitted when every
 * rateable annotator on that sample has a submitted rating from this evaluator.
 */
export function computeRatingProgress(
  rateableBySample: Record<string, Annotation[]>,
  ratings: Rating[]
): RatingProgress {
  const sampleIds = Object.keys(rateableBySample).filter(
    (id) => (rateableBySample[id]?.length ?? 0) > 0
  );
  const bySampleAnnotator = new Map<string, Rating>();
  for (const r of ratings) {
    bySampleAnnotator.set(`${r.sample_id}::${r.rated_annotator_id}`, r);
  }

  let submitted = 0;
  let draft = 0;
  for (const sampleId of sampleIds) {
    const anns = rateableBySample[sampleId] ?? [];
    let allSubmitted = true;
    let anyDraft = false;
    let anyRating = false;
    for (const a of anns) {
      const r = bySampleAnnotator.get(`${sampleId}::${a.annotator_id}`);
      if (!r) {
        allSubmitted = false;
        continue;
      }
      anyRating = true;
      if (r.status === "submitted") continue;
      allSubmitted = false;
      if (r.status === "draft") anyDraft = true;
    }
    if (allSubmitted && anns.length > 0) submitted += 1;
    else if (anyDraft || anyRating) draft += 1;
  }

  const remaining = Math.max(0, sampleIds.length - submitted - draft);
  return {
    total_rateable_samples: sampleIds.length,
    submitted,
    draft,
    remaining,
  };
}

export async function fetchRatingProgress(
  datasetId: string,
  evaluatorId: string
): Promise<RatingProgress> {
  const [annotations, ratings] = await Promise.all([
    fetchSubmittedAnnotationsForDataset(datasetId),
    fetchRatingsForEvaluator(datasetId, evaluatorId),
  ]);
  const bySample: Record<string, Annotation[]> = {};
  for (const a of annotations) {
    (bySample[a.sample_id] ??= []).push(a);
  }
  return computeRatingProgress(bySample, ratings);
}

/* ── Inter-annotator agreement (cross-dataset by post_id) ───────────── */

export interface IaaQuestion {
  post_id: string;
  question: string;
  image_urls: string[];
  /** Annotations from other IAA annotators (excludes the evaluator). */
  annotations: Annotation[];
}

export async function fetchRatingsForEvaluatorAll(
  evaluatorId: string
): Promise<Rating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("evaluator_id", evaluatorId);
  if (error) throw error;
  return (data ?? []) as Rating[];
}

export async function fetchAllRatings(): Promise<Rating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Rating[];
}

export interface RatingExportRow {
  post_id: string;
  evaluator_id: string;
  evaluator_code: string | null;
  rated_annotator_id: string;
  rated_annotator_code: string | null;
  desc_completeness: number | null;
  desc_independence: number | null;
  sum_informativeness: number | null;
  sum_completeness: number | null;
  sum_combination: number | null;
  sum_fluency: number | null;
  status: string;
  sample_id: string;
  dataset_id: string;
  created_at: string;
  updated_at: string;
}

export async function fetchRatingExportRows(): Promise<RatingExportRow[]> {
  const rows = await fetchAllRatings();
  return rows.map((r) => ({
    post_id: r.post_id,
    evaluator_id: r.evaluator_id,
    evaluator_code: resolveIaaCode(r.evaluator_id),
    rated_annotator_id: r.rated_annotator_id,
    rated_annotator_code: codeForAnnotatorId(r.rated_annotator_id),
    desc_completeness: r.desc_completeness,
    desc_independence: r.desc_independence,
    sum_informativeness: r.sum_informativeness,
    sum_completeness: r.sum_completeness,
    sum_combination: r.sum_combination,
    sum_fluency: r.sum_fluency,
    status: r.status,
    sample_id: r.sample_id,
    dataset_id: r.dataset_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

/**
 * Load IAA pool: submitted annotations from the 5 included doctors /
 * included datasets, grouped by post_id. Evaluator’s own work is omitted.
 */
export async function fetchIaaQuestionsForEvaluator(
  evaluatorCode: IaaCode
): Promise<IaaQuestion[]> {
  const { data: datasets, error: dsErr } = await supabase
    .from("datasets")
    .select("id, name")
    .in("name", [...IAA_INCLUDED_DATASET_NAMES]);
  if (dsErr) throw dsErr;
  const datasetIds = ((datasets ?? []) as Pick<Dataset, "id" | "name">[]).map(
    (d) => d.id
  );
  if (datasetIds.length === 0) return [];

  const iaaIds = allIaaAnnotatorIds();
  const { data: annRows, error: annErr } = await supabase
    .from("annotations")
    .select("*")
    .in("dataset_id", datasetIds)
    .in("annotator_id", iaaIds)
    .eq("status", "submitted")
    .eq("image_status", "Yes");
  if (annErr) throw annErr;

  const annotations = ((annRows ?? []) as Annotation[]).filter(
    (a) => isRateableAnnotation(a) && isIaaPoolAnnotator(a.annotator_id)
  );

  const byPost = new Map<string, Annotation[]>();
  for (const a of annotations) {
    const code = codeForAnnotatorId(a.annotator_id);
    if (!code || code === evaluatorCode) continue;
    (byPost.get(a.post_id) ?? byPost.set(a.post_id, []).get(a.post_id)!).push(
      a
    );
  }

  // Prefer one sample row per post for image/question (from included datasets)
  const { data: sampleRows, error: sErr } = await supabase
    .from("samples")
    .select("*")
    .in("dataset_id", datasetIds);
  if (sErr) throw sErr;
  const sampleByPost = new Map<string, Sample>();
  for (const s of (sampleRows ?? []) as Sample[]) {
    if (!sampleByPost.has(s.post_id)) sampleByPost.set(s.post_id, s);
  }

  const questions: IaaQuestion[] = [];
  for (const [postId, anns] of byPost) {
    if (anns.length === 0) continue;
    // Deduplicate by annotator code (keep first)
    const seen = new Set<IaaCode>();
    const unique: Annotation[] = [];
    for (const a of anns) {
      const code = codeForAnnotatorId(a.annotator_id);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      unique.push(a);
    }
    unique.sort((a, b) => {
      const ca = codeForAnnotatorId(a.annotator_id) ?? "";
      const cb = codeForAnnotatorId(b.annotator_id) ?? "";
      return ca.localeCompare(cb);
    });
    const sample = sampleByPost.get(postId);
    questions.push({
      post_id: postId,
      question: sample?.question ?? "",
      image_urls: sample?.image_urls ?? [],
      annotations: unique,
    });
  }

  questions.sort((a, b) => a.post_id.localeCompare(b.post_id));
  return questions;
}

function isIaaPoolAnnotator(annotatorId: string): boolean {
  return codeForAnnotatorId(annotatorId) != null;
}

/** Progress keyed by post_id for IAA rating. */
export function computeIaaRatingProgress(
  questions: IaaQuestion[],
  ratings: Rating[]
): RatingProgress {
  const byPostAnnotator = new Map<string, Rating>();
  for (const r of ratings) {
    byPostAnnotator.set(`${r.post_id}::${r.rated_annotator_id}`, r);
  }

  let submitted = 0;
  let draft = 0;
  for (const q of questions) {
    if (q.annotations.length === 0) continue;
    let allSubmitted = true;
    let anyRating = false;
    let anyDraft = false;
    for (const a of q.annotations) {
      const r = byPostAnnotator.get(`${q.post_id}::${a.annotator_id}`);
      if (!r) {
        allSubmitted = false;
        continue;
      }
      anyRating = true;
      if (r.status === "submitted") continue;
      allSubmitted = false;
      if (r.status === "draft") anyDraft = true;
    }
    if (allSubmitted) submitted += 1;
    else if (anyDraft || anyRating) draft += 1;
  }

  const total = questions.filter((q) => q.annotations.length > 0).length;
  return {
    total_rateable_samples: total,
    submitted,
    draft,
    remaining: Math.max(0, total - submitted - draft),
  };
}

export interface UpsertAnnotationInput {
  sample_id: string;
  dataset_id: string;
  post_id: string;
  annotator_id: string;
  image_status: string;
  summarization_reason: string | null;
  objective_image_description: string | null;
  final_multimodal_clinical_summary: string | null;
  status: "draft" | "submitted" | "skipped" | "out_of_expertise";
}

export async function upsertAnnotation(
  input: UpsertAnnotationInput
): Promise<Annotation> {
  const { data, error } = await supabase
    .from("annotations")
    .upsert(input, { onConflict: "sample_id,annotator_id" })
    .select()
    .single();
  if (error) throw error;
  return data as Annotation;
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const { error } = await supabase
    .from("datasets")
    .delete()
    .eq("id", datasetId);
  if (error) throw error;
}

/* ── Export helpers ─────────────────────────────────────────────────── */

export interface ExportRow {
  dataset_id: string;
  post_id: string;
  original_question: string;
  image_urls: string[];
  image_status: string;
  summarization_reason: string | null;
  objective_image_description: string | null;
  final_multimodal_clinical_summary: string | null;
  annotator_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function fetchExportRows(datasetId: string): Promise<ExportRow[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select(
      "dataset_id, post_id, annotator_id, image_status, summarization_reason, objective_image_description, final_multimodal_clinical_summary, status, created_at, updated_at, sample:samples(question, image_urls)"
    )
    .eq("dataset_id", datasetId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  type Joined = {
    dataset_id: string;
    post_id: string;
    annotator_id: string;
    image_status: string;
    summarization_reason: string | null;
    objective_image_description: string | null;
    final_multimodal_clinical_summary: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    sample: { question: string; image_urls: string[] } | null;
  };
  return ((data ?? []) as unknown as Joined[]).map((r) => ({
    dataset_id: r.dataset_id,
    post_id: r.post_id,
    original_question: r.sample?.question ?? "",
    image_urls: r.sample?.image_urls ?? [],
    image_status: r.image_status,
    summarization_reason: r.summarization_reason,
    objective_image_description: r.objective_image_description,
    final_multimodal_clinical_summary: r.final_multimodal_clinical_summary,
    annotator_id: r.annotator_id,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}
