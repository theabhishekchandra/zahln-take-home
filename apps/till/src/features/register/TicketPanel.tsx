import type { TillProblem } from '@zahln/application';
import { ticketItemCount, ticketTotals, type MenuItem, type MenuItemId, type Ticket } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, NoticeCard, useTheme } from '@zahln/ui-native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupPrices } from '@/features/sale/GroupPrices';

import { problemKey } from './problem-text';

/** Width of the order panel beside the menu. */
const TICKET_WIDTH = 380;
/** The visible +/− button; the touch target grows to the till's 64 dp around it. */
const STEP_SIZE = 44;

export interface TicketPanelProps {
  readonly menu: readonly MenuItem[];
  readonly ticket: Ticket;
  readonly online: boolean;
  /** This app is below Zahln's minimum version: no code is shown. */
  readonly outdated: boolean;
  readonly busy: boolean;
  readonly problem: TillProblem | null;
  readonly onAdd: (id: MenuItemId) => void;
  readonly onRemove: (id: MenuItemId) => void;
  readonly onClear: () => void;
  readonly onShowQr: () => void;
}

/** The order being rung up, the three group totals and "Show QR". */
export function TicketPanel({ menu, ticket, online, outdated, busy, problem, onAdd, onRemove, onClear, onShowQr }: TicketPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const insets = useSafeAreaInsets();
  const count = ticketItemCount(ticket);
  return (
    <View
      style={{
        width: TICKET_WIDTH,
        backgroundColor: theme.colors.surfaceRaised,
        borderLeftWidth: 1,
        borderLeftColor: theme.colors.disabledFill,
        paddingTop: theme.spacing[5],
        paddingLeft: theme.spacing[5],
        paddingRight: insets.right + theme.spacing[5],
        paddingBottom: insets.bottom + theme.spacing[5],
        gap: theme.spacing[3],
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="titleS" accessibilityRole="header" style={{ fontSize: 22 }}>
          {t('till.register.order')}
        </AppText>
        {count > 0 && !busy ? <Button variant="textDestructive" label={t('till.register.clear')} onPress={onClear} /> : null}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: theme.spacing[1] }}>
        {ticket.length === 0 ? (
          <AppText tone="muted">{t('till.register.empty')}</AppText>
        ) : (
          ticket.map((line) => {
            const item = menu.find((candidate) => candidate.id === line.itemId);
            const name = item ? format.text(item.name) : line.itemId;
            return (
              <View key={line.itemId} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], minHeight: theme.size.tapTill }}>
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {name}
                </AppText>
                <StepButton icon="minus" label={t('till.register.removeOne', { name })} disabled={busy} onPress={() => onRemove(line.itemId)} />
                <AppText variant="bodyStrong" style={{ minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                  {line.quantity}
                </AppText>
                <StepButton icon="plus" label={t('till.register.addOne', { name })} disabled={busy} onPress={() => onAdd(line.itemId)} />
              </View>
            );
          })
        )}
      </ScrollView>

      {online ? (
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: theme.spacing[4] }}>
          <GroupPrices totals={ticketTotals(ticket, menu)} look="row" />
        </View>
      ) : (
        <AppText variant="caption" tone="muted">
          {t('till.offline.note')}
        </AppText>
      )}
      {problem ? <NoticeCard tone="problem" title={t(problemKey(problem))} /> : null}
      <Button
        size="large"
        icon="qr"
        label={!online ? t('till.register.showQrOffline') : outdated ? t('till.register.showQrUpdate') : t('till.register.showQr', { count })}
        loading={busy}
        loadingLabel={t('till.register.creating')}
        disabled={!online || outdated || count === 0}
        onPress={onShowQr}
      />
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'plus' | 'minus'; label: string; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const slop = (theme.size.tapTill - STEP_SIZE) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={slop}
      onPress={onPress}
      style={({ pressed }) => ({
        width: STEP_SIZE,
        height: STEP_SIZE,
        borderRadius: theme.radius.tile,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.colors.disabledFill : theme.colors.pressed,
        opacity: disabled ? 0.4 : 1,
      })}>
      <Icon name={icon} size={20} strokeWidth={2.4} color={theme.colors.ink} />
    </Pressable>
  );
}
