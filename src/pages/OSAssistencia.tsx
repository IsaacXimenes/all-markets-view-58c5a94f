import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrdensServico, calcularSLADias, formatCurrency, exportOSToCSV, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { getProdutosPendentes, ProdutoPendente } from '@/utils/osApi';
import { Plus, Eye, FileText, Download, AlertTriangle, Clock, Edit, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIMEI } from '@/utils/imeiMask';

export default function OSAssistencia() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const { obterLojasTipoLoja, obterNomeLoja, obterTecnicos, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const tecnicos = obterTecnicos();

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroIMEI, setFiltroIMEI] = useState('');
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroSetor, setFiltroSetor] = useState('todos');

  const ordensFiltradas = useMemo(() => {
    return ordensServico.filter(os => {
      // Filtro por data início
      if (filtroDataInicio) {
        const dataOS = new Date(os.dataHora).toISOString().split('T')[0];
        if (dataOS < filtroDataInicio) return false;
      }

      // Filtro por data fim
      if (filtroDataFim) {
        const dataOS = new Date(os.dataHora).toISOString().split('T')[0];
        if (dataOS > filtroDataFim) return false;
      }

      // Filtro por IMEI
      if (filtroIMEI) {
        const hasIMEI = os.pecas.some(p => p.imei?.includes(filtroIMEI.replace(/-/g, '')));
        if (!hasIMEI) return false;
      }

      // Filtro por técnico
      if (filtroTecnico && filtroTecnico !== 'todos') {
        if (os.tecnicoId !== filtroTecnico) return false;
      }

      // Filtro por status
      if (filtroStatus && filtroStatus !== 'todos') {
        if (os.status !== filtroStatus) return false;
      }

      // Filtro por setor
      if (filtroSetor && filtroSetor !== 'todos') {
        if (os.setor !== filtroSetor) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico, filtroDataInicio, filtroDataFim, filtroIMEI, filtroTecnico, filtroStatus, filtroSetor]);

  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || '-';
  };

  const getLojaNome = (lojaId: string) => {
    return obterNomeLoja(lojaId);
  };

  const getTecnicoNome = (tecnicoId: string) => {
    return obterNomeColaborador(tecnicoId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Concluído</Badge>;
      case 'Em serviço':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em serviço</Badge>;
      case 'Aguardando Peça':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
      case 'Solicitação Enviada':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Solicitação Enviada</Badge>;
      case 'Em Análise':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Em Análise</Badge>;
      case 'Peça Recebida':
        return <Badge className="bg-teal-500 hover:bg-teal-600">Peça Recebida</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLADisplay = (dataHora: string) => {
    const dias = calcularSLADias(dataHora);
    let bgClass = '';
    let icon = null;

    if (dias >= 5) {
      bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      icon = <AlertTriangle className="h-3 w-3" />;
    } else if (dias >= 3) {
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      icon = <Clock className="h-3 w-3" />;
    }

    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1', bgClass)}>
        {icon}
        {dias} dias
      </span>
    );
  };

  const getSetorBadge = (setor: string) => {
    switch (setor) {
      case 'GARANTIA':
        return <Badge variant="outline" className="border-green-500 text-green-600">Garantia</Badge>;
      case 'ASSISTÊNCIA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Assistência</Badge>;
      case 'TROCA':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Troca</Badge>;
      default:
        return <Badge variant="outline">{setor}</Badge>;
    }
  };

  const handleExport = () => {
    exportOSToCSV(ordensFiltradas, 'ordens-servico.csv');
  };

  const getIMEI = (os: OrdemServico) => {
    // Primeiro verificar se tem IMEI direto na OS
    if (os.imeiAparelho) return formatIMEI(os.imeiAparelho);
    // Senão, buscar nas peças
    const pecaComIMEI = os.pecas.find(p => p.imei);
    return pecaComIMEI?.imei ? formatIMEI(pecaComIMEI.imei) : '-';
  };

  const getOrigemBadge = (os: OrdemServico) => {
    if (!os.origemOS || os.origemOS === 'Avulso') {
      return <Badge variant="outline" className="text-muted-foreground">Avulso</Badge>;
    }
    switch (os.origemOS) {
      case 'Venda':
        return <Badge variant="outline" className="border-green-500 text-green-600">Venda</Badge>;
      case 'Garantia':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Garantia</Badge>;
      case 'Estoque':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Estoque</Badge>;
      default:
        return <Badge variant="outline">{os.origemOS}</Badge>;
    }
  };

  const getValorProduto = (os: OrdemServico) => {
    if (os.origemOS === 'Venda' && os.valorProdutoOrigem) {
      return (
        <span className="font-medium text-green-600">
          {formatCurrency(os.valorProdutoOrigem)}
        </span>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  // Stats
  const totalOS = ordensFiltradas.length;
  const osConcluidas = ordensFiltradas.filter(os => os.status === 'Serviço concluído').length;
  const osEmAndamento = ordensFiltradas.filter(os => os.status === 'Em serviço').length;
  const osAguardando = ordensFiltradas.filter(os => 
    os.status === 'Aguardando Peça' || 
    os.status === 'Solicitação Enviada' || 
    os.status === 'Em Análise' || 
    os.status === 'Peça Recebida'
  ).length;
  const valorTotal = ordensFiltradas.reduce((acc, os) => acc + os.valorTotal, 0);

  // Produtos de Troca (Trade-In) Stats
  const produtosPendentes = getProdutosPendentes();
  const produtosTroca = produtosPendentes.filter(p => p.origemEntrada === 'Base de Troca');
  const totalProdutosTroca = produtosTroca.length;
  const valorTotalTroca = produtosTroca.reduce((acc, p) => acc + (p.valorOrigem || 0), 0);

  return (
    <OSLayout title="Assistência">
      {/* Dashboard Cards - Sticky */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalOS}</div>
              <div className="text-xs text-muted-foreground">Total de OS</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{osConcluidas}</div>
              <div className="text-xs text-muted-foreground">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{osEmAndamento}</div>
              <div className="text-xs text-muted-foreground">Em Serviço</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{osAguardando}</div>
              <div className="text-xs text-muted-foreground">Aguardando/Peças</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
              <div className="text-xs text-muted-foreground">Valor Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Card de Produtos de Troca */}
        {totalProdutosTroca > 0 && (
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 mb-4">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <RefreshCcw className="h-4 w-4" />
                Produtos de Troca (Trade-In)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div>
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalProdutosTroca}</span>
                    <span className="text-xs text-muted-foreground ml-2">produtos pendentes</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(valorTotalTroca)}</span>
                    <span className="text-xs text-muted-foreground ml-2">valor total</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/40"
                  onClick={() => navigate('/os/produtos-pendentes')}
                >
                  Ver Produtos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={e => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={e => setFiltroDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>IMEI</Label>
              <Input
                placeholder="Buscar por IMEI..."
                value={filtroIMEI}
                onChange={e => setFiltroIMEI(formatIMEI(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Técnico</Label>
              <AutocompleteColaborador
                value={filtroTecnico === 'todos' ? '' : filtroTecnico}
                onChange={(v) => setFiltroTecnico(v || 'todos')}
                filtrarPorTipo="tecnicos"
                placeholder="Todos"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                  <SelectItem value="Em serviço">Em serviço</SelectItem>
                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                  <SelectItem value="Solicitação Enviada">Solicitação Enviada</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Peça Recebida">Peça Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="GARANTIA">Garantia</SelectItem>
                  <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                  <SelectItem value="TROCA">Troca</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => navigate('/os/assistencia/nova')} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Nova Assistência
              </Button>
              <Button variant="outline" onClick={() => navigate('/assistencia/lotes-pagamento')} title="Lotes de Pagamento">
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº OS</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Valor Produto</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensFiltradas.map(os => (
              <TableRow key={os.id}>
                <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                <TableCell className="text-xs">
                  {new Date(os.dataHora).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>{getClienteNome(os.clienteId)}</TableCell>
                <TableCell className="font-mono text-xs">{getIMEI(os)}</TableCell>
                <TableCell>{getOrigemBadge(os)}</TableCell>
                <TableCell>{getValorProduto(os)}</TableCell>
                <TableCell>{getSetorBadge(os.setor)}</TableCell>
                <TableCell>{getTecnicoNome(os.tecnicoId)}</TableCell>
                <TableCell className="text-xs">{getLojaNome(os.lojaId)}</TableCell>
                <TableCell>{getStatusBadge(os.status)}</TableCell>
                <TableCell>{getSLADisplay(os.dataHora)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(os.valorTotal)}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Editar"
                      onClick={() => navigate(`/os/assistencia/editar/${os.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Detalhes"
                      onClick={() => navigate(`/os/assistencia/${os.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Gerar Recibo"
                      onClick={() => {
                        alert(`Recibo da OS ${os.id} gerado com sucesso!`);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {ordensFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  Nenhuma ordem de serviço encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </OSLayout>
  );
}
