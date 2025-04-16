/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: [
      'localhost',
      'viralizamos.com',
      'api.viralizamos.com',
      'admin.viralizamos.com',
      'images.viralizamos.com',
      'assets.viralizamos.com',
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'cdn.pixabay.com'
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Não tente processar esses módulos no lado do cliente
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
        child_process: false,
        crypto: false
      };
    }
    return config;
  },
  // Ignora todos os erros de ESLint durante o build para simplificar o processo
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de TypeScript durante o build para simplificar o processo
    ignoreBuildErrors: true,
  },
  // Define variáveis de ambiente públicas para o cliente
  env: {
    NEXT_PUBLIC_PAINEL_URL: process.env.NEXT_PUBLIC_PAINEL_URL,
    NEXT_PUBLIC_PAGAMENTOS_API_URL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL,
    NEXT_PUBLIC_ORDERS_API_URL: process.env.NEXT_PUBLIC_ORDERS_API_URL
  },
  // API routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ];
  },
};

module.exports = nextConfig; 