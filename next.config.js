/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' } // news thumbnails come from many different publisher domains
    ]
  }
};

module.exports = nextConfig;
