'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Este arquivo foi criado para resolver um erro de build onde o Next.js estava
// tentando acessar /_not-found quando deveria usar /not-found
export default function NotFoundRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/not-found');
  }, [router]);
  
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecionando para a página de erro 404...</p>
    </div>
  );
} 