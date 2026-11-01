import type { ButtonHTMLAttributes } from 'react';

import { Icon, type IconName } from './Icon';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  readonly icon: IconName;
  /** Required: the button has no visible words. */
  readonly label: string;
}

/** 40 px square, radius 12, on the pressed fill. Focus ring comes from the global :focus-visible rule. */
export function IconButton({ icon, label, type = 'button', style, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      style={{
        width: 40,
        height: 40,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        border: 0,
        borderRadius: 12,
        background: 'var(--color-pressed)',
        color: 'var(--color-ink)',
        cursor: 'pointer',
        ...style,
      }}
      {...props}>
      <Icon name={icon} strokeWidth={icon === 'close' ? 2.4 : 2} />
    </button>
  );
}
