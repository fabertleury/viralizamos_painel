import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Cliente Prisma para o banco de dados principal
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Conexões diretas com os bancos de dados para consultas SQL personalizadas
// (usadas quando precisamos de consultas mais complexas que o Prisma não suporta facilmente)
export const ordersPool = new Pool({
  connectionString: process.env.ORDERS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Função para calcular o crescimento percentual
export function calcularCrescimento(atual: number, anterior: number): number {
  if (anterior === 0) return 100;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// Função para formatar data para o formato ISO
export function formatarData(data: Date): string {
  return data.toISOString();
}

// Função para converter snake_case para camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

// Transformador de resultados de consultas SQL
export function transformResult<T>(result: any): T {
  if (Array.isArray(result)) {
    return result.map((item) => {
      const newItem: any = {};
      for (const key in item) {
        newItem[snakeToCamel(key)] = item[key];
      }
      return newItem;
    }) as unknown as T;
  }
  
  const newItem: any = {};
  for (const key in result) {
    newItem[snakeToCamel(key)] = result[key];
  }
  return newItem as T;
} 