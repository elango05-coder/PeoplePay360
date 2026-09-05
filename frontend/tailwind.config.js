/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2fd',
          100: '#fce7fc',
          200: '#f7cff7',
          300: '#f1a9f1',
          400: '#e475e4',
          500: '#cb3dcb',
          600: '#ab18ab',
          700: '#8b008b', // Neon Dark Magenta
          800: '#750275',
          900: '#610761',
          950: '#3d003d',
        },
        accent: {
          50: '#f4fdf4',
          100: '#e5fae5',
          200: '#ccf6cc',
          300: '#a8efa8',
          400: '#90ee90', // Neon Light Green
          500: '#56db56',
          600: '#3ec23e',
          700: '#319831',
          800: '#2b772b',
          900: '#256325',
          950: '#0f380f',
        },
        neon: {
          magenta: '#8b008b',
          green: '#90ee90',
        },
        navy: {
          800: '#1e1b4b',
          900: '#0f172a',
          950: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['DM Sans', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
