import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProdutos, getLojas, exportToCSV, getEstoqueStats } from '@/utils/estoqueApi';
import { Download, Eye, CheckCircle, XCircle, Package, DollarSign, AlertTriangle, FileWarning, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function EstoqueProdutos() {
  const navigate = useNavigate();
  const [produtos] = useState(getProdutos());
  const stats = getEstoqueStats();
  const [lojaFilter, setLojaFilter] = useState<string>('todas');
  const [modeloFilter, setModeloFilter] = useState('');
  const [imeiFilter, setImeiFilter] = useState('');
  const [somenteNaoConferidos, setSomenteNaoConferidos] = useState(false);

  const produtosFiltrados = produtos.filter(p => {
    if (lojaFilter !== 'todas' && p.loja !== lojaFilter) return false;
    if (modeloFilter && !p.modelo.toLowerCase().includes(modeloFilter.toLowerCase())) return false;
    if (imeiFilter && !p.imei.toLowerCase().includes(imeiFilter.toLowerCase())) return false;
    if (somenteNaoConferidos && (p.estoqueConferido && p.assistenciaConferida)) return false;
    return true;
  });

  // Stats dinâmicos baseados nos filtros
  const statsFiltrados = {
    totalProdutos: produtosFiltrados.length,
    valorTotalEstoque: produtosFiltrados.reduce((acc, p) => acc + p.valorCusto * p.quantidade, 0),
    produtosBateriaFraca: produtosFiltrados.filter(p => p.saudeBateria < 85).length,
    notasPendentes: stats.notasPendentes
  };

  const handleExport = () => {
    exportToCSV(produtosFiltrados, 'produtos-estoque.csv');
  };

  return (
    <EstoqueLayout title="Gerenciamento de Produtos">
      <div className="space-y-6">
        {/* Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsFiltrados.totalProdutos}</div>
              <p className="text-xs text-muted-foreground">Unidades em estoque</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total do Estoque</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(statsFiltrados.valorTotalEstoque)}
              </div>
              <p className="text-xs text-muted-foreground">Base custo</p>
            </CardContent>
          </Card>

          <Card className={statsFiltrados.produtosBateriaFraca > 0 ? 'bg-destructive/10' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saúde da Bateria &lt; 85%</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${statsFiltrados.produtosBateriaFraca > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statsFiltrados.produtosBateriaFraca > 0 ? 'text-destructive' : ''}`}>
                {statsFiltrados.produtosBateriaFraca}
              </div>
              <p className="text-xs text-muted-foreground">Produtos com bateria degradada</p>
            </CardContent>
          </Card>

          <Card className={statsFiltrados.notasPendentes > 0 ? 'bg-destructive/10' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notas Pendentes</CardTitle>
              <FileWarning className={`h-4 w-4 ${statsFiltrados.notasPendentes > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statsFiltrados.notasPendentes > 0 ? 'text-destructive' : ''}`}>
                {statsFiltrados.notasPendentes}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando financeiro</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as lojas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {getLojas().map(loja => (
                <SelectItem key={loja} value={loja}>{loja}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Modelo"
            value={modeloFilter}
            onChange={(e) => setModeloFilter(e.target.value)}
            className="w-[200px]"
          />

          <Input
            placeholder="IMEI"
            value={imeiFilter}
            onChange={(e) => setImeiFilter(e.target.value)}
            className="w-[200px]"
          />

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="naoConferidos" 
              checked={somenteNaoConferidos}
              onCheckedChange={(checked) => setSomenteNaoConferidos(checked as boolean)}
            />
            <label htmlFor="naoConferidos" className="text-sm font-medium cursor-pointer">
              Só não conferidos
            </label>
          </div>

          <Button onClick={handleExport} variant="outline" className="ml-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Venda Recomendada</TableHead>
                <TableHead>Saúde Bat.</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Assistência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.map(produto => (
                <TableRow 
                  key={produto.id}
                  className={cn(
                    produto.saudeBateria < 70 ? 'bg-destructive/20' :
                    produto.saudeBateria < 80 ? 'bg-orange-500/20' : ''
                  )}
                >
                  <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                  <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{produto.modelo}</span>
                      <span className="text-xs text-muted-foreground">{produto.cor}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                      {produto.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{produto.quantidade}</TableCell>
                  <TableCell>
                    {formatCurrency(produto.valorCusto)}
                  </TableCell>
                  <TableCell>
                    {produto.vendaRecomendada ? (
                      <span className="font-semibold text-green-600">{formatCurrency(produto.vendaRecomendada)}</span>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Pendente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'font-semibold',
                      produto.saudeBateria < 70 ? 'text-destructive' :
                      produto.saudeBateria < 80 ? 'text-orange-500' :
                      produto.saudeBateria < 90 ? 'text-yellow-500' : 'text-green-500'
                    )}>
                      {produto.saudeBateria}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {produto.estoqueConferido ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell>
                    {produto.assistenciaConferida ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/estoque/produto/${produto.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
