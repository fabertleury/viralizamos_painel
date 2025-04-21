'use client'

// Configuração para desativar a pré-renderização estática
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import AdminLayout from '../../components/Layout/AdminLayout'

export default function ReposicoesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
} 