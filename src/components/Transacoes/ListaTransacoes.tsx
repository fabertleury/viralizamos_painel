import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DatePicker } from '../ui/date-picker';
import { Pagination } from '../ui/pagination';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import { formatCurrency, formatDate } from '../../utils/format';
import { Search } from 'lucide-react';
import { useRouter } from 'next/router';
import { Text } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Define the transaction status type
type TransacaoStatus = 'PENDENTE' | 'APROVADO' | 'ESTORNADO' | 'CANCELADO' | 'EM_ANALISE';

// Define payment method type
type MetodoPagamento = 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'BOLETO' | 'TRANSFERENCIA';

// Define the transaction interface
interface Transacao {
  id: string;
  status: TransacaoStatus;
  metodoPagamento: MetodoPagamento;
  valor: number;
  dataCriacao: string;
  cliente: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    documento: string;
  };
  produto: {
    id: string;
    nome: string;
    descricao: string;
  };
  orderId: string;
  externalId: string;
}

const ITENS_POR_PAGINA = 10;

const statusColors: Record<TransacaoStatus, string> = {
  'PENDENTE': 'bg-yellow-100 text-yellow-800',
  'APROVADO': 'bg-green-100 text-green-800',
  'ESTORNADO': 'bg-red-100 text-red-800',
  'CANCELADO': 'bg-gray-100 text-gray-800',
  'EM_ANALISE': 'bg-blue-100 text-blue-800'
};

const metodoPagamentoLabels: Record<MetodoPagamento, string> = {
  'CARTAO_CREDITO': 'Cartão de Crédito',
  'CARTAO_DEBITO': 'Cartão de Débito',
  'PIX': 'PIX',
  'BOLETO': 'Boleto',
  'TRANSFERENCIA': 'Transferência'
};

export default function ListaTransacoes() {
  const router = useRouter();
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [termoBusca, setTermoBusca] = useState('');
  const [status, setStatus] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [sendingWhatsapp, setSendingWhatsapp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        pagina: paginaAtual,
        limite: ITENS_POR_PAGINA
      };
      
      if (termoBusca) params.busca = termoBusca;
      if (status) params.status = status;
      if (metodoPagamento) params.metodoPagamento = metodoPagamento;
      if (dataInicio) params.dataInicio = dataInicio.toISOString();
      if (dataFim) params.dataFim = dataFim.toISOString();
      
      const response = await axios.get('/api/transacoes/direto-v2', { params });
      setData(response.data);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      setError('Erro ao buscar transações. Tente novamente mais tarde.');
      toast.error('Erro ao buscar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paginaAtual, termoBusca, status, metodoPagamento, dataInicio, dataFim]);

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPaginaAtual(1);
    fetchData();
  };

  const handleLimparFiltros = () => {
    setTermoBusca('');
    setStatus('');
    setMetodoPagamento('');
    setDataInicio(undefined);
    setDataFim(undefined);
    setPaginaAtual(1);
  };

  const handleVerDetalhes = (id: string) => {
    router.push(`/transacoes/${id}`);
  };

  const handleSendWhatsapp = async (transactionId: string) => {
    try {
      setSendingWhatsapp(transactionId);
      
      const response = await axios.post('/api/transacoes/send-whatsapp', {
        transactionId
      });

      if (response.data.success) {
        // Abrir WhatsApp Web com o número e mensagem pré-preenchidos
        const whatsappUrl = `https://wa.me/${response.data.phone}?text=${encodeURIComponent(response.data.message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Copiar código PIX para área de transferência
        navigator.clipboard.writeText(response.data.pixCode);
        toast.success('Código PIX copiado! Abra o WhatsApp para enviar a mensagem.');
      } else {
        throw new Error(response.data.message || 'Erro ao buscar dados da transação');
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar código PIX');
    } finally {
      setSendingWhatsapp(null);
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
            <h3 className="text-lg font-medium mb-2">Erro ao carregar transações</h3>
            <p>{error}</p>
            <Button 
              className="mt-4" 
              onClick={fetchData}
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const transacoes = data?.transacoes || [];
  const totalItems = data?.total || 0;
  const totalPaginas = data?.totalPaginas || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transações</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBusca} className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome, e-mail ou ID"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="w-[150px]">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="ESTORNADO">Estornado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[180px]">
              <label className="text-sm font-medium">Método Pagamento</label>
              <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                  <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[150px]">
              <label className="text-sm font-medium">Data Início</label>
              <DatePicker 
                date={dataInicio} 
                setDate={setDataInicio} 
                placeholder="Selecione" 
              />
            </div>
            
            <div className="w-[150px]">
              <label className="text-sm font-medium">Data Fim</label>
              <DatePicker 
                date={dataFim} 
                setDate={setDataFim} 
                placeholder="Selecione" 
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="outline" onClick={handleLimparFiltros}>
                Limpar
              </Button>
            </div>
          </div>
        </form>
        
        {loading ? (
          <div className="flex justify-center my-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="rounded-md border mt-6 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Método Pagamento</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoes.map((transacao: any) => (
                      <TableRow key={transacao.id} onClick={() => handleVerDetalhes(transacao.id)} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>{transacao.id.substring(0, 8)}</TableCell>
                        <TableCell>{formatDate(transacao.dataCriacao)}</TableCell>
                        <TableCell>
                          <Text fontWeight="medium">{transacao.cliente.nome}</Text>
                          {transacao.cliente.email && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {transacao.cliente.email}
                            </Text>
                          )}
                        </TableCell>
                        <TableCell>
                          {transacao.cliente.telefone ? (
                            <div className="flex items-center gap-2">
                              <a 
                                href={`https://wa.me/${transacao.cliente.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {transacao.cliente.telefone}
                              </a>
                            </div>
                          ) : (
                            <Text color="gray.500">Não informado</Text>
                          )}
                        </TableCell>
                        <TableCell>
                          <Text>{metodoPagamentoLabels[transacao.metodoPagamento as MetodoPagamento] || transacao.metodoPagamento}</Text>
                        </TableCell>
                        <TableCell>
                          <Text fontWeight="medium">{transacao.produto.nome}</Text>
                          {transacao.produto.descricao && (
                            <Text fontSize="xs" color="gray.500" mt={1} noOfLines={2}>
                              {transacao.produto.descricao}
                            </Text>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(transacao.valor)}</TableCell>
                        <TableCell>
                          <Badge
                            className={statusColors[transacao.status as TransacaoStatus] || 'bg-gray-100 text-gray-800'}
                          >
                            {transacao.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDistanceToNow(new Date(transacao.dataCriacao), { addSuffix: true, locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {transacao.status === 'PENDENTE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={`bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 ${
                                sendingWhatsapp === transacao.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              disabled={sendingWhatsapp === transacao.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsapp(transacao.id);
                              }}
                            >
                              {sendingWhatsapp === transacao.id ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FaWhatsapp />
                              )}
                              Enviar PIX
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {transacoes.length > 0 && (
              <div className="flex justify-center mt-8">
                <Pagination 
                  currentPage={paginaAtual}
                  totalPages={totalPaginas} 
                  onChange={setPaginaAtual} 
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 