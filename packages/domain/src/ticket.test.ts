import { describe, expect, it } from 'vitest';

import { asMenuItemId } from './ids';
import { money } from './money';
import type { MenuItem } from './order';
import { addToTicket, emptyTicket, MAX_QUANTITY, removeFromTicket, ticketItemCount, ticketTotals } from './ticket';

const item = (id: string, s: number, m: number, g: number): MenuItem => ({
  id: asMenuItemId(id),
  name: { de: id, en: id },
  prices: { student: money(s), staff: money(m), guest: money(g) },
});
const schnitzel = item('schnitzel', 320, 540, 690);
const salad = item('salad', 110, 180, 230);
const menu = [schnitzel, salad];

describe('ticket', () => {
  it('adds, counts and removes items, dropping a line at zero', () => {
    let ticket = addToTicket(emptyTicket, schnitzel.id);
    ticket = addToTicket(ticket, schnitzel.id);
    ticket = addToTicket(ticket, salad.id);
    expect(ticket).toEqual([
      { itemId: schnitzel.id, quantity: 2 },
      { itemId: salad.id, quantity: 1 },
    ]);
    expect(ticketItemCount(ticket)).toBe(3);
    ticket = removeFromTicket(removeFromTicket(ticket, salad.id), salad.id);
    expect(ticket).toEqual([{ itemId: schnitzel.id, quantity: 2 }]);
  });

  it('stops at the maximum quantity', () => {
    let ticket = emptyTicket;
    for (let i = 0; i < MAX_QUANTITY + 5; i++) ticket = addToTicket(ticket, salad.id);
    expect(ticketItemCount(ticket)).toBe(MAX_QUANTITY);
  });

  it('totals the ticket for every price group', () => {
    const ticket = addToTicket(addToTicket(addToTicket(emptyTicket, schnitzel.id), salad.id), salad.id);
    expect(ticketTotals(ticket, menu)).toEqual({ student: money(540), staff: money(900), guest: money(1150) });
  });

  it('refuses an item that is not on the menu', () => {
    expect(() => ticketTotals(addToTicket(emptyTicket, asMenuItemId('ghost')), menu)).toThrow();
  });
});
