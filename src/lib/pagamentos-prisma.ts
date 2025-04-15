import { PrismaClient } from '@prisma/client';

// Define modelos específicos que existem no banco de pagamentos
const models = {
  transaction: {
    count: async (args?: any) => {
      return await prismaQuery('transaction', 'count', args);
    },
    findMany: async (args?: any) => {
      return await prismaQuery('transaction', 'findMany', args);
    },
    findUnique: async (args?: any) => {
      return await prismaQuery('transaction', 'findUnique', args);
    }
  },
  payment_request: {
    findMany: async (args?: any) => {
      return await prismaQuery('payment_request', 'findMany', args);
    },
    findUnique: async (args?: any) => {
      return await prismaQuery('payment_request', 'findUnique', args);
    }
  }
};

// Cliente Prisma para o banco de dados de pagamentos
export const pagamentosPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.PAGAMENTOS_DATABASE_URL,
    },
  },
});

// Função auxiliar para executar queries no Prisma
async function prismaQuery(model: string, operation: string, args?: any) {
  // Substitui o nome do modelo para o formato que o Prisma espera
  const modelName = model.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  
  console.log(`[PagamentosPrisma] Executando ${operation} em ${model} com args:`, args);
  
  try {
    // @ts-ignore - Executa a operação no modelo
    const result = await pagamentosPrisma[modelName][operation](args);
    console.log(`[PagamentosPrisma] Resultado: ${operation} em ${model} retornou ${Array.isArray(result) ? result.length + ' itens' : 'objeto'}`);
    return result;
  } catch (error) {
    console.error(`[PagamentosPrisma] Erro ao executar ${operation} em ${model}:`, error);
    throw error;
  }
}

// Exporta os modelos para uso
export { models as transaction };

// Interfaces para tipos de dados do banco de pagamentos
export interface ITransacao {
  id: string;
  external_id: string | null;
  payment_request_id: string | null;
  amount: number;
  status: string;
  provider: string;
  method: string;
  metadata: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  payment_request?: IPaymentRequest | null;
}

export interface IPaymentRequest {
  id: string;
  token: string;
  status: string;
  amount: number;
  service_name: string;
  profile_username: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  description: string | null;
  payment_link: string | null;
  created_at: Date;
  updated_at: Date;
} 