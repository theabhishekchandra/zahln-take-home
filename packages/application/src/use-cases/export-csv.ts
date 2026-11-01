import { businessDay, businessTime, type Money, type Payment, type PaymentStatus } from '@zahln/domain';

/**
 * `excel_de`: what German Excel opens without an import dialog (semicolon,
 * decimal comma, UTF-8 BOM). `rfc4180`: comma, decimal point, for tools.
 */
export type CsvFormat = 'excel_de' | 'rfc4180';

const COLUMNS = ['payment_id', 'order_id', 'date', 'time', 'mensa', 'till', 'group', 'amount_eur', 'refunded_eur', 'status'] as const;

/** A payment still being checked is "unknown", never "paid": the books must not count money that may not have arrived. */
const STATUS: Readonly<Record<PaymentStatus, string>> = { confirmed: 'paid', pending: 'unknown', declined: 'declined' };

const SETTINGS = {
  excel_de: { separator: ';', decimal: ',', bom: '\uFEFF' },
  rfc4180: { separator: ',', decimal: '.', bom: '' },
} as const;

/**
 * Payments as CSV for accounting. Dates and times are Berlin's, as Zahln
 * counts them. Lines end in CRLF (RFC 4180).
 */
export function paymentsCsv(payments: readonly Payment[], format: CsvFormat): string {
  const { separator, decimal, bom } = SETTINGS[format];
  const field = (value: string) => quote(neutralize(value), separator);
  const amount = (value: Money) => {
    const cents = Math.abs(value.cents);
    return `${value.cents < 0 ? '-' : ''}${Math.floor(cents / 100)}${decimal}${String(cents % 100).padStart(2, '0')}`;
  };
  const rows = payments.map((p) => {
    const created = new Date(p.createdAt);
    return [
      field(p.id),
      field(p.orderId),
      businessDay(created),
      businessTime(created),
      field(p.mensa.name),
      field(p.till.name),
      p.priceGroup,
      quote(amount(p.amount), separator),
      quote(amount(p.refunded), separator),
      STATUS[p.status],
    ].join(separator);
  });
  return bom + [COLUMNS.join(separator), ...rows].map((line) => `${line}\r\n`).join('');
}

/** Quotes a field that holds the separator, a quote or a line break; doubles quotes inside. */
function quote(value: string, separator: string): string {
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Text from the server never starts a formula when the file is opened in a spreadsheet. */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** File name for an export: `zahln-payments-2026-10-01_2026-10-31.csv`. */
export function exportFileName(first: string, last: string): string {
  return first === last ? `zahln-payments-${first}.csv` : `zahln-payments-${first}_${last}.csv`;
}
