/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sqlite3", "sqlite"],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  images: {
    remotePatterns: [
      // Google user avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Parqet asset logos
      { protocol: 'https', hostname: 'assets.parqet.com' },
      // brapi (Brazilian stocks)
      { protocol: 'https', hostname: 'brapi.dev' },
      // FMP logos
      { protocol: 'https', hostname: 'financialmodelingprep.com' },
      // S3/CDN-hosted logos
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
  },
};

export default nextConfig;
