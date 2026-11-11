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
        cream: '#f6f4ef',
      },
      boxShadow: {
        // Keep legacy brutal-* class names used across admin pages, but map them
        // to the soft marketplace elevation used on the public site.
        brutal: '0 10px 30px rgba(20, 34, 31, 0.08)',
        'brutal-sm': '0 6px 18px rgba(20, 34, 31, 0.07)',
        'brutal-xs': '0 2px 8px rgba(20, 34, 31, 0.06)',
        'brutal-amber': '0 8px 22px rgba(212, 160, 23, 0.18)',
        'brutal-red': '0 8px 22px rgba(185, 28, 28, 0.14)',
        'brutal-teal-xs': '0 2px 8px rgba(20, 34, 31, 0.08)',
        card: '0 10px 30px rgba(20, 34, 31, 0.08)',
        soft: '0 6px 18px rgba(20, 34, 31, 0.07)',
        'soft-sm': '0 2px 8px rgba(20, 34, 31, 0.06)',
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
