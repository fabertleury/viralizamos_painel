import { prisma } from '../../lib/prisma';

// Define types for filter and pagination
interface PaginacaoInput {
  pagina: number;
  limite: number;
}

interface FiltroUsuarioInput {
  ativo?: boolean;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
}

export const usuariosResolvers = {
  Query: {
    usuarios: async (_: any, { filtro, paginacao }: { filtro?: FiltroUsuarioInput, paginacao: PaginacaoInput }) => {
      try {
        const { pagina, limite } = paginacao;
        const skip = (pagina - 1) * limite;
        
        // Construir a query com filtros
        const where: any = {};
        
        if (filtro) {
          if (filtro.ativo !== undefined) {
            where.active = filtro.ativo;
          }
          
          if (filtro.dataInicio) {
            where.createdAt = {
              ...(where.createdAt || {}),
              gte: new Date(filtro.dataInicio)
            };
          }
          
          if (filtro.dataFim) {
            where.createdAt = {
              ...(where.createdAt || {}),
              lte: new Date(filtro.dataFim)
            };
          }
          
          if (filtro.termoBusca) {
            where.OR = [
              { name: { contains: filtro.termoBusca, mode: 'insensitive' } },
              { email: { contains: filtro.termoBusca, mode: 'insensitive' } }
            ];
          }
        }
        
        // Executar contagem e busca em paralelo
        const [usuarios, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              active: true,
              lastLogin: true,
              createdAt: true,
              role: true
            },
            skip,
            take: limite,
            orderBy: {
              createdAt: 'desc'
            }
          }),
          prisma.user.count({ where })
        ]);
        
        // Converter para o formato esperado pelo GraphQL
        const usuariosFormatados = usuarios.map(u => ({
          id: u.id,
          nome: u.name,
          email: u.email,
          ativo: u.active,
          dataUltimoLogin: u.lastLogin?.toISOString() || null,
          dataCriacao: u.createdAt.toISOString()
        }));
        
        return {
          usuarios: usuariosFormatados,
          total
        };
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        throw new Error('Erro ao buscar usuários');
      }
    },
    
    usuario: async (_: any, { id }: { id: string }) => {
      try {
        const usuario = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            lastLogin: true,
            createdAt: true,
            role: true
          }
        });
        
        if (!usuario) {
          return null;
        }
        
        return {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          ativo: usuario.active,
          dataUltimoLogin: usuario.lastLogin?.toISOString() || null,
          dataCriacao: usuario.createdAt.toISOString()
        };
      } catch (error) {
        console.error(`Erro ao buscar usuário ${id}:`, error);
        throw new Error(`Erro ao buscar usuário ${id}`);
      }
    }
  },
  
  Mutation: {
    // Mutations para usuários podem ser adicionadas aqui, se necessárias
  }
}; 