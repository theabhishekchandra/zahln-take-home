import type { Money } from './money';

/** Who pays decides the price. The till never knows this; the quote does. */
export const PRICE_GROUPS = ['student', 'staff', 'guest'] as const;
export type PriceGroup = (typeof PRICE_GROUPS)[number];

export type PriceList = Readonly<Record<PriceGroup, Money>>;
