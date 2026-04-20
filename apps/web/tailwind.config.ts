import type { Config } from 'tailwindcss';
import baseConfig from '@rentingi/ui/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...((baseConfig.theme as { extend?: object })?.extend ?? {}),
      colors: {
        primary: '#00A651',
        surface: {
          dark: '#0F1117',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
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
