import { Text, TextProps } from 'react-native';
import { Colors, type, TypeVariant } from '../theme';
import { useTheme } from '../theming';

export type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'gold' | 'danger' | 'warning' | 'info' | 'inverse';

const toneKey: Record<Tone, keyof Colors> = {
  default: 'text',
  muted: 'textMuted',
  subtle: 'textSubtle',
  primary: 'primary',
  // Gold as text is always the deep variant (readable on light surfaces).
  gold: 'goldDeep',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  inverse: 'onPrimary',
};

interface Props extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
}

/** The one text component: every piece of copy picks a size from the type scale and a tone. */
export function AppText({ variant = 'body', tone = 'default', align, style, ...rest }: Props) {
  const { colors } = useTheme();
  return <Text style={[type[variant], { color: colors[toneKey[tone]] }, align ? { textAlign: align } : null, style]} {...rest} />;
}
