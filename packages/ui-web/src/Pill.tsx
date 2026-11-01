import type { ReactNode } from 'react';

export type PillTone = 'success' | 'pending' | 'danger' | 'neutral' | 'brand';

const tones: Readonly<Record<PillTone, { readonly color: string; readonly background: string }>> = {
  success: { color: 'var(--color-success)', background: 'var(--color-success-tint)' },
  pending: { color: 'var(--color-pending)', background: 'var(--color-pending-tint)' },
  danger: { color: 'var(--color-danger)', background: 'var(--color-danger-tint)' },
  neutral: { color: 'var(--color-ink-secondary)', background: 'var(--color-pressed)' },
  brand: { color: 'var(--color-brand)', background: 'var(--color-brand-tint)' },
};

/** A status label: a dot and words, so the meaning never depends on colour alone. */
export function Pill({ tone, children, dot = true }: { readonly tone: PillTone; readonly children: ReactNode; readonly dot?: boolean }) {
  const look = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 13,
        lineHeight: '20px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: look.color,
        background: look.background,
      }}>
      {dot ? <span aria-hidden style={{ width: 7, height: 7, borderRadius: 4, background: 'currentColor' }} /> : null}
      {children}
    </span>
  );
}
