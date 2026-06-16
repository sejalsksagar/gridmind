/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        severity: {
          low:    '#22C55E',
          medium: '#F59E0B',
          high:   '#EF4444',
          severe: '#7F1D1D',
        },
      },
    },
  },
  plugins: [],
}
