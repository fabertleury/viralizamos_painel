/**
 * Utilitário para corrigir problemas de URL de API em tempo de execução
 * Isso verifica e corrige automaticamente URLs que podem ter /api duplicado
 */

// Função para corrigir URLs que podem ter /api duplicado
export function fixApiUrl(url) {
  // Verificar se a URL já tem padrão /api/api/
  if (url && url.includes('/api/api/')) {
    // Substituir /api/api/ por /api/
    return url.replace('/api/api/', '/api/');
  }
  return url;
}

// Substitui métodos de fetch global para interceptar e corrigir URLs
export function installApiFix() {
  // Guarda a referência original do fetch
  const originalFetch = window.fetch;

  // Sobrescreve o método fetch
  window.fetch = function(url, options) {
    // Corrige a URL
    const fixedUrl = fixApiUrl(url);
    
    // Registra a correção para debug
    if (fixedUrl !== url) {
      console.log('URL API corrigida:', url, '->', fixedUrl);
    }
    
    // Chama o fetch original com a URL corrigida
    return originalFetch.call(this, fixedUrl, options);
  };

  // Verifica e corrige as URLs base das APIs em axios ou outras libs
  if (typeof window !== 'undefined') {
    // Verifica URLs das APIs em variáveis de ambiente
    if (window.NEXT_PUBLIC_PAGAMENTOS_API_URL && window.NEXT_PUBLIC_PAGAMENTOS_API_URL.includes('/api/api')) {
      window.NEXT_PUBLIC_PAGAMENTOS_API_URL = window.NEXT_PUBLIC_PAGAMENTOS_API_URL.replace('/api/api', '/api');
      console.log('URL API Pagamentos corrigida:', window.NEXT_PUBLIC_PAGAMENTOS_API_URL);
    }

    if (window.NEXT_PUBLIC_ORDERS_API_URL && window.NEXT_PUBLIC_ORDERS_API_URL.includes('/api/api')) {
      window.NEXT_PUBLIC_ORDERS_API_URL = window.NEXT_PUBLIC_ORDERS_API_URL.replace('/api/api', '/api');
      console.log('URL API Orders corrigida:', window.NEXT_PUBLIC_ORDERS_API_URL);
    }
  }

  console.log('🔧 Fix de API instalado para prevenir duplicação de /api/');
} 