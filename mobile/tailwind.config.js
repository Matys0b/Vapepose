/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          900: "#0b0516",
          800: "#120a24",
          700: "#1a0f30",
          600: "#241642"
        },
        violet: {
          glow: "#a855f7"
        },
        fuchsia: {
          glow: "#d946ef"
        }
      },
      fontFamily: {
        sans: ["System"],
        display: ["System"],
        mono: ["Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
