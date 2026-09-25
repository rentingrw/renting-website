import type { Config } from 'tailwindcss';
import baseConfig from '@rentingi/ui/tailwind.config';

const baseExtend = (baseConfig.theme as { extend?: Record<string, unknown> })?.extend ?? {};
const baseColors = (baseExtend.colors ?? {}) as Record<string, unknown>;

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...baseExtend,
      colors: {
        ...baseColors,
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        surface: { dark: '#0F1117' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        brand: {
          DEFAULT: '#14221f',
          hover: '#1c302b',
          strong: '#0d1614',
          soft: 'rgba(20, 34, 31, 0.08)',
          bright: '#2d4a43',
        },
        ink: '#14221f',
        sun: '#d4a017',
        hill: '#2f8f5b',
      },
      boxShadow: {
        brutal: '0 10px 30px rgba(20, 34, 31, 0.08)',
        'brutal-sm': '0 6px 18px rgba(20, 34, 31, 0.07)',
        'brutal-xs': '0 2px 8px rgba(20, 34, 31, 0.06)',
        'brutal-sky': '0 10px 30px rgba(20, 34, 31, 0.16)',
        'brutal-sky-sm': '0 4px 14px rgba(20, 34, 31, 0.16)',
        card: '0 10px 30px rgba(20, 34, 31, 0.08)',
        'soft-sm': '0 2px 8px rgba(20, 34, 31, 0.06)',
        soft: '0 6px 18px rgba(20, 34, 31, 0.07)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #14221f, #2d4a43)',
        hills: 'radial-gradient(ellipse at top, rgba(20, 34, 31, 0.08), transparent 55%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};

export default config;
