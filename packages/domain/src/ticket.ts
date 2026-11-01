import type { MenuItemId } from './ids';
import { multiplyMoney, sumMoney, type Money } from './money';
import type { MenuItem, OrderLine } from './order';
import { PRICE_GROUPS, type PriceGroup } from './pricing';

/** The cashier's ticket before it becomes an order: items and quantities, no amount. */
export type Ticket = readonly OrderLine[];

export const emptyTicket: Ticket = [];

/** Most of one item a ticket can hold; a guard against a stuck key, not a business rule. */
export const MAX_QUANTITY = 99;

export function addToTicket(ticket: Ticket, itemId: MenuItemId): Ticket {
  const line = ticket.find((l) => l.itemId === itemId);
  if (!line) return [...ticket, { itemId, quantity: 1 }];
  if (line.quantity >= MAX_QUANTITY) return ticket;
  return ticket.map((l) => (l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l));
}

/** One fewer; the line goes when it reaches zero. */
export function removeFromTicket(ticket: Ticket, itemId: MenuItemId): Ticket {
  return ticket.flatMap((l) => (l.itemId !== itemId ? [l] : l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []));
}

export function ticketItemCount(ticket: Ticket): number {
  return ticket.reduce((count, line) => count + line.quantity, 0);
}

/**
 * What the ticket costs in each price group. The till shows all three, since it
 * cannot know who will pay; the server resolves the payer's price at scan.
 */
export function ticketTotals(ticket: Ticket, menu: readonly MenuItem[]): Readonly<Record<PriceGroup, Money>> {
  const priced = ticket.map((line) => {
    const item = menu.find((m) => m.id === line.itemId);
    if (!item) throw new Error(`Item ${line.itemId} is not on the menu`);
    return { item, quantity: line.quantity };
  });
  const total = (group: PriceGroup) => sumMoney(priced.map(({ item, quantity }) => multiplyMoney(item.prices[group], quantity)));
  return Object.fromEntries(PRICE_GROUPS.map((group) => [group, total(group)])) as Record<PriceGroup, Money>;
}
