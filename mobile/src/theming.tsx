import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { Colors, palette, Scheme, shadowsFor } from './theme';
import { usePrefs } from './store/prefs-store';

/**
 * Dark mode switches on once every screen reads colours through useTheme /
 * makeStyles. Until then the app stays light whatever the setting, so no
 * screen shows light cards on a dark background.
 */
export const DARK_MODE_READY = false;

interface Theme {
  scheme: Scheme;
  colors: Colors;
  shadow: ReturnType<typeof shadowsFor>;
}

const build = (scheme: Scheme): Theme => ({ scheme, colors: palette[scheme], shadow: shadowsFor(palette[scheme]) });
const themes: Record<Scheme, Theme> = { light: build('light'), dark: build('dark') };

const ThemeContext = createContext<Theme>(themes.light);

/** Picks light or dark from the person's setting (System / Light / Dark). */
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const preference = usePrefs((s) => s.themePreference);
  const wanted: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const scheme: Scheme = DARK_MODE_READY ? wanted : 'light';
  return <ThemeContext.Provider value={themes[scheme]}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Styles that depend on the active colours, built once per scheme:
 *
 *   const useStyles = makeStyles((c) => ({ card: { backgroundColor: c.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (colors: Colors, theme: Theme) => T) {
  const cache = new Map<Scheme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme.scheme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme.colors, theme));
        cache.set(theme.scheme, styles);
      }
      return styles;
    }, [theme]);
  };
}
