import type { Config } from "tailwindcss";

/**
 * Palet diambil dari logo SMP Negeri 30 Semarang:
 * - brand : biru logo (600 = warna utama, 950 = biru tinta untuk latar gelap)
 * - gold  : kuning bingkai logo (aksen: tombol utama di latar gelap, lencana nilai)
 * - ember : merah sayap logo (dipakai sangat hemat)
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef3fe",
          100: "#dce6fd",
          200: "#bccdfa",
          300: "#8faaf5",
          400: "#5f82ec",
          500: "#3a62e0",
          600: "#2449c9",
          700: "#1d3aa3",
          800: "#1b3283",
          900: "#172a66",
          950: "#0e1b45",
        },
        gold: {
          50: "#fef9e7",
          100: "#fdf0c2",
          200: "#fbe48f",
          300: "#f8d766",
          400: "#f5c82e",
          500: "#e9b308",
          600: "#c99306",
          700: "#a0700a",
        },
        ember: {
          500: "#d9312b",
          600: "#b8241f",
        },
        paper: "#f5f7fc",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
