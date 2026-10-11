import { AlertDialog, Host, Text, TextButton } from '@expo/ui/jetpack-compose';

import { it } from '@/i18n/it';
import { useDiscardPrompt } from '@/state/discard-prompt';
import { fonts, useTheme } from '@/theme';

/**
 * «Scartare?» as a Material 3 dialog in the app's colours and type. The system alert of React Native
 * draws the AppCompat dialog of the app theme, which looks like Android of ten years ago.
 */
export function DiscardDialog() {
  const { colors, scheme } = useTheme();
  const pending = useDiscardPrompt((s) => s.pending);
  const answer = useDiscardPrompt((s) => s.answer);
  return (
    <Host matchContents colorScheme={scheme} style={{ position: 'absolute' }}>
      {pending ? (
        <AlertDialog onDismissRequest={() => answer('keep')} colors={{ containerColor: colors.surface }}>
          <AlertDialog.Title>
            <Text color={colors.ink} style={{ fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 }}>
              {it.discard.title}
            </Text>
          </AlertDialog.Title>
          <AlertDialog.Text>
            <Text color={colors.inkSecondary} style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 }}>
              {it.discard.body}
            </Text>
          </AlertDialog.Text>
          <AlertDialog.DismissButton>
            <TextButton onClick={() => answer('keep')} colors={{ contentColor: colors.ink }}>
              <Text color={colors.ink} style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
                {it.discard.keep}
              </Text>
            </TextButton>
          </AlertDialog.DismissButton>
          <AlertDialog.ConfirmButton>
            <TextButton onClick={() => answer('discard')} colors={{ contentColor: colors.alert }}>
              <Text color={colors.alert} style={{ fontFamily: fonts.semibold, fontSize: 16 }}>
                {it.discard.discard}
              </Text>
            </TextButton>
          </AlertDialog.ConfirmButton>
        </AlertDialog>
      ) : null}
    </Host>
  );
}
