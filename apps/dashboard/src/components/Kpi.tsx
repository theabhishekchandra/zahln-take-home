import type { ReactNode } from 'react';

export interface KpiProps {
  readonly label: string;
  readonly value: string;
  /** The change against the comparison day, e.g. "+11.3 %", with its direction for the pill. */
  readonly change?: { readonly text: string; readonly spoken: string; readonly direction: 'up' | 'down' | 'flat'; readonly neutral?: boolean };
  readonly note?: ReactNode;
}

/** One figure on the overview, with its change against the same weekday a week before. */
export function Kpi({ label, value, change, note }: KpiProps) {
  const tone = !change || change.neutral || change.direction === 'flat' ? 'neutral' : change.direction === 'up' ? 'up' : 'down';
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {change ? (
          <span className={`delta ${tone}`} aria-label={change.spoken}>
            {change.direction === 'up' ? '▲' : change.direction === 'down' ? '▼' : '='} {change.text}
          </span>
        ) : null}
        {note ? <span className="muted">{note}</span> : null}
      </div>
    </div>
  );
}
