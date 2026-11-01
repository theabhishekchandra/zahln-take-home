import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './theme';
import { useReduceMotion } from './useReduceMotion';

export interface OverlayProps {
  readonly visible: boolean;
  /** Bottom sheet for problems with the current step, centred dialog for interruptions. */
  readonly placement: 'bottom' | 'center';
  /** Android back button; omit to make the overlay non-dismissible. */
  readonly onRequestClose?: () => void;
  readonly children: ReactNode;
}

/** Modal sheet or dialog over a scrim; screen readers stay inside it. */
export function Overlay({ visible, placement, onRequestClose, children }: OverlayProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const bottom = placement === 'bottom';
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reduceMotion ? 'fade' : bottom ? 'slide' : 'fade'}
      onRequestClose={onRequestClose ?? (() => undefined)}>
      {/* The modal is edge to edge, so the window doesn't shrink for the keyboard: lift the sheet ourselves. */}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: theme.colors.scrim, justifyContent: bottom ? 'flex-end' : 'center', padding: bottom ? 0 : theme.spacing[6] }}>
        <View
          accessibilityViewIsModal
          style={{
            // A dialog stays dialog-sized on a tablet.
            ...(bottom ? null : { width: '100%', maxWidth: 480, alignSelf: 'center' }),
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radius.sheet,
            borderBottomLeftRadius: bottom ? 0 : theme.radius.sheet,
            borderBottomRightRadius: bottom ? 0 : theme.radius.sheet,
            paddingTop: theme.spacing[6],
            paddingHorizontal: theme.spacing[5],
            paddingBottom: bottom ? Math.max(insets.bottom, theme.spacing[4]) + theme.spacing[3] : theme.spacing[5],
            gap: theme.spacing[4],
            boxShadow: theme.elevation.sheet,
          }}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
