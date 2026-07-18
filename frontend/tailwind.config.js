/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        bone: "#FFFFFF",
        flame: "#FF4D00",
        ash: "#666666",
        surface: "#0A0A0A",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
