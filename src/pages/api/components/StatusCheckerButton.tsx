import React, { useState } from 'react';
import { Button, useToast, Tooltip, ButtonProps } from '@chakra-ui/react';
import axios from 'axios';

interface StatusCheckerButtonProps extends Omit<ButtonProps, 'onClick'> {
  orderIds: string[];
  onStatusUpdated?: (results: any) => void;
  variant?: string;
  size?: string;
  icon?: React.ReactElement;
  label?: string;
  tooltipText?: string;
}

const StatusCheckerButton: React.FC<StatusCheckerButtonProps> = ({
  orderIds,
  onStatusUpdated,
  variant = 'outline',
  size = 'sm',
  icon,
  label = 'Verificar Status',
  tooltipText = 'Verificar status do pedido no provedor',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleCheckStatus = async () => {
    if (orderIds.length === 0) {
      toast({
        title: 'Nenhum pedido selecionado',
        description: 'Selecione pelo menos um pedido para verificar o status',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/pedidos/check-multiple', {
        ids: orderIds
      });

      if (response.data.success) {
        const { atualizados, erros, total } = response.data.resultados;
        
        toast({
          title: 'Verificação de status concluída',
          description: `${atualizados} de ${total} pedidos atualizados. ${erros} erros.`,
          status: atualizados > 0 ? 'success' : (erros > 0 ? 'warning' : 'info'),
          duration: 5000,
          isClosable: true,
        });

        if (onStatusUpdated && typeof onStatusUpdated === 'function') {
          onStatusUpdated(response.data.resultados);
        }
      } else {
        toast({
          title: 'Erro ao verificar status',
          description: response.data.message || 'Ocorreu um erro ao verificar o status dos pedidos',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      
      toast({
        title: 'Erro ao verificar status',
        description: error instanceof Error 
          ? error.message 
          : 'Ocorreu um erro ao verificar o status dos pedidos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip label={tooltipText} hasArrow placement="top">
      <Button
        leftIcon={icon}
        onClick={handleCheckStatus}
        isLoading={isLoading}
        loadingText="Verificando..."
        variant={variant}
        size={size}
        colorScheme="blue"
        {...props}
      >
        {label}
      </Button>
    </Tooltip>
  );
};

export default StatusCheckerButton; 