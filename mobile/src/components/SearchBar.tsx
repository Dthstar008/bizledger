import { ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, touch, type } from '../theme';
import { makeStyles, useTheme } from '../theming';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** e.g. a barcode-scan button inside the bar. */
  trailing?: ReactNode;
}

export function SearchBar({ value, onChangeText, placeholder, trailing }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={12}>
          <Ionicons name="close-circle" size={20} color={colors.textSubtle} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md - 2,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  input: { ...type.body, flex: 1, minWidth: 0, color: c.text, paddingVertical: spacing.sm },
}));
