import { Text, TextProps } from 'react-native';
import { colors, type, TypeVariant } from '../theme';

export type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'warning' | 'inverse';

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  primary: colors.primary,
  danger: colors.danger,
  warning: colors.warning,
  inverse: colors.onPrimary,
};

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

/** The one text component: every piece of copy picks a size from the type scale and a tone. */
export function AppText({ variant = 'body', tone = 'default', align, style, ...rest }: Props) {
  return <Text style={[type[variant], { color: toneColor[tone] }, align ? { textAlign: align } : null, style]} {...rest} />;
}
