/**
 * Theme System Utilities
 * Handles theme persistence, switching, and system preference detection
 */

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_COOKIE_NAME = 'theme';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Get the current theme from cookie
 */
export function getThemeFromCookie(): Theme {
  if (typeof document === 'undefined') return 'system';

  const value = '; ' + document.cookie;
  const parts = value.split('; ' + THEME_COOKIE_NAME + '=');
  if (parts.length === 2) {
    const theme = parts.pop()?.split(';').shift();
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
  }
  return 'system';
}

/**
 * Set the theme cookie
 */
export function setThemeCookie(theme: Theme): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Get the system color scheme preference
 */
export function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve the actual theme based on user preference
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemPreference();
  }
  return theme;
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: Theme, withTransition = true): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveTheme(theme);
  const html = document.documentElement;

  // Add transition class for smooth animation
  if (withTransition) {
    html.classList.add('theme-transition');
  }

  // Set data attributes
  html.setAttribute('data-theme', theme);
  html.setAttribute('data-actual-theme', resolved);

  // Remove transition class after animation completes
  if (withTransition) {
    setTimeout(() => {
      html.classList.remove('theme-transition');
    }, 200);
  }
}

/**
 * Set and persist the theme
 */
export function setTheme(theme: Theme): void {
  setThemeCookie(theme);
  applyTheme(theme, true);

  // Broadcast to other tabs
  broadcastThemeChange(theme);
}

/**
 * Initialize the theme system
 * Call this on client-side after hydration
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return;

  // Setup system preference listener
  setupSystemPreferenceListener();

  // Setup cross-tab synchronization
  setupCrossTabSync();
}

/**
 * Listen for system preference changes when theme is set to 'system'
 */
function setupSystemPreferenceListener(): void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e: MediaQueryListEvent) => {
    const currentTheme = document.documentElement.getAttribute('data-theme') as Theme;
    if (currentTheme === 'system') {
      document.documentElement.setAttribute('data-actual-theme', e.matches ? 'dark' : 'light');
    }
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }
}

/**
 * Broadcast channel for cross-tab synchronization
 */
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }

  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel('theme-sync');
  }

  return broadcastChannel;
}

function broadcastThemeChange(theme: Theme): void {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({ type: 'theme-change', theme });
  }
}

function setupCrossTabSync(): void {
  const channel = getBroadcastChannel();
  if (!channel) return;

  channel.onmessage = (event) => {
    if (event.data?.type === 'theme-change') {
      const theme = event.data.theme as Theme;
      // Apply without broadcasting back (to avoid loops)
      setThemeCookie(theme);
      applyTheme(theme, true);
    }
  };
}

/**
 * Get current theme from DOM
 */
export function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'system';

  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return 'system';
}

/**
 * Get resolved theme from DOM
 */
export function getResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';

  const theme = document.documentElement.getAttribute('data-actual-theme');
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return 'light';
}
