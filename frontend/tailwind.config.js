/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        aurora: {
          lavender: "#eae7f9",
          mint: "#dcfaf5",
          peach: "#ffe8e0"
        }
      },
      backgroundImage: {
        "vibe-gradient": "linear-gradient(45deg, #f58529, #dd2a7b, #8134af, #515bd4)",
      },
      animation: {
        "float": "floatGlow 8s ease-in-out infinite alternate",
      },
      keyframes: {
        floatGlow: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(30px, -50px) scale(1.1)" },
          "100%": { transform: "translate(-20px, 20px) scale(0.95)" }
        }
      }
    },
  },
  plugins: [],
}
