export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface ThemeColors {
  grey: ColorScale;
  blue: ColorScale;
  indigo: ColorScale;
  purple: ColorScale;
  orange: ColorScale;
  green: ColorScale;
  red: ColorScale;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  designSystemUrl?: string;
}

export const defaultTheme: Theme = {
  id: 'intentr-default',
  name: 'IntentR Default',
  description: 'Grey foundations with blue interactions and vibrant orange accents',
  designSystemUrl: '/design-systems/intentr-default-reverse-engineered.html',
  colors: {
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
};

// Second theme - Figma Design System (from vest-hazel-54208462.figma.site)
// This is the reverse-engineered design system from the Figma site
export const figmaTheme: Theme = {
  id: 'figma-design-system',
  name: 'Figma Design System',
  description: 'Official design system from Figma - Grey foundations, blue interactions, vibrant orange accents',
  designSystemUrl: '/design-systems/intentr-default-reverse-engineered.html',
  colors: {
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
};

// Third theme - Ford Design System (Material-based)
// Based on official Ford Motor Company colors
export const fordTheme: Theme = {
  id: 'ford-design-system',
  name: 'Ford Design System',
  description: 'Official Ford Motor Company colors - Built Ford Tough meets Material Design',
  designSystemUrl: '/design-systems/ford-design-system.html',
  colors: {
    grey: {
      50: '#F5FAFD',
      100: '#E8F4FB',
      200: '#C6C6C6',
      300: '#A8A8A8',
      400: '#8A8A8A',
      500: '#6C6C6C',
      600: '#3E5966',
      700: '#2D4149',
      800: '#1C2A2F',
      900: '#0B1518',
    },
    blue: {
      50: '#E8F4FB',
      100: '#D1E9F7',
      200: '#A3D3EF',
      300: '#75BDE7',
      400: '#47A8E5',
      500: '#2A6BAC',
      600: '#1F5080',
      700: '#133A7C',
      800: '#0D2654',
      900: '#081534',
    },
    indigo: {
      50: '#E8F0FB',
      100: '#D1E1F7',
      200: '#A3C3EF',
      300: '#75A5E7',
      400: '#4787DF',
      500: '#2A6BAC',
      600: '#1F5080',
      700: '#133A7C',
      800: '#0D2654',
      900: '#081534',
    },
    purple: {
      50: '#F0EDF7',
      100: '#E1DBEF',
      200: '#C3B7DF',
      300: '#A593CF',
      400: '#876FBF',
      500: '#6951A0',
      600: '#503D7A',
      700: '#382953',
      800: '#20152D',
      900: '#100A16',
    },
    orange: {
      50: '#FFF3E0',
      100: '#FFE7C1',
      200: '#FFCF83',
      300: '#FFB745',
      400: '#FF9F07',
      500: '#E68A00',
      600: '#B36B00',
      700: '#804D00',
      800: '#4D2E00',
      900: '#1A0F00',
    },
    green: {
      50: '#E8F5E9',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50',
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20',
    },
    red: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#F44336',
      600: '#E53935',
      700: '#D32F2F',
      800: '#C62828',
      900: '#B71C1C',
    },
  },
};

// Fourth theme - Apple Design System (iOS HIG)
// Based on official Apple Human Interface Guidelines
export const appleTheme: Theme = {
  id: 'apple-design-system',
  name: 'Apple Design System',
  description: 'Official Apple Human Interface Guidelines - SF Pro typography and iOS system colors',
  designSystemUrl: 'https://developer.apple.com/design/human-interface-guidelines',
  colors: {
    grey: {
      50: '#f2f2f7',   // systemGray6
      100: '#e5e5ea',  // systemGray5
      200: '#d1d1d6',  // systemGray4
      300: '#c7c7cc',  // systemGray3
      400: '#aeaeb2',  // systemGray2
      500: '#8e8e93',  // systemGray
      600: '#636366',
      700: '#48484a',
      800: '#3a3a3c',
      900: '#000000',  // label
    },
    blue: {
      50: '#e5f2ff',
      100: '#cce5ff',
      200: '#99ccff',
      300: '#66b2ff',
      400: '#3399ff',
      500: '#007AFF',  // systemBlue
      600: '#0062cc',
      700: '#004999',
      800: '#003166',
      900: '#001833',
    },
    indigo: {
      50: '#f0f0ff',
      100: '#e0e0ff',
      200: '#c2c1ff',
      300: '#a3a2ff',
      400: '#8583ff',
      500: '#5856D6',  // systemIndigo
      600: '#4645ab',
      700: '#353480',
      800: '#232255',
      900: '#12112b',
    },
    purple: {
      50: '#f9f0ff',
      100: '#f2e0ff',
      200: '#e5c2ff',
      300: '#d8a3ff',
      400: '#cb85ff',
      500: '#AF52DE',  // systemPurple
      600: '#8c42b2',
      700: '#693185',
      800: '#462159',
      900: '#23102c',
    },
    orange: {
      50: '#fff7e5',
      100: '#ffefcc',
      200: '#ffdf99',
      300: '#ffcf66',
      400: '#ffbf33',
      500: '#FF9500',  // systemOrange
      600: '#cc7700',
      700: '#995900',
      800: '#663c00',
      900: '#331e00',
    },
    green: {
      50: '#e5f9ec',
      100: '#ccf3d9',
      200: '#99e7b3',
      300: '#66db8d',
      400: '#33cf67',
      500: '#4CD964',  // systemGreen
      600: '#3dae50',
      700: '#2e823c',
      800: '#1e5728',
      900: '#0f2b14',
    },
    red: {
      50: '#ffe5e3',
      100: '#ffccc8',
      200: '#ff9991',
      300: '#ff665a',
      400: '#ff3323',
      500: '#FF3B30',  // systemRed
      600: '#cc2f26',
      700: '#99231d',
      800: '#661813',
      900: '#330c0a',
    },
  },
};

// Fifth theme - Ube Design System
// Named after the Filipino purple yam - vibrant purple as primary interaction color
export const ubeTheme: Theme = {
  id: 'ube-design-system',
  name: 'Ube',
  description: 'Vibrant purple design system - Purple foundations with purple interactions inspired by the Ube yam',
  designSystemUrl: '/design-systems/ube-design-system.html',
  colors: {
    grey: {
      50: '#faf8fc',   // Subtle purple tint
      100: '#f3f0f7',
      200: '#e9e4f0',
      300: '#d8d0e5',
      400: '#a89cc4',
      500: '#7a6b9e',
      600: '#5c4f7a',
      700: '#453a5c',
      800: '#2d2640',
      900: '#1a1528',
    },
    blue: {
      // Using purple as the primary interaction color (replacing blue's role)
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',  // Primary - matches logo outer ring
      600: '#7c3aed',  // Primary hover
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    purple: {
      // Deep Ube purple palette
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
    orange: {
      // Complementary accent - golden/amber tones
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    green: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
};

// Ube is the default theme
export const availableThemes: Theme[] = [ubeTheme, defaultTheme, figmaTheme, fordTheme, appleTheme];
