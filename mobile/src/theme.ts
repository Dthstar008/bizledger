import { TextStyle, ViewStyle } from 'react-native';

// Brand palette is unchanged; the additions are neutrals and states derived from it.
export const colors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F3F6',
  border: '#E4E8EE',
  borderStrong: '#CBD3DC',
  text: '#12181F',
  // Slightly darker than before so small muted text meets WCAG AA on the background.
  textMuted: '#5E6978',
  textSubtle: '#8A94A2',
  primary: '#0F7A4B',
  primaryPressed: '#0B6440',
  primaryMuted: '#E6F4ED',
  onPrimary: '#FFFFFF',
  danger: '#C0392B',
  dangerMuted: '#FBEAE8',
  warning: '#B7791F',
  warningMuted: '#FCF3E3',
  overlay: 'rgba(18, 24, 31, 0.45)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  metric: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Minimum touch target (Apple HIG / Material both land around 44–48). */
export const touch = { min: 44 };

export const layout = {
  /** Content column width on tablets, so lines and forms don't stretch edge to edge. */
  maxWidth: 760,
  tabletBreakpoint: 700,
};

export const shadow = {
  card: {
    shadowColor: '#12181F',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#12181F',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  } satisfies ViewStyle,
};
