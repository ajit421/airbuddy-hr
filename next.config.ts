import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // M4 — Allow next/image to optimize Cloudinary-hosted images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // M10 — Restrict API routes to same-origin requests in production
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            // Use the app's own origin — never '*' for credentialed requests
            value: process.env.NEXT_PUBLIC_APP_URL ?? 'https://airbuddy-hr.vercel.app',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
};

export default nextConfig;
