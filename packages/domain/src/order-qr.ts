import { asOrderId } from './ids';
import type { OrderId } from './ids';
import type { OrderRef } from './order';

/**
 * What a till's QR code contains, as Zahln's server makes it: a reference to
 * the order, never an amount.
 *
 *   zahln://pay?order=<orderId>
 *
 * The till shows the server's `qrPayload` as it is; this file is how the phone
 * reads it. Everything about the format lives here.
 */
const PREFIX = 'zahln://';
const PAY = 'zahln://pay?';
const ORDER_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Anything longer is not one of our codes; don't spend time parsing it. */
const MAX_LENGTH = 256;

export type OrderCodeProblem =
  /** Not a Zahln till code. We never open or follow it. */
  | 'not_zahln'
  /** A Zahln code in a form this app version can't read, e.g. from a newer format. */
  | 'unsupported_version';

export type OrderCodeResult =
  | { readonly ok: true; readonly orderRef: OrderRef }
  | { readonly ok: false; readonly problem: OrderCodeProblem };

export function orderQrPayload(orderId: OrderId): string {
  return `${PAY}order=${orderId}`;
}

/** Reads a scanned QR code. Strict: anything that is not exactly the server's format is rejected. */
export function parseOrderQr(data: string): OrderCodeResult {
  if (data.length > MAX_LENGTH) return { ok: false, problem: 'not_zahln' };
  const text = data.trim();
  if (!text.toLowerCase().startsWith(PREFIX)) return { ok: false, problem: 'not_zahln' };
  if (!text.toLowerCase().startsWith(PAY)) return { ok: false, problem: 'unsupported_version' };

  const params = text.slice(PAY.length).split('&');
  const [name, orderId, ...rest] = (params[0] ?? '').split('=');
  if (name !== 'order' || rest.length > 0 || !orderId || !ORDER_ID.test(orderId)) return { ok: false, problem: 'not_zahln' };
  // More parameters than we know: a newer code, which must not be paid on a guess.
  if (params.length > 1) return { ok: false, problem: 'unsupported_version' };
  return { ok: true, orderRef: { orderId: asOrderId(orderId) } };
}

/**
 * Reads a code the student typed because the camera couldn't scan: either the
 * order code shown under the till's QR, or the full QR text.
 */
export function parseOrderCode(input: string): OrderCodeResult {
  const text = input.trim();
  if (text.toLowerCase().startsWith(PREFIX)) return parseOrderQr(text);
  const orderId = text.replace(/\s+/g, '');
  return ORDER_ID.test(orderId) ? { ok: true, orderRef: { orderId: asOrderId(orderId) } } : { ok: false, problem: 'not_zahln' };
}
