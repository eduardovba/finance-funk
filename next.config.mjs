/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sqlite3", "sqlite"],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
};

export default nextConfig;
