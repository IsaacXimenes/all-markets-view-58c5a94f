import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveCardGrid, ResponsiveFilterGrid, ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, Clock, AlertTriangle, CheckCircle, Package, Filter, Download, AlertCircle, Wrench, RotateCcw, Undo2, DollarSign, CheckSquare, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProdutosPendentes, ProdutoPendente, calcularSLA } from '@/utils/osApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getFornecedores } from '@/utils/cadastrosApi';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { toast } from 'sonner';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { getPendenciaPorNota } from '@/utils/pendenciasFinanceiraApi';
import { validarAparelhosEmLote, Produto, validarRetornoAssistencia } from '@/utils/estoqueApi';
import { ModalRetiradaPecas } from '@/components/estoque/ModalRetiradaPecas';
import { formatCurrency, exportToCSV } from '@/utils/formatUtils';
import { getProdutos } from '@/utils/estoqueApi';
import { useAuthStore } from '@/store/authStore';

// Tipos de status disponíveis
type StatusAparelhosPendentes = 
  | 'Pendente Estoque' 
  | 'Aguardando Recebimento Assistência'
  | 'Em Análise Assistência' 
  | 'Aguardando Peça' 
  | 'Retornado da Assistência' 
  | 'Devolvido para Fornecedor'
  | 'Serviço Concluído - Validar Aparelho'
  | 'Retrabalho - Recusado pelo Estoque'
  | 'Retorno de Assistência';

export default function EstoqueProdutosPendentes() {
  const navigate = useNavigate();
  const { obterLojasTipoLoja, obterLojaById, obterNomeLoja, obterEstoquistas } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const [produtosPendentes, setProdutosPendentes] = useState<ProdutoPendente[]>([]);
  
  // Estado para linha selecionada (destaque visual)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  // Estados para validação em lote
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [dialogValidacaoLote, setDialogValidacaoLote] = useState(false);
  const [loteForm, setLoteForm] = useState({
    responsavel: user?.colaborador?.nome || '',
    observacoes: ''
  });
  
  // Estados para retirada de peças
  const [showRetiradaModal, setShowRetiradaModal] = useState(false);
  const [produtoRetirada, setProdutoRetirada] = useState<ProdutoPendente | null>(null);
  
  // Usar lojas do store centralizado (apenas tipo 'Loja')
  const lojas = obterLojasTipoLoja();
  const fornecedores = getFornecedores();
  const estoquistas = obterEstoquistas();

  const getLojaNome = (lojaId: string) => {
    const loja = obterLojaById(lojaId);
    if (loja) return loja.nome;
    return obterNomeLoja(lojaId);
  };

  // Função para obter progresso da nota
  const getNotaProgresso = useCallback((notaOrigemId: string) => {
    if (!notaOrigemId) return null;
    const pendencia = getPendenciaPorNota(notaOrigemId);
    if (!pendencia) return null;
    return {
      percentual: pendencia.percentualConferencia,
      conferidos: pendencia.aparelhosConferidos,
      total: pendencia.aparelhosTotal
    };
  }, []);

  // Filtros - igual à aba Produtos + filtro de status + filtro de fornecedor + filtro de parecer estoque
  const [filters, setFilters] = useState({
    imei: '',
    modelo: '',
    loja: 'todas',
    status: 'todos',
    fornecedor: 'todos',
    parecerEstoque: 'todos',
    tipoNota: 'todos' // Novo filtro: 'todos' | 'urgencia' | 'normal'
  });

  useEffect(() => {
    // Busca todos os produtos não liberados (visíveis durante todo o fluxo)
    const data = getProdutosPendentes();
    setProdutosPendentes(data);
  }, []);

  // Filtrar e ordenar produtos (Devolvido para Fornecedor no final)
  const filteredProdutos = useMemo(() => {
    const filtered = produtosPendentes.filter(produto => {
      // Filtro de IMEI (limpar formatação para buscar)
      if (filters.imei) {
        const imeiLimpo = unformatIMEI(filters.imei);
        if (!produto.imei.includes(imeiLimpo)) return false;
      }
      if (filters.modelo && !produto.modelo.toLowerCase().includes(filters.modelo.toLowerCase())) return false;
      if (filters.loja !== 'todas' && produto.loja !== filters.loja) return false;
      if (filters.status !== 'todos' && produto.statusGeral !== filters.status) return false;
      // Filtro de fornecedor
      if (filters.fornecedor !== 'todos') {
        // Verificar se o produto tem um fornecedor associado
        const produtoFornecedor = (produto as any).fornecedor || (produto as any).fornecedorId;
        if (produtoFornecedor !== filters.fornecedor) return false;
      }
      // Filtro de Parecer Estoque
      if (filters.parecerEstoque !== 'todos') {
        const parecerStatus = produto.parecerEstoque?.status || 'Aguardando Parecer';
        if (parecerStatus !== filters.parecerEstoque) return false;
      }
      // Filtro de Tipo de Nota (Urgência/Normal)
      if (filters.tipoNota !== 'todos') {
        const notaOrigemId = (produto as any).notaOrigemId || '';
        if (filters.tipoNota === 'urgencia' && !notaOrigemId.startsWith('URG')) return false;
        if (filters.tipoNota === 'normal' && !notaOrigemId.startsWith('NC-')) return false;
      }
      return true;
    });

    // Ordenar: Devolvido para Fornecedor no final
    return filtered.sort((a, b) => {
      const aDevolvido = a.statusGeral === 'Devolvido para Fornecedor' ? 1 : 0;
      const bDevolvido = b.statusGeral === 'Devolvido para Fornecedor' ? 1 : 0;
      return aDevolvido - bDevolvido;
    });
  }, [produtosPendentes, filters]);

  // Cálculo do somatório do valor de origem
  const totalValorOrigem = useMemo(() => {
    return filteredProdutos.reduce((acc, p) => acc + (p.valorOrigem || p.valorCusto || 0), 0);
  }, [filteredProdutos]);

  const getStatusBadge = (produto: ProdutoPendente) => {
    // Badge baseado no statusGeral - usando tokens semânticos
    switch (produto.statusGeral) {
      case 'Pendente Estoque':
        if (!produto.parecerEstoque) {
          return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Aguardando Parecer</Badge>;
        }
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Aprovado</Badge>;
      case 'Aguardando Recebimento Assistência':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Aguard. Recebimento</Badge>;
      case 'Em Análise Assistência':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Em Assistência</Badge>;
      case 'Aguardando Peça':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive">Aguardando Peça</Badge>;
      case 'Retornado da Assistência':
        return <Badge variant="outline" className="bg-primary/20 text-primary">Revisão Final</Badge>;
      case 'Serviço Concluído - Validar Aparelho':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">🔧 Validar Aparelho</Badge>;
      case 'Retrabalho - Recusado pelo Estoque':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">🔄 Retrabalho</Badge>;
      case 'Devolvido para Fornecedor':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Devolvido p/ Fornecedor</Badge>;
      default:
        // Inclui "Retorno de Assistência" e outros status futuros
        if ((produto.statusGeral as string) === 'Retorno de Assistência' || (produto as any).tagRetornoAssistencia) {
          return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">🔙 Retorno de Assistência</Badge>;
        }
        return <Badge variant="outline" className="bg-muted text-muted-foreground">{produto.statusGeral}</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    // Mesmo padrão da tabela de Aparelhos
    if (origem === 'Base de Troca') {
      return <Badge variant="outline" className="bg-accent text-accent-foreground">Base de Troca</Badge>;
    }
    if (origem === 'Emprestado - Garantia') {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive">Emprestado - Garantia</Badge>;
    }
    if (origem === 'NEGOCIADO') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">NEGOCIADO</Badge>;
    }
    return <Badge variant="outline" className="bg-primary/20 text-primary">Fornecedor</Badge>;
  };

  const getSLABadge = (dataEntrada: string) => {
    const { texto, cor } = calcularSLA(dataEntrada);
    
    if (cor === 'vermelho') {
      return (
        <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {texto}
        </div>
      );
    }
    if (cor === 'amarelo') {
      return (
        <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          {texto}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Clock className="h-3 w-3" />
        {texto}
      </div>
    );
  };

  const getStatusRowClass = (produto: ProdutoPendente, dataEntrada: string) => {
    // Se devolvido para fornecedor, cor de fundo muted
    if (produto.statusGeral === 'Devolvido para Fornecedor') {
      return 'bg-muted/50 opacity-70';
    }
    
    // Cores baseadas na saúde da bateria (mesmo padrão da tabela de Aparelhos)
    const saudeBateria = produto.saudeBateria;
    if (saudeBateria < 70) return 'bg-destructive/10'; // Crítico - vermelho
    if (saudeBateria < 80) return 'bg-yellow-500/10'; // Atenção - amarelo
    if (saudeBateria >= 90) return 'bg-green-500/10'; // Excelente - verde
    
    // Normal (80-89%) - sem cor de fundo
    return '';
  };

  // Obter nome do fornecedor
  const getFornecedorNome = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nome || fornecedorId || '-';
  };

  const stats = {
    totalPendentes: filteredProdutos.length,
    pendenteEstoque: filteredProdutos.filter(p => p.statusGeral === 'Pendente Estoque').length,
    emAssistencia: filteredProdutos.filter(p => p.statusGeral === 'Em Análise Assistência' || p.statusGeral === 'Aguardando Recebimento Assistência').length,
    aguardandoPeca: filteredProdutos.filter(p => p.statusGeral === 'Aguardando Peça').length,
    retornados: filteredProdutos.filter(p => p.statusGeral === 'Retornado da Assistência').length,
    validarAparelho: filteredProdutos.filter(p => p.statusGeral === 'Serviço Concluído - Validar Aparelho').length,
    devolvidos: filteredProdutos.filter(p => p.statusGeral === 'Devolvido para Fornecedor').length,
  };

  const handleExport = () => {
    const dataToExport = filteredProdutos.map(p => {
      const sla = calcularSLA(p.dataEntrada);
      return {
        ID: p.id,
        IMEI: p.imei,
        Produto: `${p.marca} ${p.modelo}`,
        Cor: p.cor,
        Origem: p.origemEntrada,
        Fornecedor: getFornecedorNome((p as any).fornecedor || (p as any).fornecedorId || ''),
        Loja: getLojaNome(p.loja),
        'Valor Custo': formatCurrency(p.valorCusto),
        'Saúde Bateria': `${p.saudeBateria}%`,
        'SLA (dias)': sla.dias,
        Status: p.statusGeral || (p.parecerEstoque ? p.parecerEstoque.status : 'Aguardando Parecer')
      };
    });
    exportToCSV(dataToExport, `produtos-pendentes-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ imei: '', modelo: '', loja: 'todas', status: 'todos', fornecedor: 'todos', parecerEstoque: 'todos', tipoNota: 'todos' });
    setSelectedProducts([]);
  };

  // Handlers para seleção de produtos
  const handleSelectProduct = (productId: string, imei: string) => {
    setSelectedProducts(prev => 
      prev.includes(imei) 
        ? prev.filter(id => id !== imei)
        : [...prev, imei]
    );
  };

  const handleSelectAllFiltered = () => {
    const allImeis = filteredProdutos.map(p => p.imei);
    if (selectedProducts.length === allImeis.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(allImeis);
    }
  };

  // Produtos selecionados com suas notas
  const produtosSelecionadosInfo = useMemo(() => {
    return filteredProdutos.filter(p => selectedProducts.includes(p.imei));
  }, [filteredProdutos, selectedProducts]);

  // Agrupar por nota para validação em lote
  const notasDosSeleccionados = useMemo(() => {
    const notas = new Set(produtosSelecionadosInfo.map(p => (p as any).notaOrigemId).filter(Boolean));
    return Array.from(notas);
  }, [produtosSelecionadosInfo]);

  // Handler para validação em lote
  const handleValidarLote = () => {
    if (!loteForm.responsavel) {
      toast.error('Selecione o responsável pela conferência');
      return;
    }

    if (notasDosSeleccionados.length !== 1) {
      toast.error('Selecione produtos de uma única nota para validar em lote');
      return;
    }

    const notaId = notasDosSeleccionados[0];
    const imeisParaValidar = produtosSelecionadosInfo.map(p => p.imei);

    const resultado = validarAparelhosEmLote(
      notaId,
      imeisParaValidar,
      loteForm.responsavel,
      loteForm.observacoes
    );

    if (resultado.sucesso) {
      toast.success(`${resultado.validados} produto(s) validado(s) com sucesso!`);
      setSelectedProducts([]);
      setDialogValidacaoLote(false);
      setLoteForm({ responsavel: '', observacoes: '' });
      // Recarregar dados
      const data = getProdutosPendentes();
      setProdutosPendentes(data);
    } else {
      toast.error(`Erros na validação: ${resultado.erros.join(', ')}`);
    }
  };

  return (
    <EstoqueLayout title="Produtos Pendentes">
      {/* Card de Somatório Valor Origem */}
      <Card className="mb-4 bg-red-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <DollarSign className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total de Origem (Pendentes)</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalValorOrigem)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Cards - Sticky */}
      <div className="mb-6 sticky top-0 z-10 bg-background py-2">
        <ResponsiveCardGrid cols={6}>
          <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.totalPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente Estoque</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendenteEstoque}</p>
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
                <p className="text-sm text-muted-foreground">Em Assistência</p>
                <p className="text-2xl font-bold text-blue-600">{stats.emAssistencia}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguard. Peça</p>
                <p className="text-2xl font-bold text-orange-600">{stats.aguardandoPeca}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RotateCcw className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revisão Final</p>
                <p className="text-2xl font-bold text-blue-600">{stats.retornados}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Undo2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Devolvido</p>
                <p className="text-2xl font-bold text-gray-600">{stats.devolvidos}</p>
              </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>
      </div>

      {/* Filtros - Igual à aba Produtos + Fornecedor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveFilterGrid cols={6}>
            <div>
              <Label htmlFor="imei">IMEI</Label>
              <InputComMascara
                mascara="imei"
                value={filters.imei}
                onChange={(formatted) => setFilters({ ...filters, imei: formatted })}
                placeholder="00-000000-000000-0"
              />
            </div>
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                placeholder="Buscar modelo..."
                value={filters.modelo}
                onChange={(e) => setFilters({ ...filters, modelo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="loja">Loja</Label>
              <Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}>
                <SelectTrigger id="loja">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <AutocompleteFornecedor
                value={filters.fornecedor === 'todos' ? '' : filters.fornecedor}
                onChange={(v) => setFilters({ ...filters, fornecedor: v || 'todos' })}
                placeholder="Todos os Fornecedores"
              />
            </div>
            <div>
              <Label htmlFor="status">Status Geral</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente Estoque">Pendente Estoque</SelectItem>
                  <SelectItem value="Em Análise Assistência">Em Assistência</SelectItem>
                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                  <SelectItem value="Retornado da Assistência">Revisão Final</SelectItem>
                  <SelectItem value="Serviço Concluído - Validar Aparelho">Validar Aparelho</SelectItem>
                  <SelectItem value="Retrabalho - Recusado pelo Estoque">Retrabalho</SelectItem>
                  <SelectItem value="Retorno de Assistência">Retorno de Assistência</SelectItem>
                  <SelectItem value="Devolvido para Fornecedor">Devolvido p/ Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="parecerEstoque">Parecer Estoque</Label>
              <Select value={filters.parecerEstoque} onValueChange={(value) => setFilters({ ...filters, parecerEstoque: value })}>
                <SelectTrigger id="parecerEstoque">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Aguardando Parecer">Aguardando Parecer</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Reprovado">Reprovado</SelectItem>
                  <SelectItem value="Encaminhado para conferência da Assistência">Encaminhado Assistência</SelectItem>
                  <SelectItem value="Devolvido ao fornecedor">Devolvido ao Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tipoNota">Tipo de Nota</Label>
              <Select value={filters.tipoNota} onValueChange={(value) => setFilters({ ...filters, tipoNota: value })}>
                <SelectTrigger id="tipoNota">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="normal">Entrada Normal (NC-)</SelectItem>
                  <SelectItem value="urgencia">Urgência (URG-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ResponsiveFilterGrid>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={handleLimpar}>
              Limpar
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos Pendentes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Produtos Pendentes de Conferência</CardTitle>
            {selectedProducts.length > 0 && (
              <Button 
                onClick={() => setDialogValidacaoLote(true)}
                className="bg-green-600 hover:bg-green-700"
                disabled={notasDosSeleccionados.length !== 1}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Validar {selectedProducts.length} Selecionado(s)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Produto</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Valor Origem</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Nota de Origem</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Saúde Bat.</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Parecer Estoque</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Nenhum produto pendente de conferência
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProdutos.map((produto) => (
                    <TableRow 
                      key={produto.id} 
                      className={cn(
                        getStatusRowClass(produto, produto.dataEntrada),
                        selectedRowId === produto.id && 'bg-muted/80 border-l-4 border-black'
                      )}
                      onClick={() => setSelectedRowId(prev => prev === produto.id ? null : produto.id)}
                    >
                      <TableCell className="sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div>
                          <div className="font-medium">{produto.modelo}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getLojaNome(produto.loja)}</TableCell>
                      <TableCell className="font-medium text-primary">{formatCurrency(produto.valorOrigem || produto.valorCusto)}</TableCell>
                      <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                      <TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>
                        {(produto as any).notaOrigemId ? (
                          <div className="space-y-1">
                            {/* Badge colorido baseado no tipo de nota */}
                            {(produto as any).notaOrigemId.startsWith('URG') ? (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 font-medium">
                                🚨 Urgência
                              </Badge>
                            ) : (produto as any).notaOrigemId.startsWith('NC-') ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                  Entrada
                                </Badge>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {(produto as any).notaOrigemId}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono text-xs">{(produto as any).notaOrigemId}</span>
                            )}
                            {/* Barra de progresso com cores dinâmicas */}
                            {(() => {
                              const progresso = getNotaProgresso((produto as any).notaOrigemId);
                              if (progresso) {
                                return (
                                  <div className="space-y-1 mt-1">
                                    <Progress 
                                      value={progresso.percentual} 
                                      className={`h-1.5 ${
                                        progresso.percentual === 100 
                                          ? '[&>div]:bg-green-500' 
                                          : progresso.percentual >= 50 
                                          ? '[&>div]:bg-blue-500' 
                                          : '[&>div]:bg-yellow-500'
                                      }`} 
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {progresso.conferidos}/{progresso.total} ({progresso.percentual}%)
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getFornecedorNome((produto as any).fornecedor || (produto as any).fornecedorId || '')}
                      </TableCell>
                      <TableCell>
                        <span className={
                          produto.saudeBateria < 70 ? 'font-semibold text-destructive' :
                          produto.saudeBateria < 80 ? 'font-semibold text-yellow-600' :
                          produto.saudeBateria < 90 ? 'text-muted-foreground' : 
                          'font-semibold text-green-600'
                        }>
                          {produto.saudeBateria}%
                        </span>
                      </TableCell>
                      <TableCell>{getSLABadge(produto.dataEntrada)}</TableCell>
                      <TableCell>{getStatusBadge(produto)}</TableCell>
                      <TableCell>
                        {produto.parecerAssistencia ? (
                          <Badge variant="outline" className={
                            produto.parecerAssistencia.status === 'Recusado - Assistência'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30'
                              : produto.parecerAssistencia.status === 'Validado pela assistência'
                              ? 'bg-green-500/10 text-green-600 border-green-500/30'
                              : produto.parecerAssistencia.status === 'Aguardando peça'
                              ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                              : produto.parecerAssistencia.status === 'Ajustes realizados'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              : 'bg-destructive/10 text-destructive'
                          }>
                            {produto.parecerAssistencia.status === 'Recusado - Assistência' ? 'Recusado' 
                              : produto.parecerAssistencia.status === 'Aguardando peça' ? 'Aguardando Peça'
                              : produto.parecerAssistencia.status === 'Validado pela assistência' ? 'Validado'
                              : produto.parecerAssistencia.status === 'Ajustes realizados' ? 'Ajustes Realizados'
                              : 'Em Análise'}
                          </Badge>
                        ) : produto.parecerEstoque?.status === 'Encaminhado para conferência da Assistência' ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Para Análise</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {/* Botão Validar Retorno de Assistência */}
                          {((produto.statusGeral as string) === 'Retorno de Assistência' || (produto as any).tagRetornoAssistencia) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const sucesso = validarRetornoAssistencia(produto.imei, user?.colaborador?.nome || 'Estoquista');
                                if (sucesso) {
                                  toast.success(`${produto.modelo} validado e disponível para venda!`);
                                  setProdutosPendentes(getProdutosPendentes());
                                } else {
                                  toast.error('Erro ao validar retorno');
                                }
                              }}
                              title="Validar Retorno e disponibilizar"
                              className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Botão Retirada de Peças */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProdutoRetirada(produto);
                              setShowRetiradaModal(true);
                            }}
                            title="Retirada de Peças"
                            className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                          >
                            <Scissors className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/estoque/produto-pendente/${produto.id}`)}
                            title="Ver Detalhes"
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

      {/* Modal de Validação em Lote */}
      <Dialog open={dialogValidacaoLote} onOpenChange={setDialogValidacaoLote}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckSquare className="h-5 w-5" />
              Validar Produtos em Lote
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {notasDosSeleccionados.length === 1 ? (
              <>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Nota</p>
                  <p className="font-medium font-mono">{notasDosSeleccionados[0]}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Produtos selecionados: {selectedProducts.length}</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {produtosSelecionadosInfo.map(p => (
                      <div key={p.id} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{p.modelo}</span>
                        <span className="text-muted-foreground font-mono text-xs">({p.imei.slice(-6)})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Responsável Conferência *</Label>
                  <Input
                    value={user?.colaborador?.nome || 'Não identificado'}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={loteForm.observacoes}
                    onChange={(e) => setLoteForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações gerais sobre a conferência..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                <p>Selecione produtos de uma única nota para validar em lote.</p>
                <p className="text-sm mt-2">Notas encontradas: {notasDosSeleccionados.join(', ') || 'Nenhuma'}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogValidacaoLote(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleValidarLote}
              disabled={notasDosSeleccionados.length !== 1 || !loteForm.responsavel}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Validação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Retirada de Peças */}
      <ModalRetiradaPecas
        open={showRetiradaModal}
        onOpenChange={setShowRetiradaModal}
        produto={produtoRetirada ? {
          id: produtoRetirada.id,
          imei: produtoRetirada.imei,
          marca: produtoRetirada.marca,
          modelo: produtoRetirada.modelo,
          cor: produtoRetirada.cor,
          tipo: produtoRetirada.tipo as 'Novo' | 'Seminovo',
          quantidade: 1,
          valorCusto: produtoRetirada.valorCusto,
          valorVendaSugerido: produtoRetirada.valorCusto * 1.5,
          saudeBateria: produtoRetirada.saudeBateria,
          loja: produtoRetirada.loja,
          estoqueConferido: false,
          assistenciaConferida: false,
          condicao: produtoRetirada.condicao === 'Semi-novo' ? 'Seminovo' : 'Lacrado',
          historicoCusto: [],
          historicoValorRecomendado: [],
          statusNota: 'Pendente',
          origemEntrada: produtoRetirada.origemEntrada
        } as Produto : null}
        onSuccess={() => {
          // Recarregar dados
          const data = getProdutosPendentes();
          setProdutosPendentes(data);
          setProdutoRetirada(null);
        }}
      />
    </EstoqueLayout>
  );
}
