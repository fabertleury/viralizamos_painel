#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Função para verificar se um arquivo existe
function checkFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

// Função para listar arquivos em um diretório
function listFiles(dirPath) {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = [];
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...listFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  } catch (error) {
    console.error(`Erro ao listar arquivos em ${dirPath}:`, error.message);
    return [];
  }
}

// Início da verificação
console.log('=== VERIFICAÇÃO DE ESTRUTURA DE PÁGINAS ===');

// Verificar pastas principais
const pagesDir = path.join(process.cwd(), 'src', 'pages');
const appDir = path.join(process.cwd(), 'src', 'app');

console.log(`Verificando pasta pages (${pagesDir})...`);
if (fs.existsSync(pagesDir)) {
  const pagesFiles = listFiles(pagesDir);
  console.log(`✅ Pasta pages existe e contém ${pagesFiles.length} arquivos.`);
  
  // Verificar página de usuários específica
  const usuariosPage = path.join(pagesDir, 'usuarios.tsx');
  
  if (checkFile(usuariosPage)) {
    console.log(`✅ Arquivo usuarios.tsx encontrado em src/pages.`);
  } else {
    console.log(`❌ Arquivo usuarios.tsx NÃO encontrado em src/pages!`);
  }
} else {
  console.log('❌ Pasta pages não existe!');
}

console.log(`\nVerificando pasta app (${appDir})...`);
if (fs.existsSync(appDir)) {
  const appFiles = listFiles(appDir);
  console.log(`✅ Pasta app existe e contém ${appFiles.length} arquivos.`);
  
  // Verificar possíveis localizações conflitantes
  const appPagesDir = path.join(appDir, 'pages');
  
  if (fs.existsSync(appPagesDir)) {
    console.log(`⚠️ ALERTA: Pasta app/pages existe, pode causar conflito!`);
    
    const appUsuariosPage = path.join(appPagesDir, 'usuarios.js');
    if (checkFile(appUsuariosPage)) {
      console.log(`⚠️ ALERTA: Arquivo usuarios.js encontrado em src/app/pages!`);
      console.log('   Isso pode estar causando conflito com src/pages/usuarios.tsx');
    }
  }
} else {
  console.log('❓ Pasta app não existe (não é um problema se não estiver usando App Router).');
}

console.log('\n=== VERIFICAÇÃO CONCLUÍDA ==='); 