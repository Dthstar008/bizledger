import { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, spacing } from '../theme';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned above the scrolling content (e.g. search bar). */
  header?: ReactNode;
  /** Pinned to the bottom, above the keyboard (e.g. "Complete sale"). */
  footer?: ReactNode;
  /** Tab screens draw under the status bar; stack screens with a native header pass []. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/**
 * Standard screen shell: safe area, keyboard avoidance, pull-to-refresh, and a
 * centred max-width column so tablets don't stretch content edge to edge.
 */
export function Screen({ children, scroll = true, refreshing, onRefresh, header, footer, edges = ['top'], contentStyle }: Props) {
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined
      }
    >
      <View style={[styles.column, styles.content, contentStyle]}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.column, styles.content, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header ? <View style={[styles.column, styles.header]}>{header}</View> : null}
        {body}
        {footer ? (
          <View style={styles.footerBar}>
            <View style={[styles.column, styles.footer]}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  column: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md },
  footerBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, gap: spacing.sm },
});
