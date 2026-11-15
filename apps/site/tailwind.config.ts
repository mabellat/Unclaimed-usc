import type { Config } from "tailwindcss";
import web from "../web/tailwind.config";

// Same tokens as the phone app (CLAUDE.md "Design"); also scans the shared components.
export default {
  ...web,
  content: ["./src/**/*.{ts,tsx}", "../web/src/**/*.{ts,tsx}"],
} satisfies Config;
