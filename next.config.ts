import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const withSerwistConfig = withSerwist({
  swSrc: "src/sw/index.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "*.supabase.co" }],
  },
  // The branded QR-card renderer (src/lib/utils/qr-card.tsx) reads the bundled
  // font and logo from disk at request time; make sure they ship with the
  // serverless functions that call it.
  outputFileTracingIncludes: {
    "/api/**": ["./src/assets/fonts/**", "./public/logo.png"],
  },
  redirects: async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: `${appUrl}/:path*`,
        permanent: true,
      },
    ];
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://*.basemaps.cartocdn.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.basemaps.cartocdn.com",
            "worker-src 'self' blob:",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    },
  ],
};

export default withSerwistConfig(nextConfig);
