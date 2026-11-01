import type { ButtonHTMLAttributes } from 'react';

import { Icon, type IconName } from './Icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'destructive';
  /** Shown before the label; decorative, the label says what the button does. */
  readonly icon?: IconName;
}

const looks = {
  primary: { background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'var(--color-brand)' },
  secondary: { background: 'transparent', color: 'var(--color-ink)', border: 'var(--color-line)' },
  destructive: { background: 'transparent', color: 'var(--color-danger)', border: 'var(--color-danger)' },
} as const;

/** 48 px minimum, radius 16, label 16/20 700. Focus ring comes from the global :focus-visible rule. */
export function Button({ variant = 'primary', type = 'button', icon, style, children, ...props }: ButtonProps) {
  const look = looks[variant];
  return (
    <button
      type={type}
      style={{
        minHeight: 'var(--size-tap-min)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 var(--space-5)',
        borderRadius: 'var(--radius-control)',
        border: `1px solid ${look.border}`,
        background: look.background,
        color: look.color,
        font: 'inherit',
        fontSize: 16,
        lineHeight: '20px',
        fontWeight: 700,
        cursor: 'pointer',
        ...style,
      }}
      {...props}>
      {icon ? <Icon name={icon} strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
}
