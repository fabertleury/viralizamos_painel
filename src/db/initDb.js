const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Configuração do cliente PostgreSQL com a URL do banco de dados do .env
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function inicializarBancoDados() {
  try {
    console.log('Conectando ao banco de dados PostgreSQL...');
    await client.connect();
    
    // Lê o arquivo SQL de schema
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executando script de inicialização...');
    await client.query(sqlScript);
    
    console.log('✅ Banco de dados inicializado com sucesso!');
    console.log('As tabelas essenciais foram criadas.');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    await client.end();
  }
}

// Executar a inicialização se este arquivo for executado diretamente
if (require.main === module) {
  inicializarBancoDados();
}

module.exports = { inicializarBancoDados }; 