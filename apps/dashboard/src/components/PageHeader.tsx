import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { readonly title: string; readonly subtitle?: ReactNode; readonly actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
