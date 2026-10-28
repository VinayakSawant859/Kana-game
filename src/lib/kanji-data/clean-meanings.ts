export function cleanMeanings(raw: string[], heisig: string | null): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const meaning of raw) {
    const value = meaning.trim();
    const normalized = value.toLowerCase();
    if (
      !value ||
      seen.has(normalized) ||
      /radical|\(no\.|kokuji|zodiac|\*\*/i.test(value) ||
      /^counter for\b/i.test(value) ||
      /^\d/.test(value) ||
      value.startsWith("-") ||
      value.endsWith("-") ||
      value.endsWith(".")
    ) {
      continue;
    }

    seen.add(normalized);
    cleaned.push(value);
  }

  const preferred = heisig?.trim();
  if (!preferred) return cleaned;
  const preferredIndex = cleaned.findIndex(
    (meaning) => meaning.toLowerCase() === preferred.toLowerCase()
  );
  if (preferredIndex <= 0) return cleaned;
  return [cleaned[preferredIndex], ...cleaned.filter((_, index) => index !== preferredIndex)];
}
