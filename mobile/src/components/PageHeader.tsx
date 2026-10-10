import { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { spacing } from '../theme';
import { makeStyles } from '../theming';

interface Props {
  title: string;
  subtitle?: string;
  /** Small line above the title, e.g. a greeting context. */
  eyebrow?: string;
  /** Trailing icon buttons / primary action. */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? (
          <AppText variant="overline" tone="primary" numberOfLines={1}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="label" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
}));
