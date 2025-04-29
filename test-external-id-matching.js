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

async function testExternalIdMatching() {
  console.log('Testando vinculação entre usuários e transações usando external_id...');
  
  try {
    // Buscar 5 usuários de exemplo do banco de orders
    const usersQuery = 'SELECT id, email, name FROM "User" LIMIT 5';
    const usersResult = await ordersPool.query(usersQuery);
    
    if (usersResult.rows.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado no banco de orders');
      return;
    }
    
    // Buscar todas as transações com external_id não nulo
    const transactionsQuery = `
      SELECT id, external_id, status, amount, method, created_at
      FROM "transactions"
      WHERE external_id IS NOT NULL
      ORDER BY created_at DESC
    `;
    const transactionsResult = await pagamentosPool.query(transactionsQuery);
    
    console.log(`Total de transações com external_id: ${transactionsResult.rows.length}`);
    
    // Testar a correspondência para cada usuário
    for (const user of usersResult.rows) {
      console.log(`\nTestando usuário: ${user.name || user.email} (ID: ${user.id})`);
      
      // Filtrar transações que podem estar relacionadas ao usuário
      const userTransactions = transactionsResult.rows.filter(transaction => {
        if (!transaction.external_id) return false;
        
        // Verificar se o ID do usuário está contido no external_id
        const containsUserId = transaction.external_id.includes(user.id);
        
        // Verificar se o email do usuário (sem o domínio) está contido no external_id
        const emailUsername = user.email.split('@')[0];
        const containsEmail = emailUsername && transaction.external_id.includes(emailUsername);
        
        return containsUserId || containsEmail;
      });
      
      if (userTransactions.length > 0) {
        console.log(`✅ Encontradas ${userTransactions.length} transações para o usuário`);
        
        // Mostrar detalhes da primeira transação
        const firstTransaction = userTransactions[0];
        console.log('Detalhes da primeira transação:');
        console.log(`  ID: ${firstTransaction.id}`);
        console.log(`  External ID: ${firstTransaction.external_id}`);
        console.log(`  Status: ${firstTransaction.status}`);
        console.log(`  Valor: ${firstTransaction.amount}`);
        console.log(`  Método: ${firstTransaction.method}`);
        console.log(`  Data: ${firstTransaction.created_at}`);
        
        // Verificar qual critério de correspondência foi usado
        if (firstTransaction.external_id.includes(user.id)) {
          console.log(`  Correspondência por ID do usuário: ${user.id}`);
        }
        
        const emailUsername = user.email.split('@')[0];
        if (emailUsername && firstTransaction.external_id.includes(emailUsername)) {
          console.log(`  Correspondência por nome de usuário do email: ${emailUsername}`);
        }
      } else {
        console.log('⚠️ Nenhuma transação encontrada para o usuário');
      }
    }
    
    // Se nenhuma correspondência foi encontrada, verificar os formatos de external_id
    const anyMatch = usersResult.rows.some(user => {
      return transactionsResult.rows.some(transaction => {
        if (!transaction.external_id) return false;
        
        const containsUserId = transaction.external_id.includes(user.id);
        const emailUsername = user.email.split('@')[0];
        const containsEmail = emailUsername && transaction.external_id.includes(emailUsername);
        
        return containsUserId || containsEmail;
      });
    });
    
    if (!anyMatch) {
      console.log('\n⚠️ Nenhuma correspondência encontrada para nenhum dos usuários testados');
      console.log('\nExemplos de valores de external_id:');
      
      const sampleExternalIds = transactionsResult.rows.slice(0, 5).map(t => t.external_id);
      sampleExternalIds.forEach((externalId, index) => {
        console.log(`  ${index + 1}: ${externalId}`);
      });
      
      console.log('\nExemplos de IDs de usuários:');
      usersResult.rows.forEach((user, index) => {
        console.log(`  ${index + 1}: ${user.id}`);
      });
      
      console.log('\nExemplos de emails de usuários:');
      usersResult.rows.forEach((user, index) => {
        console.log(`  ${index + 1}: ${user.email}`);
      });
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

testExternalIdMatching();
