import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { BrandLockup } from './Brand';
import { Card } from './Card';
import { Screen } from './Screen';
import { spacing } from '../theme';
import { makeStyles } from '../theming';

interface Props extends PropsWithChildren {
  heading: string;
  subheading: string;
  footer: ReactNode;
}

/** Shared frame for login and sign-up so both read as the same product. */
export function AuthLayout({ heading, subheading, footer, children }: Props) {
  const styles = useStyles();
  return (
    <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.inner}>
        <BrandLockup />
        <View style={styles.heading}>
          <AppText variant="title" align="center">
            {heading}
          </AppText>
          <AppText tone="muted" align="center">
            {subheading}
          </AppText>
        </View>
        <Card style={styles.card}>{children}</Card>
        <View style={styles.footer}>{footer}</View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.lg },
  heading: { gap: spacing.xs },
  card: { gap: spacing.md, padding: spacing.lg - 4 },
  footer: { alignItems: 'center' },
}));
