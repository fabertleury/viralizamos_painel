import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { ReactNode } from 'react';
import { apolloClient } from '../lib/apollo-client';

interface ApolloProviderProps {
  children: ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <BaseApolloProvider client={apolloClient}>
      {children}
    </BaseApolloProvider>
  );
} 