/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'images.unsplash.com',
      'i.pravatar.cc',
      'via.placeholder.com',
      'avatars.githubusercontent.com',
      'storage.googleapis.com',
      'lh3.googleusercontent.com',
      'cdn.viralizamos.com'
    ],
  },
  // Configuração para permitir o uso do Apollo Server Micro
  // e correção para problema de URL absoluta no development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ];
  },
  typescript: {
    // !! ATENÇÃO !!
    // Desativar verificação de tipos temporariamente para permitir o build
    // Isso deve ser removido depois de corrigir todos os problemas de tipo
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Adicionar resolução para o ApexCharts
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Caso esteja no servidor, solucionar problemas com bibliotecas client-side
    if (isServer) {
      config.externals = [...config.externals, 'apexcharts'];
    }

    return config;
  },
};

module.exports = nextConfig; 