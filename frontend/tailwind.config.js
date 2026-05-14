/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          light: '#25D366',
          dark: '#128C7E',
          bg: '#E5DDD5',
          chat: '#DCF8C6'
        }
      }
    },
  },
  plugins: [],
}
