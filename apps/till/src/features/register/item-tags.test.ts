import { describe, expect, it } from 'vitest';

import { itemTags } from './item-tags';

describe('itemTags', () => {
  it('takes the first three letters of the first word', () => {
    const tags = itemTags(['Vegetarian dish of the day', 'Pasta with tomato sauce', 'Apple spritzer 0.5 l']);
    expect([...tags.values()]).toEqual(['VEG', 'PAS', 'APP']);
  });

  it('uses the last word when two items would share a tag', () => {
    const tags = itemTags(['Tagesgericht vegetarisch', 'Tagesgericht mit Fleisch', 'Kaffee']);
    expect([...tags.values()]).toEqual(['VEG', 'FLE', 'KAF']);
  });

  it('skips words too short to tag, and keeps umlauts', () => {
    const tags = itemTags(['Apfelschorle 0,5 l', 'Öko-Brot']);
    expect([...tags.values()]).toEqual(['APF', 'ÖKO']);
  });
});
