import type { Config } from "tailwindcss";

// Tokens from reference/prototype.html (CLAUDE.md "Design").
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cardinal: "#990000",
        "cardinal-dark": "#5C0000",
        gold: "#FFCC00",
        paper: "#F3EDE1",
        ticket: "#FFFCF5",
        ink: "#1A1210",
        muted: "#5E524C",
        rule: "#D8CDB8",
        sand: "#B9AA8E",
        body: "#3B302B",
        blush: "#F6E3D6",
        cream: "#FFE9A8",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        label: ["var(--font-oswald)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
