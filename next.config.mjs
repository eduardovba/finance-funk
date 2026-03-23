/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sqlite3", "sqlite"],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
