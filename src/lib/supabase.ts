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

export type AnnotationStatus = "draft" | "submitted" | "skipped" | "out_of_expertise";

export interface Annotation {
  id: string;
  sample_id: string;
  dataset_id: string;
  post_id: string;
  annotator_id: string;
  image_status: string;
  summarization_reason: string | null;
  objective_image_description: string | null;
  final_multimodal_clinical_summary: string | null;
  status: AnnotationStatus;
  created_at: string;
  updated_at: string;
}

/** Stored in DB column `image_status` (legacy name). Values: Yes | No */
export const REQUIRES_SUMMARIZATION_OPTIONS = ["Yes", "No"] as const;

/** @deprecated Use REQUIRES_SUMMARIZATION_OPTIONS */
export const IMAGE_STATUS_OPTIONS = REQUIRES_SUMMARIZATION_OPTIONS;

export type RequiresSummarization =
  (typeof REQUIRES_SUMMARIZATION_OPTIONS)[number] | "";

/** Stored in image_status when status = out_of_expertise */
export const OUT_OF_EXPERTISE_IMAGE_STATUS = "Not within expertise";

/** Why summarization is not required (when image_status = No) */
export const SUMMARIZATION_REASON_OPTIONS = [
  "Image is not clear",
  "Question is complete — don't need image for complete summary",
] as const;
