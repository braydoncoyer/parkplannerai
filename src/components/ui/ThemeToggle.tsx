import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { type Theme, getCurrentTheme, setTheme, initializeTheme } from '../../lib/theme';
import './ThemeToggle.css';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: typeof Sun;
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme system
    initializeTheme();

    // Get current theme from DOM
    setCurrentTheme(getCurrentTheme());
    setMounted(true);

    // Listen for theme changes (from other tabs or programmatic changes)
    const observer = new MutationObserver(() => {
      setCurrentTheme(getCurrentTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme);
    setCurrentTheme(theme);
  };

  // Cycle to next theme (for mobile button)
  const cycleTheme = () => {
    const currentIndex = themeOptions.findIndex(opt => opt.value === currentTheme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    const nextTheme = themeOptions[nextIndex].value;
    handleThemeChange(nextTheme);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (index + 1) % themeOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (index - 1 + themeOptions.length) % themeOptions.length;
    }

    if (newIndex !== index) {
      const newTheme = themeOptions[newIndex].value;
      handleThemeChange(newTheme);

      // Focus the new button
      const container = e.currentTarget.parentElement;
      const buttons = container?.querySelectorAll('button');
      buttons?.[newIndex]?.focus();
    }
  };

  // Get current icon for mobile button
  const currentOption = themeOptions.find(opt => opt.value === currentTheme) || themeOptions[2];
  const CurrentIcon = currentOption.icon;

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <>
        {/* Desktop: Segmented control */}
        <div className="theme-toggle theme-toggle-desktop" role="radiogroup" aria-label="Color theme">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              className="theme-toggle-btn"
              disabled
              aria-label={option.label}
            >
              <option.icon size={16} />
            </button>
          ))}
        </div>
        {/* Mobile: Single button */}
        <button className="theme-toggle-mobile" disabled aria-label="Toggle theme">
          <Monitor size={18} />
        </button>
      </>
    );
  }

  return (
    <>
      {/* Desktop: Segmented control */}
      <div className="theme-toggle theme-toggle-desktop" role="radiogroup" aria-label="Color theme">
        {themeOptions.map((option, index) => {
          const isSelected = currentTheme === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              className={`theme-toggle-btn ${isSelected ? 'active' : ''}`}
              onClick={() => handleThemeChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              role="radio"
              aria-checked={isSelected}
              aria-label={option.label}
              tabIndex={isSelected ? 0 : -1}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      {/* Mobile: Single cycling button */}
      <button
        className="theme-toggle-mobile"
        onClick={cycleTheme}
        aria-label={`Current: ${currentOption.label}. Click to cycle theme.`}
        title={`Theme: ${currentOption.label}`}
      >
        <CurrentIcon size={18} />
      </button>
    </>
  );
}
