import { useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Box, Spinner, Text, Flex } from '@chakra-ui/react';
import AdminLayout from '../components/Layout/AdminLayout';

// Dynamically import the App Router component with SSR disabled
const ReposicoesPageContent = dynamic(
  () => import('../app/reposicoes/page').then((mod) => mod.default),
  { ssr: false }
);

export default function ReposicoesPageWrapper() {
  const router = useRouter();
  
  return (
    <AdminLayout>
      <ReposicoesPageContent />
    </AdminLayout>
  );
} 