/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // CloudST brand — extracted from the gold logo
        brand: {
          50: '#fdf9ef',
          100: '#faf0d9',
          200: '#f4dfae',
          300: '#edcb7d',
          400: '#e3b657',
          500: '#d4a442',
          600: '#c08b33',
          700: '#a06e2b',
          800: '#825828',
          900: '#6b4824',
        },
        ink: {
          50: '#f6f7f8',
          100: '#ebedef',
          200: '#d5d9dd',
          300: '#b0b8bf',
          400: '#84929d',
          500: '#677784',
          600: '#525f6b',
          700: '#444e57',
          800: '#3b434a',
          900: '#1a1e23',
          950: '#0d1014',
        },
      },
    },
  },
  plugins: [],
};
