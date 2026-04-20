import type { Config } from 'tailwindcss';
import baseConfig from '@rentingi/ui/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...((baseConfig.theme as { extend?: object })?.extend ?? {}),
      colors: {
        primary: '#334155',
        surface: {
          dark: '#0F172A',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};

export default config;
