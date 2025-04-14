/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['placehold.co'], // Permitir imagens do serviço placehold.co
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
};

module.exports = nextConfig; 