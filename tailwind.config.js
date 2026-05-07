/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1f2a24",
          muted: "#5f6f65",
          subtle: "#8a978f",
        },
        surface: {
          DEFAULT: "#f8f7f2",
          raised: "#fffefa",
          sunken: "#f1f0ea",
        },
        line: "#d7ddd5",
        accent: {
          DEFAULT: "#166f4f",
          hover: "#10583f",
        },
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
