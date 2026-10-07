import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { it } from '@/i18n/it';
import { useToast } from '@/state/toast';
import { radius, spacing, useTheme } from '@/theme';

import { recentTemplates } from './suggestions';

function SecondaryTile({ label, icon }: { label: string; icon: IconName }) {
  const { colors } = useTheme();
  const show = useToast((s) => s.show);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        router.back();
        show({ text: it.add.comingSoon(label) });
      }}
      style={{
        flex: 1,
        minHeight: 84,
        borderRadius: radius.control,
        borderCurve: 'continuous',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
      }}
    >
      <Icon name={icon} color={colors.ink} size={22} />
      <AppText variant="subheadStrong" numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** The + menu: expense first and largest, the other types below, then habits to repeat with one tap. */
export function AddMenu() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const templates = data ? recentTemplates(data, 3) : [];
  const categoryById = new Map(data?.categories.map((c) => [c.id, c]) ?? []);

  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, gap: spacing.md }}>
      <AppText variant="title2" accessibilityRole="header">
        {it.add.title}
      </AppText>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${it.add.expense}. ${it.add.expenseHint}`}
        onPress={() => router.replace('/add-expense')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          minHeight: 76,
          borderRadius: radius.card,
          borderCurve: 'continuous',
          backgroundColor: colors.ink,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: radius.key, backgroundColor: colors.onInk, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="ArrowDown" color={colors.ink} size={22} weight="bold" />
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="title3" tone="onInk">
            {it.add.expense}
          </AppText>
          <AppText variant="subhead" tone="onInk" style={{ opacity: 0.75 }}>
            {it.add.expenseHint}
          </AppText>
        </View>
        <Icon name="CaretRight" color={colors.onInk} size={18} />
      </PressableScale>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <SecondaryTile label={it.add.income} icon="ArrowUp" />
        <SecondaryTile label={it.add.subscription} icon="ArrowsClockwise" />
        <SecondaryTile label={it.add.transfer} icon="ArrowsLeftRight" />
      </View>

      {templates.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheadStrong" tone="secondary">
            {it.add.recent}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {templates.map((t) => {
              const category = categoryById.get(t.categoryId);
              return (
                <PressableScale
                  key={t.merchant}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.merchant}, ${category?.name ?? ''}`}
                  onPress={() =>
                    router.replace({
                      pathname: '/add-expense',
                      params: { merchant: t.merchant, amount: String(t.amountMinor), category: t.categoryId, account: t.accountId },
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minHeight: 44,
                    paddingLeft: spacing.xs + 2,
                    paddingRight: spacing.smd,
                    borderRadius: radius.full,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.hairline,
                  }}
                >
                  <LineBadge color={category?.color ?? 'grey'} name={category?.name ?? t.merchant} size={28} />
                  <AppText variant="subheadStrong">{t.merchant}</AppText>
                  <Money minor={t.amountMinor} currency={data!.currency} variant="subhead" tone="secondary" />
                </PressableScale>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
