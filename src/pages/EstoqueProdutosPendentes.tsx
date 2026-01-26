import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Eye, Clock, AlertTriangle, CheckCircle, Package, Filter, Download, AlertCircle, Wrench, RotateCcw, Undo2, DollarSign } from 'lucide-react';
import { getProdutosPendentes, ProdutoPendente, calcularSLA } from '@/utils/osApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getFornecedores } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';

import { formatCurrency, exportToCSV } from '@/utils/formatUtils';

// Tipos de status disponíveis
type StatusAparelhosPendentes = 
  | 'Pendente Estoque' 
  | 'Em Análise Assistência' 
  | 'Aguardando Peça' 
  | 'Retornado da Assistência' 
  | 'Devolvido para Fornecedor';

export default function EstoqueProdutosPendentes() {
  const navigate = useNavigate();
  const { obterLojasTipoLoja, obterLojaById, obterNomeLoja } = useCadastroStore();
  const [produtosPendentes, setProdutosPendentes] = useState<ProdutoPendente[]>([]);
  
  // Usar lojas do store centralizado (apenas tipo 'Loja')
  const lojas = obterLojasTipoLoja();
  const fornecedores = getFornecedores();

  const getLojaNome = (lojaId: string) => {
    const loja = obterLojaById(lojaId);
    if (loja) return loja.nome;
    return obterNomeLoja(lojaId);
  };

  // Filtros - igual à aba Produtos + filtro de status + filtro de fornecedor + filtro de parecer estoque
  const [filters, setFilters] = useState({
    imei: '',
    modelo: '',
    loja: 'todas',
    status: 'todos',
    fornecedor: 'todos',
    parecerEstoque: 'todos'
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
    // Badge baseado no statusGeral para maior clareza visual
    switch (produto.statusGeral) {
      case 'Pendente Estoque':
        if (!produto.parecerEstoque) {
          return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aguardando Parecer</Badge>;
        }
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>;
      case 'Em Análise Assistência':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Em Assistência</Badge>;
      case 'Aguardando Peça':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Aguardando Peça</Badge>;
      case 'Retornado da Assistência':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Revisão Final</Badge>;
      case 'Devolvido para Fornecedor':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">Devolvido p/ Fornecedor</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">{produto.statusGeral}</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    if (origem === 'Base de Troca') {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Base de Troca</Badge>;
    }
    if (origem === 'Emprestado - Garantia') {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Emprestado - Garantia</Badge>;
    }
    if (origem === 'NEGOCIADO') {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">NEGOCIADO</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Fornecedor</Badge>;
  };

  const getSLABadge = (dataEntrada: string) => {
    const { dias, cor } = calcularSLA(dataEntrada);
    
    if (cor === 'vermelho') {
      return (
        <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {dias} dias
        </div>
      );
    }
    if (cor === 'amarelo') {
      return (
        <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          {dias} dias
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Clock className="h-3 w-3" />
        {dias} dias
      </div>
    );
  };

  const getStatusRowClass = (produto: ProdutoPendente, dataEntrada: string) => {
    // Se devolvido para fornecedor, cor cinza
    if (produto.statusGeral === 'Devolvido para Fornecedor') {
      return 'bg-gray-100 dark:bg-gray-900/30 opacity-70';
    }
    
    const { cor } = calcularSLA(dataEntrada);
    // Prioridade: SLA crítico > status geral
    if (cor === 'vermelho') return 'bg-red-500/10';
    if (cor === 'amarelo') return 'bg-yellow-500/10';
    // Cores por status quando SLA normal
    switch (produto.statusGeral) {
      case 'Em Análise Assistência':
        return 'bg-blue-500/5';
      case 'Aguardando Peça':
        return 'bg-orange-500/5';
      case 'Retornado da Assistência':
        return 'bg-purple-500/5';
      default:
        return '';
    }
  };

  // Obter nome do fornecedor
  const getFornecedorNome = (fornecedorId: string) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.nome || fornecedorId || '-';
  };

  const stats = {
    totalPendentes: filteredProdutos.length,
    pendenteEstoque: filteredProdutos.filter(p => p.statusGeral === 'Pendente Estoque').length,
    emAssistencia: filteredProdutos.filter(p => p.statusGeral === 'Em Análise Assistência').length,
    aguardandoPeca: filteredProdutos.filter(p => p.statusGeral === 'Aguardando Peça').length,
    retornados: filteredProdutos.filter(p => p.statusGeral === 'Retornado da Assistência').length,
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
    setFilters({ imei: '', modelo: '', loja: 'todas', status: 'todos', fornecedor: 'todos', parecerEstoque: 'todos' });
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 sticky top-0 z-10 bg-background py-2">
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
              <div className="p-2 rounded-lg bg-purple-500/10">
                <RotateCcw className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revisão Final</p>
                <p className="text-2xl font-bold text-purple-600">{stats.retornados}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <Select value={filters.fornecedor} onValueChange={(value) => setFilters({ ...filters, fornecedor: value })}>
                <SelectTrigger id="fornecedor">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Fornecedores</SelectItem>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
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
          <CardTitle>Produtos Pendentes de Conferência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Nota de Origem</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Valor Origem</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Parecer Estoque</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Nenhum produto pendente de conferência
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className={getStatusRowClass(produto, produto.dataEntrada)}>
                      <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                      <TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{produto.modelo}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>
                        {(produto as any).notaOrigemId ? (
                          (produto as any).notaOrigemId.startsWith('URG') ? (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                              Urgência
                            </Badge>
                          ) : (
                            <span className="font-mono text-xs">{(produto as any).notaOrigemId}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getFornecedorNome((produto as any).fornecedor || (produto as any).fornecedorId || '')}
                      </TableCell>
                      <TableCell>{getLojaNome(produto.loja)}</TableCell>
                      <TableCell className="font-medium text-primary">{formatCurrency(produto.valorOrigem || produto.valorCusto)}</TableCell>
                      <TableCell>{getSLABadge(produto.dataEntrada)}</TableCell>
                      <TableCell>{getStatusBadge(produto)}</TableCell>
                      <TableCell>
                        {produto.parecerAssistencia ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                            {produto.parecerAssistencia.status === 'Aguardando peça' ? 'Aguardando Peça' : 'Em Análise'}
                          </Badge>
                        ) : produto.parecerEstoque?.status === 'Encaminhado para conferência da Assistência' ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Para Análise</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
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
    </EstoqueLayout>
  );
}
