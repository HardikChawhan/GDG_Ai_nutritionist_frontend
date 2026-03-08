/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // Deep Slate
        surface: '#18181b',    // Surface Dark
        accent: '#22c55e',     // Organic Green
        border: 'rgba(255, 255, 255, 0.1)',
        muted: '#a1a1aa',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Cal Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
