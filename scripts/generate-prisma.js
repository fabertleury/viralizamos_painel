// Script para garantir que o Prisma seja gerado corretamente
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Verifica se o diretório prisma existe
const prismaDir = path.join(__dirname, '..', 'prisma');
const schemaPath = path.join(prismaDir, 'schema.prisma');

console.log('Verificando diretório Prisma...');
if (!fs.existsSync(prismaDir)) {
  console.error('Diretório prisma não encontrado!');
  process.exit(1);
}

console.log('Verificando schema.prisma...');
if (!fs.existsSync(schemaPath)) {
  console.error('Arquivo schema.prisma não encontrado!');
  process.exit(1);
}

console.log('Gerando cliente Prisma...');
try {
  // Executa o comando prisma generate
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Cliente Prisma gerado com sucesso!');
} catch (error) {
  console.error('Erro ao gerar cliente Prisma:', error);
  process.exit(1);
}
