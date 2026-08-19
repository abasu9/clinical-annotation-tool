import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Rating } from "../lib/supabase";
import {
  computeIaaRatingProgress,
  fetchIaaQuestionsForEvaluator,
  fetchRatingsForEvaluatorAll,
  IaaQuestion,
  RatingProgress,
  upsertRatings,
  UpsertRatingInput,
} from "../lib/data";
import {
  allScoresFilled,
  EMPTY_ANNOTATOR_SCORES,
  type AnnotatorRatingScores,
} from "../lib/ratingCriteria";
import {
  codeForAnnotatorId,
  resolveIaaCode,
  type IaaCode,
} from "../lib/iaaAnnotators";
import AnnotatorRatingCard from "./AnnotatorRatingCard";
import ImageViewer from "./ImageViewer";
import PostPanel from "./PostPanel";
import ProgressBar from "./ProgressBar";
import { contentCanvas, interiorStrip } from "../lib/ui";

interface Props {
  evaluatorId: string;
  onBack: () => void;
}

function ratingToScores(r: Rating | undefined): AnnotatorRatingScores {
  if (!r) {
    return {
      description: { ...EMPTY_ANNOTATOR_SCORES.description },
      summary: { ...EMPTY_ANNOTATOR_SCORES.summary },
    };
  }
  return {
    description: {
      completeness:
        (r.desc_completeness as AnnotatorRatingScores["description"]["completeness"]) ??
        null,
      independence:
        (r.desc_independence as AnnotatorRatingScores["description"]["independence"]) ??
        null,
    },
    summary: {
      informativeness:
        (r.sum_informativeness as AnnotatorRatingScores["summary"]["informativeness"]) ??
        null,
      completeness:
        (r.sum_completeness as AnnotatorRatingScores["summary"]["completeness"]) ??
        null,
      combination:
        (r.sum_combination as AnnotatorRatingScores["summary"]["combination"]) ??
        null,
      fluency:
        (r.sum_fluency as AnnotatorRatingScores["summary"]["fluency"]) ?? null,
    },
  };
}

function scoresToInput(
  ann: IaaQuestion["annotations"][number],
  evaluatorId: string,
  scores: AnnotatorRatingScores,
  status: "draft" | "submitted"
): UpsertRatingInput {
  return {
    sample_id: ann.sample_id,
    dataset_id: ann.dataset_id,
    post_id: ann.post_id,
    evaluator_id: evaluatorId,
    rated_annotator_id: ann.annotator_id,
    desc_completeness: scores.description.completeness,
    desc_independence: scores.description.independence,
    sum_informativeness: scores.summary.informativeness,
    sum_completeness: scores.summary.completeness,
    sum_combination: scores.summary.combination,
    sum_fluency: scores.summary.fluency,
    status,
  };
}

export default function RatingPage({ evaluatorId, onBack }: Props) {
  const evaluatorCode = resolveIaaCode(evaluatorId);

  const [questions, setQuestions] = useState<IaaQuestion[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [index, setIndex] = useState(0);
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

  useEffect(() => {
    if (!evaluatorCode) {
      setLoading(false);
      setLoadError(
        `Your login ID (“${evaluatorId}”) is not in the rating pool. Use one of: nf, c, sz, s, w (or the matching doctor login ID). Mondal is excluded.`
      );
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [qs, ratingRows] = await Promise.all([
          fetchIaaQuestionsForEvaluator(evaluatorCode),
          fetchRatingsForEvaluatorAll(evaluatorId),
        ]);
        if (cancelled) return;
        setQuestions(qs);
        setRatings(ratingRows);
        setProgress(computeIaaRatingProgress(qs, ratingRows));

        const firstIncomplete = qs.findIndex((q) => {
          return !q.annotations.every((a) =>
            ratingRows.some(
              (r) =>
                r.post_id === q.post_id &&
                r.rated_annotator_id === a.annotator_id &&
                r.status === "submitted"
            )
          );
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
  }, [evaluatorCode, evaluatorId]);

  const current = questions[index];

  const loadForm = useCallback(
    (q: IaaQuestion | undefined, ratingRows: Rating[]) => {
      if (!q) {
        setFormByAnnotator({});
        return;
      }
      const next: Record<string, AnnotatorRatingScores> = {};
      for (const a of q.annotations) {
        const existing = ratingRows.find(
          (r) =>
            r.post_id === q.post_id &&
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
    if (loading || questions.length === 0) return;
    loadForm(questions[index], ratings);
  }, [index, questions, ratings, loading, loadForm]);

  const moveTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= questions.length) return;
      setIndex(i);
    },
    [questions.length]
  );

  const buildPayloads = useCallback(
    (status: "draft" | "submitted"): UpsertRatingInput[] => {
      if (!current) return [];
      return current.annotations.map((a) =>
        scoresToInput(
          a,
          evaluatorId,
          formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES,
          status
        )
      );
    },
    [current, evaluatorId, formByAnnotator]
  );

  const persist = useCallback(
    async (status: "draft" | "submitted") => {
      const payloads = buildPayloads(status);
      if (payloads.length === 0) return;
      const saved = await upsertRatings(payloads);
      setRatings((prev) => {
        const map = new Map(
          prev.map((r) => [`${r.post_id}::${r.rated_annotator_id}`, r])
        );
        for (const r of saved) {
          map.set(`${r.post_id}::${r.rated_annotator_id}`, r);
        }
        const next = Array.from(map.values());
        setProgress(computeIaaRatingProgress(questions, next));
        return next;
      });
      dirtyRef.current = false;
    },
    [buildPayloads, questions]
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
    if (!current) return;
    const missing: string[] = [];
    for (const a of current.annotations) {
      const scores = formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES;
      if (!allScoresFilled(scores)) {
        const code = codeForAnnotatorId(a.annotator_id) ?? "?";
        missing.push(`Complete all Likert scores for annotator ${code}.`);
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
      if (index < questions.length - 1) moveTo(index + 1);
    } catch (e: unknown) {
      setErrors([e instanceof Error ? e.message : "Failed to submit ratings."]);
    } finally {
      setBusy(false);
    }
  };

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

  const updateScores = (annotatorId: string, scores: AnnotatorRatingScores) => {
    dirtyRef.current = true;
    setFormByAnnotator((prev) => ({ ...prev, [annotatorId]: scores }));
  };

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
          onClick={onBack}
          className="mt-4 text-indigo-600 hover:underline text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-slate-700 font-medium">No questions to rate yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Waiting for other annotators’ submitted descriptions and summaries on
          shared posts.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-indigo-600 hover:underline text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  const peerCount = current?.annotations.length ?? 0;

  return (
    <div className="flex-1 flex flex-col">
      {progressForBar && <ProgressBar progress={progressForBar} />}
      <div
        className={`${interiorStrip} relative px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs sm:text-sm`}
      >
        <span className="shrink-0 text-slate-800">
          Question{" "}
          <span className="font-bold text-slate-900">
            {index + 1} / {questions.length}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="font-mono font-semibold text-indigo-800">
            {current?.post_id}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-indigo-200">
            Rate {peerCount} annotator{peerCount === 1 ? "" : "s"}
          </span>
          {evaluatorCode ? (
            <>
              <span className="mx-2 text-indigo-300">·</span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                You: {evaluatorCode}
              </span>
            </>
          ) : null}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-semibold text-indigo-900 shadow-sm ring-1 ring-indigo-300 transition hover:bg-indigo-50"
          >
            Change task
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
            {current?.annotations.map((a) => {
              const code = codeForAnnotatorId(a.annotator_id) as IaaCode;
              return (
                <AnnotatorRatingCard
                  key={a.id}
                  code={code}
                  imageDescription={a.objective_image_description ?? ""}
                  summary={a.final_multimodal_clinical_summary ?? ""}
                  scores={
                    formByAnnotator[a.annotator_id] ?? EMPTY_ANNOTATOR_SCORES
                  }
                  disabled={busy}
                  onChange={(scores) => updateScores(a.annotator_id, scores)}
                />
              );
            })}
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
              disabled={index >= questions.length - 1 || busy}
              className="px-4 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
