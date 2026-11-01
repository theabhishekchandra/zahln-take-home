import type { TillProblem } from '@zahln/application';
import type { AppGate } from '@zahln/config';
import type { MenuItem, MenuItemId, Ticket } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { NoticeCard, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

import { MenuPanel } from './MenuPanel';
import { OfflineBanner } from './OfflineBanner';
import { TicketPanel } from './TicketPanel';

export interface RegisterViewProps {
  readonly menu: readonly MenuItem[];
  readonly ticket: Ticket;
  readonly online: boolean;
  readonly gate: AppGate;
  readonly busy: boolean;
  readonly problem: TillProblem | null;
  readonly onAdd: (id: MenuItemId) => void;
  readonly onRemove: (id: MenuItemId) => void;
  readonly onClear: () => void;
  readonly onShowQr: () => void;
}

/**
 * T2 / T13: ring up an order. Offline, or while the app is too old for
 * Zahln, the order can still be edited, but no QR is shown. Paused is T14 (`PausedView`).
 */
export function RegisterView({ menu, ticket, online, gate, busy, problem, onAdd, onRemove, onClear, onShowQr }: RegisterViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {online ? null : <OfflineBanner />}
      {gate.status === 'update_required' ? (
        <View style={{ paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3] }}>
          <NoticeCard tone="problem" title={t('gate.tillUpdate')} />
        </View>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <MenuPanel menu={menu} ticket={ticket} online={online} locked={busy} onAdd={(item) => onAdd(item.id)} />
        <TicketPanel
          menu={menu}
          ticket={ticket}
          online={online}
          outdated={gate.status === 'update_required'}
          busy={busy}
          problem={problem}
          onAdd={onAdd}
          onRemove={onRemove}
          onClear={onClear}
          onShowQr={onShowQr}
        />
      </View>
    </View>
  );
}
