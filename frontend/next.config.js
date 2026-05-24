/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',           // Static export for Nginx
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  swcMinify: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  env: {
    NEXT_PUBLIC_API_URL:     process.env.NEXT_PUBLIC_API_URL     || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_APP_NAME:    process.env.NEXT_PUBLIC_APP_NAME    || 'FinStack ERP',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '21.0.0',
  },
};
module.exports = nextConfig;
