import { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { ApolloProvider } from '../providers/ApolloProvider';
import { ChakraProvider } from '@chakra-ui/react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
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