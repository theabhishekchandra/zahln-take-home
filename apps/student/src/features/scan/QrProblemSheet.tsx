import { useTranslation } from '@zahln/i18n';
import { announce, AppText, Button, Icon, Overlay, useTheme } from '@zahln/ui-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import type { QrProblem } from '@/features/pay/pay-view';

export interface QrProblemSheetProps {
  readonly problem: QrProblem | null;
  readonly onScanAgain: () => void;
  readonly onDone: () => void;
}

/** Design screen 13: the code can't be paid. Always says whether money moved. */
export function QrProblemSheet({ problem, onScanAgain, onDone }: QrProblemSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const copy =
    problem === null
      ? null
      : problem === 'not_zahln' || problem === 'unsupported_version'
        ? { title: t(`qr.problem.${problem}.title`), body: t(`qr.problem.${problem}.body`) }
        : { title: t(`qr.${problem}.title`), body: t(`qr.${problem}.body`) };
  const spoken = copy ? `${copy.title}. ${copy.body}` : null;

  useEffect(() => {
    if (spoken) announce(spoken);
  }, [spoken]);

  const alreadyPaid = problem === 'alreadyPaid';
  return (
    <Overlay visible={copy !== null} placement="bottom" onRequestClose={onScanAgain}>
      {copy ? (
        <>
          <View style={{ flexDirection: 'row', gap: theme.spacing[3], alignItems: 'center' }}>
            <View
              style={{
                width: theme.size.iconTile + 8,
                height: theme.size.iconTile + 8,
                borderRadius: theme.radius.control,
                backgroundColor: alreadyPaid ? theme.colors.successTint : theme.colors.dangerTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name={alreadyPaid ? 'check' : 'alert'} size={24} color={alreadyPaid ? theme.colors.success : theme.colors.danger} />
            </View>
            <AppText variant="titleS" accessibilityRole="header" style={{ flex: 1 }}>
              {copy.title}
            </AppText>
          </View>
          <AppText tone="secondary">{copy.body}</AppText>
          {alreadyPaid ? (
            <Button label={t('common.done')} onPress={onDone} />
          ) : (
            <>
              <Button label={t('common.scanAgain')} onPress={onScanAgain} />
              <Button label={t('common.backToHome')} variant="text" onPress={onDone} />
            </>
          )}
        </>
      ) : null}
    </Overlay>
  );
}
