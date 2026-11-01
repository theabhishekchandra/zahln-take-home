import { useTranslation } from '@zahln/i18n';
import { Button, Icon } from '@zahln/ui-web';
import { NavLink, Outlet } from 'react-router';

import { ExportDialog } from '@/features/export/ExportDialog';
import { PaymentDrawer } from '@/features/payment/PaymentDrawer';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/people';
import { attentionBadge, ShellStatusProvider, useShellStatus } from '@/lib/shell-status';
import { useOverlays } from '@/lib/use-overlays';

import { LanguageToggle } from './LanguageToggle';

/** Sidebar and page, with the payment drawer (W5) and export dialog (W6) over any page. */
export function Shell() {
  return (
    <ShellStatusProvider>
      <div className="shell">
        <Sidebar />
        <main className="page">
          <Outlet />
        </main>
        <Overlays />
      </div>
    </ShellStatusProvider>
  );
}

function Sidebar() {
  const { t } = useTranslation();
  const overlays = useOverlays();
  const { attention, offline } = useShellStatus();
  const flagged = attention && attention.count > 0 ? attention : null;
  const links = [
    { to: '/', label: t('dashboard.nav.overview'), icon: 'overview' as const },
    { to: '/attention', label: t('dashboard.nav.attention'), icon: 'attention' as const, badge: flagged },
    { to: '/transactions', label: t('dashboard.nav.transactions'), icon: 'list' as const },
  ];
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">{t('common.appName')}</div>
        <div className="sidebar-org">{t('dashboard.org')}</div>
      </div>
      <nav aria-label={t('dashboard.nav.label')}>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                <span aria-hidden className="nav-icon">
                  <Icon name={link.icon} />
                </span>
                <span className="nav-label">{link.label}</span>
                {link.badge ? (
                  <>
                    <span aria-hidden className="nav-badge">
                      {attentionBadge(link.badge)}
                    </span>
                    <span className="visually-hidden">
                      {link.badge.more
                        ? t('dashboard.nav.attentionCountMore', { count: link.badge.count })
                        : t('dashboard.nav.attentionCount', { count: link.badge.count })}
                    </span>
                  </>
                ) : null}
              </NavLink>
            </li>
          ))}
          <li>
            {/* Off while the page on screen can't reach Zahln: the export would only fail. */}
            <button type="button" className="nav-link" onClick={overlays.openExport} disabled={offline} title={offline ? t('dashboard.offline.exportNeedsConnection') : undefined}>
              <span aria-hidden className="nav-icon">
                <Icon name="download" />
              </span>
              <span className="nav-label">{t('dashboard.nav.export')}</span>
            </button>
          </li>
        </ul>
      </nav>
      <UserCard />
    </aside>
  );
}

function UserCard() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  return (
    <div className="sidebar-user">
      {user ? (
        <div className="user-card">
          <span aria-hidden className="avatar">
            {initials(user.name)}
          </span>
          <span>
            <strong>{user.name}</strong>
            <span className="user-role">{t('dashboard.financeTeam')}</span>
          </span>
        </div>
      ) : null}
      <div className="sidebar-actions">
        <LanguageToggle />
        <Button variant="secondary" style={{ minHeight: 40, padding: '0 var(--space-4)', fontSize: 14, color: 'inherit', borderColor: 'rgba(255, 255, 255, 0.4)' }} onClick={signOut}>
          {t('dashboard.signOut')}
        </Button>
      </div>
    </div>
  );
}

function Overlays() {
  const overlays = useOverlays();
  return (
    <>
      <PaymentDrawer paymentId={overlays.paymentId} onClose={overlays.closePayment} />
      <ExportDialog open={overlays.exporting} onClose={overlays.closeExport} />
    </>
  );
}
