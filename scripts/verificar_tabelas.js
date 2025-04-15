const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function verificarTabelas() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados PostgreSQL.');
    
    // Consulta para listar todas as tabelas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tabelas existentes no banco de dados:');
    console.log('----------------------------------------');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma tabela encontrada.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Verificar usuários admin
    const userResult = await client.query(`
      SELECT id, nome, email, role, ativo 
      FROM usuarios 
      WHERE role = 'admin'
    `);
    
    console.log('\n👤 Usuários administradores:');
    console.log('---------------------------');
    
    if (userResult.rows.length === 0) {
      console.log('Nenhum usuário administrador encontrado.');
    } else {
      userResult.rows.forEach(user => {
        console.log(`ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
      });
    }
    
    // Verificar configurações
    const configResult = await client.query(`
      SELECT chave, valor, grupo
      FROM configuracoessistema
      ORDER BY grupo, chave
    `);
    
    console.log('\n⚙️ Configurações do sistema:');
    console.log('---------------------------');
    
    if (configResult.rows.length === 0) {
      console.log('Nenhuma configuração encontrada.');
    } else {
      let currentGroup = '';
      
      configResult.rows.forEach(config => {
        if (config.grupo !== currentGroup) {
          currentGroup = config.grupo;
          console.log(`\n[${currentGroup}]`);
        }
        
        console.log(`${config.chave}: ${config.valor}`);
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
  } finally {
    await client.end();
    console.log('\nConexão encerrada.');
  }
}

verificarTabelas(); 