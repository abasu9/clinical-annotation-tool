import React from "react";
import {
  annotationStatusLabel,
  annotationStatusPillClass,
} from "../lib/annotationStatus";

interface Props {
  status: string;
  variant?: "light" | "dark";
}

export default function AnnotationStatusPill({ status, variant = "light" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${annotationStatusPillClass(status, variant)}`}
    >
      {annotationStatusLabel(status)}
    </span>
  );
}
