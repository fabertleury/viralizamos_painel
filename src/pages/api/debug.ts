import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // Verificar variáveis de ambiente (mascarando valores sensíveis)
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    ORDERS_DATABASE_URL: process.env.ORDERS_DATABASE_URL ? 
      `${process.env.ORDERS_DATABASE_URL.substring(0, 25)}...` : 'não definido',
    PAGAMENTOS_DATABASE_URL: process.env.PAGAMENTOS_DATABASE_URL ? 
      `${process.env.PAGAMENTOS_DATABASE_URL.substring(0, 25)}...` : 'não definido',
    PAGAMENTOS_API_URL: process.env.PAGAMENTOS_API_URL ? 
      `${process.env.PAGAMENTOS_API_URL}` : 'não definido',
    ORDERS_API_URL: process.env.ORDERS_API_URL ? 
      `${process.env.ORDERS_API_URL}` : 'não definido',
    NEXT_PUBLIC_PAGAMENTOS_API_URL: process.env.NEXT_PUBLIC_PAGAMENTOS_API_URL,
    NEXT_PUBLIC_ORDERS_API_URL: process.env.NEXT_PUBLIC_ORDERS_API_URL,
    NEXT_PUBLIC_PAINEL_URL: process.env.NEXT_PUBLIC_PAINEL_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 
      `${process.env.DATABASE_URL.substring(0, 25)}...` : 'não definido',
  };

  // Coletar informações do servidor
  const serverInfo = {
    node_version: process.version,
    uptime: process.uptime(),
    platform: process.platform,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  // Verificar timezone do servidor
  const timezone = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    current_date: new Date().toString(),
    utc_date: new Date().toUTCString(),
  };

  // Enviar a resposta
  res.status(200).json({
    status: 'ok',
    env: envVars,
    server: serverInfo,
    timezone,
  });
} 