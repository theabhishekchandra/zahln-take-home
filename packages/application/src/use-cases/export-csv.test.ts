import { asMensaId, asOrderId, asPaymentId, asTillId, asUserId, money, type Payment } from '@zahln/domain';
import { describe, expect, it } from 'vitest';

import { exportFileName, paymentsCsv } from './export-csv';

function aPayment(overrides: Partial<Payment>): Payment {
  return {
    id: asPaymentId('pay_0'),
    orderId: asOrderId('ord_0'),
    status: 'confirmed',
    amount: money(250),
    priceGroup: 'student',
    mensa: { id: asMensaId('mensa_campus'), name: 'Mensa am Campus' },
    till: { id: asTillId('till_campus_1'), name: 'Kasse 1' },
    payer: { id: asUserId('usr_student'), name: 'Test Student' },
    items: [],
    refunded: money(0),
    refundPending: money(0),
    refundable: money(0),
    needsAttention: false,
    attentionReasons: [],
    version: 1,
    createdAt: '2026-10-26T11:00:00Z',
    updatedAt: '2026-10-26T11:00:00Z',
    ...overrides,
  };
}

const paid = aPayment({ id: asPaymentId('pay_1'), amount: money(530), refunded: money(100), createdAt: '2026-10-26T11:51:00Z' });
const pending = aPayment({ id: asPaymentId('pay_2'), status: 'pending', amount: money(360), createdAt: '2026-10-26T23:10:00Z' });

describe('paymentsCsv', () => {
  it('German Excel: BOM, semicolons, decimal comma, Berlin date and time', () => {
    const lines = paymentsCsv([paid], 'excel_de').split('\r\n');
    expect(lines[0]).toBe('\uFEFFpayment_id;order_id;date;time;mensa;till;group;amount_eur;refunded_eur;status');
    expect(lines[1]).toMatch(/^pay_1;[^;]+;2026-10-26;12:51;[^;]+;[^;]+;student;5,30;1,00;paid$/);
  });

  it('standard CSV: commas and a decimal point, quoting where needed', () => {
    const csv = paymentsCsv([aPayment({ mensa: { id: asMensaId('m'), name: 'Mensa "Süd", Ost' } })], 'rfc4180');
    expect(csv.startsWith('payment_id,')).toBe(true);
    expect(csv).toContain(',"Mensa ""Süd"", Ost",');
  });

  it('a payment still being checked is exported as unknown, never as paid; its Berlin day is the next one', () => {
    expect(paymentsCsv([pending], 'rfc4180').split('\r\n')[1]).toMatch(/^pay_2,[^,]+,2026-10-27,00:10,.*,3\.60,0\.00,unknown$/);
  });

  it('server text cannot start a spreadsheet formula', () => {
    const csv = paymentsCsv([aPayment({ till: { id: asTillId('t'), name: '=HYPERLINK("x")' } })], 'excel_de');
    expect(csv).toContain(`;"'=HYPERLINK(""x"")";`);
  });

  it('every line ends in CRLF, including the last', () => {
    expect(paymentsCsv([paid, pending], 'rfc4180').match(/\r\n/g)).toHaveLength(3);
    expect(paymentsCsv([], 'rfc4180').endsWith('\r\n')).toBe(true);
  });

  it('names the file by its days', () => {
    expect(exportFileName('2026-10-26', '2026-10-26')).toBe('zahln-payments-2026-10-26.csv');
    expect(exportFileName('2026-10-01', '2026-10-31')).toBe('zahln-payments-2026-10-01_2026-10-31.csv');
  });
});
