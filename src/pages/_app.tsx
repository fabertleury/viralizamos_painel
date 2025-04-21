import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from '../contexts/AuthContext';
import { ApolloProvider } from '../providers/ApolloProvider';
import '../styles/globals.css';
import { useEffect, useState } from 'react';

// Componente para garantir renderização apenas no cliente
function ClientOnly({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClientOnly>
      <ChakraProvider>
        <ApolloProvider>
          <AuthProvider>
            <Component {...pageProps} />
          </AuthProvider>
        </ApolloProvider>
      </ChakraProvider>
    </ClientOnly>
  );
}

export default MyApp; 