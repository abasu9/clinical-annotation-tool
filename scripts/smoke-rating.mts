/**
 * Smoke tests for IAA login mapping, dataset ownership filter, and PIN verify.
 * Run: npx --yes tsx scripts/smoke-rating.mts
 */
import { filterDatasetsForAnnotator } from "../src/lib/annotatorDatasets.ts";
import {
  codeForAnnotatorId,
  isBlindDisplayCode,
  resolveIaaCode,
  verifyIaaPin,
} from "../src/lib/iaaAnnotators.ts";
import type { Dataset } from "../src/lib/supabase.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const datasets: Dataset[] = [
  {
    id: "1",
    name: "Dr Naafila pilot study",
    uploaded_filename: "a.jsonl",
    total_samples: 20,
    created_at: "",
  },
  {
    id: "2",
    name: "Dr Naafila pilot study batch 2",
    uploaded_filename: "b.jsonl",
    total_samples: 20,
    created_at: "",
  },
  {
    id: "3",
    name: "Dr Mondal pilot study",
    uploaded_filename: "c.jsonl",
    total_samples: 20,
    created_at: "",
  },
  {
    id: "4",
    name: "Dr Chadda pilot study",
    uploaded_filename: "d.jsonl",
    total_samples: 20,
    created_at: "",
  },
  {
    id: "5",
    name: "Dr Saja pilot study",
    uploaded_filename: "e.jsonl",
    total_samples: 20,
    created_at: "",
  },
];

// Blind codes cannot be logins
assert(isBlindDisplayCode("nf"), "nf should be blind code");
assert(isBlindDisplayCode("c"), "c should be blind code");
assert(!isBlindDisplayCode("dr naafila"), "dr naafila is not a blind code");

// Resolve real IDs → codes
assert(resolveIaaCode("dr naafila") === "nf", "naafila → nf");
assert(resolveIaaCode("dr aditya") === "c", "aditya → c");
assert(resolveIaaCode("nf") === null, "blind code must not resolve");
assert(codeForAnnotatorId("Dr Saja") === "s", "Dr Saja → s");

// PINs
assert(verifyIaaPin("nf", "194827"), "nf pin ok");
assert(!verifyIaaPin("nf", "000000"), "nf bad pin");

// Dataset ownership filter
const nf = filterDatasetsForAnnotator("dr naafila", datasets);
assert(nf.length === 2, `naafila should see 2 datasets, got ${nf.length}`);
assert(
  nf.every((d) => d.name.toLowerCase().includes("naafila")),
  "naafila datasets only"
);

const mondal = filterDatasetsForAnnotator("dr mondal", datasets);
assert(mondal.length === 1 && mondal[0].name.includes("Mondal"), "mondal only");

const chadda = filterDatasetsForAnnotator("dr aditya", datasets);
assert(
  chadda.length === 1 && chadda[0].name.includes("Chadda"),
  "aditya → chadda only"
);

const saja = filterDatasetsForAnnotator("Dr Saja", datasets);
assert(saja.length === 1 && saja[0].name.includes("Saja"), "saja only");

console.log("smoke-rating: all checks passed");
