import type { ReasonLook } from '@/lib/attention';

/** The tinted square that marks a flagged payment's reason; decorative, the title next to it says it. */
export function ReasonTile({ look, size = 'small' }: { readonly look: ReasonLook; readonly size?: 'small' | 'large' }) {
  return (
    <span aria-hidden className={`reason-tile ${look.tone} ${size}`}>
      {look.icon}
    </span>
  );
}
