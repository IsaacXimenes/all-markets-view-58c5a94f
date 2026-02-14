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
import { Plus, Eye, FileText, Download, AlertTriangle, Clock, Edit, RefreshCcw, Wrench, DollarSign, UserCheck, CreditCard, CheckCircle, Package, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

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
  const [filtroAtuacao, setFiltroAtuacao] = useState<string>('todos');

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
        const filtroDigits = unformatIMEI(filtroIMEI);
        const hasIMEI = os.pecas.some(p => p.imei && unformatIMEI(p.imei).includes(filtroDigits)) ||
          (os.imeiAparelho && unformatIMEI(os.imeiAparelho).includes(filtroDigits));
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

      // Filtro por atuação
      if (filtroAtuacao && filtroAtuacao !== 'todos') {
        if (filtroAtuacao === 'tecnico') {
          if (os.proximaAtuacao !== 'Técnico: Avaliar/Executar') return false;
        } else if (filtroAtuacao === 'aguardando_pagamento') {
          if (os.proximaAtuacao !== 'Vendedor: Registrar Pagamento' && os.proximaAtuacao !== 'Atendente') return false;
        } else if (filtroAtuacao === 'pendentes_financeiro') {
          if (os.proximaAtuacao !== 'Financeiro: Conferir Lançamento') return false;
        } else if (filtroAtuacao === 'gestor') {
          if (os.proximaAtuacao !== 'Gestor: Aprovar Peça') return false;
        } else if (filtroAtuacao === 'logistica') {
          if (os.proximaAtuacao !== 'Logística: Enviar Peça') return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico, filtroDataInicio, filtroDataFim, filtroIMEI, filtroTecnico, filtroStatus, filtroAtuacao]);

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
      case 'Em Aberto':
        return <Badge className="bg-slate-500 hover:bg-slate-600">Em Aberto</Badge>;
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Serviço Concluído</Badge>;
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
      case 'Pagamento Concluído':
        return <Badge className="bg-teal-600 hover:bg-teal-700">Pagamento Concluído</Badge>;
      case 'Aguardando Recebimento':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Aguardando Recebimento</Badge>;
      case 'Em Execução':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">Em Execução</Badge>;
      case 'Aguardando Pagamento':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Pagamento</Badge>;
      case 'Aguardando Conferência':
        return <Badge className="bg-violet-500 hover:bg-violet-600">Aguardando Conferência</Badge>;
      case 'Concluído':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Concluído</Badge>;
      case 'Finalizado':
        return <Badge className="bg-emerald-700 hover:bg-emerald-800">Finalizado</Badge>;
      case 'Recusada pelo Técnico':
        return <Badge variant="destructive">Recusada pelo Técnico</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProximaAtuacaoBadge = (atuacao?: string) => {
    switch (atuacao) {
      case 'Técnico: Avaliar/Executar':
        return <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs">Técnico</Badge>;
      case 'Vendedor: Registrar Pagamento':
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Vendedor</Badge>;
      case 'Atendente':
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">Atendente</Badge>;
      case 'Financeiro: Conferir Lançamento':
        return <Badge variant="outline" className="border-purple-500 text-purple-600 text-xs">Financeiro</Badge>;
      case 'Gestor: Aprovar Peça':
        return <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">Gestor</Badge>;
      case 'Logística: Enviar Peça':
        return <Badge variant="outline" className="border-cyan-500 text-cyan-600 text-xs">Logística</Badge>;
      case 'Concluído':
        return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Concluído</Badge>;
      default:
        return <span className="text-muted-foreground text-xs">-</span>;
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
    if (!os.origemOS || os.origemOS === 'Balcão') {
      return <Badge variant="outline" className="text-muted-foreground">Balcão</Badge>;
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
    // Verificar se tem valor de produto de origem (venda)
    if (os.origemOS === 'Venda' && os.valorProdutoOrigem) {
      return (
        <span className="font-medium text-green-600">
          {formatCurrency(os.valorProdutoOrigem)}
        </span>
      );
    }
    
    // Para produtos de Trade-In (Base de Troca), buscar valor nos produtos pendentes
    if (os.origemOS === 'Estoque' || os.origemOS === 'Garantia') {
      // Buscar produto pendente relacionado pelo IMEI
      const imeiOS = os.imeiAparelho || os.pecas.find(p => p.imei)?.imei;
      if (imeiOS) {
        const produtoTroca = produtosPendentes.find(p => 
          p.imei === imeiOS && p.origemEntrada === 'Base de Troca'
        );
        if (produtoTroca && produtoTroca.valorOrigem) {
          return (
            <span className="font-medium text-purple-600">
              {formatCurrency(produtoTroca.valorOrigem)}
            </span>
          );
        }
      }
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
    <OSLayout title="Nova Assistência">
      {/* Dashboard Cards - Sticky */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de OS</p>
                  <p className="text-2xl font-bold">{totalOS}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{osConcluidas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wrench className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Serviço</p>
                  <p className="text-2xl font-bold text-blue-600">{osEmAndamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Aguardando/Peças</p>
                  <p className="text-2xl font-bold text-yellow-600">{osAguardando}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Valor Total</p>
                  <p className="text-xl font-bold truncate">{formatCurrency(valorTotal)}</p>
                </div>
              </div>
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

      {/* Filtros Rápidos de Atuação */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={filtroAtuacao === 'todos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('todos')}
        >
          Todas
        </Button>
        <Button
          variant={filtroAtuacao === 'tecnico' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('tecnico')}
          className="gap-1"
        >
          <Wrench className="h-3.5 w-3.5" />
          Técnico
        </Button>
        <Button
          variant={filtroAtuacao === 'aguardando_pagamento' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('aguardando_pagamento')}
          className="gap-1"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Aguardando Pagamento
        </Button>
        <Button
          variant={filtroAtuacao === 'pendentes_financeiro' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('pendentes_financeiro')}
          className="gap-1"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Pendentes Financeiro
        </Button>
        <Button
          variant={filtroAtuacao === 'gestor' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('gestor')}
          className="gap-1"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Gestor
        </Button>
        <Button
          variant={filtroAtuacao === 'logistica' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroAtuacao('logistica')}
          className="gap-1"
        >
          <Package className="h-3.5 w-3.5" />
          Logística
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                  <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                  <SelectItem value="Em serviço">Em serviço</SelectItem>
                  <SelectItem value="Em Execução">Em Execução</SelectItem>
                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                  <SelectItem value="Peça Recebida">Peça Recebida</SelectItem>
                  <SelectItem value="Pagamento Concluído">Pagamento Concluído</SelectItem>
                  <SelectItem value="Solicitação Enviada">Solicitação Enviada</SelectItem>
                  <SelectItem value="Aguardando Conferência">Aguardando Conferência</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                  <SelectItem value="Pendente de Pagamento">Pendente de Pagamento</SelectItem>
                  <SelectItem value="Aguardando Financeiro">Aguardando Financeiro</SelectItem>
                  <SelectItem value="Liquidado">Liquidado</SelectItem>
                  <SelectItem value="Recusada pelo Técnico">Recusada pelo Técnico</SelectItem>
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
              <TableHead>Técnico</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Próxima Atuação</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensFiltradas.map(os => (
              <TableRow key={os.id} className={os.recusadaTecnico ? 'bg-red-500/15' : ''}>
                <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                <TableCell className="text-xs">
                  {new Date(os.dataHora).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>{getClienteNome(os.clienteId)}</TableCell>
                <TableCell className="font-mono text-xs">{getIMEI(os)}</TableCell>
                <TableCell>{getOrigemBadge(os)}</TableCell>
                <TableCell>{getTecnicoNome(os.tecnicoId)}</TableCell>
                <TableCell className="text-xs">{getLojaNome(os.lojaId)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(os.status)}
                    {os.recusadaTecnico && os.motivoRecusaTecnico && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <XCircle className="h-3 w-3" />
                              Recusada
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium text-xs">Motivo da Recusa:</p>
                            <p className="text-xs">{os.motivoRecusaTecnico}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getProximaAtuacaoBadge(os.proximaAtuacao)}</TableCell>
                <TableCell>{getSLADisplay(os.dataHora)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(os.valorTotal)}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Editar"
                      onClick={() => navigate(`/os/assistencia/${os.id}?edit=true`)}
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
                    {(os.status === 'Serviço concluído' || os.status === 'Aguardando Pagamento') && os.proximaAtuacao === 'Atendente' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Registrar Pagamento"
                        className="text-amber-600 hover:text-amber-700"
                        onClick={() => navigate(`/os/assistencia/${os.id}?pagamento=true`)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
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
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
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
