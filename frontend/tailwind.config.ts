import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3fa',
          100: '#d9e0f3',
          200: '#b4c3e8',
          300: '#839fd9',
          400: '#5678c7',
          500: '#385bb2',
          600: '#2a4593',
          700: '#223675',
          800: '#1e2b5c',
          850: '#161b40', // Card background
          900: '#111540',
          925: '#0d1137', // Deep navy
          950: '#0a0e27', // Darkest background
        },
        card: {
          DEFAULT: '#161b40',
          hover: '#1b214d',
          border: '#1e2456',
        },
        cyan: {
          DEFAULT: '#00d4ff',
          400: '#00d4ff',
          500: '#00c2eb',
          600: '#009ec0',
        },
        violet: {
          DEFAULT: '#7c3aed',
          500: '#7c3aed',
          600: '#6d28d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        slideUp: 'slideUp 0.4s ease-out forwards',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -5px rgba(0, 212, 255, 0.3)',
        'cyan-glow-lg': '0 0 35px -5px rgba(0, 212, 255, 0.4)',
        'violet-glow': '0 0 25px -5px rgba(124, 58, 237, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
