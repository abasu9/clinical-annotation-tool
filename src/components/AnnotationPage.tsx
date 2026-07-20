import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Annotation, Dataset, OUT_OF_EXPERTISE_IMAGE_STATUS, Sample } from "../lib/supabase";
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
import AnnotationStatusPill from "./AnnotationStatusPill";
import ProgressBar from "./ProgressBar";
import SampleSearchBar, {
  previewQuestion,
  type SampleSearchHit,
} from "./SampleSearchBar";
import { contentCanvas, interiorStrip } from "../lib/ui";
import {
  countWords,
  MIN_TASK_WORDS,
  meetsMinWordCount,
} from "../lib/wordCount";

function taskFieldErrors(data: FormData): string[] {
  if (data.imageStatus !== "Yes") return [];
  const errs: string[] = [];
  const task1Words = countWords(data.objectiveImageDescription);
  const task2Words = countWords(data.finalMultimodalClinicalSummary);
  if (!meetsMinWordCount(data.objectiveImageDescription)) {
    errs.push(
      `Task 1 must be at least ${MIN_TASK_WORDS} words (currently ${task1Words}).`
    );
  }
  if (!meetsMinWordCount(data.finalMultimodalClinicalSummary)) {
    errs.push(
      `Task 2 must be at least ${MIN_TASK_WORDS} words (currently ${task2Words}).`
    );
  }
  return errs;
}

interface Props {
  dataset: Dataset;
  annotatorId: string;
  onBackToDatasets: () => void;
}

const EMPTY_FORM: FormData = {
  imageStatus: "",
  summarizationReason: "",
  objectiveImageDescription: "",
  finalMultimodalClinicalSummary: "",
};

function annotationToForm(a: Annotation | undefined): FormData {
  if (!a) return EMPTY_FORM;
  return {
    imageStatus: a.image_status ?? "",
    summarizationReason: a.summarization_reason ?? "",
    objectiveImageDescription: a.objective_image_description ?? "",
    finalMultimodalClinicalSummary: a.final_multimodal_clinical_summary ?? "",
  };
}

function isTerminal(a: Annotation | undefined): boolean {
  return (
    !!a &&
    (a.status === "submitted" ||
      a.status === "skipped" ||
      a.status === "out_of_expertise")
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SampleSearchHit[]>([]);
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
    if (data.imageStatus === "No") {
      if (!data.summarizationReason.trim()) {
        errs.push(
          "Reason is required when summarization is No (choose a preset or write a custom reason)."
        );
      }
    }
    if (data.imageStatus === "Yes") {
      errs.push(...taskFieldErrors(data));
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
    async (
      status: "draft" | "submitted" | "skipped" | "out_of_expertise",
      data: FormData
    ) => {
      if (!current) return null;
      const objective = data.objectiveImageDescription.trim() || null;
      const summary = data.finalMultimodalClinicalSummary.trim() || null;
      const saved = await upsertAnnotation({
        sample_id: current.id,
        dataset_id: dataset.id,
        post_id: current.post_id,
        annotator_id: annotatorId,
        image_status: data.imageStatus,
        summarization_reason:
          data.imageStatus === "No" ? data.summarizationReason.trim() || null : null,
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

  const needsReason =
    form.imageStatus === "No" && !form.summarizationReason.trim();

  const handleSaveDraft = async () => {
    if (!current || busy) return;
    if (!form.imageStatus) {
      setErrors(["Yes or No is required (even for a draft)."]);
      return;
    }
    if (needsReason) {
      setErrors([
        "Reason is required when summarization is No (choose a preset or write a custom reason).",
      ]);
      return;
    }
    const draftTaskErrs = taskFieldErrors(form);
    if (draftTaskErrs.length > 0) {
      setErrors(draftTaskErrs);
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

  const handleOutOfExpertise = async () => {
    if (!current || busy) return;
    const proceed = window.confirm(
      `Mark post ${current.post_id} as not within your expertise?\n\nIt will be tracked for reassignment to another doctor. You can still view it later, but it will count as done for your queue.`
    );
    if (!proceed) return;
    setBusy(true);
    setErrors([]);
    try {
      const saved = await upsertAnnotation({
        sample_id: current.id,
        dataset_id: dataset.id,
        post_id: current.post_id,
        annotator_id: annotatorId,
        image_status: OUT_OF_EXPERTISE_IMAGE_STATUS,
        summarization_reason: null,
        objective_image_description: null,
        final_multimodal_clinical_summary: null,
        status: "out_of_expertise",
      });
      const updatedMap = { ...annByMap, [current.id]: saved };
      setAnnByMap(updatedMap);
      dirtyRef.current = false;
      const next = findNextPending(samples, updatedMap, current.id);
      if (next >= 0) {
        showToast("Marked out of expertise. Loading next…");
        moveToWithoutPrompt(next);
      } else {
        showToast("Marked out of expertise.");
        setForm(EMPTY_FORM);
      }
    } catch (e: any) {
      setErrors([e.message ?? "Failed to save. Run the Supabase migration for out_of_expertise status."]);
    } finally {
      setBusy(false);
    }
  };

  const handlePrev = () => moveTo(index - 1);
  const handleNext = () => moveTo(index + 1);

  const findMatchingIndices = useCallback(
    (query: string): number[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const indices: number[] = [];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (
          s.post_id.toLowerCase().includes(q) ||
          s.question.toLowerCase().includes(q)
        ) {
          indices.push(i);
        }
      }
      return indices;
    },
    [samples]
  );

  const handleSearch = useCallback(() => {
    const matches = findMatchingIndices(searchQuery);
    if (matches.length === 0) {
      setSearchHits([]);
      showToast(`No sample found for "${searchQuery.trim()}"`);
      return;
    }
    const max = 50;
    const hits: SampleSearchHit[] = matches.slice(0, max).map((i) => {
      const s = samples[i];
      const ann = annByMap[s.id];
      const statusLabel = ann?.status ?? "unstarted";
      return {
        index: i,
        post_id: s.post_id,
        questionPreview: previewQuestion(s.question),
        statusLabel,
      };
    });
    setSearchHits(hits);
    if (matches.length > max) {
      showToast(`Showing first ${max} of ${matches.length} matches.`);
    }
  }, [findMatchingIndices, searchQuery, samples, annByMap, showToast]);

  const handleSelectSearchHit = useCallback(
    (targetIndex: number) => {
      setSearchHits([]);
      moveTo(targetIndex);
    },
    [moveTo]
  );

  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
    setSearchHits([]);
  }, []);

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
      <div
        className={`${interiorStrip} relative px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs sm:text-sm`}
      >
        <span className="shrink-0 text-slate-800">
          Sample{" "}
          <span className="font-bold text-slate-900">
            {index + 1} / {samples.length}
          </span>
          <span className="mx-2 text-indigo-300">·</span>
          <span className="font-mono font-semibold text-indigo-800">{current?.post_id}</span>
          <span className="mx-2 text-indigo-300">·</span>
          <AnnotationStatusPill status={annStatus} />
        </span>
        <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-xl lg:max-w-2xl">
          <SampleSearchBar
            embedded
            value={searchQuery}
            onChange={handleSearchQueryChange}
            onSearch={handleSearch}
            hits={searchHits}
            onSelectHit={handleSelectSearchHit}
            onCloseResults={() => setSearchHits([])}
            disabled={busy}
          />
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
        <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[280px] lg:min-h-[min(40vh,420px)]">
            <div className="min-h-[320px] lg:min-h-0 h-full">
              <ImageViewer imageUrls={current?.image_urls ?? []} />
            </div>
            <div className="min-h-[320px] lg:min-h-0 h-full">
              <PostPanel
                postId={current?.post_id ?? ""}
                question={current?.question ?? ""}
              />
            </div>
          </div>
          <div>
            <AnnotationForm value={form} onChange={onFormChange} errors={errors} />
          </div>
        </div>
      </div>

      <div className="border-t border-indigo-300/40 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 sm:px-6 py-3 shadow-[0_-8px_32px_rgba(49,46,129,0.25)]">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto gap-3 flex-wrap">
          <button
            type="button"
            onClick={handlePrev}
            disabled={index === 0 || busy}
            className="px-4 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
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
              onClick={handleOutOfExpertise}
              disabled={busy || currentAnn?.status === "out_of_expertise"}
              className="px-4 py-2.5 border border-violet-300/60 bg-violet-500/20 rounded-xl text-sm font-medium text-violet-100 hover:bg-violet-500/30 disabled:opacity-40 transition"
              title="Mark this case for reassignment to another doctor"
            >
              Not within my expertise
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
              onClick={handleNext}
              disabled={index >= samples.length - 1 || busy}
              className="px-4 py-2.5 border border-white/20 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/20 disabled:opacity-40 transition"
              title="Go to next sample without saving"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
