import type { Config } from 'tailwindcss';
import baseConfig from '@rentingi/ui/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...((baseConfig.theme as { extend?: object })?.extend ?? {}),
      colors: {
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        surface: { dark: '#0F172A' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        ink: '#111111',
        cream: '#F5F4EF',
      },
      boxShadow: {
        brutal: '4px 4px 0 #111111',
        'brutal-sm': '2px 2px 0 #111111',
        'brutal-xs': '1px 1px 0 #111111',
        'brutal-amber': '4px 4px 0 #78350f',
        'brutal-red': '4px 4px 0 #991b1b',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};

export default config;
