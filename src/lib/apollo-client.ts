import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// Criar o link de tratamento de erros
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  if (networkError) console.log(`[Network error]: ${networkError}`);
});

// Criar o link HTTP apontando para o endpoint correto
const httpLink = createHttpLink({
  uri: '/api/graphql', // URL relativa ao servidor GraphQL interno no Next.js
  credentials: 'same-origin' // Importante para cookies/autenticação
});

// Adicionar o token de autenticação a todas as requisições
const authLink = setContext((_, { headers }) => {
  // Get token from cookies instead of localStorage
  let token = null;
  
  if (typeof window !== 'undefined') {
    // Use cookies to match the AuthContext approach
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    token = getCookie('auth_token');
  }
  
  // Return the headers with the token
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Criar e exportar o cliente Apollo
export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Ajustar aqui as políticas para os campos que possam ter problemas
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
}); 