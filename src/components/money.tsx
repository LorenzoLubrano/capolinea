import { Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';

import { accessibleMoney, formatMoney, type MoneyFormatOptions } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { type, type TypeVariant } from '@/theme';

import { AppText, type TextTone } from './text';

export interface MoneyProps {
  minor: number;
  currency: string;
  variant?: TypeVariant;
  tone?: TextTone;
  sign?: MoneyFormatOptions['sign'];
  wholeUnits?: boolean;
  /** Render cents and currency smaller, in `centsVariant`. Used by large figures. */
  centsVariant?: TypeVariant;
  /** Accessibility prefix, e.g. "Speso a ottobre". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The only way amounts reach the screen. It applies privacy mode everywhere and
 * gives screen readers the spelled-out amount (or "importo nascosto").
 */
export function Money({
  minor,
  currency,
  variant = 'bodyStrong',
  tone = 'primary',
  sign,
  wholeUnits,
  centsVariant,
  label,
  style,
}: MoneyProps) {
  const masked = useSettings((state) => state.privacy);
  const text = formatMoney(minor, currency, { sign, wholeUnits, masked });
  const spoken = accessibleMoney(minor, currency, { masked });
  const a11yLabel = label ? `${label}: ${spoken}` : spoken;

  const split = centsVariant && !masked ? /^(.*?)(,\d{2})?(\s?\S+)$/.exec(text) : null;

  return (
    <View style={style} accessible accessibilityLabel={a11yLabel}>
      {split ? (
        <AppText variant={variant} tone={tone} numberOfLines={1} adjustsFontSizeToFit>
          {split[1]}
          <RNText style={type[centsVariant!]}>{`${split[2] ?? ''}${split[3]}`}</RNText>
        </AppText>
      ) : (
        <AppText variant={variant} tone={tone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {text}
        </AppText>
      )}
    </View>
  );
}
