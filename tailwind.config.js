/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f0f0f',
          secondary: '#1a1a1a',
          tertiary: '#252525',
          card: '#1e1e1e',
          hover: '#2a2a2a',
        },
        accent: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
        },
        border: {
          DEFAULT: '#333',
          light: '#444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
