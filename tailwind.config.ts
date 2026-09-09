import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefaf4",
          100: "#d6f2e3",
          200: "#b0e5cc",
          300: "#7dd1ae",
          400: "#49b78c",
          500: "#2f9e6f",  // Hauptfarbe
          600: "#217f59",
          700: "#1c6549",
          800: "#19513c",
          900: "#164333",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
