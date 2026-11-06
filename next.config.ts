import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NAC_NEXT_DIST_DIR || ".next",
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }, {
      // A signed Storage redirect must never carry the private page's address
      // to the object endpoint. This narrower rule overrides the site default.
      source: "/api/exercise-media/:path*",
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }];
  },
};

export default nextConfig;
