export const MIN_TASK_WORDS = 20;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function meetsMinWordCount(
  text: string,
  min: number = MIN_TASK_WORDS
): boolean {
  return countWords(text) >= min;
}
