import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-sans)', 'Arial', 'sans-serif'] },
      colors: {
        gray: {
          50: 'rgb(var(--gray-50, 247 247 245) / <alpha-value>)',
          100: 'rgb(var(--gray-100, 241 241 238) / <alpha-value>)',
          200: 'rgb(var(--gray-200, 231 231 227) / <alpha-value>)',
          300: 'rgb(var(--gray-300, 214 214 208) / <alpha-value>)',
          400: 'rgb(var(--gray-400, 163 163 156) / <alpha-value>)',
          500: 'rgb(var(--gray-500, 102 102 95) / <alpha-value>)',
          600: 'rgb(var(--gray-600, 85 85 79) / <alpha-value>)',
          700: 'rgb(var(--gray-700, 65 65 62) / <alpha-value>)',
          800: 'rgb(var(--gray-800, 51 51 48) / <alpha-value>)',
          900: 'rgb(var(--gray-900, 41 41 41) / <alpha-value>)',
        },
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
          text: color('destructive-text'),
          foreground: color('destructive-foreground'),
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
        card: {
          DEFAULT: color('background'),
          foreground: color('foreground'),
          border: color('border-card'),
        },
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
