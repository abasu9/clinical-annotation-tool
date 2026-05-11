import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Create a .env file (see .env.example) or set them in your deploy environment."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: { persistSession: false },
});

export const isSupabaseConfigured = Boolean(url && anonKey);

/* ── Row types matching the Supabase schema ─────────────────────────── */

export interface Dataset {
  id: string;
  name: string;
  uploaded_filename: string | null;
  total_samples: number;
  created_at: string;
}

export interface Sample {
  id: string;
  dataset_id: string;
  post_id: string;
  question: string;
  image_urls: string[];
  created_at: string;
}

export type AnnotationStatus = "draft" | "submitted" | "skipped";

export interface Annotation {
  id: string;
  sample_id: string;
  dataset_id: string;
  post_id: string;
  annotator_id: string;
  image_status: string;
  objective_image_description: string | null;
  final_multimodal_clinical_summary: string | null;
  status: AnnotationStatus;
  created_at: string;
  updated_at: string;
}

export const IMAGE_STATUS_OPTIONS = [
  "Image available",
  "Image not assessable",
  "Image link broken",
  "No medical finding visible",
] as const;

export type ImageStatus = (typeof IMAGE_STATUS_OPTIONS)[number] | "";
