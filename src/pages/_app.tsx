import type { AppProps } from 'next/app';
import { ChakraProvider } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { ApolloProvider } from '../providers/ApolloProvider';
import '../styles/globals.css';

// Importar o AuthProvider dinamicamente para evitar executá-lo no servidor
const AuthProviderWithNoSSR = dynamic(
  () => import('../contexts/AuthContext').then((mod) => mod.AuthProvider),
  { ssr: false }
);

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
        <AuthProviderWithNoSSR>
          <Component {...pageProps} />
        </AuthProviderWithNoSSR>
      </ChakraProvider>
    </ApolloProvider>
  );
}

export default MyApp; 