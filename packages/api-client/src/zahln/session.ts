import { err, ok, type Clock, type Credentials, type Outcome, type SessionPort } from '@zahln/application';
import type { User } from '@zahln/domain';

import type { HttpClient, SessionProvider } from '../http-client';

import { toUser } from './mappers';
import { SessionSchema } from './schemas';

/** Renew a little before the token's end, so a request doesn't leave with a token about to die. */
const RENEW_BEFORE_MS = 15_000;

/**
 * A login to Zahln's API. Tokens last five minutes and can end sooner, and
 * the API has no refresh token, so the session logs in again with the same
 * credentials when its token ends. That means keeping the password in memory:
 * fine for Zahln's seeded test logins, not for real users, who would need a
 * refresh token from the API.
 */
export class ZahlnSession implements SessionPort, SessionProvider {
  private readonly client: () => HttpClient;
  private readonly clock: Clock;
  private credentials: Credentials | null = null;
  private token: { readonly value: string; readonly expiresAt: number } | null = null;
  private login: Promise<Outcome<User>> | null = null;
  private current: User | null = null;

  /** `client` is read lazily: the client itself asks this session for tokens. */
  constructor(client: () => HttpClient, clock: Clock) {
    this.client = client;
    this.clock = clock;
  }

  /** Who is signed in, once a login succeeded. */
  get user(): User | null {
    return this.current;
  }

  signIn(credentials: Credentials): Promise<Outcome<User>> {
    this.credentials = credentials;
    this.token = null;
    this.login = null;
    this.current = null;
    return this.logIn();
  }

  signOut(): void {
    this.credentials = null;
    this.token = null;
    this.login = null;
    this.current = null;
  }

  async accessToken(): Promise<string | null> {
    if (this.token && this.token.expiresAt - RENEW_BEFORE_MS > this.clock.now().getTime()) return this.token.value;
    if (!this.credentials) return null;
    await this.logIn();
    return this.token?.value ?? null;
  }

  /** The server ended the session early: log in again. */
  async refresh(): Promise<boolean> {
    if (!this.credentials) return false;
    this.token = null;
    return (await this.logIn()).ok;
  }

  /** One login at a time; every caller waiting for a token shares it. */
  private logIn(): Promise<Outcome<User>> {
    const credentials = this.credentials;
    if (!credentials) return Promise.resolve(err({ kind: 'not_processed', cause: 'unauthorized', retryable: false }));
    this.login ??= this.client()
      .request({ method: 'POST', path: '/sessions', body: credentials, schema: SessionSchema, safeToRetry: true, authenticated: false })
      .then((result): Outcome<User> => {
        // Signed out or in as someone else meanwhile: this login is no longer wanted.
        if (this.credentials !== credentials) return err({ kind: 'not_processed', cause: 'unauthorized', retryable: false });
        if (!result.ok) return result;
        this.token = { value: result.value.accessToken, expiresAt: Date.parse(result.value.expiresAt) };
        this.current = toUser(result.value.user);
        return ok(this.current);
      })
      .finally(() => {
        this.login = null;
      });
    return this.login;
  }
}
