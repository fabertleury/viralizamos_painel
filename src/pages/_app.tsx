import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { ApolloProvider } from '../providers/ApolloProvider';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// Component to handle router ready state
function RouterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRouterReady, setIsRouterReady] = useState(false);
  
  useEffect(() => {
    if (router.isReady) {
      setIsRouterReady(true);
    }
  }, [router.isReady]);
  
  // Don't render until the router is ready
  if (!isRouterReady) {
    return null;
  }
  
  return <>{children}</>;
}

// Componente para garantir renderização apenas no cliente
function SafeHydrate({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Se ainda não foi montado, não renderize nada
  if (!hasMounted) {
    return null;
  }

  // Quando for montado, renderize os filhos
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SafeHydrate>
      <ChakraProvider>
        <ApolloProvider>
          <AuthProvider>
            <RouterProvider>
              <Component {...pageProps} />
            </RouterProvider>
          </AuthProvider>
        </ApolloProvider>
      </ChakraProvider>
    </SafeHydrate>
  );
}

export default MyApp; 