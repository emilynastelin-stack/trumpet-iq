/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}', // scan all your source files
    './public/**/*.html', // if you have any static HTML files here
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
