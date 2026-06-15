/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mirror the TACT tokens so Tailwind utilities stay on-brand.
        steel: '#1F3A5F',
        'steel-light': '#2A4F7A',
        rust: '#D64A2E',
        pos: '#2F8F5B',
        ink: '#1C1B19',
        cream: '#FAF9F5',
        'cream-white': '#FFFEFB',
        warmtext: '#2A2A28',
        'warmtext-light': '#706A60',
        warmborder: '#E7E2D6',
      },
      fontFamily: {
        sans: ['Heebo', 'Assistant', 'Segoe UI', 'sans-serif'],
        en: ['Space Grotesk', 'Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
