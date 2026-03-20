/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest-green': '#8FBC8F',
        'sky-blue': '#87CEEB',
        'warm-beige': '#F5DEB3',
        'soft-pink': '#FFB6C1',
      },
    },
  },
  plugins: [],
}
