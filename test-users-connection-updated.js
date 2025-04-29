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

async function testConnections() {
  console.log('Testando conexões com os bancos de dados...');
  
  try {
    // Testar conexão com o banco de dados de orders
    const ordersResult = await ordersPool.query('SELECT COUNT(*) FROM "User"');
    console.log('✅ Conexão com o banco de dados de orders bem-sucedida');
    console.log(`Total de usuários no banco de orders: ${ordersResult.rows[0].count}`);
    
    // Testar conexão com o banco de dados de pagamentos
    const pagamentosResult = await pagamentosPool.query('SELECT COUNT(*) FROM "users"');
    console.log('✅ Conexão com o banco de dados de pagamentos bem-sucedida');
    console.log(`Total de usuários no banco de pagamentos: ${pagamentosResult.rows[0].count}`);
    
    // Testar vinculação entre usuários e transações
    console.log('\nTestando vinculação entre usuários e transações...');
    
    // Buscar um usuário de exemplo do banco de orders
    const userResult = await ordersPool.query('SELECT id, email FROM "User" LIMIT 1');
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`Usuário de teste: ${user.email} (ID: ${user.id})`);
      
      // Buscar o mesmo usuário no banco de pagamentos
      const pagamentosUserResult = await pagamentosPool.query('SELECT id FROM "users" WHERE email = $1', [user.email]);
      
      if (pagamentosUserResult.rows.length > 0) {
        const pagamentosUserId = pagamentosUserResult.rows[0].id;
        console.log(`✅ Usuário encontrado no banco de pagamentos (ID: ${pagamentosUserId})`);
        
        // Buscar transações do usuário
        const transactionsQuery = `
          SELECT COUNT(*) as count
          FROM "transactions" t
          JOIN "payment_requests" pr ON t.payment_request_id = pr.id
          WHERE pr.user_id = $1
        `;
        const transactionsResult = await pagamentosPool.query(transactionsQuery, [pagamentosUserId]);
        console.log(`Total de transações do usuário: ${transactionsResult.rows[0].count}`);
        
        if (transactionsResult.rows[0].count > 0) {
          console.log('✅ Vinculação entre usuários e transações funcionando corretamente');
          
          // Buscar detalhes da última transação
          const lastTransactionQuery = `
            SELECT t.id, t.status, t.amount, t.method, t.created_at
            FROM "transactions" t
            JOIN "payment_requests" pr ON t.payment_request_id = pr.id
            WHERE pr.user_id = $1
            ORDER BY t.created_at DESC
            LIMIT 1
          `;
          const lastTransactionResult = await pagamentosPool.query(lastTransactionQuery, [pagamentosUserId]);
          if (lastTransactionResult.rows.length > 0) {
            const lastTransaction = lastTransactionResult.rows[0];
            console.log('Última transação:');
            console.log(`  ID: ${lastTransaction.id}`);
            console.log(`  Status: ${lastTransaction.status}`);
            console.log(`  Valor: ${lastTransaction.amount}`);
            console.log(`  Método: ${lastTransaction.method}`);
            console.log(`  Data: ${lastTransaction.created_at}`);
          }
        } else {
          console.log('⚠️ Usuário encontrado, mas não possui transações');
        }
      } else {
        console.log('⚠️ Usuário não encontrado no banco de pagamentos');
      }
    } else {
      console.log('⚠️ Nenhum usuário encontrado no banco de orders');
    }
  } catch (error) {
    console.error('❌ Erro ao testar conexões:', error.message);
  } finally {
    // Fechar conexões
    await ordersPool.end();
    await pagamentosPool.end();
    console.log('\nConexões fechadas');
  }
}

testConnections();
