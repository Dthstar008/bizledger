import { TextStyle, ViewStyle } from 'react-native';

/**
 * BizLedger design tokens: green + gold.
 *
 * Fixed brand hexes (from the logo): green #0B6E4F, deep green #084C37,
 * gold #F5B800, cream #F4F1E8. Everything else is derived from them.
 *
 * Colour rules:
 * - Gold is confirmation ("recorded / settled / verified") or something to
 *   notice. Gold fills carry deep-green text (onGold), never white; gold as
 *   text on light surfaces is goldDeep.
 * - Money in = green, money owed to you = goldDeep, money out / overdue =
 *   danger. Always paired with an icon or label, never colour alone.
 * - Green is success; there is no second green.
 */
export const palette = {
  light: {
    primary: '#0B6E4F',
    primaryPressed: '#084C37',
    primaryMuted: '#E6F2EC',
    primarySoft: '#BFDCCF',
    onPrimary: '#FFFFFF',
    /** Hero cards: gradient from primary to this. */
    heroEnd: '#084C37',
    gold: '#F5B800',
    /** Gold as text or icon on light surfaces (5.3:1 on white). */
    goldDeep: '#8A6500',
    goldMuted: '#FFF6D6',
    onGold: '#084C37',
    background: '#F7F6F1',
    surface: '#FFFFFF',
    /** Brand cream: ledger paper, receipts, secondary fills. */
    surfaceAlt: '#F4F1E8',
    border: '#E3E1D6',
    borderStrong: '#C9C6B8',
    /** Green-black, never pure black. */
    text: '#1B2B25',
    /** 4.9:1 on the background. */
    textMuted: '#5E6F68',
    /** Placeholders and chart labels; same contrast floor as textMuted. */
    textSubtle: '#5E6F68',
    success: '#0B6E4F',
    danger: '#C0392B',
    dangerMuted: '#FBEAE8',
    info: '#2F6F8F',
    infoMuted: '#E4F0F6',
    /** Kept for existing screens: "warning" is now the gold family. */
    warning: '#8A6500',
    warningMuted: '#FFF6D6',
    overlay: 'rgba(14, 26, 21, 0.5)',
    shadow: '#084C37',
    /** Focus ring for keyboard and switch access. */
    focus: '#F5B800',
  },
  dark: {
    primary: '#3FB58A',
    primaryPressed: '#2E9A73',
    primaryMuted: '#1B3A2E',
    primarySoft: '#2A5443',
    /** Deep green on the lifted green: white would fail contrast there. */
    onPrimary: '#062A1E',
    heroEnd: '#0B4A35',
    gold: '#F5B800',
    goldDeep: '#F2C94C',
    goldMuted: '#3A3010',
    onGold: '#084C37',
    background: '#0E1A15',
    surface: '#15251E',
    surfaceAlt: '#1C2F26',
    border: '#274137',
    borderStrong: '#36574A',
    text: '#EAF2EE',
    textMuted: '#9DB4A9',
    textSubtle: '#9DB4A9',
    success: '#3FB58A',
    danger: '#FF7B6B',
    dangerMuted: '#3A1F1B',
    info: '#7FB8D6',
    infoMuted: '#17303B',
    warning: '#F2C94C',
    warningMuted: '#3A3010',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
    focus: '#F5B800',
  },
};

export type Colors = typeof palette.light;
export type Scheme = keyof typeof palette;

/**
 * Light-mode colours. Screens not yet converted to the theme hook (see
 * theming.tsx) read these directly; converted ones get the active scheme.
 */
export const colors: Colors = palette.light;

/** Plus Jakarta Sans, one family per weight (Android can't synthesise weights of a custom font). */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

/** 4-point grid. Screen gutter and card padding are md (16). */
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
  /** Inputs, chips. */
  sm: 8,
  /** Cards. */
  md: 12,
  /** Sheets, hero cards. */
  lg: 16,
  /** Echo of the app tile, for onboarding art. */
  tile: 28,
  pill: 999,
};

// Money always uses lining, tabular figures so columns of amounts line up.
const tabular: TextStyle = { fontVariant: ['tabular-nums', 'lining-nums'] };

/** Type scale (sp). Body never below 16, nothing below 12. Respects system font scaling. */
export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  /** Numbers on stat tiles and totals. */
  metric: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, ...tabular },
  /** Big money on hero cards and success screens. */
  money: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, ...tabular },
  overline: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Minimum touch target, with 8dp between neighbouring targets. */
export const touch = { min: 48 };

/** Standard control heights. */
export const control = { button: 52, buttonSm: 40, input: 56, fab: 56 };

export const layout = {
  /** Content column on tablets and the web preview, centred. */
  maxWidth: 640,
  tabletBreakpoint: 700,
};

export const motion = {
  /** UI transitions: ease-out. */
  fast: 150,
  base: 220,
  /** Celebrations (the gold check stamp): spring. */
  celebrate: 350,
};

/** Green-tinted elevation; never grey shadows. */
export function shadowsFor(c: Colors) {
  return {
    card: {
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    } satisfies ViewStyle,
    raised: {
      shadowColor: c.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    } satisfies ViewStyle,
  };
}

export const shadow = shadowsFor(colors);
