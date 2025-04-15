const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuração do cliente PostgreSQL com a URL do banco de dados do .env
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function executarLimpeza() {
  try {
    console.log('Conectando ao banco de dados PostgreSQL...');
    await client.connect();
    
    // Lê o arquivo SQL de limpeza
    const sqlPath = path.join(__dirname, 'limpar_banco.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executando script de limpeza...');
    await client.query(sqlScript);
    
    console.log('✅ Limpeza concluída com sucesso!');
    console.log('O banco de dados agora contém apenas as tabelas essenciais.');
    
  } catch (error) {
    console.error('❌ Erro ao executar limpeza:', error);
  } finally {
    await client.end();
  }
}

executarLimpeza(); 