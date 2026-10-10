import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  distDir: process.env.VARIANTHUB_NEXT_DIST_DIR ?? '.next',
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    resolveAlias: {
      "varianthub-core/styles.css": "./packages/core/src/styles/varianthub.css",
      "varianthub-core": "./packages/core/src/index.ts",
    },
  },
  async headers() {
    return [
      {
        source: "/variant-render/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
