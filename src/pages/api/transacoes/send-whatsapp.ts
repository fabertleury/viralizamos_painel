import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  keepAlive: true
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: 'ID da transação é obrigatório' });
    }

    // Obter conexão do pool
    const client = await pagamentosPool.connect();

    try {
      // Buscar transação
      const transactionQuery = await client.query(
        `SELECT 
          t.id,
          t.status,
          t.amount,
          t.payment_method,
          t.metadata,
          t.customer_phone,
          t.customer_email,
          t.customer_name,
          pr.pix_code,
          pr.pix_qr_code
        FROM transactions t
        LEFT JOIN payment_requests pr ON t.payment_request_id = pr.id
        WHERE t.id = $1`,
        [transactionId]
      );

      if (transactionQuery.rows.length === 0) {
        return res.status(404).json({ message: 'Transação não encontrada' });
      }

      const transaction = transactionQuery.rows[0];

      // Verificar se a transação está pendente
      if (transaction.status !== 'pending') {
        return res.status(400).json({ message: 'Apenas transações pendentes podem ter o código PIX reenviado' });
      }

      // Verificar se tem código PIX
      if (!transaction.pix_code) {
        return res.status(400).json({ message: 'Transação não possui código PIX' });
      }

      // Verificar se tem telefone do cliente
      const customerPhone = transaction.customer_phone || 
                          transaction.metadata?.phone || 
                          transaction.metadata?.contact?.phone;

      if (!customerPhone) {
        return res.status(400).json({ message: 'Cliente não possui telefone cadastrado' });
      }

      // Formatar dados para o WhatsApp
      const message = `Olá ${transaction.customer_name || 'cliente'}! 

Seu pedido está aguardando pagamento. Aqui está o código PIX para copiar e colar:

${transaction.pix_code}

Valor: R$ ${(transaction.amount / 100).toFixed(2)}

Após o pagamento, seu pedido será processado automaticamente.`;

      return res.status(200).json({ 
        success: true,
        phone: customerPhone.replace(/\D/g, ''),
        message: message,
        pixCode: transaction.pix_code
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[API:SendWhatsapp] Erro:', error);
    return res.status(500).json({ 
      message: 'Erro ao buscar dados da transação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 