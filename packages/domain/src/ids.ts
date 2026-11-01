declare const brand: unique symbol;

/** A string that the type system will not confuse with other kinds of IDs. */
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type UserId = Brand<string, 'UserId'>;
export type MensaId = Brand<string, 'MensaId'>;
export type TillId = Brand<string, 'TillId'>;
export type MenuItemId = Brand<string, 'MenuItemId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type RefundId = Brand<string, 'RefundId'>;
/** Sent with every attempt of one logical write, so the server applies it at most once. */
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

export const asUserId = (value: string) => value as UserId;
export const asMensaId = (value: string) => value as MensaId;
export const asTillId = (value: string) => value as TillId;
export const asMenuItemId = (value: string) => value as MenuItemId;
export const asOrderId = (value: string) => value as OrderId;
export const asPaymentId = (value: string) => value as PaymentId;
export const asRefundId = (value: string) => value as RefundId;
export const asIdempotencyKey = (value: string) => value as IdempotencyKey;
