import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-sans)', 'Arial', 'sans-serif'] },
      colors: {
        background: color('background'),
        foreground: color('foreground'),
        border: color('border'),
        input: color('border-input'),
        ring: color('primary'),
        primary: {
          DEFAULT: color('primary'),
          foreground: color('primary-foreground'),
          hover: color('primary-hover'),
          subtle: color('primary-subtle'),
        },
        destructive: {
          DEFAULT: color('destructive'),
          foreground: color('primary-foreground'),
          subtle: color('destructive-subtle'),
        },
        muted: {
          DEFAULT: color('muted'),
          foreground: color('muted-foreground'),
        },
        secondary: { DEFAULT: color('muted'), foreground: color('foreground') },
        accent: { DEFAULT: color('muted'), foreground: color('foreground') },
        popover: {
          DEFAULT: color('background'),
          foreground: color('foreground'),
        },
        card: { DEFAULT: color('background'), foreground: color('foreground') },
        success: color('success'),
        warning: color('warning'),
        violet: color('violet'),
        orange: color('orange'),
      },
      borderRadius: { sm: '4px', md: '8px', lg: '8px', xl: '12px' },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
