import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { qualities: [75, 85], formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: { "/api/*": ["./database/schema.sql", "./public/images/coleccion/*.webp"] },
  outputFileTracingExcludes: {
    "/*": ["./.data/**/*", "./tests/**/*", "./.env*", "./docs/**/*"],
  },
};

export default nextConfig;
