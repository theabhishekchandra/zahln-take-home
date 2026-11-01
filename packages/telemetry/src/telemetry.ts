import type { Telemetry } from '@zahln/application';

const SENSITIVE_KEY = /token|authorization|password|pin|secret|cookie|session/i;
const REDACTED = '[redacted]';

/** Removes anything that looks like a credential before it leaves the device. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)]),
  );
}

export interface LogRecord {
  readonly level: 'info' | 'error';
  readonly name: string;
  readonly at: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly properties?: unknown;
  readonly error?: { readonly message: string; readonly stack?: string };
}

/** Where records go: the console in development, a crash reporter (e.g. Sentry) in release builds. */
export type LogSink = (record: LogRecord) => void;

export const consoleSink: LogSink = (record) => {
  const line = `[${record.level}] ${record.name}`;
  if (record.level === 'error') console.error(line, record);
  else console.info(line, record);
};

export function createTelemetry(options: {
  readonly context: Readonly<Record<string, unknown>>;
  readonly sinks: readonly LogSink[];
  readonly now?: () => Date;
}): Telemetry {
  const now = options.now ?? (() => new Date());
  const emit = (record: Omit<LogRecord, 'at' | 'context'>) => {
    const full: LogRecord = { ...record, at: now().toISOString(), context: options.context };
    for (const sink of options.sinks) {
      try {
        sink(full);
      } catch {
        // Telemetry must never break a payment.
      }
    }
  };

  return {
    event(name, properties) {
      emit({ level: 'info', name, properties: redact(properties) });
    },
    error(error, context) {
      const asError = error instanceof Error ? error : new Error(String(error));
      emit({
        level: 'error',
        name: asError.name,
        properties: redact(context),
        error: { message: asError.message, ...(asError.stack !== undefined && { stack: asError.stack }) },
      });
    },
  };
}
