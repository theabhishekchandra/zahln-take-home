/** The letters of a word, as a tag: "Tomatensoße" → "TOM". */
const tagOf = (word: string) => word.replace(/[^\p{L}]/gu, '').slice(0, 3).toUpperCase();

const words = (name: string) => name.split(/\s+/).filter((word) => tagOf(word).length === 3);

/**
 * A short tag per menu item that the cashier finds by shape: the first word's
 * first three letters ("Schnitzel" → "SCH"). Items that would share a tag use
 * their last word instead ("Tagesgericht vegetarisch" → "VEG", "Tagesgericht
 * mit Fleisch" → "FLE"). Keyed by item name.
 */
export function itemTags(names: readonly string[]): ReadonlyMap<string, string> {
  const first = names.map((name) => tagOf(words(name)[0] ?? name));
  const counts = new Map<string, number>();
  for (const tag of first) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return new Map(
    names.map((name, index) => {
      const tag = first[index]!;
      const last = words(name).at(-1);
      return [name, (counts.get(tag) ?? 0) > 1 && last ? tagOf(last) : tag];
    }),
  );
}
