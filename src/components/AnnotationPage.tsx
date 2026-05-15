import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Annotation, Dataset, Sample } from "../lib/supabase";
import {
  DatasetProgress,
  fetchAnnotationsForAnnotator,
  fetchDatasetProgress,
  fetchSamples,
  upsertAnnotation,
} from "../lib/data";
import PostPanel from "./PostPanel";
import ImageViewer from "./ImageViewer";
import AnnotationForm, { FormData } from "./AnnotationForm";
import ProgressBar from "./ProgressBar";

interface Props {
  dataset: Dataset;
  annotatorId: string;
  onBackToDatasets: () => void;
}

const EMPTY_FORM: FormData = {
  imageStatus: "",
  objectiveImageDescription: "",
  finalMultimodalClinicalSummary: "",
};

function annotationToForm(a: Annotation | undefined): FormData {
  if (!a) return EMPTY_FORM;
  return {
    imageStatus: a.image_status ?? "",
    objectiveImageDescription: a.objective_image_description ?? "",
    finalMultimodalClinicalSummary: a.final_multimodal_clinical_summary ?? "",
  };
}

function isTerminal(a: Annotation | undefined): boolean {
  return !!a && (a.status === "submitted" || a.status === "skipped");
}

export default function AnnotationPage({
  dataset,
  annotatorId,
  onBackToDatasets,
}: Props) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [annByMap, setAnnByMap] = useState<Record<string, Annotation>>({});
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<DatasetProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const dirtyRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const refreshProgress = useCallback(async () => {
    try {
      const p = await fetchDatasetProgress(
        dataset.id,
        dataset.total_samples,
        annotatorId
      );
      setProgress(p);
    } catch {
      /* non-fatal */
    }
  }, [dataset.id, dataset.total_samples, annotatorId]);

  // Load samples + annotations once per (dataset, annotator)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    (async () => {
      try {
        const [s, a] = await Promise.all([
          fetchSamples(dataset.id),
          fetchAnnotationsForAnnotator(dataset.id, annotatorId),
        ]);
        if (cancelled) return;
        const map: Record<string, Annotation> = {};
        for (const row of a) map[row.sample_id] = row;
        setSamples(s);
        setAnnByMap(map);
        const firstPending = s.findIndex((x) => !isTerminal(map[x.id]));
        const target = firstPending >= 0 ? firstPending : 0;
        setIndex(target);
        setForm(annotationToForm(map[s[target]?.id]));
        dirtyRef.current = false;
      } catch (e: any) {
        if (!cancelled) setLoadError(e.message ?? "Failed to load samples.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset.id, annotatorId]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress, annByMap]);

  // Warn before leaving page with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const current = samples[index];
  const currentAnn = current ? annByMap[current.id] : undefined;

  const validate = useCallback((data: FormData): string[] => {
    const errs: string[] = [];
    if (!data.imageStatus) {
      errs.push("Does this question require summarization? (Yes or No) is required.");
    }
    if (data.imageStatus === "Yes") {
      if (!data.objectiveImageDescription.trim()) {
        errs.push("Objective Image Description is required when summarization is Yes.");
      }
      if (!data.finalMultimodalClinicalSummary.trim()) {
        errs.push("Final Multimodal Clinical Summary is required when summarization is Yes.");
      }
    }
    return errs;
  }, []);

  const onFormChange = useCallback((data: FormData) => {
    setForm(data);
    dirtyRef.current = true;
  }, []);

  const moveTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= samples.length) return;
      if (dirtyRef.current) {
        const proceed = window.confirm(
          "You have unsaved changes. Continue without saving?"
        );
        if (!proceed) return;
      }
      const target = samples[next];
      setIndex(next);
      setForm(annotationToForm(annByMap[target.id]));
      setErrors([]);
      dirtyRef.current = false;
    },
    [samples, annByMap]
  );

  const persist = useCallback(
    async (status: "draft" | "submitted" | "skipped", data: FormData) => {
      if (!current) return null;
      const objective = data.objectiveImageDescription.trim() || null;
      const summary = data.finalMultimodalClinicalSummary.trim() || null;
      const saved = await upsertAnnotation({
        sample_id: current.id,
        dataset_id: dataset.id,
        post_id: current.post_id,
        annotator_id: annotatorId,
        image_status: data.imageStatus,
        objective_image_description: objective,
        final_multimodal_clinical_summary: summary,
        status,
      });
      setAnnByMap((m) => ({ ...m, [current.id]: saved }));
      dirtyRef.current = false;
      return saved;
    },
    [current, dataset.id, annotatorId]
  );

  const handleSaveDraft = async () => {
    if (!current || busy) return;
    if (!form.imageStatus) {
      setErrors(["Yes or No is required (even for a draft)."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      await persist("draft", form);
      showToast("Draft saved.");
    } catch (e: any) {
      setErrors([e.message ?? "Failed to save draft."]);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (!current || busy) return;
    if (!form.imageStatus) {
      setErrors(["Yes or No is required before skipping."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      await persist("skipped", form);
      showToast("Skipped.");
      const next = findNextPending(samples, annByMap, current.id);
      if (next >= 0) moveToWithoutPrompt(next);
      else showToast("All pending samples are complete.");
    } catch (e: any) {
      setErrors([e.message ?? "Failed to skip."]);
    } finally {
      setBusy(false);
    }
  };

  const findNextPending = (
    list: Sample[],
    map: Record<string, Annotation>,
    afterSampleId: string
  ): number => {
    const startAt =
      list.findIndex((s) => s.id === afterSampleId) >= 0
        ? list.findIndex((s) => s.id === afterSampleId) + 1
        : 0;
    for (let i = startAt; i < list.length; i++) {
      if (!isTerminal(map[list[i].id])) return i;
    }
    for (let i = 0; i < startAt; i++) {
      if (!isTerminal(map[list[i].id])) return i;
    }
    return -1;
  };

  const moveToWithoutPrompt = (next: number) => {
    if (next < 0 || next >= samples.length) return;
    const target = samples[next];
    setIndex(next);
    setForm(annotationToForm(annByMap[target.id]));
    setErrors([]);
    dirtyRef.current = false;
  };

  const handleSubmit = async () => {
    if (!current || busy) return;
    const errs = validate(form);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const saved = await persist("submitted", form);
      const updatedMap = saved ? { ...annByMap, [current.id]: saved } : annByMap;
      const next = findNextPending(samples, updatedMap, current.id);
      if (next >= 0) {
        showToast("Submitted. Loading next…");
        // Use the freshly-updated map for the next view
        const target = samples[next];
        setIndex(next);
        setForm(annotationToForm(updatedMap[target.id]));
      } else {
        showToast("Submitted. All pending samples are complete.");
      }
    } catch (e: any) {
      setErrors([e.message ?? "Failed to submit."]);
    } finally {
      setBusy(false);
    }
  };

  const handlePrev = () => moveTo(index - 1);
  const handleNext = () => moveTo(index + 1);

  const annStatus = currentAnn?.status ?? "unstarted";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading dataset…
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
        <p className="text-slate-600">This dataset has no samples yet.</p>
        <button
          onClick={onBackToDatasets}
          className="mt-3 text-indigo-600 hover:underline text-sm"
        >
          ← Back to datasets
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <ProgressBar progress={progress} />
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-600">
        <span>
          Sample {index + 1} of {samples.length} ·{" "}
          <span className="font-mono">{current?.post_id}</span> ·{" "}
          <span className="uppercase font-semibold">{annStatus}</span>
        </span>
        <button
          onClick={onBackToDatasets}
          className="text-indigo-600 hover:underline"
        >
          Change dataset
        </button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 max-w-[1800px] mx-auto">
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-[500px]">
            <div className="flex-1">
              <PostPanel
                postId={current?.post_id ?? ""}
                question={current?.question ?? ""}
              />
            </div>
            <div className="flex-1">
              <ImageViewer imageUrls={current?.image_urls ?? []} />
            </div>
          </div>
          <div className="lg:col-span-2 min-h-[500px]">
            <AnnotationForm value={form} onChange={onFormChange} errors={errors} />
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={handlePrev}
            disabled={index === 0 || busy}
            className="px-5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={busy}
              className="px-5 py-2 border border-amber-400 bg-amber-50 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition"
            >
              Save Draft
            </button>
            <button
              onClick={handleSkip}
              disabled={busy}
              className="px-5 py-2 border border-orange-300 bg-orange-50 rounded-lg text-sm font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-40 transition"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              Submit &amp; Next
            </button>
            <button
              onClick={handleNext}
              disabled={index >= samples.length - 1 || busy}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
              title="Skip to next sample without saving"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
