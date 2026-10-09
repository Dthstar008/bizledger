import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { passwordChecks } from '../utils/password';
import { spacing } from '../theme';
import { makeStyles, useTheme } from '../theming';

/** Live checklist under a new-password field; each rule ticks as it is met. */
export function PasswordRules({ password, email, showErrors }: { password: string; email?: string; showErrors?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.list} accessibilityLabel="Password requirements">
      {passwordChecks(password, email).map((check) => {
        const failed = showErrors && !check.ok;
        return (
          <View key={check.label} style={styles.row}>
            <Ionicons
              name={check.ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={check.ok ? colors.primary : failed ? colors.danger : colors.textSubtle}
            />
            <AppText variant="caption" tone={check.ok ? 'primary' : failed ? 'danger' : 'muted'}>
              {check.label}
              {check.ok ? '' : failed ? ' (needed)' : ''}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
}));
