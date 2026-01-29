import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getNotasPendentes, 
  NotaEntrada,
  NotaEntradaStatus,
  AtuacaoAtual,
  TipoPagamentoNota,
  podeEditarNota
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { 
  Eye, 
  Plus,
  ClipboardCheck,
  Download, 
  Filter, 
  X, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  FileText,
  DollarSign,
  Package,
  Lock,
  Warehouse,
  Landmark
} from 'lucide-react';
import { toast } from 'sonner';

export default function EstoqueNotasPendencias() {
  const navigate = useNavigate();
  const [notas, setNotas] = useState<NotaEntrada[]>(getNotasPendentes());
  
  const fornecedoresList = getFornecedores();
  
  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    status: 'todos',
    tipoPagamento: 'todos',
    palavraChave: ''
  });

  // Filtrar notas
  const notasFiltradas = useMemo(() => {
    let filtered = notas.filter(n => {
      if (filters.dataInicio && n.data < filters.dataInicio) return false;
      if (filters.dataFim && n.data > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && n.fornecedor !== filters.fornecedor) return false;
      if (filters.status !== 'todos' && n.status !== filters.status) return false;
      if (filters.tipoPagamento !== 'todos' && n.tipoPagamento !== filters.tipoPagamento) return false;
      if (filters.palavraChave && 
          !n.numeroNota.toLowerCase().includes(filters.palavraChave.toLowerCase()) &&
          !n.fornecedor.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });

    // Ordenar: alertas primeiro, depois por data
    return filtered.sort((a, b) => {
      // Notas com divergência primeiro
      if (a.status === 'Com Divergencia' && b.status !== 'Com Divergencia') return -1;
      if (a.status !== 'Com Divergencia' && b.status === 'Com Divergencia') return 1;
      // Depois por data (mais antigas primeiro para SLA)
      return new Date(a.data).getTime() - new Date(b.data).getTime();
    });
  }, [notas, filters]);

  // Cards de resumo
  const resumo = useMemo(() => {
    const total = notasFiltradas.length;
    const aguardandoConferencia = notasFiltradas.filter(n => 
      ['Aguardando Conferencia', 'Conferencia Parcial'].includes(n.status)
    ).length;
    const aguardandoPagamento = notasFiltradas.filter(n => 
      ['Aguardando Pagamento Inicial', 'Aguardando Pagamento Final'].includes(n.status)
    ).length;
    const comDivergencia = notasFiltradas.filter(n => n.status === 'Com Divergencia').length;
    const valorTotal = notasFiltradas.reduce((acc, n) => acc + n.valorTotal, 0);
    const atuacaoEstoque = notasFiltradas.filter(n => n.atuacaoAtual === 'Estoque').length;
    
    return { total, aguardandoConferencia, aguardandoPagamento, comDivergencia, valorTotal, atuacaoEstoque };
  }, [notasFiltradas]);

  const getStatusBadge = (status: NotaEntradaStatus) => {
    const statusConfig: Record<NotaEntradaStatus, { bg: string; text: string; label: string }> = {
      'Criada': { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Criada' },
      'Aguardando Pagamento Inicial': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Inicial' },
      'Pagamento Parcial Realizado': { bg: 'bg-primary/20', text: 'text-primary', label: 'Pag. Parcial' },
      'Pagamento Concluido': { bg: 'bg-primary/30', text: 'text-primary', label: 'Pago' },
      'Aguardando Conferencia': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Aguard. Conf.' },
      'Conferencia Parcial': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Conf. Parcial' },
      'Conferencia Concluida': { bg: 'bg-primary/40', text: 'text-primary', label: 'Conf. Concluída' },
      'Aguardando Pagamento Final': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Final' },
      'Com Divergencia': { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Divergência' },
      'Finalizada': { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Finalizada' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    );
  };

  const getTipoPagamentoBadge = (tipo: TipoPagamentoNota) => {
    switch (tipo) {
      case 'Pagamento 100% Antecipado':
        return <Badge variant="outline" className="bg-primary/10 text-primary">100% Antecipado</Badge>;
      case 'Pagamento Parcial':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Parcial</Badge>;
      case 'Pagamento Pos':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Pós</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual) => {
    switch (atuacao) {
      case 'Estoque':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <Warehouse className="h-3 w-3" />
            Estoque
          </Badge>
        );
      case 'Financeiro':
        return (
          <Badge className="bg-accent text-accent-foreground gap-1">
            <Landmark className="h-3 w-3" />
            Financeiro
          </Badge>
        );
      case 'Encerrado':
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{atuacao}</Badge>;
    }
  };

  // Verificar se pode editar (atuação é Estoque)
  const podeEditar = (nota: NotaEntrada) => podeEditarNota(nota, 'Estoque');

  const getRowClass = (nota: NotaEntrada) => {
    if (nota.status === 'Com Divergencia') return 'bg-destructive/10';
    if (nota.alertas.some(a => !a.resolvido && a.tipo === 'status_critico')) return 'bg-warning/10';
    return '';
  };

  const calcularDiasDecorridos = (data: string): number => {
    const dataInicio = new Date(data);
    const hoje = new Date();
    return Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleCadastrarProdutos = (nota: NotaEntrada) => {
    navigate(`/estoque/nota/${nota.id}/cadastrar-produtos`);
  };

  const handleConferir = (nota: NotaEntrada) => {
    navigate(`/estoque/nota/${nota.id}/conferencia`);
  };

  const handleVerDetalhes = (nota: NotaEntrada) => {
    navigate(`/estoque/nota/${nota.id}`);
  };

  const handleExport = () => {
    const dataToExport = notasFiltradas.map(n => ({
      'Nº Nota': n.numeroNota,
      Fornecedor: n.fornecedor,
      'Tipo Pagamento': n.tipoPagamento,
      Status: n.status,
      'Qtd Informada': n.qtdInformada,
      'Qtd Cadastrada': n.qtdCadastrada,
      'Qtd Conferida': n.qtdConferida,
      'Valor Total': formatCurrency(n.valorTotal),
      'Valor Pago': formatCurrency(n.valorPago),
      'Valor Pendente': formatCurrency(n.valorPendente),
      'Dias Decorridos': calcularDiasDecorridos(n.data)
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notas-pendentes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      status: 'todos',
      tipoPagamento: 'todos',
      palavraChave: ''
    });
  };

  const handleRefresh = () => {
    setNotas(getNotasPendentes());
    toast.success('Dados atualizados!');
  };

  // Lista de status para filtro
  const statusOptions: NotaEntradaStatus[] = [
    'Criada',
    'Aguardando Pagamento Inicial',
    'Pagamento Parcial Realizado',
    'Pagamento Concluido',
    'Aguardando Conferencia',
    'Conferencia Parcial',
    'Conferencia Concluida',
    'Aguardando Pagamento Final',
    'Com Divergencia'
  ];

  return (
    <EstoqueLayout title="Notas Pendentes">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Notas</p>
                  <p className="text-2xl font-bold">{resumo.total}</p>
                </div>
                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguard. Conferência</p>
                  <p className="text-2xl font-bold text-primary">{resumo.aguardandoConferencia}</p>
                </div>
                <ClipboardCheck className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguard. Pagamento</p>
                  <p className="text-2xl font-bold text-primary">{resumo.aguardandoPagamento}</p>
                </div>
                <DollarSign className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Com Divergência</p>
                  <p className="text-2xl font-bold text-destructive">{resumo.comDivergencia}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(resumo.valorTotal)}</p>
                </div>
                <Package className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select value={filters.fornecedor} onValueChange={(value) => setFilters({ ...filters, fornecedor: value })}>
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {fornecedoresList.map(f => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tipoPagamento">Tipo Pagamento</Label>
                <Select value={filters.tipoPagamento} onValueChange={(value) => setFilters({ ...filters, tipoPagamento: value })}>
                  <SelectTrigger id="tipoPagamento">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pagamento 100% Antecipado">100% Antecipado</SelectItem>
                    <SelectItem value="Pagamento Parcial">Parcial</SelectItem>
                    <SelectItem value="Pagamento Pos">Pós</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="palavraChave">Palavra-chave</Label>
                <Input
                  id="palavraChave"
                  placeholder="Buscar..."
                  value={filters.palavraChave}
                  onChange={(e) => setFilters({ ...filters, palavraChave: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Notas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Notas Pendentes</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleRefresh} variant="outline">
                  Atualizar
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo Pag.</TableHead>
                    <TableHead>Atuação Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Qtd Inf./Cad./Conf.</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma nota pendente encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    notasFiltradas.map(nota => (
                      <TableRow key={nota.id} className={getRowClass(nota)}>
                        <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                        <TableCell>{nota.fornecedor}</TableCell>
                        <TableCell>{getTipoPagamentoBadge(nota.tipoPagamento)}</TableCell>
                        <TableCell>{getAtuacaoBadge(nota.atuacaoAtual)}</TableCell>
                        <TableCell>{getStatusBadge(nota.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium">{nota.qtdInformada}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-primary font-medium">{nota.qtdCadastrada}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-primary font-medium">{nota.qtdConferida}</span>
                            {nota.qtdCadastrada > 0 && (
                              <Progress 
                                value={(nota.qtdConferida / nota.qtdCadastrada) * 100} 
                                className="w-12 h-2 ml-2" 
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(nota.valorTotal)}</TableCell>
                        <TableCell>
                          {(() => {
                            const dias = calcularDiasDecorridos(nota.data);
                            if (dias >= 5) {
                              return (
                                <div className="flex items-center gap-1 text-destructive">
                                  <AlertCircle className="h-3 w-3" />
                                  {dias}d
                                </div>
                              );
                            } else if (dias >= 3) {
                              return (
                                <div className="flex items-center gap-1 text-warning">
                                  <AlertTriangle className="h-3 w-3" />
                                  {dias}d
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {dias}d
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* Botão Cadastrar Produtos - só se atuação for Estoque */}
                            {podeEditar(nota) && ['Aguardando Conferencia', 'Conferencia Parcial'].includes(nota.status) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCadastrarProdutos(nota)}
                                title="Cadastrar produtos"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Botão Conferir - só se atuação for Estoque */}
                            {podeEditar(nota) && ['Aguardando Conferencia', 'Conferencia Parcial'].includes(nota.status) && nota.qtdCadastrada > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleConferir(nota)}
                                title="Realizar conferência"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Indicador de bloqueio se não pode editar */}
                            {!podeEditar(nota) && nota.atuacaoAtual !== 'Encerrado' && (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs px-2">
                                <Lock className="h-3 w-3" />
                                <span>Aguardando {nota.atuacaoAtual}</span>
                              </div>
                            )}
                            {/* Botão Ver Detalhes - sempre disponível */}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleVerDetalhes(nota)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
