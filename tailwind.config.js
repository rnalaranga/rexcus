/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rex: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      borderRadius: {
        DEFAULT: '0px', sm: '0px', md: '0px', lg: '0px',
        xl: '0px', '2xl': '0px', '3xl': '0px', full: '9999px',
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(185,28,28,0.4)',
        'glow-red-sm': '0 0 8px rgba(185,28,28,0.25)',
        'card':        '0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        'card-dark':   '0 2px 12px rgba(0,0,0,0.4)',
        'topbar':      '0 1px 0 rgb(220 222 230)',
        'topbar-dark': '0 1px 0 rgb(40 40 50)',
      },
      animation: {
        'fade-in':       'fadeIn 0.25s ease both',
        'slide-in-left': 'slideInLeft 0.2s ease both',
        'pulse-red':     'pulseRed 2s ease infinite',
      },
    },
  },
  plugins: [],
}
