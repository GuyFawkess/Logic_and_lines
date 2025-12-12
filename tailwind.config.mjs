/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'dark-blue': '#050e1b',
        'medium-blue': '#0e356a',
        'bright-blue': '#1057af',
        'cyan': '#3e98da',
        'accent-red': '#9f2239',
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'serif'],
        'sans': ['"Host Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
