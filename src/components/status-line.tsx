import { View } from 'react-native';

import type { BudgetStatus } from '@/domain/budget';
import { it } from '@/i18n/it';
import { spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { AppText } from './text';

/** Status in words, icon and colour together; red only past the limit. */
export function StatusLine({ status }: { status: BudgetStatus }) {
  const { colors } = useTheme();
  const alert = status === 'over';
  const warn = status === 'near' || status === 'full' || status === 'trending_over';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Icon name={alert || warn ? 'Warning' : 'Check'} size={14} weight="bold" color={alert ? colors.alert : warn ? colors.warning : colors.inkSecondary} />
      <AppText variant="footnote" tone={alert ? 'alert' : warn ? 'warning' : 'secondary'}>
        {it.budget.statusWords[status]}
      </AppText>
    </View>
  );
}
