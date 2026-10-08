import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { SettingsGroup } from '@/components/settings-group';
import { SheetHeader } from '@/components/sheet-header';
import { ColorPicker, IconPicker } from '@/components/swatch-picker';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useDeleteCategory, useRestoreCategory, useSaveCategory, useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import type { Category, CategoryKind } from '@/domain/types';
import { TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { useDiscardGuard } from '@/services/discard-guard';
import { haptics } from '@/services/haptics';
import { useToast } from '@/state/toast';
import { layout, spacing, useTheme } from '@/theme';

import { buildCategoryList, categoryUsage, type CategoryRow } from './money';

const KINDS: CategoryKind[] = ['expense', 'income'];
const ICONS = [
  'ShoppingCart', 'ForkKnife', 'Train', 'Car', 'Bicycle', 'AirplaneTilt', 'ShoppingBag', 'House', 'Lightning', 'ArrowsClockwise',
  'Heartbeat', 'Sparkle', 'FilmSlate', 'MusicNotes', 'GameController', 'GraduationCap', 'Laptop', 'Gift', 'Heart', 'Plant',
  'Camera', 'Umbrella', 'Receipt', 'Tag', 'PiggyBank', 'Briefcase', 'HandCoins', 'ArrowCounterClockwise', 'DotsThree',
];
const COLORS = ['green', 'yellow', 'sky', 'magenta', 'blue', 'orange', 'lilac', 'teal', 'indigo', 'olive', 'brown', 'slate', 'pink', 'plum', 'grey'];

function CategoryListRow({ row }: { row: CategoryRow }) {
  const { colors } = useTheme();
  const { category, movementCount } = row;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${it.categoryList.movements(movementCount)}`}
      feedback="dim"
      onPress={() => router.push({ pathname: '/category-edit', params: { id: category.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      <LineBadge color={category.color} icon={category.icon} />
      <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="body" numberOfLines={1}>
          {category.name}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {it.categoryList.movements(movementCount)}
        </AppText>
      </View>
      <Icon name={category.icon} size={20} color={colors.inkSecondary} />
      <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
    </PressableScale>
  );
}

/** Categorie: spending and income lines, each with how many movements use it; archived ones apart. */
export function CategoriesScreen() {
  const { data } = useSnapshot();
  const [kind, setKind] = useState<CategoryKind>('expense');
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const list = buildCategoryList(data, kind);

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.lg }}>
        <AppText variant="subhead" tone="secondary">
          {it.categoryList.hint}
        </AppText>
        <Segmented label={it.categoryList.kindsLabel} value={kind} onChange={setKind} options={KINDS.map((value) => ({ value, label: it.categoryList.kinds[value] }))} />
        <SettingsGroup>
          {list.active.map((row) => (
            <CategoryListRow key={row.category.id} row={row} />
          ))}
        </SettingsGroup>
        {list.archived.length ? (
          <SettingsGroup title={it.categoryList.archived}>
            {list.archived.map((row) => (
              <CategoryListRow key={row.category.id} row={row} />
            ))}
          </SettingsGroup>
        ) : null}
        <Button label={it.categoryList.add} icon="Plus" variant="secondary" onPress={() => router.push({ pathname: '/category-edit', params: { kind } })} />
      </View>
    </Screen>
  );
}

/** New category or changes to one: name, icon, colour. Used categories are archived, unused ones can be deleted. */
export function CategoryForm() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: CategoryKind }>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = id ? data.categories.find((c) => c.id === id) : undefined;
  return <CategoryFormBody key={editing?.id ?? 'new'} data={data} editing={editing} kind={editing?.kind ?? (kind === 'income' ? 'income' : 'expense')} />;
}

function CategoryFormBody({ data, editing, kind }: { data: Snapshot; editing?: Category; kind: CategoryKind }) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const restore = useRestoreCategory();
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'Tag');
  const [color, setColor] = useState(editing?.color ?? 'teal');
  const allowLeave = useDiscardGuard({ name, icon, color });
  const usage = editing ? categoryUsage(data, editing.id) : null;
  const usedBy = usage
    ? [
        usage.movements ? it.categoryList.form.usage.movements(usage.movements) : null,
        usage.budgets ? it.categoryList.form.usage.budgets(usage.budgets) : null,
        usage.subscriptions ? it.categoryList.form.usage.subscriptions(usage.subscriptions) : null,
      ].filter(Boolean)
    : [];

  const onSave = () => {
    if (save.isPending) return;
    if (!name.trim()) {
      haptics.warning();
      showToast({ text: it.categoryList.form.typeName });
      return;
    }
    const fields = { name: name.trim(), icon, color };
    const draft = editing
      ? { ...editing, ...fields }
      : { ...fields, kind, isDefault: false, archived: false, sortOrder: Math.max(-1, ...data.categories.filter((c) => c.kind === kind).map((c) => c.sortOrder)) + 1 };
    save.mutate(draft, {
      onSuccess: () => {
        haptics.success();
        allowLeave();
        router.back();
        showToast({ text: it.categoryList.form.saved });
      },
    });
  };
  const toggleArchive = () => {
    if (!editing) return;
    const archived = !editing.archived;
    haptics.light();
    save.mutate(
      { ...editing, archived },
      {
        onSuccess: () => {
          allowLeave();
          router.back();
          showToast({
            text: archived ? it.categoryList.form.archivedToast : it.categoryList.form.unarchivedToast,
            actionLabel: it.common.undo,
            onAction: () => save.mutate({ ...editing }),
          });
        },
      },
    );
  };
  const onDelete = () => {
    if (!editing) return;
    haptics.medium();
    remove.mutate(editing.id, {
      onSuccess: () => {
        allowLeave();
        router.back();
        showToast({
          text: it.categoryList.form.deletedToast,
          actionLabel: it.common.undo,
          onAction: () => restore.mutate(editing.id, { onSuccess: () => showToast({ text: it.categoryList.form.restoredToast }) }),
        });
      },
    });
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={editing ? it.categoryList.form.editTitle : it.categoryList.form.newTitle}
        left={{ label: it.common.cancel, onPress: () => router.back() }}
        right={{ label: it.categoryList.form.save, onPress: onSave }}
      />
      <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }} accessibilityLabel={it.categoryList.form.preview}>
          <LineBadge color={color} icon={icon} size={40} />
          <AppText variant="title2" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name || it.categoryList.form.namePlaceholder}
          </AppText>
        </View>
        <TextField label={it.categoryList.form.name} value={name} onChangeText={setName} placeholder={it.categoryList.form.namePlaceholder} autoFocus={!editing} />
        <ColorPicker label={it.categoryList.form.color} keys={COLORS} value={color} onChange={setColor} />
        <IconPicker label={it.categoryList.form.icon} icons={ICONS} value={icon} onChange={setIcon} />
        {editing && usage ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="footnote" tone="secondary">
              {usage.canDelete ? it.categoryList.form.unused : it.categoryList.form.usedBy(usedBy.join(', '))}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label={editing.archived ? it.categoryList.form.unarchive : it.categoryList.form.archive}
                icon={editing.archived ? 'ArrowUUpLeft' : 'Archive'}
                variant="secondary"
                onPress={toggleArchive}
                style={{ flex: 1 }}
              />
              {usage.canDelete ? <Button label={it.categoryList.form.delete} icon="Trash" variant="destructive" onPress={onDelete} style={{ flex: 1 }} /> : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <ToastHost top={60} />
    </View>
  );
}
