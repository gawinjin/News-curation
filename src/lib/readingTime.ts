const WORDS_PER_MIN = 220;

export function readingTime(text: string): { minutes: number; words: number } {
  const words = (text.match(/\S+/g) ?? []).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MIN));
  return { minutes, words };
}
