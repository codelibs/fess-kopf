import {darkTheme, type GlobalTheme, type GlobalThemeOverrides} from 'naive-ui';

/**
 * One palette, two consumers.
 *
 * kopf renders inside an iframe in the Fess admin dashboard, so its colours are
 * not a free choice: the canvas, the dark chrome and the semantic colours are
 * taken from what AdminLTE 3.2 paints around it (content-wrapper #f4f6f9,
 * sidebar #343a40, Bootstrap 4 semantics). Everything else -- radii, spacing,
 * type -- is ours, and is where the modern look comes from.
 *
 * The same values feed Naive UI's theme overrides and the CSS custom properties
 * the layout layer reads, so the two cannot drift apart.
 */
export interface Palette {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  chrome: string;
  chromeText: string;
  chromeTextMuted: string;
  shadow: string;
}

export const LIGHT: Palette = {
  canvas: '#f4f6f9',
  surface: '#ffffff',
  surfaceMuted: '#f7f9fc',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  text: '#1f2933',
  textMuted: '#5b6675',
  textFaint: '#8a94a6',
  primary: '#007bff',
  primaryHover: '#0069d9',
  primaryPressed: '#0062cc',
  success: '#28a745',
  warning: '#e0a800',
  error: '#dc3545',
  info: '#17a2b8',
  chrome: '#343a40',
  chromeText: '#f1f3f5',
  chromeTextMuted: '#adb5bd',
  shadow: '0 1px 2px rgba(15, 23, 42, .06), 0 1px 3px rgba(15, 23, 42, .04)',
};

export const DARK: Palette = {
  canvas: '#16191d',
  surface: '#1e2227',
  surfaceMuted: '#252a31',
  border: '#333940',
  borderStrong: '#454c55',
  text: '#e6e8eb',
  textMuted: '#a9b1ba',
  textFaint: '#7d868f',
  primary: '#3d95ff',
  primaryHover: '#59a5ff',
  primaryPressed: '#2b83ea',
  success: '#3fc060',
  warning: '#e3b341',
  error: '#f2555a',
  info: '#3bc0d4',
  chrome: '#101317',
  chromeText: '#e6e8eb',
  chromeTextMuted: '#8b939c',
  shadow: '0 1px 2px rgba(0, 0, 0, .4)',
};

/**
 * No webfont is shipped: an unmapped file extension would be served without a
 * Content-Type, and a font request that 404s inside the iframe is worse than a
 * system stack that always resolves.
 */
const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", ' +
  'Arial, "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export function themeOverrides(p: Palette): GlobalThemeOverrides {
  return {
    common: {
      fontFamily: FONT,
      fontFamilyMono: MONO,
      fontSize: '13px',
      fontSizeMedium: '13px',
      borderRadius: '6px',
      borderRadiusSmall: '4px',
      primaryColor: p.primary,
      primaryColorHover: p.primaryHover,
      primaryColorPressed: p.primaryPressed,
      primaryColorSuppl: p.primaryHover,
      successColor: p.success,
      successColorHover: p.success,
      successColorPressed: p.success,
      successColorSuppl: p.success,
      warningColor: p.warning,
      warningColorHover: p.warning,
      warningColorPressed: p.warning,
      warningColorSuppl: p.warning,
      errorColor: p.error,
      errorColorHover: p.error,
      errorColorPressed: p.error,
      errorColorSuppl: p.error,
      infoColor: p.info,
      infoColorHover: p.info,
      infoColorPressed: p.info,
      infoColorSuppl: p.info,
      bodyColor: p.canvas,
      cardColor: p.surface,
      modalColor: p.surface,
      popoverColor: p.surface,
      tableColor: p.surface,
      tableHeaderColor: p.surfaceMuted,
      inputColor: p.surface,
      textColorBase: p.text,
      textColor1: p.text,
      textColor2: p.text,
      textColor3: p.textMuted,
      borderColor: p.border,
      dividerColor: p.border,
      placeholderColor: p.textFaint,
    },
    Card: {
      borderRadius: '8px',
      paddingMedium: '14px 16px',
      titleFontSizeMedium: '13px',
      titleFontWeight: '600',
      colorEmbedded: p.surfaceMuted,
    },
    DataTable: {
      thFontWeight: '600',
      thColor: p.surfaceMuted,
      thTextColor: p.textMuted,
      borderColor: p.border,
      tdColorHover: p.surfaceMuted,
      thPaddingMedium: '8px 12px',
      tdPaddingMedium: '8px 12px',
    },
    Tag: {
      borderRadius: '4px',
    },
    Button: {
      fontWeightStrong: '600',
    },
  };
}

/** Naive UI's built-in dark base; light mode uses the library default. */
export function baseTheme(dark: boolean): GlobalTheme | null {
  return dark ? darkTheme : null;
}

/**
 * Publishes the palette as CSS custom properties so the layout layer in
 * styles.css can use exactly the colours the components use.
 */
export function applyPalette(p: Palette, root: HTMLElement): void {
  const vars: Record<string, string> = {
    '--k-canvas': p.canvas,
    '--k-surface': p.surface,
    '--k-surface-muted': p.surfaceMuted,
    '--k-border': p.border,
    '--k-border-strong': p.borderStrong,
    '--k-text': p.text,
    '--k-text-muted': p.textMuted,
    '--k-text-faint': p.textFaint,
    '--k-primary': p.primary,
    '--k-success': p.success,
    '--k-warning': p.warning,
    '--k-error': p.error,
    '--k-info': p.info,
    '--k-chrome': p.chrome,
    '--k-chrome-text': p.chromeText,
    '--k-chrome-text-muted': p.chromeTextMuted,
    '--k-shadow': p.shadow,
    '--k-font': FONT,
    '--k-mono': MONO,
  };
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
}
