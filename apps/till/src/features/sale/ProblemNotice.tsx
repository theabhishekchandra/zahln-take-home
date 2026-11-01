import type { TillProblem } from '@zahln/application';
import { useTranslation } from '@zahln/i18n';
import { NoticeCard } from '@zahln/ui-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { problemKey } from '@/features/register/problem-text';

import { PANEL_WIDTH } from './SaleLayout';

/** Over a result screen: a new code did not go through. */
export function ProblemNotice({ problem }: { readonly problem: TillProblem }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 16, left: 32, right: PANEL_WIDTH + 32, alignItems: 'center' }}>
      <View style={{ maxWidth: 560, width: '100%' }}>
        <NoticeCard tone="problem" title={t(problemKey(problem))} />
      </View>
    </View>
  );
}
