import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nac: {
          navy: "#05070A",
          deep: "#10151C",
          electric: "#008BCB",
          cyan: "#00B8F0",
          yellow: "#FFB900",
          card: "#151C25",
          silver: "#BFC7D0",
          muted: "#9CAAB9",
          success: "#22C55E",
          danger: "#EF4444",
        },
      },
      boxShadow: {
        glow: "0 12px 30px rgba(0, 139, 203, 0.22)",
        card: "0 20px 50px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
