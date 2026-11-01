import { parseOrderQr, type OrderRef } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Icon, useTheme } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { QrProblem } from '@/features/pay/pay-view';

import { CameraPermission } from './CameraPermission';
import { CodeEntrySheet } from './CodeEntrySheet';
import { QrProblemSheet } from './QrProblemSheet';

export interface ScanViewProps {
  /** A problem the server found with the scanned order (expired, already paid, not found). */
  readonly flowProblem: QrProblem | null;
  readonly onOrder: (orderRef: OrderRef) => void;
  /** Clears a server-side problem so the next code can be scanned. */
  readonly onScanAgain: () => void;
  readonly onClose: () => void;
}

const FINDER = 248;

/** Design screen 03: scan the till's QR, or type its code. */
export function ScanView({ flowProblem, onOrder, onScanAgain, onClose }: ScanViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeProblem, setCodeProblem] = useState<QrProblem | null>(null);
  /** The camera reports the same code many times a second; act on the first only. */
  const handled = useRef(false);

  const problem = codeProblem ?? flowProblem;
  const busy = codeOpen || problem !== null;

  const accept = (orderRef: OrderRef) => {
    handled.current = true;
    setCodeOpen(false);
    onOrder(orderRef);
  };

  const scanned = (data: string) => {
    if (handled.current || busy) return;
    const result = parseOrderQr(data);
    if (result.ok) return accept(result.orderRef);
    handled.current = true;
    setCodeProblem(result.problem);
  };

  const scanAgain = () => {
    handled.current = false;
    setCodeProblem(null);
    onScanAgain();
  };

  const sheets = (
    <>
      <CodeEntrySheet visible={codeOpen} onSubmit={accept} onClose={() => setCodeOpen(false)} />
      <QrProblemSheet problem={problem} onScanAgain={scanAgain} onDone={onClose} />
    </>
  );

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <>
        <CameraPermission
          canAsk={permission.canAskAgain}
          onAllow={() => void requestPermission()}
          onEnterCode={() => setCodeOpen(true)}
          onClose={onClose}
        />
        {sheets}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : ({ data }) => scanned(data)}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={{ flex: 1, paddingTop: insets.top + theme.spacing[2], paddingBottom: insets.bottom + theme.spacing[5] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: theme.size.tapMin }}>
          <AppText variant="bodyStrong" accessibilityRole="header" style={{ color: hero.ink }}>
            {t('scan.title')}
          </AppText>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing[5] }}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('scan.viewfinder')}
            style={{ width: FINDER, height: FINDER, borderRadius: 28, borderWidth: 3, borderColor: hero.ink, opacity: 0.9 }}
          />
          <AppText variant="bodyStrong" style={{ color: hero.ink, textAlign: 'center', paddingHorizontal: theme.spacing[8] }}>
            {t('scan.hint')}
          </AppText>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 6,
              paddingHorizontal: theme.spacing[3],
              borderRadius: theme.radius.pill,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
            }}>
            <Icon name="shield" size={14} color={hero.ink} />
            <AppText variant="label" style={{ color: hero.ink }}>
              {t('scan.onlyZahln')}
            </AppText>
          </View>
        </View>

        <View style={{ paddingHorizontal: theme.spacing[5], gap: theme.spacing[2] }}>
          <AppText variant="caption" style={{ color: hero.inkMuted, textAlign: 'center' }}>
            {t('scan.seeFirst')}
          </AppText>
          <DarkButton icon="keyboard" label={t('scan.enterCode')} onPress={() => setCodeOpen(true)} />
        </View>
      </View>

      {/* Close and torch come last in the tree: screen readers reach the instructions first. */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + theme.spacing[2],
          left: theme.spacing[5],
          right: theme.spacing[5],
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
        pointerEvents="box-none">
        <RoundButton icon="close" label={t('scan.close')} onPress={onClose} />
        <RoundButton
          icon="torch"
          label={torch ? t('scan.torchOff') : t('scan.torchOn')}
          selected={torch}
          onPress={() => setTorch((on) => !on)}
        />
      </View>
      {sheets}
    </View>
  );
}

function RoundButton({ icon, label, selected, onPress }: { icon: 'close' | 'torch'; label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'switch'}
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: theme.size.tapMin,
        height: theme.size.tapMin,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? hero.ink : pressed ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.55)',
      })}>
      <Icon name={icon} size={22} color={selected ? hero.ground : hero.ink} />
    </Pressable>
  );
}

function DarkButton({ icon, label, onPress }: { icon: 'keyboard'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: theme.size.primaryButton,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[2],
        borderRadius: theme.radius.control,
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.18)',
      })}>
      <Icon name={icon} size={20} color={hero.ink} />
      <AppText variant="button" style={{ color: hero.ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}
