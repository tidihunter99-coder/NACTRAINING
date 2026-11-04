import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nac: {
          navy: "#07172B",
          deep: "#0C2038",
          electric: "#087CFF",
          cyan: "#00B8FF",
          card: "#10243D",
          silver: "#CBD5E1",
          muted: "#94A3B8",
          success: "#22C55E",
          danger: "#EF4444",
        },
      },
      boxShadow: {
        glow: "0 12px 36px rgba(8, 124, 255, 0.24)",
        card: "0 20px 50px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
