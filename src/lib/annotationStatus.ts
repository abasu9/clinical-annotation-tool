/** Human-readable labels for annotation status values. */
export function annotationStatusLabel(status: string): string {
  switch (status) {
    case "unstarted":
      return "Not started";
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "skipped":
      return "Skipped";
    default:
      return status;
  }
}

const PILL_LIGHT: Record<string, string> = {
  unstarted: "bg-orange-50 text-slate-600 ring-1 ring-orange-200/80",
  draft: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  submitted: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  skipped: "bg-orange-50 text-orange-800 ring-1 ring-orange-200/80",
};

const PILL_DARK: Record<string, string> = {
  unstarted: "bg-orange-500/15 text-orange-100/95 ring-1 ring-orange-400/30",
  draft: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
  submitted: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
  skipped: "bg-orange-400/20 text-orange-100 ring-1 ring-orange-300/30",
};

export function annotationStatusPillClass(
  status: string,
  variant: "light" | "dark" = "light"
): string {
  const map = variant === "dark" ? PILL_DARK : PILL_LIGHT;
  return map[status] ?? map.unstarted;
}
