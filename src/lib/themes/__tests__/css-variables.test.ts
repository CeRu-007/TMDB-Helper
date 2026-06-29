import { describe, it, expect } from 'vitest';
import { themeToCSSVariables } from '../css-variables';
import { defaultDarkTheme } from '../presets/dark/default';

describe('themeToCSSVariables', () => {
  it('converts theme colors to CSS variable format', () => {
    const vars = themeToCSSVariables(defaultDarkTheme);
    expect(vars['--background']).toBe('222.2 84% 4.9%');
    expect(vars['--foreground']).toBe('210 40% 98%');
    expect(vars['--primary']).toBe('217.2 91.2% 59.8%');
  });

  it('converts border radius', () => {
    const vars = themeToCSSVariables(defaultDarkTheme);
    expect(vars['--radius']).toBe('0.5rem');
  });

  it('converts typography', () => {
    const vars = themeToCSSVariables(defaultDarkTheme);
    expect(vars['--font-family']).toBe("'Inter', sans-serif");
    expect(vars['--font-size-base']).toBe('16px');
  });
});
