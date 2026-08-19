/**
 * Inter-annotator agreement rating pool.
 * Five human annotators; each rates the other four on shared post_ids.
 * Mondal and Naafila batch-2 are excluded.
 *
 * Blind codes (nf, c, sz, s, w) are DISPLAY-ONLY — never valid logins.
 * Rating also requires a per-person PIN (see verifyIaaPin).
 */

export type IaaCode = "nf" | "c" | "sz" | "s" | "w";

export interface IaaAnnotator {
  code: IaaCode;
  /** Canonical annotator_id values as stored in annotations (case-sensitive in DB queries) */
  annotatorIds: string[];
}

/** Display order on the rating page */
export const IAA_ANNOTATORS: IaaAnnotator[] = [
  {
    code: "nf",
    annotatorIds: ["dr naafila"],
  },
  {
    code: "c",
    // Chadda’s pilot study was annotated as "dr aditya"
    annotatorIds: ["dr aditya"],
  },
  {
    code: "sz",
    annotatorIds: ["Dr Sanchez"],
  },
  {
    code: "s",
    annotatorIds: ["Dr Saja"],
  },
  {
    code: "w",
    annotatorIds: ["Dr Wesley"],
  },
];

/** Dataset names included in the IAA rating pool */
export const IAA_INCLUDED_DATASET_NAMES = [
  "Dr Naafila pilot study",
  "Dr Chadda pilot study",
  "Dr Sanchez pilot study",
  "Dr Saja pilot study",
  "Dr Wesley pilot study",
] as const;

/** Explicitly excluded (never load for rating) */
export const IAA_EXCLUDED_DATASET_NAMES = [
  "Dr Mondal pilot study",
  "Dr Naafila pilot study batch 2",
] as const;

const BLIND_CODES = new Set<string>(
  IAA_ANNOTATORS.map((a) => a.code.toLowerCase())
);

const byAnnotatorId = new Map<string, IaaCode>();
for (const a of IAA_ANNOTATORS) {
  for (const id of a.annotatorIds) {
    byAnnotatorId.set(id.toLowerCase(), a.code);
  }
}

/** True if the typed login is only a blind code (nf, c, …) — must reject. */
export function isBlindDisplayCode(login: string): boolean {
  return BLIND_CODES.has(login.trim().toLowerCase());
}

/**
 * Map a real annotator login ID → blind code.
 * Blind codes themselves never resolve (cannot impersonate via nf/c/…).
 */
export function resolveIaaCode(loginOrAnnotatorId: string): IaaCode | null {
  const key = loginOrAnnotatorId.trim().toLowerCase();
  if (!key || isBlindDisplayCode(key)) return null;
  return byAnnotatorId.get(key) ?? null;
}

export function codeForAnnotatorId(annotatorId: string): IaaCode | null {
  return byAnnotatorId.get(annotatorId.trim().toLowerCase()) ?? null;
}

export function isIaaAnnotatorId(annotatorId: string): boolean {
  return codeForAnnotatorId(annotatorId) != null;
}

export function otherIaaCodes(self: IaaCode): IaaCode[] {
  return IAA_ANNOTATORS.map((a) => a.code).filter((c) => c !== self);
}

export function allIaaAnnotatorIds(): string[] {
  return IAA_ANNOTATORS.flatMap((a) => a.annotatorIds);
}

/**
 * Per-annotator Rating PINs.
 * Override with VITE_IAA_PINS=nf:111111,c:222222,sz:333333,s:444444,w:555555
 * Share each PIN privately with that doctor only — never publish codes as logins.
 */
const DEFAULT_PINS: Record<IaaCode, string> = {
  nf: "194827",
  c: "385601",
  sz: "572913",
  s: "640158",
  w: "819374",
};

function loadPins(): Record<IaaCode, string> {
  const pins = { ...DEFAULT_PINS };
  const raw = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_IAA_PINS;
  if (!raw?.trim()) return pins;
  for (const part of raw.split(",")) {
    const [code, pin] = part.split(":").map((s) => s.trim());
    if (
      code &&
      pin &&
      (code === "nf" ||
        code === "c" ||
        code === "sz" ||
        code === "s" ||
        code === "w")
    ) {
      pins[code] = pin;
    }
  }
  return pins;
}

export function verifyIaaPin(code: IaaCode, pin: string): boolean {
  const expected = loadPins()[code];
  return pin.trim() === expected;
}

const PIN_SESSION_PREFIX = "iaa_rating_pin_ok_";

export function isIaaPinUnlocked(code: IaaCode): boolean {
  try {
    return sessionStorage.getItem(PIN_SESSION_PREFIX + code) === "1";
  } catch {
    return false;
  }
}

export function unlockIaaPin(code: IaaCode) {
  try {
    sessionStorage.setItem(PIN_SESSION_PREFIX + code, "1");
  } catch {
    /* ignore */
  }
}

export function clearIaaPinUnlocks() {
  try {
    for (const a of IAA_ANNOTATORS) {
      sessionStorage.removeItem(PIN_SESSION_PREFIX + a.code);
    }
  } catch {
    /* ignore */
  }
}
