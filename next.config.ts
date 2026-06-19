import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  transpilePackages: ['firebase-admin', 'jose', 'jwks-rsa'],
  experimental: {
    esmExternals: 'loose',
  }
};

export default nextConfig;
