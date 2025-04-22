import { dadosDashboard } from './dashboardResolvers';
import { pedidosResolvers } from './pedidosResolvers';
import { transacoesResolvers } from './transacoesResolvers';
import { usuariosResolvers } from './usuariosResolvers';

// Combinar todos os resolvers
export const resolvers = {
  Query: {
    dadosDashboard,
    ...pedidosResolvers.Query,
    ...transacoesResolvers.Query,
    ...usuariosResolvers.Query,
  },
  Mutation: {
    ...pedidosResolvers.Mutation,
    ...transacoesResolvers.Mutation,
    ...usuariosResolvers.Mutation,
  }
}; 