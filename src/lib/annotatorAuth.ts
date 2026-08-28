import { isBlindDisplayCode } from "./iaaAnnotators";
import { annotatorForLogin } from "./annotatorDatasets";
import { fetchAnnotatorForLogin } from "./data";

const PIN_SESSION_PREFIX = "annotator_pin_ok_";

export function isAnnotatorPinUnlocked(loginId: string): boolean {
  try {
    return sessionStorage.getItem(PIN_SESSION_PREFIX + loginId.trim()) === "1";
  } catch {
    return false;
  }
}

export function unlockAnnotatorPin(loginId: string) {
  try {
    sessionStorage.setItem(PIN_SESSION_PREFIX + loginId.trim(), "1");
  } catch {
    /* ignore */
  }
}

export function clearAnnotatorPinUnlocks() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PIN_SESSION_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface LoginResult {
  ok: true;
  /** Canonical login_id stored in DB */
  loginId: string;
  displayName: string;
}

export async function verifyAnnotatorLogin(
  loginInput: string,
  pin: string
): Promise<LoginResult | { ok: false; error: string }> {
  const trimmed = loginInput.trim();
  const pinTrimmed = pin.trim();
  if (!trimmed || !pinTrimmed) {
    return { ok: false, error: "Enter your annotator ID and PIN." };
  }

  if (isBlindDisplayCode(trimmed)) {
    return {
      ok: false,
      error:
        "nf, c, sz, s, and w are display codes only. Log in with your real annotator ID + PIN.",
    };
  }

  const row = await fetchAnnotatorForLogin(trimmed);
  if (!row) {
    return {
      ok: false,
      error:
        "Unknown annotator ID. Ask your admin for your login ID and PIN.",
    };
  }

  if (row.pin.trim() !== pinTrimmed) {
    return { ok: false, error: "Incorrect PIN." };
  }

  return {
    ok: true,
    loginId: row.login_id,
    displayName: row.display_name,
  };
}