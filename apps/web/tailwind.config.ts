import type { Config } from "tailwindcss";

// Quiet mineral palette shared by the phone app and desktop site.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cardinal: "#245F58",
        "cardinal-dark": "#183F3B",
        gold: "#BDE6D9",
        paper: "#F5F7F4",
        ticket: "#FFFFFF",
        ink: "#182522",
        muted: "#5B6D65",
        rule: "#D9E3DD",
        sand: "#A7B8AE",
        body: "#344740",
        blush: "#DCEDE6",
        cream: "#D6F0E7",
      },
      fontFamily: {
        display: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
        label: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
