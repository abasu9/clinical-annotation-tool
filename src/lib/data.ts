import {
  supabase,
  Annotation,
  Dataset,
  Rating,
  Sample,
} from "./supabase";
import { isAiAnnotatorId } from "./ratingCriteria";

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
