export interface Bar {
  readonly key: string;
  readonly value: number;
  /** Shown under the bar; leave empty to skip a label. */
  readonly label?: string;
  readonly tone?: 'brand' | 'muted' | 'highlight';
}

const fills = { brand: 'var(--color-brand)', muted: 'var(--color-disabled-fill)', highlight: 'var(--color-pending)' } as const;

/**
 * Vertical bars without a value axis. The chart is one image for screen
 * readers, described by `label`; the numbers it shows are also in a table.
 */
export function BarChart({ bars, label, height = 200 }: { readonly bars: readonly Bar[]; readonly label: string; readonly height?: number }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div role="img" aria-label={label} style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {bars.map((bar) => (
          <div
            key={bar.key}
            style={{
              flex: 1,
              minWidth: 4,
              height: `${Math.max(2, (bar.value / max) * 100)}%`,
              borderRadius: '6px 6px 2px 2px',
              background: fills[bar.tone ?? 'brand'],
            }}
          />
        ))}
      </div>
      <div aria-hidden style={{ display: 'flex', gap: 6 }}>
        {bars.map((bar) => (
          <span key={bar.key} style={{ flex: 1, minWidth: 4, fontSize: 12, color: 'var(--color-ink-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {bar.label ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}
