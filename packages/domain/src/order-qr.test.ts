import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { asOrderId } from './ids';
import { orderQrPayload, parseOrderCode, parseOrderQr } from './order-qr';

describe('parseOrderQr', () => {
  it("reads the server's payload", () => {
    expect(parseOrderQr('zahln://pay?order=ord_8a5f6c0f4573b58c')).toEqual({ ok: true, orderRef: { orderId: 'ord_8a5f6c0f4573b58c' } });
    expect(parseOrderQr('zahln://pay?order=order-42')).toEqual({ ok: true, orderRef: { orderId: 'order-42' } });
  });

  it('round-trips every valid order id', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9_-]{1,64}$/), (id) => {
        expect(parseOrderQr(orderQrPayload(asOrderId(id)))).toEqual({ ok: true, orderRef: { orderId: id } });
      }),
    );
  });

  it.each([
    'https://zahln.de/pay?order=order-42',
    'https://evil.example/zahln://pay?order=order-42',
    'zahln://pay?order=',
    'zahln://pay?order=order-42/extra',
    'zahln://pay?order=order 42',
    'zahln://pay?order=../../etc',
    'zahln://pay?amount=0',
    'zahln://pay?order=a=b',
    '',
    `zahln://pay?order=${'a'.repeat(300)}`,
  ])('rejects %s as not a Zahln code', (data) => {
    expect(parseOrderQr(data)).toEqual({ ok: false, problem: 'not_zahln' });
  });

  it('tells a newer Zahln format apart from a foreign code', () => {
    expect(parseOrderQr('zahln://pay?order=order-42&amount=0')).toEqual({ ok: false, problem: 'unsupported_version' });
    expect(parseOrderQr('zahln://refund?order=order-42')).toEqual({ ok: false, problem: 'unsupported_version' });
  });

  it('never throws, whatever the camera reads', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (data) => {
        const result = parseOrderQr(data);
        expect(typeof result.ok).toBe('boolean');
      }),
    );
  });
});

describe('parseOrderCode', () => {
  it('accepts the order code shown on the till, with stray spaces', () => {
    expect(parseOrderCode('  order- 42 ')).toEqual({ ok: true, orderRef: { orderId: 'order-42' } });
  });

  it('accepts a pasted QR payload', () => {
    expect(parseOrderCode('zahln://pay?order=order-42')).toEqual({ ok: true, orderRef: { orderId: 'order-42' } });
  });

  it('rejects links', () => {
    expect(parseOrderCode('https://example.com')).toEqual({ ok: false, problem: 'not_zahln' });
  });
});
