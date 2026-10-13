/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f1efff',
          100: '#e6e2ff',
          200: '#d0c9ff',
          300: '#b3a6ff',
          400: '#9380fc',
          500: '#7c5cf7',
          600: '#6d3ff0',
          700: '#5f2ddc',
          800: '#4f25b8',
          900: '#422296',
          950: '#291465',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        pop: '0 8px 30px -6px rgb(15 23 42 / 0.18)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease-out both',
      },
    },
  },
  plugins: [],
};
