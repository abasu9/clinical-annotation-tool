import type { Dataset } from "./supabase";

/**
 * Which datasets an annotator may open in Annotation mode.
 * Matched by dataset name substring (case-insensitive).
 */
const OWNERSHIP: {
  annotatorIds: string[];
  nameIncludes: string[];
}[] = [
  {
    annotatorIds: ["dr naafila"],
    nameIncludes: ["naafila"],
  },
  {
    // Chadda’s pilot was annotated / logged in as "dr aditya"
    annotatorIds: ["dr aditya", "dr chadda", "chadda"],
    nameIncludes: ["chadda"],
  },
  {
    annotatorIds: ["dr sanchez", "sanchez"],
    nameIncludes: ["sanchez"],
  },
  {
    annotatorIds: ["dr saja", "saja"],
    nameIncludes: ["saja"],
  },
  {
    annotatorIds: ["dr wesley", "wesley"],
    nameIncludes: ["wesley"],
  },
  {
    annotatorIds: ["dr mondal", "mondal"],
    nameIncludes: ["mondal"],
  },
];

function ownershipFor(annotatorId: string) {
  const key = annotatorId.trim().toLowerCase();
  return OWNERSHIP.find((row) =>
    row.annotatorIds.some((id) => id.toLowerCase() === key)
  );
}

/** Datasets assigned to this annotator for the Annotation picker. */
export function filterDatasetsForAnnotator(
  annotatorId: string,
  datasets: Dataset[]
): Dataset[] {
  const owned = ownershipFor(annotatorId);
  if (!owned) return [];
  return datasets.filter((d) => {
    const name = d.name.toLowerCase();
    return owned.nameIncludes.some((frag) => name.includes(frag.toLowerCase()));
  });
}
