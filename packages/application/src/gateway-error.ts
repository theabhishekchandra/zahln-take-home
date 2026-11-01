import type { Result } from './result';

/**
 * Every failed server call answers one question first: could the server have
 * processed it? That decides whether the client may retry, must check the
 * status, or can tell the user that nothing happened.
 */
export type GatewayError =
  | {
      /** The server provably did not apply the request. */
      readonly kind: 'not_processed';
      readonly cause: 'offline' | 'unauthorized' | 'rejected' | 'rate_limited' | 'unavailable';
      /** Machine-readable reason from the server, e.g. "quote_expired". */
      readonly code?: string;
      /** Sending the same request again later may succeed. */
      readonly retryable: boolean;
    }
  | {
      /** The request may or may not have been applied. Only a status check can tell. */
      readonly kind: 'outcome_unknown';
      readonly cause: 'timeout' | 'connection_lost' | 'server_error' | 'invalid_response';
    };

export type Outcome<T> = Result<T, GatewayError>;
