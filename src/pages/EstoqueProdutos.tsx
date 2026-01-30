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
import { getProdutos, getEstoqueStats, updateValorRecomendado, updateProdutoLoja, Produto } from '@/utils/estoqueApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { Download, Eye, CheckCircle, XCircle, Package, DollarSign, AlertTriangle, FileWarning, AlertCircle, Edit, Wrench, ArrowRightLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';

import { formatCurrency, exportToCSV, parseMoeda } from '@/utils/formatUtils';

export default function EstoqueProdutos() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterLojaById, obterEstoquistas } = useCadastroStore();
  const [produtos, setProdutos] = useState(getProdutos());
  const stats = getEstoqueStats();
  const lojasEstoque = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();
  
  const [lojaFilter, setLojaFilter] = useState<string>('todas');
  const [modeloFilter, setModeloFilter] = useState('');
  const [imeiFilter, setImeiFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [somenteNaoConferidos, setSomenteNaoConferidos] = useState(false);
  
  // Modal para informar valor recomendado
  const [showValorModal, setShowValorModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [novoValorRecomendado, setNovoValorRecomendado] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');

  // Colaboradores com permissão de estoque (gestores ou estoquistas)
  const colaboradoresEstoque = colaboradores.filter(col => 
    col.eh_estoquista || col.eh_gestor
  );

  // Helper para obter nome da loja
  const getLojaNome = (lojaId: string) => {
    const loja = obterLojaById(lojaId);
    return loja?.nome || lojaId;
  };

  const produtosFiltrados = produtos.filter(p => {
    if (lojaFilter !== 'todas' && p.loja !== lojaFilter) return false;
    if (modeloFilter && !p.modelo.toLowerCase().includes(modeloFilter.toLowerCase())) return false;
    if (imeiFilter && !unformatIMEI(p.imei).includes(unformatIMEI(imeiFilter))) return false;
    if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
    if (origemFilter !== 'todas' && p.origemEntrada !== origemFilter) return false;
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

    const valor = parseMoeda(novoValorRecomendado);
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
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {/* Dashboard Cards */}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total de Produtos</p>
                  <p className="text-xl sm:text-2xl font-bold">{statsFiltrados.totalProdutos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Valor Total Estoque</p>
                  <p className="text-xl sm:text-2xl font-bold truncate" title={formatCurrency(statsFiltrados.valorTotalEstoque)}>{formatCurrency(statsFiltrados.valorTotalEstoque)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden ${statsFiltrados.produtosBateriaFraca > 0 ? 'bg-orange-500/10' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                  <AlertTriangle className={`h-5 w-5 ${statsFiltrados.produtosBateriaFraca > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Bateria &lt; 85%</p>
                  <p className={`text-xl sm:text-2xl font-bold ${statsFiltrados.produtosBateriaFraca > 0 ? 'text-orange-500' : ''}`}>{statsFiltrados.produtosBateriaFraca}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden ${statsFiltrados.notasPendentes > 0 ? 'bg-red-500/10' : ''}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
                  <FileWarning className={`h-5 w-5 ${statsFiltrados.notasPendentes > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Notas Pendentes</p>
                  <p className={`text-xl sm:text-2xl font-bold ${statsFiltrados.notasPendentes > 0 ? 'text-red-500' : ''}`}>{statsFiltrados.notasPendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div>
            <p className="text-xs text-muted-foreground mb-1">IMEI</p>
            <Input
              placeholder="WW-XXXXXX-YYYYYY-Z"
              value={imeiFilter}
              onChange={(e) => setImeiFilter(formatIMEI(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Modelo</p>
            <Input
              placeholder="Modelo"
              value={modeloFilter}
              onChange={(e) => setModeloFilter(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Loja</p>
            <AutocompleteLoja
              value={lojaFilter === 'todas' ? '' : lojaFilter}
              onChange={(v) => setLojaFilter(v || 'todas')}
              placeholder="Todas as lojas"
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipo</p>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Seminovo">Seminovo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Origem</p>
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                <SelectItem value="Base de Troca">Base de Troca</SelectItem>
                <SelectItem value="Emprestado - Garantia">Emprestado - Garantia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 h-10 self-end col-span-full sm:col-span-1">
            <Checkbox 
              id="naoConferidos" 
              checked={somenteNaoConferidos}
              onCheckedChange={(checked) => setSomenteNaoConferidos(checked as boolean)}
            />
            <label htmlFor="naoConferidos" className="text-sm font-medium cursor-pointer">
              Só não conferidos
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 col-span-full self-end">
            <Button 
              onClick={() => {
                setLojaFilter('todas');
                setModeloFilter('');
                setImeiFilter('');
                setTipoFilter('todos');
                setOrigemFilter('todas');
                setSomenteNaoConferidos(false);
              }} 
              variant="ghost"
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Custo Assist.</TableHead>
                <TableHead>Venda Recomendada</TableHead>
                <TableHead>Saúde Bat.</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Assistência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.map(produto => {
                // Cores baseadas na saúde da bateria seguindo o padrão do sistema
                const getRowClassByBattery = (saudeBateria: number) => {
                  if (saudeBateria >= 90) return 'bg-green-500/10'; // Excelente - verde
                  if (saudeBateria >= 80) return ''; // Normal - sem cor
                  if (saudeBateria >= 70) return 'bg-yellow-500/10'; // Atenção - amarelo
                  return 'bg-destructive/10'; // Crítico - vermelho
                };
                
                return (
                <TableRow 
                  key={produto.id}
                  className={getRowClassByBattery(produto.saudeBateria)}
                >
                  <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                  <TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{produto.modelo}</span>
                        {produto.statusMovimentacao === 'Em movimentação' && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            Em movimentação
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{produto.cor}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      produto.tipo === 'Novo' 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-muted text-muted-foreground'
                    }>
                      {produto.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      produto.origemEntrada === 'Base de Troca' 
                        ? 'bg-accent text-accent-foreground'
                        : produto.origemEntrada === 'Emprestado - Garantia'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/20 text-primary'
                    }>
                      {produto.origemEntrada}
                    </Badge>
                  </TableCell>
                  <TableCell>{produto.quantidade}</TableCell>
                  <TableCell>
                    {formatCurrency(produto.valorCusto)}
                  </TableCell>
                  <TableCell>
                    {produto.custoAssistencia ? (
                      <div className="flex items-center gap-1 text-orange-600">
                        <Wrench className="h-3 w-3" />
                        <span>{formatCurrency(produto.custoAssistencia)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
                  <TableCell className="text-sm">{getLojaNome(produto.loja)}</TableCell>
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
                );
              })}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
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
                <Label htmlFor="valorRecomendado">Valor Recomendado</Label>
                <InputComMascara
                  id="valorRecomendado"
                  mascara="moeda"
                  value={novoValorRecomendado}
                  onChange={(formatted) => setNovoValorRecomendado(formatted)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário que Informou *</Label>
                <AutocompleteColaborador
                  value={usuarioSelecionado}
                  onChange={setUsuarioSelecionado}
                  placeholder="Selecione o colaborador"
                  filtrarPorTipo="estoquistas"
                />
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
