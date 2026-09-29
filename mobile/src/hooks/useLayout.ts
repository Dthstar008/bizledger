import { useWindowDimensions } from 'react-native';
import { layout } from '../theme';

/** Screen-size facts for responsive layouts (phones vs tablets). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= layout.tabletBreakpoint;
  const contentWidth = Math.min(width, layout.maxWidth);
  return {
    width,
    height,
    isTablet,
    isSmallPhone: width < 360,
    contentWidth,
    /** Columns for card grids: 2 on phones, 3 on small tablets, 4 on wide screens. */
    gridColumns: contentWidth >= 720 ? 4 : contentWidth >= 520 ? 3 : 2,
  };
}
