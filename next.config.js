/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'art.hearthstonejson.com' },
      { protocol: 'https', hostname: '**.battle.net' },
      { protocol: 'https', hostname: '**.blizzard.com' },
    ],
  },
};

module.exports = nextConfig;
