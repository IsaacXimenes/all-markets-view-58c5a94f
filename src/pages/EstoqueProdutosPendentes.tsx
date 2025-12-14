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
import { Eye, Clock, AlertTriangle, CheckCircle, Package, Filter, Download, AlertCircle } from 'lucide-react';
import { getProdutosPendentes, ProdutoPendente, calcularSLA, exportToCSV } from '@/utils/osApi';
import { getLojas } from '@/utils/cadastrosApi';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function EstoqueProdutosPendentes() {
  const navigate = useNavigate();
  const [produtosPendentes, setProdutosPendentes] = useState<ProdutoPendente[]>([]);
  const lojas = getLojas();

  // Filtros - igual à aba Produtos
  const [filters, setFilters] = useState({
    imei: '',
    modelo: '',
    loja: 'todas'
  });

  useEffect(() => {
    const data = getProdutosPendentes();
    // Filtrar apenas produtos que ainda não foram liberados e não estão na OS
    const pendentesEstoque = data.filter(p => 
      p.statusGeral === 'Pendente Estoque' || 
      (p.parecerEstoque?.status === 'Análise Realizada – Produto em ótimo estado' && p.statusGeral !== 'Liberado')
    );
    setProdutosPendentes(pendentesEstoque);
  }, []);

  // Filtrar produtos
  const filteredProdutos = useMemo(() => {
    return produtosPendentes.filter(produto => {
      if (filters.imei && !produto.imei.toLowerCase().includes(filters.imei.toLowerCase())) return false;
      if (filters.modelo && !produto.modelo.toLowerCase().includes(filters.modelo.toLowerCase())) return false;
      if (filters.loja !== 'todas' && produto.loja !== filters.loja) return false;
      return true;
    });
  }, [produtosPendentes, filters]);

  const getStatusBadge = (produto: ProdutoPendente) => {
    if (!produto.parecerEstoque) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aguardando Parecer</Badge>;
    }
    if (produto.parecerEstoque.status === 'Análise Realizada – Produto em ótimo estado') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Encaminhado Assis.</Badge>;
  };

  const getOrigemBadge = (origem: string) => {
    if (origem === 'Base de Troca') {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Base de Troca</Badge>;
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

  const getSLARowClass = (dataEntrada: string) => {
    const { cor } = calcularSLA(dataEntrada);
    if (cor === 'vermelho') return 'bg-red-500/10';
    if (cor === 'amarelo') return 'bg-yellow-500/10';
    return '';
  };

  const stats = {
    totalPendentes: filteredProdutos.length,
    aguardandoParecer: filteredProdutos.filter(p => !p.parecerEstoque).length,
    aprovados: filteredProdutos.filter(p => p.parecerEstoque?.status === 'Análise Realizada – Produto em ótimo estado').length,
    encaminhados: filteredProdutos.filter(p => p.parecerEstoque?.status === 'Encaminhado para conferência da Assistência').length,
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
        Loja: p.loja,
        'Valor Custo': formatCurrency(p.valorCusto),
        'Saúde Bateria': `${p.saudeBateria}%`,
        'SLA (dias)': sla.dias,
        Status: p.parecerEstoque ? p.parecerEstoque.status : 'Aguardando Parecer'
      };
    });
    exportToCSV(dataToExport, `produtos-pendentes-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ imei: '', modelo: '', loja: 'todas' });
  };

  return (
    <EstoqueLayout title="Produtos Pendentes">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Aguardando Parecer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.aguardandoParecer}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprovados (Liberar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprovados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              Encaminhados Assis.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.encaminhados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros - Igual à aba Produtos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                placeholder="Buscar por IMEI..."
                value={filters.imei}
                onChange={(e) => setFilters({ ...filters, imei: e.target.value })}
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
                    <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleLimpar} className="flex-1">
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
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
                  <TableHead>Loja</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Parecer Estoque</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum produto pendente de conferência
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className={getSLARowClass(produto.dataEntrada)}>
                      <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                      <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{produto.modelo}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>{produto.loja}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/estoque/produto-pendente/${produto.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
