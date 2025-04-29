const { Pool } = require('pg');

// Conexão com o banco de dados de pedidos (orders)
const ordersPool = new Pool({
  connectionString: 'postgresql://postgres:cgbdNabKzdmLNJWfXAGgNFqjwpwouFXZ@switchyard.proxy.rlwy.net:44974/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkOrderMetadata() {
  console.log('Verificando estrutura da coluna metadata na tabela Order...');
  
  try {
    // Verificar se a coluna metadata existe
    const columnQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Order' AND column_name = 'metadata';
    `;
    
    const columnResult = await ordersPool.query(columnQuery);
    
    if (columnResult.rows.length === 0) {
      console.log('❌ A coluna metadata não existe na tabela Order');
      return;
    }
    
    console.log(`✅ A coluna metadata existe na tabela Order (tipo: ${columnResult.rows[0].data_type})`);
    
    // Buscar exemplos de valores na coluna metadata
    const metadataQuery = `
      SELECT id, user_id, metadata
      FROM "Order"
      WHERE metadata IS NOT NULL
      LIMIT 5;
    `;
    
    const metadataResult = await ordersPool.query(metadataQuery);
    
    if (metadataResult.rows.length === 0) {
      console.log('❌ Não foram encontrados registros com metadata não nulo');
      return;
    }
    
    console.log(`\nExemplos de valores na coluna metadata (${metadataResult.rows.length} registros):`);
    
    metadataResult.rows.forEach((row, index) => {
      console.log(`\nRegistro ${index + 1} (Order ID: ${row.id}, User ID: ${row.user_id}):`);
      
      try {
        // Se for uma string JSON, tentar fazer o parse
        if (typeof row.metadata === 'string') {
          const metadata = JSON.parse(row.metadata);
          console.log('Metadata (parsed):', JSON.stringify(metadata, null, 2));
          
          // Verificar se existe user_id no metadata
          if (metadata.user_info && metadata.user_info.user_id) {
            console.log(`✅ user_id encontrado no metadata: ${metadata.user_info.user_id}`);
          } else {
            console.log('❌ user_id não encontrado no metadata');
          }
          
          // Verificar se existe email no metadata
          if (metadata.user_info && metadata.user_info.email) {
            console.log(`✅ email encontrado no metadata: ${metadata.user_info.email}`);
          } else {
            console.log('❌ email não encontrado no metadata');
          }
          
          // Verificar se existe external_payment_id no metadata
          if (metadata.external_payment_id) {
            console.log(`✅ external_payment_id encontrado no metadata: ${metadata.external_payment_id}`);
          } else {
            console.log('❌ external_payment_id não encontrado no metadata');
          }
        } else {
          console.log('Metadata (raw):', row.metadata);
        }
      } catch (error) {
        console.log('Erro ao fazer parse do metadata:', error.message);
        console.log('Metadata (raw):', row.metadata);
      }
    });
    
    // Verificar se existe alguma relação entre o user_id na tabela Order e o user_id no metadata
    const userIdQuery = `
      SELECT o.id, o.user_id, o.metadata
      FROM "Order" o
      JOIN "User" u ON o.user_id = u.id
      WHERE o.metadata IS NOT NULL
      LIMIT 5;
    `;
    
    const userIdResult = await ordersPool.query(userIdQuery);
    
    if (userIdResult.rows.length > 0) {
      console.log('\nVerificando relação entre user_id na tabela Order e user_id no metadata:');
      
      userIdResult.rows.forEach((row, index) => {
        console.log(`\nRegistro ${index + 1} (Order ID: ${row.id}):`);
        console.log(`User ID na tabela: ${row.user_id}`);
        
        try {
          if (typeof row.metadata === 'string') {
            const metadata = JSON.parse(row.metadata);
            const metadataUserId = metadata.user_info && metadata.user_info.user_id;
            
            if (metadataUserId) {
              console.log(`User ID no metadata: ${metadataUserId}`);
              
              if (row.user_id === metadataUserId) {
                console.log('✅ Os user_ids são iguais');
              } else {
                console.log('⚠️ Os user_ids são diferentes');
              }
            } else {
              console.log('❌ user_id não encontrado no metadata');
            }
          }
        } catch (error) {
          console.log('Erro ao fazer parse do metadata:', error.message);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar metadata:', error.message);
  } finally {
    // Fechar conexão
    await ordersPool.end();
    console.log('\nConexão fechada');
  }
}

checkOrderMetadata();
