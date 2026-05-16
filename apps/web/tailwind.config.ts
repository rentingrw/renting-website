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
        surface: { dark: '#0F1117' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
      },
      boxShadow: {
        brutal: '4px 4px 0 #111111',
        'brutal-sm': '2px 2px 0 #111111',
        'brutal-xs': '1px 1px 0 #111111',
        'brutal-teal': '4px 4px 0 #0f766e',
        'brutal-teal-sm': '2px 2px 0 #0f766e',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(to right, #00A651, #007A3D)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
};

export default config;
