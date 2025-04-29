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
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await pagamentosPool.query(columnsQuery);
    
    console.log('\nColunas da tabela transactions:');
    columnsResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''})`);
    });
    
    // Verificar se existem colunas que podem conter o ID do usuário
    console.log('\nPossíveis colunas para vinculação com ID do usuário:');
    const possibleUserIdColumns = columnsResult.rows.filter(column => 
      column.column_name.includes('user') || 
      column.column_name.includes('id') || 
      column.column_name.includes('reference') ||
      column.column_name.includes('external')
    );
    
    if (possibleUserIdColumns.length > 0) {
      possibleUserIdColumns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''})`);
      });
    } else {
      console.log('Nenhuma coluna óbvia encontrada para vinculação com ID do usuário');
    }
    
    // Buscar exemplos de dados na tabela transactions
    const samplesQuery = `
      SELECT *
      FROM transactions
      LIMIT 3;
    `;
    
    const samplesResult = await pagamentosPool.query(samplesQuery);
    
    console.log('\nExemplos de registros na tabela transactions:');
    samplesResult.rows.forEach((row, index) => {
      console.log(`\nRegistro ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
    // Verificar tabela payment_requests
    console.log('\nVerificando tabela payment_requests...');
    
    const paymentRequestsColumnsQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'payment_requests'
      ORDER BY ordinal_position;
    `;
    
    const paymentRequestsColumnsResult = await pagamentosPool.query(paymentRequestsColumnsQuery);
    
    console.log('\nColunas da tabela payment_requests:');
    paymentRequestsColumnsResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''})`);
    });
    
    // Buscar exemplos de dados na tabela payment_requests
    const paymentRequestsSamplesQuery = `
      SELECT *
      FROM payment_requests
      LIMIT 3;
    `;
    
    const paymentRequestsSamplesResult = await pagamentosPool.query(paymentRequestsSamplesQuery);
    
    console.log('\nExemplos de registros na tabela payment_requests:');
    paymentRequestsSamplesResult.rows.forEach((row, index) => {
      console.log(`\nRegistro ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar esquema:', error.message);
  } finally {
    // Fechar conexão
    await pagamentosPool.end();
    console.log('\nConexão fechada');
  }
}

checkTransactionsSchema();
