import { useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Box, Spinner, Text, Flex } from '@chakra-ui/react';
import AdminLayout from '../../components/Layout/AdminLayout';

// Dynamically import the App Router component with SSR disabled
const ReposicaoDetailsContent = dynamic(
  () => import('../../app/reposicoes/[id]/page').then((mod) => {
    const Component = mod.default;
    return (props: any) => <Component {...props} />
  }),
  { ssr: false }
);

export default function ReposicaoDetailsWrapper() {
  const router = useRouter();
  const { id } = router.query;
  
  if (!id) {
    return (
      <AdminLayout>
        <Flex justify="center" align="center" minH="50vh">
          <Spinner size="xl" mr={4} />
          <Text>Carregando...</Text>
        </Flex>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <ReposicaoDetailsContent params={{ id: id as string }} />
    </AdminLayout>
  );
} 