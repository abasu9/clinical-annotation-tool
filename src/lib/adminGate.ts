const STORAGE_KEY = "admin_unlocked_until";
const SESSION_MS = 8 * 60 * 60 * 1000;

const DEFAULT_USERNAME = "nlp";
const DEFAULT_PASSWORD = "nlp123";

function expectedUsername(): string {
  const u = import.meta.env.VITE_ADMIN_USERNAME as string | undefined;
  return u && String(u).length > 0 ? String(u) : DEFAULT_USERNAME;
}

function expectedPassword(): string {
  const p = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
  return p && String(p).length > 0 ? String(p) : DEFAULT_PASSWORD;
}

export function isAdminCredentialsConfigured(): boolean {
  return true;
}

/** @deprecated use isAdminCredentialsConfigured */
export function isAdminPasswordConfigured(): boolean {
  return isAdminCredentialsConfigured();
}

export function isAdminUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() > until) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function unlockAdmin(username: string, password: string): boolean {
  if (username.trim() !== expectedUsername() || password !== expectedPassword()) return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now() + SESSION_MS));
  } catch {
    /* sessionStorage unavailable */
  }
  return true;
}

export function lockAdmin() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
