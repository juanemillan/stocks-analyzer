/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          hover:   "#059669",
          subtle:  "rgba(16,185,129,0.12)",
          50:      "#ecfdf5",
          100:     "#d1fae5",
          200:     "#a7f3d0",
          600:     "#059669",
          700:     "#047857",
          900:     "rgba(5,150,105,0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SF Mono", "Menlo"],
      },
    },
  },
  plugins: [],
};
