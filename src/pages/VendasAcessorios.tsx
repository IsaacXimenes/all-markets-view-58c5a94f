import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, Search, Plus, X, Clock, Trash2, 
  User, Package, CreditCard, Truck, FileText, AlertTriangle, Check, Save 
} from 'lucide-react';
import { 
  getClientes, getOrigensVenda, 
  getContasFinanceiras, Cliente, OrigemVenda, ContaFinanceira,
  addCliente, calcularTipoPessoa
} from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getNextVendaNumber, getHistoricoComprasCliente, Pagamento, addVenda } from '@/utils/vendasApi';
import { inicializarVendaNoFluxo } from '@/utils/fluxoVendasApi';
import { formatarMoeda } from '@/utils/formatUtils';
import { 
  getAcessorios, 
  subtrairEstoqueAcessorio, 
  Acessorio,
  VendaAcessorio 
} from '@/utils/acessoriosApi';
import { useDraftVenda } from '@/hooks/useDraftVenda';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';

// Alias para compatibilidade
const formatCurrency = formatarMoeda;

const TIMER_DURATION = 1800; // 30 minutos em segundos
const DRAFT_KEY = 'draft_venda_acessorios';

export default function VendasAcessorios() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterLojasTipoLoja, obterVendedores, obterNomeLoja, obterNomeColaborador, obterColaboradorById, obterRodizioAtivoDoColaborador } = useCadastroStore();
  
  // Dados do cadastros - usando Zustand store
  const lojas = obterLojasAtivas();
  const lojasTipoLoja = obterLojasTipoLoja();
  const vendedoresDisponiveis = obterVendedores();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [acessoriosEstoque, setAcessoriosEstoque] = useState<Acessorio[]>(getAcessorios());
  
  // Info da venda
  const [vendaInfo] = useState(getNextVendaNumber());
  const [lojaVenda, setLojaVenda] = useState('');
  const [vendedor, setVendedor] = useState('');
  
  // Cliente
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState<Partial<Cliente>>({});
  
  // Origem e retirada
  const [origemVenda, setOrigemVenda] = useState('');
  const [localRetirada, setLocalRetirada] = useState('');
  const [tipoRetirada, setTipoRetirada] = useState<'Retirada Balcão' | 'Entrega' | 'Retirada em Outra Loja'>('Retirada Balcão');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  
  // Acessórios da venda
  const [acessorios, setAcessorios] = useState<VendaAcessorio[]>([]);
  const [showAcessorioModal, setShowAcessorioModal] = useState(false);
  const [buscaAcessorio, setBuscaAcessorio] = useState('');
  const [quantidadeAcessorio, setQuantidadeAcessorio] = useState(1);
  const [acessorioSelecionado, setAcessorioSelecionado] = useState<Acessorio | null>(null);
  
  // Timer
  const [timer, setTimer] = useState<number | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  
  // Pagamentos
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  // Confirmação
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [confirmVendedor, setConfirmVendedor] = useState('');
  const [confirmLoja, setConfirmLoja] = useState('');

  // Draft (rascunho automático)
  const { saveDraft, loadDraft, clearDraft, hasDraft, getDraftAge, formatDraftAge } = useDraftVenda(DRAFT_KEY);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const isLoadingDraft = useRef(false);
  const lastSaveTime = useRef<number>(0);

  // Verificar se existe rascunho ao montar
  useEffect(() => {
    if (hasDraft()) {
      setDraftAge(getDraftAge());
      setShowDraftModal(true);
    }
  }, []);

  // Carregar rascunho
  const handleLoadDraft = () => {
    isLoadingDraft.current = true;
    const draft = loadDraft();
    if (draft) {
      setLojaVenda(draft.lojaVenda || '');
      setVendedor(draft.vendedor || '');
      setClienteId(draft.clienteId || '');
      setClienteNome(draft.clienteNome || '');
      setClienteCpf(draft.clienteCpf || '');
      setClienteTelefone(draft.clienteTelefone || '');
      setClienteEmail(draft.clienteEmail || '');
      setClienteCidade(draft.clienteCidade || '');
      setOrigemVenda(draft.origemVenda || '');
      setTipoRetirada(draft.tipoRetirada || 'Retirada Balcão');
      setTaxaEntrega(draft.taxaEntrega || 0);
      setObservacoes(draft.observacoes || '');
      setAcessorios(draft.acessorios || []);
      setPagamentos(draft.pagamentos || []);
      toast({ title: "Rascunho carregado", description: "Dados da venda anterior foram restaurados" });
    }
    setShowDraftModal(false);
    setTimeout(() => { isLoadingDraft.current = false; }, 500);
  };

  // Descartar rascunho
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftModal(false);
    toast({ title: "Rascunho descartado", description: "Iniciando nova venda" });
  };

  // Auto-save com debounce
  useEffect(() => {
    if (isLoadingDraft.current) return;
    
    const now = Date.now();
    if (now - lastSaveTime.current < 2000) return;
    
    const hasData = lojaVenda || vendedor || clienteId || acessorios.length > 0 || pagamentos.length > 0;
    if (!hasData) return;

    const timeout = setTimeout(() => {
      saveDraft({
        lojaVenda,
        vendedor,
        clienteId,
        clienteNome,
        clienteCpf,
        clienteTelefone,
        clienteEmail,
        clienteCidade,
        origemVenda,
        tipoRetirada,
        taxaEntrega,
        observacoes,
        acessorios,
        pagamentos
      });
      lastSaveTime.current = Date.now();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [lojaVenda, vendedor, clienteId, clienteNome, origemVenda, tipoRetirada, taxaEntrega, observacoes, acessorios, pagamentos]);

  // Timer effect
  useEffect(() => {
    if (timerStart && acessorios.length > 0) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining <= 0) {
          setAcessorios([]);
          setTimer(null);
          setTimerStart(null);
          toast({
            title: "Tempo esgotado",
            description: "Acessórios liberados novamente para o estoque",
            variant: "destructive"
          });
        } else {
          setTimer(remaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerStart, acessorios.length]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Cálculos
  const subtotal = useMemo(() => acessorios.reduce((acc, item) => acc + item.valorTotal, 0), [acessorios]);
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  const total = useMemo(() => subtotal + taxaEntrega, [subtotal, taxaEntrega]);
  const valorPendente = useMemo(() => total - totalPagamentos, [total, totalPagamentos]);
  
  // Custo total dos acessórios
  const custoTotalAcessorios = useMemo(() => acessorios.reduce((acc, a) => {
    const acessorio = acessoriosEstoque.find(ae => ae.id === a.acessorioId);
    return acc + (acessorio?.valorCusto || 0) * a.quantidade;
  }, 0), [acessorios, acessoriosEstoque]);

  // Lucro e Margem - igual Nova Venda
  const lucroProjetado = useMemo(() => total - custoTotalAcessorios, [total, custoTotalAcessorios]);
  const margemProjetada = useMemo(() => {
    if (custoTotalAcessorios === 0) return 0;
    return ((lucroProjetado / custoTotalAcessorios) * 100);
  }, [lucroProjetado, custoTotalAcessorios]);
  const isPrejuizo = lucroProjetado < 0;

  // Buscar cliente
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) || 
      c.cpf.includes(busca)
    );
  }, [clientes, buscaCliente]);

  const handleSelectCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast({ title: "Cliente bloqueado", description: "Este cliente está inativo.", variant: "destructive" });
      return;
    }
    
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteCpf(cliente.cpf);
    setClienteTelefone(cliente.telefone);
    setClienteEmail(cliente.email);
    setClienteCidade(cliente.cidade);
    setHistoricoCliente(getHistoricoComprasCliente(cliente.id));
    setShowClienteModal(false);
    setBuscaCliente('');
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast({ title: "Erro", description: "Nome e CPF/CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    
    const cpfLimpo = novoCliente.cpf.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cpfLimpo);
    
    if (clienteExistente) {
      toast({ title: "Erro", description: "CPF/CNPJ já cadastrado.", variant: "destructive" });
      return;
    }
    
    const cliente = addCliente({
      nome: novoCliente.nome,
      cpf: novoCliente.cpf,
      telefone: novoCliente.telefone || '',
      dataNascimento: novoCliente.dataNascimento || '',
      email: novoCliente.email || '',
      cep: novoCliente.cep || '',
      endereco: novoCliente.endereco || '',
      numero: novoCliente.numero || '',
      bairro: novoCliente.bairro || '',
      cidade: novoCliente.cidade || '',
      estado: novoCliente.estado || '',
      status: 'Ativo',
      origemCliente: 'Venda',
      idsCompras: []
    });
    
    setClientes([...clientes, cliente]);
    handleSelectCliente(cliente);
    setShowNovoClienteModal(false);
    setNovoCliente({});
    toast({ title: "Sucesso", description: "Cliente cadastrado!" });
  };

  // Acessórios filtrados
  const acessoriosFiltrados = useMemo(() => {
    return acessoriosEstoque.filter(a => {
      if (a.quantidade <= 0) return false;
      if (buscaAcessorio && !a.descricao.toLowerCase().includes(buscaAcessorio.toLowerCase())) return false;
      return true;
    });
  }, [acessoriosEstoque, buscaAcessorio]);

  // Adicionar acessório
  const handleAddAcessorio = () => {
    if (!acessorioSelecionado || quantidadeAcessorio <= 0) {
      toast({ title: "Erro", description: "Selecione um acessório e quantidade válida", variant: "destructive" });
      return;
    }

    if (acessorioSelecionado.quantidade < quantidadeAcessorio) {
      toast({ title: "Estoque insuficiente", description: `Disponível: ${acessorioSelecionado.quantidade} unidades`, variant: "destructive" });
      return;
    }

    const valorRecomendado = acessorioSelecionado.valorRecomendado || acessorioSelecionado.valorCusto * 1.5;

    const novoItem: VendaAcessorio = {
      id: `VA-${Date.now()}`,
      acessorioId: acessorioSelecionado.id,
      descricao: acessorioSelecionado.descricao,
      quantidade: quantidadeAcessorio,
      valorRecomendado: valorRecomendado,
      valorUnitario: valorRecomendado,
      valorTotal: valorRecomendado * quantidadeAcessorio
    };
    
    setAcessorios([...acessorios, novoItem]);
    setShowAcessorioModal(false);
    setAcessorioSelecionado(null);
    setQuantidadeAcessorio(1);
    setBuscaAcessorio('');
    
    if (acessorios.length === 0) {
      setTimerStart(Date.now());
      setTimer(TIMER_DURATION);
    }
    
    toast({ title: "Acessório adicionado", description: `${acessorioSelecionado.descricao} adicionado à venda` });
  };

  const handleRemoveAcessorio = (itemId: string) => {
    setAcessorios(acessorios.filter(a => a.id !== itemId));
    if (acessorios.length === 1) {
      setTimer(null);
      setTimerStart(null);
    }
  };

  // Lista de pendências para validação visual
  const pendencias = useMemo(() => {
    const lista: string[] = [];
    if (!lojaVenda) lista.push('Loja de Venda');
    if (!vendedor) lista.push('Responsável');
    if (!clienteId) lista.push('Cliente');
    if (!origemVenda) lista.push('Origem da Venda');
    if (acessorios.length === 0) lista.push('Pelo menos 1 acessório');
    if (valorPendente > 0) lista.push('Pagamento completo');
    return lista;
  }, [lojaVenda, vendedor, clienteId, origemVenda, acessorios.length, valorPendente]);

  // Validar venda - removido localRetirada
  const canSubmit = useMemo(() => {
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      acessorios.length > 0 &&
      valorPendente <= 0
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, acessorios.length, valorPendente]);

  const handleRegistrarVenda = () => {
    if (!canSubmit) return;
    setConfirmVendedor(vendedor);
    setConfirmLoja(lojaVenda);
    setShowConfirmacaoModal(true);
  };

  const handleConfirmarVenda = () => {
    // Criar venda no sistema (addVenda já subtrai estoque de acessórios automaticamente)
    const novaVenda = addVenda({
      dataHora: new Date().toISOString(),
      lojaVenda,
      vendedor,
      clienteId,
      clienteNome,
      clienteCpf,
      clienteTelefone,
      clienteEmail: clienteEmail || '',
      clienteCidade: clienteCidade || '',
      origemVenda,
      localRetirada: lojaVenda,
      tipoRetirada,
      taxaEntrega,
      itens: [],
      tradeIns: [],
      acessorios: acessorios,
      pagamentos,
      subtotal,
      totalTradeIn: 0,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes: observacoes || 'Venda Balcão - Acessórios',
      status: 'Concluída',
    } as any);

    // Inicializar no fluxo de conferências
    const vendedorNome = obterNomeColaborador(vendedor);
    inicializarVendaNoFluxo(novaVenda.id, vendedor, vendedorNome);

    // Limpar rascunho
    clearDraft();

    toast({
      title: "Venda registrada com sucesso!",
      description: `Venda de acessórios ${novaVenda.id} registrada e enviada para conferência!`,
    });

    setShowConfirmacaoModal(false);
    navigate('/vendas');
  };

  const getColaboradorNome = (colId: string) => obterNomeColaborador(colId);
  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);

  const getContaNome = (id: string) => {
    const conta = contasFinanceiras.find(c => c.id === id);
    return conta?.nome || id;
  };

  return (
    <VendasLayout title="Venda - Balcão">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/vendas')} className="gap-2">
          <span>←</span> Voltar
        </Button>
      </div>

      {timer !== null && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          timer <= 30 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'
        }`}>
          <Clock className="h-5 w-5" />
          <span className="text-2xl font-mono font-bold">{formatTimer(timer)}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Info da Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informações da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">ID da Venda</label>
                <Input value={vendaInfo.id} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Nº da Venda</label>
                <Input value={vendaInfo.numero} disabled className="bg-muted" />
              </div>
              <div>
                <label className={`text-sm font-medium ${!vendedor ? 'text-destructive' : ''}`}>
                  Responsável *
                </label>
                <AutocompleteColaborador
                  value={vendedor}
                  onChange={(id: string) => {
                    setVendedor(id);
                    if (id) {
                      const col = obterColaboradorById(id);
                      if (col) {
                        const rodizio = obterRodizioAtivoDoColaborador(col.id);
                        setLojaVenda(rodizio ? rodizio.loja_destino_id : col.loja_id);
                      }
                    } else {
                      setLojaVenda('');
                    }
                  }}
                  placeholder="Selecione o responsável"
                  filtrarPorTipo="vendedoresEGestores"
                  className={!vendedor ? 'border-destructive' : ''}
                />
              </div>
              <div>
                <label className={`text-sm font-medium ${!lojaVenda ? 'text-destructive' : ''}`}>
                  Loja de Venda *
                </label>
                <Input
                  value={lojaVenda ? obterNomeLoja(lojaVenda) : ''}
                  disabled
                  placeholder="Preenchido automaticamente"
                  className={`bg-muted ${!lojaVenda ? 'border-destructive' : ''}`}
                />
              </div>
              <div>
                <label className={`text-sm font-medium ${!origemVenda ? 'text-destructive' : ''}`}>
                  Origem da Venda *
                </label>
                <Select value={origemVenda} onValueChange={setOrigemVenda}>
                  <SelectTrigger className={!origemVenda ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {origensVenda.filter(o => o.status === 'Ativo').map(origem => (
                      <SelectItem key={origem.id} value={origem.origem}>{origem.origem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className={`text-sm font-medium ${!clienteId ? 'text-destructive' : ''}`}>
                      Nome do Cliente *
                    </label>
                    <Input 
                      value={clienteNome} 
                      placeholder="Nome do Cliente"
                      className={`${!clienteId ? 'border-destructive' : ''}`}
                      readOnly
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => setShowClienteModal(true)}>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </div>
                
                {clienteId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">CPF/CNPJ</label>
                      <p className="font-medium">{clienteCpf}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="font-medium">{clienteTelefone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">E-mail</label>
                      <p className="font-medium">{clienteEmail || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Cidade</label>
                      <p className="font-medium">{clienteCidade || '-'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Histórico de Compras */}
              {clienteId && historicoCliente.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Últimas Compras</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {historicoCliente.slice(0, 3).map((compra, idx) => (
                      <div key={idx} className="p-2 bg-muted rounded text-sm">
                        <div className="flex justify-between">
                          <span>{compra.produto}</span>
                          <span className="font-medium">{formatCurrency(compra.valor)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{compra.data}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acessórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Acessórios
                {acessorios.length > 0 && (
                  <Badge variant="secondary">{acessorios.length} item(s)</Badge>
                )}
              </span>
              <Button onClick={() => setShowAcessorioModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Acessórios
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acessorios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                Nenhum acessório adicionado. Clique em "Selecionar Acessórios" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acessório</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessorios.map(item => {
                    const acessorioOriginal = acessoriosEstoque.find(a => a.id === item.acessorioId);
                    const custoUnit = acessorioOriginal?.valorCusto || 0;
                    const lucroItem = item.valorTotal - (custoUnit * item.quantidade);
                    return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={item.quantidade <= 1}
                            onClick={() => {
                              setAcessorios(prev => prev.map(a =>
                                a.id === item.id
                                  ? { ...a, quantidade: a.quantidade - 1, valorTotal: a.valorUnitario * (a.quantidade - 1) }
                                  : a
                              ));
                            }}
                          >
                            <span className="text-sm font-bold">−</span>
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantidade}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const acessorioOriginal = acessoriosEstoque.find(a => a.id === item.acessorioId);
                              if (acessorioOriginal && item.quantidade >= acessorioOriginal.quantidade) {
                                toast({ title: "Estoque insuficiente", description: `Máximo disponível: ${acessorioOriginal.quantidade}`, variant: "destructive" });
                                return;
                              }
                              setAcessorios(prev => prev.map(a =>
                                a.id === item.id
                                  ? { ...a, quantidade: a.quantidade + 1, valorTotal: a.valorUnitario * (a.quantidade + 1) }
                                  : a
                              ));
                            }}
                          >
                            <span className="text-sm font-bold">+</span>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatCurrency(custoUnit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.valorRecomendado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="text"
                          className="w-24 text-right h-8 text-sm ml-auto"
                          value={formatCurrency(item.valorUnitario)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                            const num = parseFloat(raw);
                            if (!isNaN(num) && num >= 0) {
                              setAcessorios(prev => prev.map(a => 
                                a.id === item.id 
                                  ? { ...a, valorUnitario: num, valorTotal: num * a.quantidade }
                                  : a
                              ));
                            }
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                            const num = parseFloat(raw) || 0;
                            setAcessorios(prev => prev.map(a => 
                              a.id === item.id 
                                ? { ...a, valorUnitario: num, valorTotal: num * a.quantidade }
                                : a
                            ));
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${lucroItem >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(lucroItem)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveAcessorio(item.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagamentos - Usando PagamentoQuadro */}
        <PagamentoQuadro
          valorTotalProdutos={total}
          custoTotalProdutos={custoTotalAcessorios}
          lojaVendaId={lojaVenda}
          onPagamentosChange={setPagamentos}
          pagamentosIniciais={pagamentos}
        />

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações da venda..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Alerta de Pendências */}
        {pendencias.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Pendências para registrar a venda:</strong>
              <ul className="list-disc list-inside mt-1">
                {pendencias.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo */}
        <Card className={`${isPrejuizo ? 'border-destructive bg-destructive/5' : 'bg-muted/30'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Valores */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal Acessórios</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {taxaEntrega > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega</span>
                    <span className="font-medium">{formatCurrency(taxaEntrega)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Pago</span>
                  <span className="text-green-600 font-medium">{formatCurrency(totalPagamentos)}</span>
                </div>
                {valorPendente > 0 && (
                  <div className="flex justify-between text-sm text-destructive font-medium">
                    <span>Valor Pendente</span>
                    <span>{formatCurrency(valorPendente)}</span>
                  </div>
                )}
              </div>

              {/* Lucro e Margem */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Custo Total</span>
                  <span className="text-muted-foreground">{formatCurrency(custoTotalAcessorios)}</span>
                </div>
                <div className={`flex justify-between ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                  <span>Lucro Projetado</span>
                  <span className="font-bold">{formatCurrency(lucroProjetado)}</span>
                </div>
                <div className={`flex justify-between ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                  <span>Margem</span>
                  <span className="font-bold">{margemProjetada.toFixed(2)}%</span>
                </div>
                {isPrejuizo && (
                  <div className="mt-2 p-2 bg-destructive/10 rounded flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Venda com prejuízo!</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate('/vendas')}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRegistrarVenda}
                disabled={!canSubmit}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Registrar Venda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Buscar Cliente - max-w-5xl igual Nova Venda */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Buscar por nome ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => {
                setShowClienteModal(false);
                setShowNovoClienteModal(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map(cliente => (
                    <TableRow key={cliente.id} className={cliente.status === 'Inativo' ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <Badge variant={calcularTipoPessoa(cliente.cpf) === 'Pessoa Física' ? 'default' : 'secondary'}>
                          {calcularTipoPessoa(cliente.cpf) === 'Pessoa Física' ? 'PF' : 'PJ'}
                        </Badge>
                      </TableCell>
                      <TableCell>{cliente.cpf}</TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell>{cliente.cidade || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.status === 'Ativo' ? 'default' : 'destructive'}>
                          {cliente.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          onClick={() => handleSelectCliente(cliente)}
                          disabled={cliente.status === 'Inativo'}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Cliente */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input 
                value={novoCliente.nome || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CPF/CNPJ *</label>
              <Input 
                value={novoCliente.cpf || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cpf: formatCpfCnpj(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input 
                value={novoCliente.telefone || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input 
                value={novoCliente.email || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <Input 
                value={novoCliente.cidade || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoClienteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCliente}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Acessório */}
      <Dialog open={showAcessorioModal} onOpenChange={setShowAcessorioModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Acessório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Buscar acessório..."
              value={buscaAcessorio}
              onChange={(e) => setBuscaAcessorio(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Qtd Disponível</TableHead>
                    <TableHead className="text-right">Valor Custo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessoriosFiltrados.map(acessorio => (
                    <TableRow 
                      key={acessorio.id}
                      className={`${acessorioSelecionado?.id === acessorio.id ? 'bg-muted' : ''} ${acessorio.quantidade < 10 ? 'bg-destructive/10' : ''}`}
                    >
                      <TableCell className="font-mono text-sm">{acessorio.id}</TableCell>
                      <TableCell className="font-medium">{acessorio.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{acessorio.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={acessorio.quantidade < 10 ? 'destructive' : 'secondary'}>
                          {acessorio.quantidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(acessorio.valorCusto)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          variant={acessorioSelecionado?.id === acessorio.id ? 'default' : 'outline'}
                          onClick={() => setAcessorioSelecionado(acessorio)}
                        >
                          {acessorioSelecionado?.id === acessorio.id ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {acessoriosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum acessório encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {acessorioSelecionado && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <span className="font-medium">{acessorioSelecionado.descricao}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-sm">Quantidade:</label>
                  <Input 
                    type="number"
                    min="1"
                    max={acessorioSelecionado.quantidade}
                    value={quantidadeAcessorio}
                    onChange={(e) => setQuantidadeAcessorio(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAcessorioModal(false);
              setAcessorioSelecionado(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddAcessorio} disabled={!acessorioSelecionado}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação */}
      <Dialog open={showConfirmacaoModal} onOpenChange={setShowConfirmacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Confirmar Venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Confirme os dados para registrar a venda:</p>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{getColaboradorNome(confirmVendedor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loja</p>
                <p className="font-medium">{getLojaNome(confirmLoja)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{clienteNome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-medium text-lg">{formatCurrency(total)}</p>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total da Venda:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className={`flex justify-between ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                <span>Lucro:</span>
                <span className="font-medium">{formatCurrency(lucroProjetado)}</span>
              </div>
              <div className={`flex justify-between ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                <span>Margem:</span>
                <span className="font-medium">{margemProjetada.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVenda}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rascunho */}
      <Dialog open={showDraftModal} onOpenChange={setShowDraftModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Rascunho Encontrado
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Foi encontrado um rascunho de venda salvo {formatDraftAge(draftAge)}. Deseja continuar de onde parou?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>Descartar</Button>
            <Button onClick={handleLoadDraft}>Carregar Rascunho</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
