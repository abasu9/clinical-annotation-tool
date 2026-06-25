import { supabase, Annotation, Dataset, Sample } from "./supabase";

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
