// Script para verificar a estrutura da tabela transactions no banco de dados de pagamentos
const { Pool } = require('pg');

// Conexão com o banco de dados de pagamentos
const pagamentosPool = new Pool({
  connectionString: process.env.PAGAMENTOS_DATABASE_URL || 'postgresql://postgres:zacEqGceWerpWpBZZqttjamDOCcdhRbO@shinkansen.proxy.rlwy.net:29036/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkTransactionsTable() {
  try {
    console.log('Verificando estrutura da tabela transactions...');
    
    // Consulta para obter a estrutura da tabela
    const schemaResult = await pagamentosPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura da tabela transactions:');
    console.table(schemaResult.rows);
    
    // Consulta para obter uma amostra dos dados
    const sampleResult = await pagamentosPool.query(`
      SELECT id, status, amount, created_at, external_id 
      FROM "transactions" 
      LIMIT 3
    `);
    
    console.log('\nAmostra de dados da tabela transactions:');
    console.table(sampleResult.rows);
    
    // Verificar se a coluna payment_method existe
    const paymentMethodExists = schemaResult.rows.some(
      column => column.column_name === 'payment_method'
    );
    
    if (paymentMethodExists) {
      console.log('\nA coluna payment_method existe na tabela transactions.');
    } else {
      console.log('\nA coluna payment_method NÃO existe na tabela transactions.');
      
      // Verificar se existe alguma coluna similar
      console.log('Procurando colunas similares que possam conter informações de método de pagamento:');
      const possibleColumns = schemaResult.rows
        .filter(column => 
          column.column_name.includes('method') || 
          column.column_name.includes('payment') || 
          column.column_name.includes('tipo')
        )
        .map(column => column.column_name);
      
      console.log(possibleColumns.length > 0 ? possibleColumns : 'Nenhuma coluna similar encontrada');
    }
  } catch (error) {
    console.error('Erro ao verificar tabela transactions:', error);
  } finally {
    await pagamentosPool.end();
  }
}

checkTransactionsTable();
