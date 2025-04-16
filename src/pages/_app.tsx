import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from '../contexts/AuthContext';
import { ApolloProvider } from '../providers/ApolloProvider';
import '../styles/globals.css';

// Garantir que as páginas sejam carregadas corretamente
function isServerSideRendered() {
  return typeof window === 'undefined';
}

function MyApp({ Component, pageProps }: AppProps) {
  // Verificar se estamos em SSR
  if (isServerSideRendered()) {
    console.log('Renderizando no servidor...');
  }
  
  return (
    <ApolloProvider>
      <ChakraProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ChakraProvider>
    </ApolloProvider>
  );
}

export default MyApp; 