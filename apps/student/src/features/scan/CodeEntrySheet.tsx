import { parseOrderCode, type OrderRef } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Overlay, TextField } from '@zahln/ui-native';
import { useState } from 'react';

export interface CodeEntrySheetProps {
  readonly visible: boolean;
  readonly onSubmit: (orderRef: OrderRef) => void;
  readonly onClose: () => void;
}

/** When the camera can't scan: type the order code shown under the till's QR. */
export function CodeEntrySheet({ visible, onSubmit, onClose }: CodeEntrySheetProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    const result = parseOrderCode(code);
    if (!result.ok) return setInvalid(true);
    setCode('');
    setInvalid(false);
    onSubmit(result.orderRef);
  };

  return (
    <Overlay visible={visible} placement="bottom" onRequestClose={onClose}>
      <AppText variant="titleS" accessibilityRole="header">
        {t('code.title')}
      </AppText>
      <TextField
        label={t('code.label')}
        hint={t('code.hint')}
        error={invalid ? t('code.invalid') : undefined}
        value={code}
        onChangeText={(text) => {
          setCode(text);
          setInvalid(false);
        }}
        placeholder="order-123"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label={t('common.continue')} onPress={submit} disabled={code.trim().length === 0} />
      <Button label={t('common.cancel')} variant="text" onPress={onClose} />
    </Overlay>
  );
}
