import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getProdutos, getLojas, exportToCSV, getEstoqueStats, updateValorRecomendado, updateProdutoLoja, Produto } from '@/utils/estoqueApi';
import { getColaboradores, getCargos } from '@/utils/cadastrosApi';
import { Download, Eye, CheckCircle, XCircle, Package, DollarSign, AlertTriangle, FileWarning, AlertCircle, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function EstoqueProdutos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState(getProdutos());
  const stats = getEstoqueStats();
  const lojasEstoque = getLojas();
  const colaboradores = getColaboradores();
  const cargos = getCargos();
  
  const [lojaFilter, setLojaFilter] = useState<string>('todas');
  const [modeloFilter, setModeloFilter] = useState('');
  const [imeiFilter, setImeiFilter] = useState('');
  const [somenteNaoConferidos, setSomenteNaoConferidos] = useState(false);
  
  // Modal para informar valor recomendado
  const [showValorModal, setShowValorModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [novoValorRecomendado, setNovoValorRecomendado] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');

  // Colaboradores com permissão de estoque
  const colaboradoresEstoque = colaboradores.filter(col => {
    const cargo = cargos.find(c => c.id === col.cargo);
    return cargo?.permissoes.includes('Estoque') || cargo?.permissoes.includes('Admin');
  });

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

  const handleOpenValorModal = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setNovoValorRecomendado(produto.vendaRecomendada?.toString() || '');
    setUsuarioSelecionado('');
    setShowValorModal(true);
  };

  const handleSaveValorRecomendado = () => {
    if (!produtoSelecionado || !novoValorRecomendado || !usuarioSelecionado) {
      toast.error('Preencha todos os campos');
      return;
    }

    const valor = parseFloat(novoValorRecomendado.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const usuario = colaboradores.find(c => c.id === usuarioSelecionado);
    if (!usuario) {
      toast.error('Selecione um usuário válido');
      return;
    }

    updateValorRecomendado(produtoSelecionado.id, valor, usuario.nome);
    setProdutos(getProdutos());
    setShowValorModal(false);
    toast.success(`Valor recomendado atualizado para ${formatCurrency(valor)}`);
  };

  const handleLojaChange = (produtoId: string, novaLoja: string) => {
    // Usar o primeiro colaborador com permissão como responsável
    const responsavel = colaboradoresEstoque[0]?.nome || 'Sistema';
    updateProdutoLoja(produtoId, novaLoja, responsavel);
    setProdutos(getProdutos());
    toast.success(`Produto transferido para ${novaLoja}`);
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
          <Input
            placeholder="IMEI"
            value={imeiFilter}
            onChange={(e) => setImeiFilter(e.target.value)}
            className="w-[200px]"
          />

          <Input
            placeholder="Modelo"
            value={modeloFilter}
            onChange={(e) => setModeloFilter(e.target.value)}
            className="w-[200px]"
          />

          <Select value={lojaFilter} onValueChange={setLojaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as lojas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as lojas</SelectItem>
              {lojasEstoque.map(loja => (
                <SelectItem key={loja} value={loja}>{loja}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Venda Recomendada</TableHead>
                  <TableHead>Saúde Bat.</TableHead>
                <TableHead>Loja</TableHead>
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
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      produto.origemEntrada === 'Trade-In' 
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                        : produto.origemEntrada === 'Fornecedor'
                        ? 'bg-green-500/10 text-green-600 border-green-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    )}>
                      {produto.origemEntrada}
                    </Badge>
                  </TableCell>
                  <TableCell>{produto.quantidade}</TableCell>
                  <TableCell>
                    {formatCurrency(produto.valorCusto)}
                  </TableCell>
                  <TableCell>
                    {produto.vendaRecomendada ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">{formatCurrency(produto.vendaRecomendada)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleOpenValorModal(produto)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {produto.statusNota === 'Pendente' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenValorModal(produto)}
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Informar Valor
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Pendente</span>
                          </div>
                        )}
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
                  <TableCell className="text-sm">{produto.loja}</TableCell>
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

      {/* Modal Informar Valor Recomendado */}
      <Dialog open={showValorModal} onOpenChange={setShowValorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informar Valor Recomendado</DialogTitle>
          </DialogHeader>
          {produtoSelecionado && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{produtoSelecionado.modelo}</p>
                <p className="text-sm text-muted-foreground">{produtoSelecionado.cor} • IMEI: {produtoSelecionado.imei}</p>
                <p className="text-sm">Custo: {formatCurrency(produtoSelecionado.valorCusto)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorRecomendado">Valor Recomendado (R$)</Label>
                <Input
                  id="valorRecomendado"
                  type="text"
                  value={novoValorRecomendado}
                  onChange={(e) => {
                    // Permitir apenas números e vírgula
                    const value = e.target.value.replace(/[^\d,]/g, '');
                    setNovoValorRecomendado(value);
                  }}
                  placeholder="Ex: 5999,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário que Informou *</Label>
                <Select value={usuarioSelecionado} onValueChange={setUsuarioSelecionado}>
                  <SelectTrigger id="usuario">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradoresEstoque.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {produtoSelecionado.historicoValorRecomendado && produtoSelecionado.historicoValorRecomendado.length > 0 && (
                <div className="space-y-2">
                  <Label>Histórico de Valor Recomendado</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {produtoSelecionado.historicoValorRecomendado.map((hist, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                        <span className="font-medium">{new Date(hist.data).toLocaleDateString('pt-BR')}</span>
                        <span className="mx-2">•</span>
                        <span>{hist.usuario}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {hist.valorAntigo ? formatCurrency(hist.valorAntigo) : 'N/A'} → {formatCurrency(hist.valorNovo)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValorModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveValorRecomendado}
              disabled={!novoValorRecomendado || !usuarioSelecionado}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
