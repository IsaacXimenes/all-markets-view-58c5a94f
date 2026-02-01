import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveCardGrid, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { 
  getNotasParaEstoque, 
  NotaEntrada,
  NotaEntradaStatus
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { TabelaNotasPendencias } from '@/components/estoque/TabelaNotasPendencias';
import { 
  Download, 
  Filter, 
  X, 
  AlertTriangle, 
  FileText,
  DollarSign,
  Package,
  ClipboardCheck,
  Plus,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';

export default function EstoqueNotasPendencias() {
  const navigate = useNavigate();
  const [notas, setNotas] = useState<NotaEntrada[]>(getNotasParaEstoque());
  
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

    // Ordenar: registros mais recentes primeiro (por dataCriacao)
    return filtered.sort((a, b) => {
      return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
    });
  }, [notas, filters]);

  // Cards de resumo
  const resumo = useMemo(() => {
    const total = notasFiltradas.length;
    const finalizadas = notasFiltradas.filter(n => n.status === 'Finalizada' || n.atuacaoAtual === 'Encerrado').length;
    const aguardandoConferencia = notasFiltradas.filter(n => 
      ['Aguardando Conferencia', 'Conferencia Parcial'].includes(n.status)
    ).length;
    const aguardandoPagamento = notasFiltradas.filter(n => 
      ['Aguardando Pagamento Inicial', 'Aguardando Pagamento Final'].includes(n.status)
    ).length;
    const comDivergencia = notasFiltradas.filter(n => n.status === 'Com Divergencia').length;
    const valorTotal = notasFiltradas.filter(n => n.atuacaoAtual !== 'Encerrado').reduce((acc, n) => acc + n.valorTotal, 0);
    const atuacaoEstoque = notasFiltradas.filter(n => n.atuacaoAtual === 'Estoque').length;
    
    return { total, finalizadas, aguardandoConferencia, aguardandoPagamento, comDivergencia, valorTotal, atuacaoEstoque };
  }, [notasFiltradas]);

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
    const calcDias = (data: string) => {
      const dataInicio = new Date(data);
      const hoje = new Date();
      return Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    };
    
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
      'Dias Decorridos': calcDias(n.data)
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
    setNotas(getNotasParaEstoque());
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
    'Com Divergencia',
    'Finalizada'
  ];

  return (
    <EstoqueLayout title="Notas Pendentes">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <ResponsiveCardGrid cols={6}>
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
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Finalizadas</p>
                  <p className="text-2xl font-bold text-primary">{resumo.finalizadas}</p>
                </div>
                <Archive className="h-10 w-10 text-primary opacity-50" />
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
        </ResponsiveCardGrid>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveFilterGrid cols={6}>
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
            </ResponsiveFilterGrid>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Notas - Usando componente reutilizável */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Notas Pendentes</CardTitle>
              <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline">
                  Atualizar
                </Button>
                <Button onClick={() => navigate('/estoque/nota/cadastrar')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Nova Nota
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TabelaNotasPendencias 
              notas={notasFiltradas}
              modulo="Estoque"
              onVerDetalhes={handleVerDetalhes}
              onCadastrarProdutos={handleCadastrarProdutos}
              onConferir={handleConferir}
            />
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
