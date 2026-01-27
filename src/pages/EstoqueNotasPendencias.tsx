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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getPendencias, 
  PendenciaFinanceira
} from '@/utils/pendenciasFinanceiraApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { 
  Eye, 
  Pencil,
  Download, 
  Filter, 
  X, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle,
  FileText,
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';

export default function EstoqueNotasPendencias() {
  const navigate = useNavigate();
  const [pendencias, setPendencias] = useState<PendenciaFinanceira[]>(getPendencias());
  const [pendenciaSelecionada, setPendenciaSelecionada] = useState<PendenciaFinanceira | null>(null);
  const [dialogDetalhes, setDialogDetalhes] = useState(false);
  
  const fornecedoresList = getFornecedores();
  
  // Filtros
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    statusConferencia: 'todos',
    palavraChave: ''
  });

  // Filtrar pendências com foco em status de conferência
  const pendenciasFiltradas = useMemo(() => {
    let filtered = pendencias.filter(p => {
      if (filters.dataInicio && p.dataCriacao < filters.dataInicio) return false;
      if (filters.dataFim && p.dataCriacao > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && p.fornecedor !== filters.fornecedor) return false;
      if (filters.statusConferencia !== 'todos' && p.statusConferencia !== filters.statusConferencia) return false;
      if (filters.palavraChave && 
          !p.notaId.toLowerCase().includes(filters.palavraChave.toLowerCase()) &&
          !p.fornecedor.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });

    // Ordenar: SLA crítico primeiro, depois por status de conferência, depois por data
    return filtered.sort((a, b) => {
      // Prioridade: alertas SLA primeiro
      if (a.slaStatus === 'critico' && b.slaStatus !== 'critico') return -1;
      if (a.slaStatus !== 'critico' && b.slaStatus === 'critico') return 1;
      if (a.slaStatus === 'aviso' && b.slaStatus === 'normal') return -1;
      if (a.slaStatus === 'normal' && b.slaStatus === 'aviso') return 1;
      // Depois por status de conferência (não completas primeiro)
      if (a.statusConferencia !== 'Conferência Completa' && b.statusConferencia === 'Conferência Completa') return -1;
      if (a.statusConferencia === 'Conferência Completa' && b.statusConferencia !== 'Conferência Completa') return 1;
      // Por fim, por data
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });
  }, [pendencias, filters]);

  // Cards de resumo com foco no Estoque
  const resumo = useMemo(() => {
    const emConferencia = pendenciasFiltradas.filter(p => p.statusConferencia === 'Em Conferência').length;
    const valorPendente = pendenciasFiltradas.reduce((acc, p) => acc + p.valorPendente, 0);
    const valorConferido = pendenciasFiltradas.reduce((acc, p) => acc + p.valorConferido, 0);
    const alertasSLA = pendenciasFiltradas.filter(p => p.slaAlerta && p.statusPagamento !== 'Pago').length;
    
    return { emConferencia, valorPendente, valorConferido, alertasSLA };
  }, [pendenciasFiltradas]);

  const getSLABadge = (pendencia: PendenciaFinanceira) => {
    if (pendencia.statusPagamento === 'Pago') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600">Pago</Badge>;
    }
    
    switch (pendencia.slaStatus) {
      case 'critico':
        return (
          <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
      case 'aviso':
        return (
          <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="h-3 w-3" />
            {pendencia.diasDecorridos}d
          </div>
        );
    }
  };

  const getStatusPagamentoBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Pago</Badge>;
      case 'Parcial':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Parcial</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aguardando</Badge>;
    }
  };

  const getStatusConferenciaBadge = (status: string) => {
    switch (status) {
      case 'Conferência Completa':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Completa</Badge>;
      case 'Discrepância Detectada':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Discrepância</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Em Conf.</Badge>;
    }
  };

  const getRowClass = (pendencia: PendenciaFinanceira) => {
    if (pendencia.statusPagamento === 'Pago') return 'bg-green-500/10';
    if (pendencia.slaStatus === 'critico') return 'bg-red-500/10';
    if (pendencia.slaStatus === 'aviso') return 'bg-yellow-500/10';
    if (pendencia.statusConferencia === 'Discrepância Detectada') return 'bg-orange-500/10';
    return '';
  };

  const handleVerDetalhes = (pendencia: PendenciaFinanceira) => {
    setPendenciaSelecionada(pendencia);
    setDialogDetalhes(true);
  };

  const handleEditarNota = (notaId: string) => {
    navigate(`/estoque/nota/${notaId}`);
  };

  const handleExport = () => {
    const dataToExport = pendenciasFiltradas.map(p => ({
      'Nº Nota': p.notaId,
      Fornecedor: p.fornecedor,
      'Valor Total': formatCurrency(p.valorTotal),
      'Valor Conferido': formatCurrency(p.valorConferido),
      'Valor Pendente': formatCurrency(p.valorPendente),
      '% Conferência': `${p.percentualConferencia}%`,
      'Status Conferência': p.statusConferencia,
      'Status Pagamento': p.statusPagamento,
      'Dias Decorridos': p.diasDecorridos,
      SLA: p.slaStatus
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque-pendencias-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      statusConferencia: 'todos',
      palavraChave: ''
    });
  };

  const handleRefresh = () => {
    setPendencias(getPendencias());
    toast.success('Dados atualizados!');
  };

  return (
    <EstoqueLayout title="Notas - Pendências">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Conferência</p>
                  <p className="text-2xl font-bold">{resumo.emConferencia}</p>
                </div>
                <ClipboardList className="h-10 w-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Pendente</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(resumo.valorPendente)}</p>
                </div>
                <FileText className="h-10 w-10 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Conferido</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.valorConferido)}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas SLA</p>
                  <p className="text-2xl font-bold text-red-600">{resumo.alertasSLA}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <Label htmlFor="statusConferencia">Status Conferência</Label>
                <Select value={filters.statusConferencia} onValueChange={(value) => setFilters({ ...filters, statusConferencia: value })}>
                  <SelectTrigger id="statusConferencia">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Em Conferência">Em Conferência</SelectItem>
                    <SelectItem value="Conferência Completa">Completa</SelectItem>
                    <SelectItem value="Discrepância Detectada">Discrepância</SelectItem>
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

        {/* Tabela de Pendências */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Pendências - Conferência de Notas</CardTitle>
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
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Conferido</TableHead>
                    <TableHead>% Conf.</TableHead>
                    <TableHead>Conferência</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma pendência encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendenciasFiltradas.map(pendencia => (
                      <TableRow key={pendencia.id} className={getRowClass(pendencia)}>
                        <TableCell className="font-mono text-xs">{pendencia.notaId}</TableCell>
                        <TableCell>{pendencia.fornecedor}</TableCell>
                        <TableCell>{formatCurrency(pendencia.valorTotal)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pendencia.percentualConferencia} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(pendencia.valorConferido)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            pendencia.percentualConferencia === 100 
                              ? 'bg-green-500/10 text-green-600' 
                              : pendencia.percentualConferencia >= 50 
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-yellow-500/10 text-yellow-600'
                          }>
                            {pendencia.percentualConferencia}%
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusConferenciaBadge(pendencia.statusConferencia)}</TableCell>
                        <TableCell>{getStatusPagamentoBadge(pendencia.statusPagamento)}</TableCell>
                        <TableCell>{getSLABadge(pendencia)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {/* Botão Editar - visível apenas para notas não pagas */}
                            {pendencia.statusPagamento !== 'Pago' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditarNota(pendencia.notaId)}
                                title="Editar nota"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Botão Ver Detalhes - sempre visível */}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleVerDetalhes(pendencia)}
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

        {/* Modal de Detalhes (Somente Leitura) */}
        <Dialog open={dialogDetalhes} onOpenChange={setDialogDetalhes}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes - Nota {pendenciaSelecionada?.notaId}
              </DialogTitle>
            </DialogHeader>
            
            {pendenciaSelecionada && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{pendenciaSelecionada.fornecedor}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Data Entrada</p>
                    <p className="font-medium">{new Date(pendenciaSelecionada.dataCriacao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Dias Decorridos</p>
                    <p className="font-medium">{pendenciaSelecionada.diasDecorridos} dias</p>
                  </div>
                </div>

                {/* Progresso de Conferência */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Progresso de Conferência</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Aparelhos conferidos</span>
                      <span className="font-medium">{pendenciaSelecionada.aparelhosConferidos}/{pendenciaSelecionada.aparelhosTotal}</span>
                    </div>
                    <Progress value={pendenciaSelecionada.percentualConferencia} className="h-3" />
                    <p className="text-center text-sm font-medium">{pendenciaSelecionada.percentualConferencia}%</p>
                  </div>
                </div>

                {/* Valores */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Valores</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(pendenciaSelecionada.valorTotal)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-sm text-green-600">Conferido</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(pendenciaSelecionada.valorConferido)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-500/10">
                      <p className="text-sm text-orange-600">Pendente</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(pendenciaSelecionada.valorPendente)}</p>
                    </div>
                  </div>
                </div>

                {/* Status Financeiro */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Status Financeiro</h4>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status Pagamento</p>
                      {getStatusPagamentoBadge(pendenciaSelecionada.statusPagamento)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status Conferência</p>
                      {getStatusConferenciaBadge(pendenciaSelecionada.statusConferencia)}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3">Timeline (Compartilhada com Financeiro)</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {pendenciaSelecionada.timeline.map((entry) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-muted-foreground">
                            {new Date(entry.data).toLocaleDateString('pt-BR')} {new Date(entry.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="font-medium">{entry.titulo}</p>
                          <p className="text-muted-foreground">{entry.descricao}</p>
                          {entry.responsavel && (
                            <p className="text-xs text-muted-foreground">Por: {entry.responsavel}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {pendenciaSelecionada?.statusPagamento !== 'Pago' && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDialogDetalhes(false);
                    handleEditarNota(pendenciaSelecionada!.notaId);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Nota
                </Button>
              )}
              <Button onClick={() => setDialogDetalhes(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
