import { useState, useEffect, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMovimentacoes, addMovimentacao, getProdutos, Produto, confirmarRecebimentoMovimentacao, Movimentacao } from '@/utils/estoqueApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { exportToCSV } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { Download, Plus, CheckCircle, Clock, Search, Package, Eye, Edit, X, Camera } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';

export default function EstoqueMovimentacoes() {
  const { obterLojasTipoLoja, obterColaboradoresAtivos, obterLojaById, obterNomeLoja } = useCadastroStore();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>(getMovimentacoes());
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [destinoFilter, setDestinoFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [imeiFilter, setImeiFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [movimentacaoParaConfirmar, setMovimentacaoParaConfirmar] = useState<string | null>(null);
  const [responsavelConfirmacao, setResponsavelConfirmacao] = useState<string>('');
  const { toast } = useToast();

  // Apenas lojas do tipo 'Loja' para movimentações
  const lojas = obterLojasTipoLoja();
  const colaboradores = obterColaboradoresAtivos();
  
  // Colaboradores com permissão de estoque ou gestor
  const colaboradoresComPermissao = colaboradores.filter(
    col => col.eh_estoquista || col.eh_gestor
  );
  
  const [produtos] = useState<Produto[]>(getProdutos());

  // Form state
  const [formData, setFormData] = useState({
    produtoId: '',
    responsavel: '',
    data: '',
    motivo: '',
    origem: '',
    destino: '',
  });
  
  // Modal de busca de produto
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaLojaModal, setBuscaLojaModal] = useState<string>('todas');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Modal de detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [movimentacaoDetalhe, setMovimentacaoDetalhe] = useState<Movimentacao | null>(null);

  // Modal de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState<Movimentacao | null>(null);
  const [editFormData, setEditFormData] = useState({
    destino: '',
    motivo: '',
  });
  
  // Scanner de IMEI
  const [showScanner, setShowScanner] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Produtos disponíveis para movimentação (não bloqueados, não em movimentação)
  const produtosDisponiveis = useMemo(() => {
    return produtos.filter(p => 
      p.quantidade > 0 && 
      !p.bloqueadoEmVendaId && 
      !p.statusMovimentacao
    );
  }, [produtos]);

  // Filtro de produtos na busca
  const produtosFiltrados = useMemo(() => {
    let resultado = produtosDisponiveis;
    
    // Filtrar por loja
    if (buscaLojaModal !== 'todas') {
      resultado = resultado.filter(p => p.loja === buscaLojaModal);
    }
    
    // Filtrar por texto
    if (buscaProduto) {
      const busca = buscaProduto.toLowerCase();
      resultado = resultado.filter(p => 
        p.modelo.toLowerCase().includes(busca) ||
        p.imei.includes(busca) ||
        p.marca.toLowerCase().includes(busca)
      );
    }
    
    return resultado;
  }, [produtosDisponiveis, buscaProduto, buscaLojaModal]);

  const getLojaNome = (lojaIdOuNome: string) => {
    const loja = obterLojaById(lojaIdOuNome);
    if (loja) return loja.nome;
    return obterNomeLoja(lojaIdOuNome);
  };

  const movimentacoesFiltradas = movimentacoes.filter(m => {
    if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
    if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
    if (statusFilter !== 'todos' && m.status !== statusFilter) return false;
    if (imeiFilter && !m.imei.includes(imeiFilter.replace(/\D/g, ''))) return false;
    return true;
  });

  // Abrir diálogo de confirmação
  const handleAbrirConfirmacao = (movId: string) => {
    setMovimentacaoParaConfirmar(movId);
    setResponsavelConfirmacao('');
    setConfirmDialogOpen(true);
  };

  // Confirmar recebimento de uma movimentação
  const handleConfirmarRecebimento = () => {
    if (!movimentacaoParaConfirmar || !responsavelConfirmacao) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o responsável pela confirmação',
        variant: 'destructive'
      });
      return;
    }

    const nomeResponsavel = colaboradores.find(c => c.id === responsavelConfirmacao)?.nome || responsavelConfirmacao;
    const result = confirmarRecebimentoMovimentacao(movimentacaoParaConfirmar, nomeResponsavel);
    
    if (result) {
      setMovimentacoes(getMovimentacoes());
      setConfirmDialogOpen(false);
      setMovimentacaoParaConfirmar(null);
      setResponsavelConfirmacao('');
      toast({
        title: 'Recebimento confirmado',
        description: `Movimentação ${movimentacaoParaConfirmar} confirmada por ${nomeResponsavel}`,
      });
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o recebimento',
        variant: 'destructive'
      });
    }
  };

  // Salvar edição de movimentação
  const handleSalvarEdicao = () => {
    if (!movimentacaoParaEditar) return;

    if (!editFormData.destino) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o destino',
        variant: 'destructive'
      });
      return;
    }

    // Atualizar a movimentação na lista
    const movIndex = movimentacoes.findIndex(m => m.id === movimentacaoParaEditar.id);
    if (movIndex !== -1) {
      const updatedMov = {
        ...movimentacoes[movIndex],
        destino: editFormData.destino,
        motivo: editFormData.motivo,
      };
      const newMovimentacoes = [...movimentacoes];
      newMovimentacoes[movIndex] = updatedMov;
      setMovimentacoes(newMovimentacoes);
    }

    setEditDialogOpen(false);
    setMovimentacaoParaEditar(null);
    toast({
      title: 'Movimentação atualizada',
      description: 'Os dados da movimentação foram atualizados com sucesso',
    });
  };

  const handleExport = () => {
    const dataToExport = movimentacoesFiltradas.map(m => ({
      ...m,
      imei: formatIMEI(m.imei),
      data: new Date(m.data).toLocaleDateString('pt-BR'),
      origem: getLojaNome(m.origem),
      destino: getLojaNome(m.destino)
    }));
    exportToCSV(dataToExport, 'movimentacoes-estoque.csv');
  };

  // Selecionar produto
  const handleSelecionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    // Preencher origem com a loja atual do produto
    setFormData(prev => ({ ...prev, origem: produto.loja, produtoId: produto.id }));
    setShowProdutoModal(false);
    setBuscaProduto('');
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!produtoSelecionado) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um produto',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.responsavel) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um responsável',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.destino) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o destino',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.motivo || !formData.motivo.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o motivo da movimentação',
        variant: 'destructive'
      });
      return;
    }

    if (formData.origem === formData.destino) {
      toast({
        title: 'Erro',
        description: 'Origem e destino não podem ser iguais',
        variant: 'destructive'
      });
      return;
    }

    const novaMovimentacao = addMovimentacao({
      data: formData.data || new Date().toISOString().split('T')[0],
      produto: `${produtoSelecionado.marca} ${produtoSelecionado.modelo}`,
      imei: produtoSelecionado.imei,
      quantidade: 1,
      origem: formData.origem,
      destino: formData.destino,
      responsavel: colaboradores.find(c => c.id === formData.responsavel)?.nome || formData.responsavel,
      motivo: formData.motivo
    });

    setMovimentacoes([...movimentacoes, novaMovimentacao]);
    setDialogOpen(false);
    setFormData({
      produtoId: '',
      responsavel: '',
      data: '',
      motivo: '',
      origem: '',
      destino: '',
    });
    setProdutoSelecionado(null);
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso. Produto agora está "Em movimentação".`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações - Aparelhos">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <AutocompleteLoja
            value={origemFilter === 'todas' ? '' : origemFilter}
            onChange={(v) => setOrigemFilter(v || 'todas')}
            placeholder="Todas as origens"
          />

          <AutocompleteLoja
            value={destinoFilter === 'todas' ? '' : destinoFilter}
            onChange={(v) => setDestinoFilter(v || 'todas')}
            placeholder="Todos os destinos"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Recebido">Recebido</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 items-center">
            <Input
              placeholder="Filtrar por IMEI..."
              value={imeiFilter}
              onChange={(e) => setImeiFilter(e.target.value)}
              className="w-[180px]"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowScanner(true)}
              title="Escanear IMEI"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => {
              setOrigemFilter('todas');
              setDestinoFilter('todas');
              setStatusFilter('todos');
              setImeiFilter('');
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>

          <div className="ml-auto flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarMovimentacao} className="space-y-4">
                  {/* 1. Buscar Produto */}
                  <div>
                    <Label>Produto *</Label>
                    {produtoSelecionado ? (
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{produtoSelecionado.marca} {produtoSelecionado.modelo}</p>
                          <p className="text-sm text-muted-foreground">
                            IMEI: {formatIMEI(produtoSelecionado.imei)} | Cor: {produtoSelecionado.cor} | Loja: {getLojaNome(produtoSelecionado.loja)}
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setProdutoSelecionado(null);
                            setFormData(prev => ({ ...prev, origem: '', produtoId: '' }));
                          }}
                        >
                          Trocar
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowProdutoModal(true)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Buscar Produto no Estoque
                      </Button>
                    )}
                  </div>

                  {/* 2. Responsável */}
                  <div>
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <AutocompleteColaborador
                      value={formData.responsavel}
                      onChange={(v) => setFormData(prev => ({ ...prev, responsavel: v }))}
                      placeholder="Selecione o colaborador"
                      filtrarPorTipo="estoquistas"
                    />
                  </div>

                  {/* 3. Data da Movimentação */}
                  <div>
                    <Label htmlFor="data">Data da Movimentação</Label>
                    <Input 
                      id="data" 
                      type="date" 
                      value={formData.data}
                      onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se não informado, será usada a data atual
                    </p>
                  </div>

                  {/* Origem e Destino */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem</Label>
                      <Input 
                        value={produtoSelecionado ? getLojaNome(produtoSelecionado.loja) : ''}
                        disabled
                        placeholder="Selecione um produto"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Preenchido automaticamente
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino *</Label>
                      <AutocompleteLoja
                        value={formData.destino}
                        onChange={(v) => setFormData(prev => ({ ...prev, destino: v }))}
                        placeholder="Selecione o destino"
                        apenasLojasTipoLoja
                      />
                    </div>
                  </div>

                  {/* 4. Motivo (obrigatório) */}
                  <div>
                    <Label htmlFor="motivo">Motivo *</Label>
                    <Textarea 
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                      placeholder="Informe o motivo da movimentação"
                      rows={3}
                      required
                    />
                  </div>

                  {/* 5. Botões de ação */}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setDialogOpen(false);
                      setProdutoSelecionado(null);
                      setFormData({
                        produtoId: '',
                        responsavel: '',
                        data: '',
                        motivo: '',
                        origem: '',
                        destino: '',
                      });
                    }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={!produtoSelecionado}>Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <ResponsiveTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.map(mov => (
                <TableRow 
                  key={mov.id} 
                  className={cn(
                    mov.status === 'Pendente' && 'bg-yellow-500/10',
                    mov.status === 'Recebido' && 'bg-green-500/10'
                  )}
                >
                  <TableCell>{mov.produto}</TableCell>
                  <TableCell className="font-mono text-xs">{formatIMEI(mov.imei)}</TableCell>
                  <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{getLojaNome(mov.origem)}</TableCell>
                  <TableCell>{getLojaNome(mov.destino)}</TableCell>
                  <TableCell>
                    {mov.status === 'Recebido' ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Recebido</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Pendente</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={mov.motivo}>{mov.motivo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Botão Ver Detalhes */}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setMovimentacaoDetalhe(mov);
                          setShowDetalhesModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Botão Editar - só disponível enquanto pendente */}
                      {mov.status === 'Pendente' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setMovimentacaoParaEditar(mov);
                            setEditFormData({
                              destino: mov.destino,
                              motivo: mov.motivo,
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Botão Confirmar - só disponível enquanto pendente */}
                      {mov.status === 'Pendente' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleAbrirConfirmacao(mov.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>

        {/* Dialog de Confirmação de Recebimento */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
              <AlertDialogDescription>
                Selecione o responsável que está confirmando o recebimento desta movimentação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="responsavelConfirmacao">Responsável *</Label>
              <Select 
                value={responsavelConfirmacao}
                onValueChange={setResponsavelConfirmacao}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresComPermissao.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setConfirmDialogOpen(false);
                setMovimentacaoParaConfirmar(null);
                setResponsavelConfirmacao('');
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmarRecebimento}>
                Confirmar Recebimento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Busca de Produto */}
        <Dialog open={showProdutoModal} onOpenChange={setShowProdutoModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Buscar Produto no Estoque</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por modelo, marca ou IMEI..."
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowScannerModal(true)}
                  title="Escanear IMEI"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Select value={buscaLojaModal} onValueChange={setBuscaLojaModal}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as lojas</SelectItem>
                    {lojas.map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum produto disponível encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      produtosFiltrados.map(produto => (
                        <TableRow key={produto.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">{formatIMEI(produto.imei)}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{produto.modelo}</span>
                              <span className="text-muted-foreground ml-1 text-sm">({produto.marca})</span>
                            </div>
                          </TableCell>
                          <TableCell>{produto.cor}</TableCell>
                          <TableCell>
                            <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                              {produto.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>{getLojaNome(produto.loja)}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleSelecionarProduto(produto)}
                            >
                              Selecionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Exibindo {produtosFiltrados.length} de {produtosDisponiveis.length} produtos disponíveis
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes da Movimentação (Timeline) */}
        <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline da Movimentação
              </DialogTitle>
            </DialogHeader>
            {movimentacaoDetalhe && (
              <div className="space-y-4">
                {/* Produto */}
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="font-medium">{movimentacaoDetalhe.produto}</p>
                  <p className="text-sm text-muted-foreground font-mono">{formatIMEI(movimentacaoDetalhe.imei)}</p>
                </div>

                {/* Timeline Visual */}
                <div className="relative">
                  {/* Linha de conexão */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" />
                  
                  {/* Etapa 1 - Envio */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <Package className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Envio Registrado</p>
                      <div className="bg-muted/30 p-3 rounded-md mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Loja de Origem</p>
                            <p className="font-medium">{getLojaNome(movimentacaoDetalhe.origem)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Data de Envio</p>
                            <p className="font-medium">{new Date(movimentacaoDetalhe.data).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Usuário que Enviou</p>
                          <p className="font-medium">{movimentacaoDetalhe.responsavel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Etapa 2 - Destino */}
                  <div className="relative flex gap-4 pb-6">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center z-10",
                      movimentacaoDetalhe.status === 'Recebido' 
                        ? "bg-green-500" 
                        : "bg-yellow-500"
                    )}>
                      {movimentacaoDetalhe.status === 'Recebido' 
                        ? <CheckCircle className="h-4 w-4 text-white" />
                        : <Clock className="h-4 w-4 text-white" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {movimentacaoDetalhe.status === 'Recebido' 
                          ? 'Recebimento Confirmado' 
                          : 'Aguardando Recebimento'}
                      </p>
                      <div className="bg-muted/30 p-3 rounded-md mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Loja de Destino</p>
                            <p className="font-medium">{getLojaNome(movimentacaoDetalhe.destino)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Data de Recebimento</p>
                            <p className="font-medium">
                              {movimentacaoDetalhe.dataRecebimento 
                                ? new Date(movimentacaoDetalhe.dataRecebimento).toLocaleString('pt-BR')
                                : <span className="text-yellow-600">Pendente</span>}
                            </p>
                          </div>
                        </div>
                        {movimentacaoDetalhe.status === 'Recebido' && (
                          <div>
                            <p className="text-muted-foreground text-xs">Usuário que Recebeu</p>
                            <p className="font-medium">{movimentacaoDetalhe.responsavelRecebimento || '-'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                {movimentacaoDetalhe.motivo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="text-sm bg-muted/30 p-2 rounded">{movimentacaoDetalhe.motivo}</p>
                  </div>
                )}

                {/* Status Final */}
                {movimentacaoDetalhe.status === 'Pendente' && (
                  <div className="border-t pt-4">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Produto em trânsito - bloqueado para venda
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição da Movimentação */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Movimentação</DialogTitle>
            </DialogHeader>
            {movimentacaoParaEditar && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Produto</p>
                  <p className="font-medium">{movimentacaoParaEditar.produto}</p>
                  <p className="text-sm text-muted-foreground font-mono">{formatIMEI(movimentacaoParaEditar.imei)}</p>
                </div>

                <div>
                  <Label>Origem</Label>
                  <Input value={getLojaNome(movimentacaoParaEditar.origem)} disabled />
                </div>

                <div>
                  <Label htmlFor="editDestino">Destino *</Label>
                  <Select 
                    value={editFormData.destino}
                    onValueChange={(v) => setEditFormData(prev => ({ ...prev, destino: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas
                        .filter(loja => loja.id !== movimentacaoParaEditar.origem)
                        .map(loja => (
                          <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editMotivo">Motivo *</Label>
                  <Textarea 
                    id="editMotivo"
                    value={editFormData.motivo}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Informe o motivo da movimentação"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditDialogOpen(false);
                      setMovimentacaoParaEditar(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSalvarEdicao}>Salvar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Scanner de IMEI para filtro */}
        <BarcodeScanner
          open={showScanner}
          onScan={(code) => {
            setImeiFilter(code);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />

        {/* Scanner de IMEI para modal de busca */}
        <BarcodeScanner
          open={showScannerModal}
          onScan={(code) => {
            const cleanCode = code.replace(/\D/g, '');
            setBuscaProduto(cleanCode);
            const produto = produtosFiltrados.find(p => p.imei === cleanCode);
            if (produto) {
              handleSelecionarProduto(produto);
            }
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      </div>
    </EstoqueLayout>
  );
}
