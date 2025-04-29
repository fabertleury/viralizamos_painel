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

async function listTables() {
  console.log('Listando tabelas disponíveis nos bancos de dados...');
  
  try {
    // Listar tabelas no banco de dados de orders
    console.log('\n--- BANCO DE DADOS DE ORDERS ---');
    const ordersTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const ordersTables = await ordersPool.query(ordersTablesQuery);
    console.log('Tabelas disponíveis:');
    ordersTables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Listar tabelas no banco de dados de pagamentos
    console.log('\n--- BANCO DE DADOS DE PAGAMENTOS ---');
    const pagamentosTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const pagamentosTables = await pagamentosPool.query(pagamentosTablesQuery);
    console.log('Tabelas disponíveis:');
    pagamentosTables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar tabelas:', error.message);
  } finally {
    // Fechar conexões
    await ordersPool.end();
    await pagamentosPool.end();
    console.log('\nConexões fechadas');
  }
}

listTables();
