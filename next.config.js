/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_COSMIC_BUCKET_SLUG: process.env.COSMIC_BUCKET_SLUG,
  },
  images: {
    domains: [
      'cdn.cosmicjs.com',
      'imgix.cosmicjs.com',
      'images.unsplash.com'
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
}

module.exports = nextConfig