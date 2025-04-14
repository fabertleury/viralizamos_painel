import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_TRANSACOES } from '../../graphql/queries';
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

const ITENS_POR_PAGINA = 10;

const statusColors = {
  'PENDENTE': 'bg-yellow-100 text-yellow-800',
  'APROVADO': 'bg-green-100 text-green-800',
  'ESTORNADO': 'bg-red-100 text-red-800',
  'CANCELADO': 'bg-gray-100 text-gray-800',
  'EM_ANALISE': 'bg-blue-100 text-blue-800'
};

const metodoPagamentoLabels = {
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
  
  const { loading, error, data, refetch } = useQuery(GET_TRANSACOES, {
    variables: {
      pagina: paginaAtual,
      limite: ITENS_POR_PAGINA,
      busca: termoBusca || undefined,
      status: status || undefined,
      metodoPagamento: metodoPagamento || undefined,
      dataInicio: dataInicio ? dataInicio.toISOString() : undefined,
      dataFim: dataFim ? dataFim.toISOString() : undefined
    },
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error('Erro na consulta GraphQL:', error);
    }
  });

  useEffect(() => {
    refetch();
  }, [paginaAtual, termoBusca, status, metodoPagamento, dataInicio, dataFim, refetch]);

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPaginaAtual(1);
    refetch();
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

  if (error) {
    console.error('Detalhes do erro:', error);
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
            <h3 className="text-lg font-medium mb-2">Erro ao carregar transações</h3>
            <p>{error.message}</p>
            {error.graphQLErrors?.map((err, i) => (
              <p key={i} className="mt-1 text-sm">GraphQL: {err.message}</p>
            ))}
            {error.networkError && (
              <p className="mt-1 text-sm">Network: {error.networkError.message}</p>
            )}
            <Button 
              className="mt-4" 
              onClick={() => refetch()}
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const transacoes = data?.transacoes?.transacoes || [];
  const totalItems = data?.transacoes?.total || 0;
  const totalPaginas = Math.ceil(totalItems / ITENS_POR_PAGINA);

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
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pagamento</TableHead>
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
                      <TableRow key={transacao.id}>
                        <TableCell className="font-medium">{transacao.id.substring(0, 8)}...</TableCell>
                        <TableCell>{formatDate(transacao.dataCriacao)}</TableCell>
                        <TableCell>
                          {transacao.clienteNome}
                          <div className="text-xs text-gray-500">{transacao.clienteEmail}</div>
                        </TableCell>
                        <TableCell>{formatCurrency(transacao.valor / 100)}</TableCell>
                        <TableCell>
                          <Badge 
                            className={statusColors[transacao.status] || 'bg-gray-100 text-gray-800'}
                          >
                            {transacao.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{metodoPagamentoLabels[transacao.metodoPagamento] || transacao.metodoPagamento}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleVerDetalhes(transacao.id)}>
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {totalPaginas > 0 && (
              <div className="flex justify-end mt-4">
                <Pagination
                  currentPage={paginaAtual}
                  totalPages={totalPaginas}
                  onPageChange={setPaginaAtual}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 