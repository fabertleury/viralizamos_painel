/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  // Remove static export configuration
  
  // Skip any problematic routes during build
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  poweredByHeader: false,
  images: {
    unoptimized: true,
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
    minimumCacheTTL: 60,
  },
  compiler: {
    // Remover todos os console.log em produção
    removeConsole: process.env.NODE_ENV === 'production',
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
  // Configuração para ignorar erros durante o build em determinadas páginas
  onDemandEntries: {
    // Período de tempo (em ms) em que a página será mantida no buffer
    maxInactiveAge: 120 * 1000,
    // Número de páginas que serão mantidas no buffer
    pagesBufferLength: 5,
  }
};

module.exports = nextConfig; 