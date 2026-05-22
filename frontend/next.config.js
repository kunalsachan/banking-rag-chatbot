/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Next.js 15: opt back into the previous stable fetch caching behaviour
  // (our app is fully client-side rendered, so this has no runtime effect,
  // but it silences the build warning about changed defaults)
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },

  // Allow images from any HTTPS source (useful for avatars, logos)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Expose NEXT_PUBLIC_ env vars to the browser bundle
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
