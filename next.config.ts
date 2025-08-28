// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self'${isDev ? " 'unsafe-eval' 'wasm-unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.openai.com https://www.googleapis.com",
              "frame-src https://docs.google.com https://drive.google.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
