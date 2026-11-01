import { useEffect, useRef, type ReactNode } from 'react';

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Read out when the dialog opens. */
  readonly label: string;
  /** `center`: a modal (W6). `right`: a drawer over the page (W5). */
  readonly placement?: 'center' | 'right';
  readonly maxWidth?: number;
  readonly children: ReactNode;
}

/**
 * A modal on the native `<dialog>`: focus moves in and is kept there, Escape
 * closes it and the page behind is inert. The app styles `dialog::backdrop`.
 */
export function Dialog({ open, onClose, label, placement = 'center', maxWidth = 580, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const side = placement === 'right';
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        border: 0,
        padding: 0,
        width: '100%',
        maxWidth,
        background: 'var(--color-surface-raised)',
        color: 'var(--color-ink)',
        boxShadow: 'var(--elevation-sheet)',
        ...(side
          ? { margin: '0 0 0 auto', height: '100dvh', maxHeight: '100dvh', borderRadius: 0 }
          : { borderRadius: 26, maxHeight: 'calc(100dvh - 48px)' }),
      }}>
      {open ? <div style={{ padding: 'var(--space-6)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 'var(--space-4)' }}>{children}</div> : null}
    </dialog>
  );
}
