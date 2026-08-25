/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'bg-primary':   '#0a0e1a',
        'bg-secondary': '#111827',
        'bg-card':      '#151d2e',
        'border-main':  '#1e2d47',
      }
    }
  },
  plugins: [],
}

