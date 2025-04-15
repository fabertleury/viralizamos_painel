require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração da conexão com o banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:shMwuukfHKLTdgPkDOUQmYuqdFGOBzPA@metro.proxy.rlwy.net:40176/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    const client = await pool.connect();
    
    // Ler o arquivo schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executando script de inicialização do banco de dados...');
    await client.query(sqlSchema);
    
    console.log('Banco de dados inicializado com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Verificar o usuário administrador
    const userResult = await client.query('SELECT id, nome, email, tipo FROM usuarios WHERE tipo = $1', ['admin']);
    console.log('\nUsuários administradores:');
    userResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}`);
    });
    
    client.release();
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
    process.exit(1);
  } finally {
    // Fechar a conexão com o pool
    await pool.end();
  }
}

// Executar a inicialização
initDatabase(); 