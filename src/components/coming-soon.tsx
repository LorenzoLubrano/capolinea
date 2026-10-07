import { View } from 'react-native';

import { Screen } from './screen';
import { AppText } from './text';
import { spacing } from '@/theme';

/** Placeholder for tabs built in the next prototype block: says what will be here. */
export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <Screen>
      <View style={{ gap: spacing.sm, paddingTop: spacing.xl }}>
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
        <AppText tone="secondary">{body}</AppText>
      </View>
    </Screen>
  );
}
