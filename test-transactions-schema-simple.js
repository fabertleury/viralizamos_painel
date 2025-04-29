const { Pool } = require('pg');

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkTransactionsSchema() {
  console.log('Verificando esquema da tabela transactions...');
  
  try {
    // Obter informações sobre as colunas da tabela transactions
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pagamentosPool.query(columnsQuery);
    
    console.log('\nColunas da tabela transactions:');
    columnsResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Verificar se a tabela payment_requests tem uma coluna user_id
    const paymentRequestsUserIdQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'payment_requests' AND column_name = 'user_id';
    `;
    
    const paymentRequestsUserIdResult = await pagamentosPool.query(paymentRequestsUserIdQuery);
    
    if (paymentRequestsUserIdResult.rows.length > 0) {
      console.log('\nA tabela payment_requests possui a coluna user_id!');
      console.log(`- ${paymentRequestsUserIdResult.rows[0].column_name} (${paymentRequestsUserIdResult.rows[0].data_type})`);
      
      // Verificar se existem registros com user_id preenchido
      const userIdCheckQuery = `
        SELECT COUNT(*) 
        FROM payment_requests 
        WHERE user_id IS NOT NULL;
      `;
      
      const userIdCheckResult = await pagamentosPool.query(userIdCheckQuery);
      console.log(`\nExistem ${userIdCheckResult.rows[0].count} registros com user_id preenchido na tabela payment_requests`);
    } else {
      console.log('\nA tabela payment_requests NÃO possui a coluna user_id!');
    }
    
    // Verificar se existem registros na tabela transactions com external_id preenchido
    const externalIdCheckQuery = `
      SELECT COUNT(*) 
      FROM transactions 
      WHERE external_id IS NOT NULL;
    `;
    
    const externalIdCheckResult = await pagamentosPool.query(externalIdCheckQuery);
    console.log(`\nExistem ${externalIdCheckResult.rows[0].count} registros com external_id preenchido na tabela transactions`);
    
    // Verificar exemplos de external_id
    if (parseInt(externalIdCheckResult.rows[0].count) > 0) {
      const externalIdSamplesQuery = `
        SELECT id, external_id, payment_request_id
        FROM transactions
        WHERE external_id IS NOT NULL
        LIMIT 5;
      `;
      
      const externalIdSamplesResult = await pagamentosPool.query(externalIdSamplesQuery);
      
      console.log('\nExemplos de external_id na tabela transactions:');
      externalIdSamplesResult.rows.forEach((row, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  External ID: ${row.external_id}`);
        console.log(`  Payment Request ID: ${row.payment_request_id}`);
      });
    }
    
    // Verificar se existe relação entre payment_requests e transactions
    console.log('\nVerificando relação entre payment_requests e transactions...');
    
    const relationQuery = `
      SELECT pr.id as payment_request_id, pr.user_id, t.id as transaction_id, t.external_id
      FROM payment_requests pr
      JOIN transactions t ON pr.id = t.payment_request_id
      WHERE pr.user_id IS NOT NULL
      LIMIT 5;
    `;
    
    const relationResult = await pagamentosPool.query(relationQuery);
    
    if (relationResult.rows.length > 0) {
      console.log('\nExemplos de relação entre payment_requests e transactions:');
      relationResult.rows.forEach((row, index) => {
        console.log(`\nRelação ${index + 1}:`);
        console.log(`  Payment Request ID: ${row.payment_request_id}`);
        console.log(`  User ID: ${row.user_id}`);
        console.log(`  Transaction ID: ${row.transaction_id}`);
        console.log(`  External ID: ${row.external_id}`);
      });
    } else {
      console.log('\nNão foram encontradas relações entre payment_requests e transactions com user_id preenchido');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar esquema:', error.message);
  } finally {
    // Fechar conexão
    await pagamentosPool.end();
    console.log('\nConexão fechada');
  }
}

checkTransactionsSchema();
