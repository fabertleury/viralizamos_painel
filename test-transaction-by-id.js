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

async function testTransactionsByUserId() {
  console.log('Testando vinculação entre usuários e transações pelo ID...');
  
  try {
    // Buscar um usuário de exemplo do banco de orders
    const userResult = await ordersPool.query('SELECT id, email FROM "User" LIMIT 1');
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`Usuário de teste: ${user.email} (ID: ${user.id})`);
      
      // Buscar transações pelo ID do usuário nos campos external_id ou reference
      const transactionsQuery = `
        SELECT id, status, amount, method, created_at, external_id, reference
        FROM "transactions"
        WHERE external_id LIKE $1 OR reference LIKE $1
        ORDER BY created_at DESC
      `;
      const userIdPattern = `%${user.id}%`;
      const transactionsResult = await pagamentosPool.query(transactionsQuery, [userIdPattern]);
      
      console.log(`Total de transações encontradas: ${transactionsResult.rows.length}`);
      
      if (transactionsResult.rows.length > 0) {
        console.log('✅ Vinculação entre usuários e transações pelo ID funcionando corretamente');
        
        // Mostrar detalhes das transações encontradas
        console.log('\nDetalhes das transações:');
        transactionsResult.rows.slice(0, 3).forEach((transaction, index) => {
          console.log(`\nTransação ${index + 1}:`);
          console.log(`  ID: ${transaction.id}`);
          console.log(`  Status: ${transaction.status}`);
          console.log(`  Valor: ${transaction.amount}`);
          console.log(`  Método: ${transaction.method}`);
          console.log(`  Data: ${transaction.created_at}`);
          console.log(`  External ID: ${transaction.external_id}`);
          console.log(`  Reference: ${transaction.reference}`);
        });
        
        // Verificar se o ID do usuário está presente nos campos external_id ou reference
        const containsUserId = transactionsResult.rows.some(transaction => {
          const externalIdContainsUserId = transaction.external_id && transaction.external_id.includes(user.id);
          const referenceContainsUserId = transaction.reference && transaction.reference.includes(user.id);
          return externalIdContainsUserId || referenceContainsUserId;
        });
        
        if (containsUserId) {
          console.log(`\n✅ Confirmado: ID do usuário (${user.id}) encontrado nos campos external_id ou reference`);
        } else {
          console.log(`\n⚠️ Atenção: ID do usuário (${user.id}) NÃO encontrado nos campos external_id ou reference`);
          console.log('Isso pode indicar que a vinculação está usando um formato diferente.');
        }
      } else {
        console.log('⚠️ Nenhuma transação encontrada para o usuário');
        
        // Vamos tentar buscar transações para outros usuários
        console.log('\nBuscando transações para outros usuários...');
        const otherUsersQuery = 'SELECT id, email FROM "User" LIMIT 10 OFFSET 1';
        const otherUsersResult = await ordersPool.query(otherUsersQuery);
        
        let foundTransactions = false;
        
        for (const otherUser of otherUsersResult.rows) {
          const otherUserIdPattern = `%${otherUser.id}%`;
          const otherTransactionsResult = await pagamentosPool.query(transactionsQuery, [otherUserIdPattern]);
          
          if (otherTransactionsResult.rows.length > 0) {
            console.log(`\nEncontradas ${otherTransactionsResult.rows.length} transações para o usuário ${otherUser.email} (ID: ${otherUser.id})`);
            console.log('Detalhes da primeira transação:');
            const firstTransaction = otherTransactionsResult.rows[0];
            console.log(`  ID: ${firstTransaction.id}`);
            console.log(`  External ID: ${firstTransaction.external_id}`);
            console.log(`  Reference: ${firstTransaction.reference}`);
            foundTransactions = true;
            break;
          }
        }
        
        if (!foundTransactions) {
          console.log('⚠️ Não foram encontradas transações para nenhum dos usuários testados');
          
          // Vamos verificar se existem dados na tabela de transações
          const allTransactionsQuery = 'SELECT COUNT(*) FROM "transactions"';
          const allTransactionsResult = await pagamentosPool.query(allTransactionsQuery);
          console.log(`\nTotal de transações na tabela: ${allTransactionsResult.rows[0].count}`);
          
          if (parseInt(allTransactionsResult.rows[0].count) > 0) {
            // Vamos verificar o formato dos campos external_id e reference
            const sampleTransactionsQuery = 'SELECT id, external_id, reference FROM "transactions" LIMIT 5';
            const sampleTransactionsResult = await pagamentosPool.query(sampleTransactionsQuery);
            
            console.log('\nExemplos de valores nos campos external_id e reference:');
            sampleTransactionsResult.rows.forEach((transaction, index) => {
              console.log(`\nTransação ${index + 1}:`);
              console.log(`  ID: ${transaction.id}`);
              console.log(`  External ID: ${transaction.external_id}`);
              console.log(`  Reference: ${transaction.reference}`);
            });
          }
        }
      }
    } else {
      console.log('⚠️ Nenhum usuário encontrado no banco de orders');
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

testTransactionsByUserId();
