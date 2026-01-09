/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: "#0F222D",
        card: "#2C3E47",
        primary: "#EBAA00",
        text: "#EBE7D9",
        accent: "#5FB3A2",
        error: "#D96C6C",
      },
      fontFamily: {
        'display': ['"Manrope"', 'sans-serif'],
        'sans': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
}
