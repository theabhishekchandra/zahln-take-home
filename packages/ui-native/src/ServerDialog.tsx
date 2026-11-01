import { useTranslation } from '@zahln/i18n';
import { useState } from 'react';

import { AppText } from './AppText';
import { Button } from './Button';
import { NoticeCard } from './NoticeCard';
import { Overlay } from './Overlay';
import { TextField } from './TextField';

export type ServerSaveResult = 'saved' | 'busy';

export interface ServerDialogProps {
  readonly visible: boolean;
  /** The server this launch talks to. */
  readonly current: string;
  /** The build's own server, which "Use default" goes back to. */
  readonly buildDefault: string;
  readonly isValid: (url: string) => boolean;
  /** Saves for the next launch; null means the build's default. `busy` if work is still open on the current server. */
  readonly onSave: (url: string | null) => Promise<ServerSaveResult>;
  readonly onClose: () => void;
}

/**
 * Test builds only: which Zahln server to use from the next launch on, so Zahln
 * can test a build against its own server. Reached by a long press, never
 * shown to real users.
 */
export function ServerDialog({ visible, current, buildDefault, isValid, onSave, onClose }: ServerDialogProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(current);
  const [result, setResult] = useState<{ readonly kind: ServerSaveResult | 'invalid'; readonly url?: string } | null>(null);

  const save = async (url: string | null) => {
    if (url !== null && !isValid(url)) return setResult({ kind: 'invalid' });
    setResult({ kind: await onSave(url), url: url ?? buildDefault });
  };

  return (
    <Overlay visible={visible} placement="center" onRequestClose={onClose}>
      <AppText variant="titleM" accessibilityRole="header">
        {t('server.title')}
      </AppText>
      <AppText tone="secondary">{t('server.body', { current })}</AppText>
      <TextField
        label={t('server.label')}
        hint={t('server.hint')}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setResult(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={result?.kind === 'invalid' ? t('server.invalid') : undefined}
      />
      {result?.kind === 'saved' ? <NoticeCard tone="reassure" title={t('server.saved', { url: result.url })} /> : null}
      {result?.kind === 'busy' ? <NoticeCard tone="problem" title={t('server.busy')} /> : null}
      <Button label={t('server.save')} onPress={() => void save(text)} />
      <Button label={t('server.useDefault', { url: buildDefault })} variant="secondary" onPress={() => void save(null)} />
      <Button label={t('server.close')} variant="text" onPress={onClose} />
    </Overlay>
  );
}
