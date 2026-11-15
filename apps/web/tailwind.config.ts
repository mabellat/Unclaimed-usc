// No imports: the website (apps/site) loads this file too, and on its own deploy only its packages
// are installed. apps/site/tailwind.config.ts checks the type.
// Minimal theme (owner decision 2026-11-14): black and white, USC cardinal and gold as the only accents.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cardinal: "#9D2235",
        "cardinal-dark": "#111111",
        gold: "#FFC72C",
        paper: "#F4F4F1",
        ticket: "#FFFFFF",
        ink: "#111111",
        muted: "#6B6B6B",
        rule: "#E4E4DE",
        sand: "#CFCFC8",
        body: "#2A2A2A",
        blush: "#D4D4CF",
        cream: "#FFE7A3",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        label: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
