// Este arquivo garante que o schema do Prisma seja encontrado corretamente
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
console.log(`Schema path: ${schemaPath}`);

// Exporta o caminho do schema para ser usado em outros lugares
module.exports = {
  schemaPath,
};
