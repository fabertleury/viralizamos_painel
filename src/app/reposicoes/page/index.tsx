'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Este componente serve para redirecionar de /reposicoes/page para /reposicoes
// Foi criado para resolver um erro de build 
export default function ReposicoesPageRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/reposicoes');
  }, [router]);
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecionando...</p>
    </div>
  );
} 