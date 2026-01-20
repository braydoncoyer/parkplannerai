import { useState, useEffect } from 'react';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;

  // Backgrounds
  surface: string;
  page: string;
  elevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Charts
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  grid: string;
  axis: string;

  // Wait time colors
  waitGreen: string;
  waitAmber: string;
  waitOrange: string;
  waitRed: string;

  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;
}

const lightColors: ThemeColors = {
  primary: '#c2410c',
  primaryHover: '#9a3412',
  primaryLight: '#fff7ed',
  secondary: '#65a30d',

  surface: '#ffffff',
  page: '#fdfbf7',
  elevated: '#f8f6f1',

  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  border: '#e2e0db',
  borderLight: '#f0eee9',

  chartPrimary: '#c2410c',
  chartSecondary: '#65a30d',
  chartTertiary: '#0891b2',
  grid: '#e2e0db',
  axis: '#64748b',

  waitGreen: '#22c55e',
  waitAmber: '#f59e0b',
  waitOrange: '#f97316',
  waitRed: '#ef4444',

  success: '#65a30d',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
};

const darkColors: ThemeColors = {
  primary: '#d97706',
  primaryHover: '#f59e0b',
  primaryLight: '#451a03',
  secondary: '#84cc16',

  surface: '#292524',
  page: '#1c1917',
  elevated: '#44403c',

  textPrimary: '#fafaf9',
  textSecondary: '#a8a29e',
  textMuted: '#78716c',

  border: '#44403c',
  borderLight: '#57534e',

  chartPrimary: '#d97706',
  chartSecondary: '#84cc16',
  chartTertiary: '#22d3ee',
  grid: '#44403c',
  axis: '#a8a29e',

  waitGreen: '#22c55e',
  waitAmber: '#fbbf24',
  waitOrange: '#f59e0b',
  waitRed: '#ef4444',

  success: '#84cc16',
  warning: '#fbbf24',
  danger: '#ef4444',
  info: '#38bdf8',
};

/**
 * Hook to get theme-aware colors for Recharts and other JS-rendered content.
 * Updates when theme changes, triggering a re-render with new colors.
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(lightColors);

  useEffect(() => {
    const updateColors = () => {
      const theme = document.documentElement.getAttribute('data-actual-theme');
      setColors(theme === 'dark' ? darkColors : lightColors);
    };

    // Set initial colors
    updateColors();

    // Watch for theme changes via MutationObserver
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-actual-theme'
        ) {
          updateColors();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-actual-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}

/**
 * Get colors synchronously (for non-reactive use cases)
 */
export function getThemeColors(): ThemeColors {
  if (typeof document === 'undefined') return lightColors;

  const theme = document.documentElement.getAttribute('data-actual-theme');
  return theme === 'dark' ? darkColors : lightColors;
}

export { lightColors, darkColors };
