import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Annotation,
  Dataset,
  Rating,
  Sample,
} from "../lib/supabase";
import {
  computeRatingProgress,
  fetchRatingsForEvaluator,
  fetchSamples,
  fetchSubmittedAnnotationsForDataset,
  RatingProgress,
  upsertRatings,
  UpsertRatingInput,
} from "../lib/data";
import {
  allScoresFilled,
  EMPTY_ANNOTATOR_SCORES,
  type AnnotatorRatingScores,
} from "../lib/ratingCriteria";
import AnnotatorRatingCard from "./AnnotatorRatingCard";
import ImageViewer from "./ImageViewer";
import PostPanel from "./PostPanel";
import ProgressBar from "./ProgressBar";
import { contentCanvas, interiorStrip } from "../lib/ui";

interface Props {
  dataset: Dataset;
  evaluatorId: string;
  onBackToDatasets: () => void;
}

function ratingToScores(r: Rating | undefined): AnnotatorRatingScores {
  if (!r) return { ...EMPTY_ANNOTATOR_SCORES, description: { ...EMPTY_ANNOTATOR_SCORES.description }, summary: { ...EMPTY_ANNOTATOR_SCORES.summary } };
  return {
    description: {
      completeness: (r.desc_completeness as AnnotatorRatingScores["description"]["completeness"]) ?? null,
      independence: (r.desc_independence as AnnotatorRatingScores["description"]["independence"]) ?? null,
    },
    summary: {
      informativeness: (r.sum_informativeness as AnnotatorRatingScores["summary"]["informativeness"]) ?? null,
      completeness: (r.sum_completeness as AnnotatorRatingScores["summary"]["completeness"]) ?? null,
      combination: (r.sum_combination as AnnotatorRatingScores["summary"]["combination"]) ?? null,
      fluency: (r.sum_fluency as AnnotatorRatingScores["summary"]["fluency"]) ?? null,
    },
  };
}

function scoresToInput(
  sample: Sample,
  datasetId: string,
  evaluatorId: string,
  ratedAnnotatorId: string,
  scores: AnnotatorRatingScores,
  status: "draft" | "submitted"
): UpsertRatingInput {
  return {
    sample_id: sample.id,
    dataset_id: datasetId,
    post_id: sample.post_id,
    evaluator_id: evaluatorId,
    rated_annotator_id: ratedAnnotatorId,
    desc_completeness: scores.description.completeness,
    desc_independence: scores.description.independence,
    sum_informativeness: scores.summary.informativeness,
    sum_completeness: scores.summary.completeness,
    sum_combination: scores.summary.combination,
    sum_fluency: scores.summary.fluency,
    status,
  };
}

export default function RatingPage({
  dataset,
  evaluatorId,
  onBackToDatasets,
}: Props) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [annsBySample, setAnnsBySample] = useState<
    Record<string, Annotation[]>
  >({});
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [index, setIndex] = useState(0);
  /** scores keyed by rated_annotator_id for the current sample */
  const [formByAnnotator, setFormByAnnotator] = useState<
    Record<string, AnnotatorRatingScores>
  >({});
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<RatingProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const dirtyRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const refreshProgress = useCallback(
    (bySample: Record<string, Annotation[]>, ratingRows: Rating[]) => {
      setProgress(computeRatingProgress(bySample, ratingRows));
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [allSamples, submittedAnns, ratingRows] = await Promise.all([
          fetchSamples(dataset.id),
          fetchSubmittedAnnotationsForDataset(dataset.id),
          fetchRatingsForEvaluator(dataset.id, evaluatorId),
        ]);
        if (cancelled) return;

        const bySample: Record<string, Annotation[]> = {};
        for (const a of submittedAnns) {
          (bySample[a.sample_id] ??= []).push(a);
        }
        for (const id of Object.keys(bySample)) {
          bySample[id].sort((x, y) =>
            x.annotator_id.localeCompare(y.annotator_id)
          );
        }

        const rateableSamples = allSamples.filter(
          (s) => (bySample[s.id]?.length ?? 0) > 0
        );

        setSamples(rateableSamples);
        setAnnsBySample(bySample);
        setRatings(ratingRows);
        refreshProgress(bySample, ratingRows);

        const firstIncomplete = rateableSamples.findIndex((s) => {
          const anns = bySample[s.id] ?? [];
          return !anns.every((a) => {
            const r = ratingRows.find(
              (row) =>
                row.sample_id === s.id &&
                row.rated_annotator_id === a.annotator_id &&
                row.status === "submitted"
            );
            return !!r;
          });
        });
        setIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load rating data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset.id, evaluatorId, refreshProgress]);

  const current = samples[index];
  const currentAnns = useMemo(
    () => (current ? annsBySample[current.id] ?? [] : []),
    [annsBySample, current]
  );

  const loadFormForIndex = useCallback(
    (i: number, sampleList: Sample[], bySample: Record<string, Annotation[]>, ratingRows: Rating[]) => {
      const sample = sampleList[i];
      if (!sample) {
        setFormByAnnotator({});
        return;
      }
      const anns = bySample[sample.id] ?? [];
      const next: Record<string, AnnotatorRatingScores> = {};
      for (const a of anns) {
        const existing = ratingRows.find(
          (r) =>
            r.sample_id === sample.id &&
            r.rated_annotator_id === a.annotator_id
        );
        next[a.annotator_id] = ratingToScores(existing);
      }
      setFormByAnnotator(next);
      dirtyRef.current = false;
      setErrors([]);
    },
    []
  );

  useEffect(() => {
    if (loading || samples.length === 0) return;
    loadFormForIndex(index, samples, annsBySample, ratings);
  }, [index, samples, annsBySample, ratings, loading, loadFormForIndex]);

  const moveTo = useCallback((i: number) => {
    if (i < 0 || i >= samples.length) return;
    setIndex(i);
  }, [samples.length]);

  const buildPayloads = useCallback(
    (status: "draft" | "submitted"): UpsertRatingInput[] => {
      if (!current) return [];
      return currentAnns.map((a) =>
        scoresToInput(
          current,
          dataset.id,
          evaluatorId,
          a.annotator_id,
          formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES,
          status
        )
      );
    },
    [current, currentAnns, dataset.id, evaluatorId, formByAnnotator]
  );

  const persist = useCallback(
    async (status: "draft" | "submitted") => {
      const payloads = buildPayloads(status);
      if (payloads.length === 0) return [];
      const saved = await upsertRatings(payloads);
      setRatings((prev) => {
        const map = new Map(prev.map((r) => [`${r.sample_id}::${r.rated_annotator_id}`, r]));
        for (const r of saved) {
          map.set(`${r.sample_id}::${r.rated_annotator_id}`, r);
        }
        const next = Array.from(map.values());
        refreshProgress(annsBySample, next);
        return next;
      });
      dirtyRef.current = false;
      return saved;
    },
    [annsBySample, buildPayloads, refreshProgress]
  );

  const handleSaveDraft = async () => {
    setBusy(true);
    setErrors([]);
    try {
      await persist("draft");
      showToast("Draft saved.");
    } catch (e: unknown) {
      setErrors([e instanceof Error ? e.message : "Failed to save draft."]);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    for (const a of currentAnns) {
      const scores = formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES;
      if (!allScoresFilled(scores)) {
        missing.push(`Complete all Likert scores for ${a.annotator_id}.`);
      }
    }
    if (missing.length) {
      setErrors(missing);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      await persist("submitted");
      showToast("Ratings submitted.");
      if (index < samples.length - 1) moveTo(index + 1);
    } catch (e: unknown) {
      setErrors([e instanceof Error ? e.message : "Failed to submit ratings."]);
    } finally {
      setBusy(false);
    }
  };

  const sampleStatus = useMemo(() => {
    if (!current) return "unstarted";
    const anns = currentAnns;
    if (anns.length === 0) return "unstarted";
    const allSubmitted = anns.every((a) => {
      const r = ratings.find(
        (row) =>
          row.sample_id === current.id &&
          row.rated_annotator_id === a.annotator_id &&
          row.status === "submitted"
      );
      return !!r;
    });
    if (allSubmitted) return "submitted";
    const any = anns.some((a) =>
      ratings.some(
        (row) =>
          row.sample_id === current.id &&
          row.rated_annotator_id === a.annotator_id
      )
    );
    return any || dirtyRef.current ? "draft" : "unstarted";
  }, [current, currentAnns, ratings]);

  const progressForBar = progress
    ? {
        total_samples: progress.total_rateable_samples,
        submitted: progress.submitted,
        draft: progress.draft,
        skipped: 0,
        out_of_expertise: 0,
        remaining: progress.remaining,
      }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading rating workspace…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          {loadError}
        </div>
        <button
          type="button"
          onClick={onBackToDatasets}
          className="mt-4 text-indigo-600 hover:underline text-sm"
        >
          ← Back to datasets
        </button>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-slate-700 font-medium">
          No rateable submissions yet
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Rating needs submitted human annotations (with image description and
          summary). AI annotators are excluded.
        </p>
        <button
          type="button"
          onClick={onBackToDatasets}
          className="mt-4 text-indigo-600 hover:underline text-sm"
        >
          ← Back to datasets
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {progressForBar && <ProgressBar progress={progressForBar} />}
      <div
        className={`${interiorStrip} relative px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs sm:text-sm`}
      >
        <span className="shrink-0 text-slate-800">
          Question{" "}
          <span className="font-bold text-slate-900">
            {index + 1} / {samples.length}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="font-mono font-semibold text-indigo-800">
            {current?.post_id}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-indigo-200">
            {currentAnns.length} annotator{currentAnns.length === 1 ? "" : "s"}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="capitalize text-slate-600">{sampleStatus}</span>
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onBackToDatasets}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-semibold text-indigo-900 shadow-sm ring-1 ring-indigo-300 transition hover:bg-indigo-50"
          >
            Change dataset
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className={`flex-1 overflow-auto ${contentCanvas}`}>
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 min-h-[280px] lg:min-h-[min(36vh,380px)]">
            <div className="min-h-[280px] lg:min-h-0 h-full">
              <ImageViewer imageUrls={current?.image_urls ?? []} />
            </div>
            <div className="min-h-[280px] lg:min-h-0 h-full">
              <PostPanel
                postId={current?.post_id ?? ""}
                question={current?.question ?? ""}
              />
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600">
            Rate every annotator below on one scrollable page. Image description
            criteria: Completeness, Independence. Summary criteria:
            Informativeness, Completeness, Combination, Fluency. Scale: 1–5.
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-5">
            {currentAnns.map((a, i) => (
              <AnnotatorRatingCard
                key={a.id}
                index={i}
                annotatorId={a.annotator_id}
                imageDescription={a.objective_image_description ?? ""}
                summary={a.final_multimodal_clinical_summary ?? ""}
                scores={
                  formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES
                }
                disabled={busy}
                onChange={(scores) => {
                  dirtyRef.current = true;
                  setFormByAnnotator((prev) => ({
                    ...prev,
                    [a.annotator_id]: scores,
                  }));
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-indigo-300/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 sm:px-6 py-3 shadow-[0_-8px_32px_rgba(49,46,129,0.25)]">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveTo(index - 1)}
            disabled={index === 0 || busy}
            className="px-4 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition"
          >
            ← Previous
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={busy}
              className="px-4 py-2.5 border border-amber-400/50 bg-amber-500/20 rounded-xl text-sm font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 transition"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 hover:from-teal-400 hover:to-indigo-400 disabled:opacity-50 transition"
            >
              Submit &amp; Next
            </button>
            <button
              type="button"
              onClick={() => moveTo(index + 1)}
              disabled={index >= samples.length - 1 || busy}
              className="px-4 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition"
              title="Go to next question without saving"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
