const { Pool } = require('pg');

// Conexão com o banco de dados de pedidos (orders)
const ordersPool = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false }
});

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false }
});

async function testUserTransactionLink() {
  console.log('Testando vinculação entre usuários e transações usando metadata...');
  
  try {
    // Buscar um usuário de exemplo com pedidos que tenham metadata
    const userQuery = `
      SELECT u.id, u.email, u.name
      FROM "User" u
      JOIN "Order" o ON u.id = o.user_id
      WHERE o.metadata IS NOT NULL
      GROUP BY u.id, u.email, u.name
      LIMIT 1
    `;
    
    const userResult = await ordersPool.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado com pedidos que tenham metadata');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`\nUsuário de teste: ${user.name || user.email} (ID: ${user.id})`);
    
    // Buscar pedidos do usuário com metadata
    const ordersQuery = `
      SELECT id, status, amount, created_at, metadata
      FROM "Order"
      WHERE user_id = $1 AND metadata IS NOT NULL
      ORDER BY created_at DESC
    `;
    
    const ordersResult = await ordersPool.query(ordersQuery, [user.id]);
    console.log(`\nPedidos encontrados com metadata: ${ordersResult.rows.length}`);
    
    // Extrair external_payment_ids e external_transaction_ids dos pedidos
    const externalPaymentIds = [];
    const externalTransactionIds = [];
    const userEmails = new Set();
    
    ordersResult.rows.forEach(order => {
      try {
        if (order.metadata) {
          const metadata = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          
          if (metadata.external_payment_id) {
            externalPaymentIds.push(metadata.external_payment_id);
            console.log(`✅ external_payment_id encontrado: ${metadata.external_payment_id}`);
          }
          
          if (metadata.external_transaction_id) {
            externalTransactionIds.push(metadata.external_transaction_id);
            console.log(`✅ external_transaction_id encontrado: ${metadata.external_transaction_id}`);
          }
          
          if (metadata.user_info && metadata.user_info.email) {
            userEmails.add(metadata.user_info.email);
            console.log(`✅ email do usuário encontrado no metadata: ${metadata.user_info.email}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao processar metadata do pedido ${order.id}:`, error.message);
      }
    });
    
    console.log(`\nIDs externos encontrados: ${externalPaymentIds.length} payment_ids, ${externalTransactionIds.length} transaction_ids`);
    console.log(`Emails do usuário encontrados: ${Array.from(userEmails).join(', ')}`);
    
    // Buscar transações usando os external_payment_ids
    if (externalPaymentIds.length > 0) {
      // Construir condições para a consulta SQL
      const conditions = externalPaymentIds.map((_, index) => `t.external_id = $${index + 1}`);
      const transactionsQuery = `
        SELECT t.id, t.status, t.amount, t.method, t.created_at, t.external_id, t.payment_request_id
        FROM "transactions" t
        WHERE ${conditions.join(' OR ')}
        ORDER BY t.created_at DESC
      `;
      
      const transactionsResult = await pagamentosPool.query(transactionsQuery, externalPaymentIds);
      
      if (transactionsResult.rows.length > 0) {
        console.log(`\n✅ Encontradas ${transactionsResult.rows.length} transações vinculadas ao usuário`);
        
        // Mostrar detalhes das transações
        console.log('\nDetalhes das transações:');
        transactionsResult.rows.slice(0, 3).forEach((transaction, index) => {
          console.log(`\nTransação ${index + 1}:`);
          console.log(`  ID: ${transaction.id}`);
          console.log(`  External ID: ${transaction.external_id}`);
          console.log(`  Status: ${transaction.status}`);
          console.log(`  Valor: ${transaction.amount}`);
          console.log(`  Método: ${transaction.method}`);
          console.log(`  Data: ${transaction.created_at}`);
        });
        
        // Verificar correspondência entre external_id das transações e external_payment_ids dos pedidos
        const matchingIds = transactionsResult.rows.filter(transaction => 
          externalPaymentIds.includes(transaction.external_id)
        );
        
        console.log(`\nTransações com external_id correspondente: ${matchingIds.length} de ${transactionsResult.rows.length}`);
        
        if (matchingIds.length > 0) {
          console.log('✅ Vinculação entre usuários e transações funcionando corretamente!');
        } else {
          console.log('⚠️ Nenhuma correspondência exata encontrada entre external_ids');
        }
      } else {
        console.log('❌ Nenhuma transação encontrada com os external_payment_ids fornecidos');
      }
    } else {
      console.log('❌ Nenhum external_payment_id encontrado nos metadados dos pedidos');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar vinculação:', error.message);
  } finally {
    // Fechar conexões
    await ordersPool.end();
    await pagamentosPool.end();
    console.log('\nConexões fechadas');
  }
}

testUserTransactionLink();
