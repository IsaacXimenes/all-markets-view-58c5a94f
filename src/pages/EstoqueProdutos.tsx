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
import { getProdutos, getEstoqueStats, updateValorRecomendado, updateProdutoLoja, Produto, getStatusAparelho } from '@/utils/estoqueApi';
import { getStatusBadgeClasses } from '@/utils/statusColors';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useAuthStore } from '@/store/authStore';
import { Download, Eye, CheckCircle, XCircle, Package, DollarSign, AlertTriangle, FileWarning, AlertCircle, Edit, Wrench, ArrowRightLeft, X, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { ResponsiveCardGrid, ResponsiveFilterGrid } from '@/components/ui/ResponsiveContainers';
import { ModalRetiradaPecas } from '@/components/estoque/ModalRetiradaPecas';
import { verificarDisponibilidadeRetirada } from '@/utils/retiradaPecasApi';
import { verificarEstoqueBaixo, getLimiteMinimo } from '@/pages/CadastrosAcessorios';

import { formatCurrency, exportToCSV, parseMoeda } from '@/utils/formatUtils';

export default function EstoqueProdutos() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterLojaById, obterEstoquistas } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const [produtos, setProdutos] = useState(getProdutos());
  const stats = getEstoqueStats();
  const lojasEstoque = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();
  
  const [lojaFilter, setLojaFilter] = useState<string>('todas');
  const [modeloFilter, setModeloFilter] = useState('');
  const [imeiFilter, setImeiFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [statusAparelhoFilter, setStatusAparelhoFilter] = useState<string>('todos');
  const [somenteNaoConferidos, setSomenteNaoConferidos] = useState(false);
  
  // Modal para informar valor recomendado
  const [showValorModal, setShowValorModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [novoValorRecomendado, setNovoValorRecomendado] = useState('');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');

  // Modal para retirada de peças
  const [showRetiradaModal, setShowRetiradaModal] = useState(false);
  const [produtoRetirada, setProdutoRetirada] = useState<Produto | null>(null);
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
    // Usar lojaAtualId se existir (produto em movimentação matriz), senão usar loja original
    const lojaEfetiva = p.lojaAtualId || p.loja;
    if (lojaFilter !== 'todas' && lojaEfetiva !== lojaFilter) return false;
    if (modeloFilter && !p.modelo.toLowerCase().includes(modeloFilter.toLowerCase())) return false;
    if (imeiFilter && !unformatIMEI(p.imei).includes(unformatIMEI(imeiFilter))) return false;
    if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
    if (origemFilter !== 'todas' && p.origemEntrada !== origemFilter) return false;
    if (statusAparelhoFilter !== 'todos' && getStatusAparelho(p) !== statusAparelhoFilter) return false;
    if (somenteNaoConferidos && (p.estoqueConferido && p.assistenciaConferida)) return false;
    return true;
  });

  // Stats dinâmicos baseados nos filtros
  // Calcular produtos com estoque baixo baseado no limite configurado em Cadastros > Acessórios
  const produtosEstoqueBaixo = produtosFiltrados.filter(p => verificarEstoqueBaixo(p.modelo, p.quantidade));
  
  const statsFiltrados = {
    totalProdutos: produtosFiltrados.length,
    valorTotalEstoque: produtosFiltrados.reduce((acc, p) => acc + p.valorCusto * p.quantidade, 0),
    produtosBateriaFraca: produtosFiltrados.filter(p => p.saudeBateria < 85).length,
    notasPendentes: stats.notasPendentes,
    produtosEstoqueBaixo: produtosEstoqueBaixo.length
  };

  const handleExport = () => {
    exportToCSV(produtosFiltrados, 'produtos-estoque.csv');
  };

  const handleOpenValorModal = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setNovoValorRecomendado(produto.vendaRecomendada?.toString() || '');
    setUsuarioSelecionado(user?.colaborador?.id || '');
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
        <ResponsiveCardGrid cols={5}>
          <Card className="overflow-hidden min-w-0">
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

          <Card className="overflow-hidden min-w-0">
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

          <Card className={cn("overflow-hidden min-w-0", statsFiltrados.produtosBateriaFraca > 0 && 'bg-orange-500/10')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                  <AlertTriangle className={cn("h-5 w-5", statsFiltrados.produtosBateriaFraca > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Bateria &lt; 85%</p>
                  <p className={cn("text-xl sm:text-2xl font-bold", statsFiltrados.produtosBateriaFraca > 0 && 'text-orange-500')}>{statsFiltrados.produtosBateriaFraca}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Estoque Baixo - Sincronizado com Cadastros > Acessórios */}
          <Card className={cn("overflow-hidden min-w-0", statsFiltrados.produtosEstoqueBaixo > 0 && 'bg-destructive/10')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-destructive/10 flex-shrink-0">
                  <AlertCircle className={cn("h-5 w-5", statsFiltrados.produtosEstoqueBaixo > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Estoque Baixo</p>
                  <p className={cn("text-xl sm:text-2xl font-bold", statsFiltrados.produtosEstoqueBaixo > 0 && 'text-destructive')}>{statsFiltrados.produtosEstoqueBaixo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("overflow-hidden min-w-0", statsFiltrados.notasPendentes > 0 && 'bg-amber-500/10')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                  <FileWarning className={cn("h-5 w-5", statsFiltrados.notasPendentes > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Notas Pendentes</p>
                  <p className={cn("text-xl sm:text-2xl font-bold", statsFiltrados.notasPendentes > 0 && 'text-amber-500')}>{statsFiltrados.notasPendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>

        {/* Filters */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            <ResponsiveFilterGrid cols={5}>
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
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select value={statusAparelhoFilter} onValueChange={setStatusAparelhoFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Disponível">Disponível</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Em movimentação">Em movimentação</SelectItem>
                    <SelectItem value="Empréstimo">Empréstimo</SelectItem>
                    <SelectItem value="Retirada de Peças">Retirada de Peças</SelectItem>
                    <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
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

              <div>
                <p className="text-xs text-muted-foreground mb-1">Modelo</p>
                <Input
                  placeholder="Modelo"
                  value={modeloFilter}
                  onChange={(e) => setModeloFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2 h-10 self-end">
                <Checkbox 
                  id="naoConferidos" 
                  checked={somenteNaoConferidos}
                  onCheckedChange={(checked) => setSomenteNaoConferidos(checked as boolean)}
                />
                <label htmlFor="naoConferidos" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                  Só não conferidos
                </label>
              </div>

              <div className="flex gap-2 self-end">
                <Button 
                  onClick={() => {
                    setLojaFilter('todas');
                    setModeloFilter('');
                    setImeiFilter('');
                    setTipoFilter('todos');
                    setOrigemFilter('todas');
                    setStatusAparelhoFilter('todos');
                    setSomenteNaoConferidos(false);
                  }} 
                  variant="ghost"
                  size="sm"
                >
                  <X className="mr-1 h-4 w-4" />
                  Limpar
                </Button>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="mr-1 h-4 w-4" />
                  CSV
                </Button>
              </div>
            </ResponsiveFilterGrid>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Produto</TableHead>
                <TableHead className="sticky left-[150px] z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Saúde</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Venda Recomendada</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Custo Assist.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Qtd</TableHead>
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

                const getStickyBgByBattery = (saudeBateria: number) => {
                  if (saudeBateria >= 90) return 'bg-[hsl(142,72%,95%)] dark:bg-[hsl(142,30%,14%)]';
                  if (saudeBateria >= 80) return 'bg-background';
                  if (saudeBateria >= 70) return 'bg-[hsl(38,92%,95%)] dark:bg-[hsl(38,40%,14%)]';
                  return 'bg-[hsl(0,84%,95%)] dark:bg-[hsl(0,40%,14%)]';
                };
                
                return (
                <TableRow 
                  key={produto.id}
                  className={getRowClassByBattery(produto.saudeBateria)}
                >
                  {/* Produto (sticky) */}
                   <TableCell className={cn("sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", getStickyBgByBattery(produto.saudeBateria))}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{produto.modelo}</span>
                        {verificarEstoqueBaixo(produto.modelo, produto.quantidade) && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertCircle className="h-3 w-3 mr-0.5" />
                            Estoque Baixo
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{produto.cor}</span>
                    </div>
                  </TableCell>
                  {/* Saúde (sticky) */}
                  <TableCell className={cn("sticky left-[150px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]", getStickyBgByBattery(produto.saudeBateria))}>
                    <span className={cn(
                      'font-semibold',
                      produto.saudeBateria < 70 ? 'text-destructive' :
                      produto.saudeBateria < 80 ? 'text-orange-500' :
                      produto.saudeBateria < 90 ? 'text-yellow-500' : 'text-green-500'
                    )}>
                      {produto.saudeBateria}%
                    </span>
                  </TableCell>
                  {/* Loja */}
                  <TableCell className="text-sm">{getLojaNome(produto.lojaAtualId || produto.loja)}</TableCell>
                  {/* Venda Recomendada */}
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        onClick={() => handleOpenValorModal(produto)}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Informar Valor
                      </Button>
                    )}
                  </TableCell>
                  {/* Custo */}
                  <TableCell>
                    {formatCurrency(produto.valorCusto)}
                  </TableCell>
                  {/* Custo Assist. */}
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
                  {/* Status do Aparelho */}
                  <TableCell>
                    {(() => {
                      const status = getStatusAparelho(produto);
                      return (
                        <Badge variant="outline" className={getStatusBadgeClasses(status)}>
                          {status}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  {/* ID */}
                  <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                  {/* IMEI */}
                  <TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
                  {/* Tipo */}
                  <TableCell>
                    <Badge variant="outline" className={
                      produto.tipo === 'Novo' 
                        ? 'bg-primary/10 text-primary border-primary/30' 
                        : 'bg-muted text-muted-foreground'
                    }>
                      {produto.tipo}
                    </Badge>
                  </TableCell>
                  {/* Origem */}
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
                  {/* Qtd */}
                  <TableCell>{produto.quantidade}</TableCell>
                  {/* Estoque */}
                  <TableCell>
                    {produto.estoqueConferido ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                  {/* Assistência */}
                  <TableCell>
                    {produto.assistenciaConferida ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/estoque/produto/${produto.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {verificarDisponibilidadeRetirada(produto.id).disponivel && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-orange-500 hover:text-orange-600"
                          onClick={() => {
                            setProdutoRetirada(produto);
                            setShowRetiradaModal(true);
                          }}
                          title="Retirada de Peças"
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
                <Input
                  value={user?.colaborador?.nome || 'Não identificado'}
                  disabled
                  className="bg-muted"
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

      {/* Modal Retirada de Peças */}
      <ModalRetiradaPecas
        open={showRetiradaModal}
        onOpenChange={setShowRetiradaModal}
        produto={produtoRetirada}
        onSuccess={() => setProdutos(getProdutos())}
      />
    </EstoqueLayout>
  );
}
