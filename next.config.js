/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force dynamic rendering for all pages
  experimental: {
    dynamicIO: true,
  },
  // Ensure no static optimization
  trailingSlash: false,
  output: 'standalone',
}

module.exports = nextConfig