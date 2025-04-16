#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para saída do console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Função para imprimir mensagem colorida
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Fazer backup de arquivos importantes
function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    log(`Backup de ${filePath} criado em ${backupPath}`, 'green');
    return true;
  }
  return false;
}

// Verificar estrutura do projeto
log('🔍 Verificando estrutura do projeto...', 'blue');
const pagesDir = path.join(process.cwd(), 'src', 'pages');
const appDir = path.join(process.cwd(), 'src', 'app');

// Verificar se existem conflitos de pasta app/pages
const appPagesDir = path.join(appDir, 'pages');
if (fs.existsSync(appPagesDir)) {
  log('⚠️ Detectado potencial conflito: pasta src/app/pages existe', 'yellow');
  log('   Isso pode causar problemas de compilação.', 'yellow');
  
  // Verificar arquivo específico que está causando problemas
  const usuariosPath = path.join(appPagesDir, 'usuarios.js');
  if (fs.existsSync(usuariosPath)) {
    log(`Encontrado arquivo problemático: ${usuariosPath}`, 'red');
    log('Este arquivo está em conflito com src/pages/usuarios.tsx', 'red');
    
    // Fazer backup e renomear temporariamente
    if (backupFile(usuariosPath)) {
      fs.renameSync(usuariosPath, `${usuariosPath}.disabled`);
      log(`Arquivo ${usuariosPath} renomeado para ${usuariosPath}.disabled durante o build`, 'green');
    }
  }
}

// Iniciar o build com opções adicionais
log('🚀 Iniciando processo de build do Next.js...', 'magenta');
try {
  // Definir variáveis de ambiente para debug
  process.env.NEXT_DEBUG_BUILD = 'true';
  
  // Executar comando de build com timeout aumentado
  execSync('next build --no-lint', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  });
  
  log('✅ Build concluído com sucesso!', 'green');
} catch (error) {
  log(`❌ Build falhou: ${error.message}`, 'red');
  
  // Verificar se a pasta .next existe para tentar recuperar informações
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    log('Verificando arquivos gerados parcialmente...', 'yellow');
    
    // Lista de pastas a verificar
    const foldersToCheck = [
      'server/pages',
      'static/chunks'
    ];
    
    for (const folder of foldersToCheck) {
      const folderPath = path.join(nextDir, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        log(`Pasta ${folder} contém ${files.length} arquivos`, 'blue');
      } else {
        log(`Pasta ${folder} não existe`, 'yellow');
      }
    }
  }
  
  // Restaurar arquivos renomeados
  const disabledUsuariosPath = path.join(appPagesDir, 'usuarios.js.disabled');
  if (fs.existsSync(disabledUsuariosPath)) {
    fs.renameSync(disabledUsuariosPath, disabledUsuariosPath.replace('.disabled', ''));
    log('Arquivo usuarios.js restaurado', 'blue');
  }
  
  process.exit(1);
}

// Restaurar arquivos renomeados
const disabledUsuariosPath = path.join(appPagesDir, 'usuarios.js.disabled');
if (fs.existsSync(disabledUsuariosPath)) {
  fs.renameSync(disabledUsuariosPath, disabledUsuariosPath.replace('.disabled', ''));
  log('Arquivo usuarios.js restaurado', 'blue');
} 