import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': { // New primary accent color (cyan)
          light: '#67e8f9',
          DEFAULT: '#22d3ee', // More vibrant cyan
          dark: '#06b6d4',
        },
        'brand-accent': { // Secondary accent (subdued purple)
          light: '#c084fc',
          DEFAULT: '#a78bfa', // Cooler, less intense purple
          dark: '#8b5cf6',
        },
      },
      textShadow: {
        glow: '0 0 10px rgba(34, 211, 238, 0.7), 0 0 20px rgba(6, 182, 212, 0.5)', // Cyan-centric glow
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities, theme }) {
      const newUtilities = {
        '.text-shadow-glow': {
          textShadow: theme('textShadow.glow'),
        },
      }
      addUtilities(newUtilities)
    })
  ],
}
