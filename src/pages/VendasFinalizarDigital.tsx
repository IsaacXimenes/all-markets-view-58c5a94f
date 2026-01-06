import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { 
  Lock, User, Calendar, DollarSign, Search, Plus, Clock, CheckCircle,
  ShoppingCart, Package, CreditCard, Truck, FileText, AlertTriangle, Check, X, Eye, Trash2, Shield, Save
} from 'lucide-react';
import { format, addMonths } from 'date-fns';

import { 
  getVendaDigitalById, 
  finalizarVendaDigital, 
  formatCurrency,
  VendaDigital 
} from '@/utils/vendasDigitalApi';
import { 
  getLojas, getClientes, getColaboradores, getCargos, getOrigensVenda, 
  getContasFinanceiras, Loja, Cliente, Colaborador, Cargo, OrigemVenda, ContaFinanceira,
  addCliente
} from '@/utils/cadastrosApi';
import { getProdutos, Produto, updateProduto } from '@/utils/estoqueApi';
import { addVenda, getHistoricoComprasCliente, ItemVenda, ItemTradeIn, Pagamento, formatCurrency as formatCurrencyVendas } from '@/utils/vendasApi';
import { getProdutosCadastro, ProdutoCadastro } from '@/utils/cadastrosApi';
import { getProdutosPendentes, ProdutoPendente } from '@/utils/osApi';
import { getAcessorios, Acessorio, VendaAcessorio } from '@/utils/acessoriosApi';
import { useDraftVenda } from '@/hooks/useDraftVenda';

const TIMER_DURATION = 1800; // 30 minutos em segundos

export default function VendasFinalizarDigital() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Dados do pré-cadastro
  const [venda, setVenda] = useState<VendaDigital | null>(null);
  
  // Dados do cadastros
  const [lojas] = useState<Loja[]>(getLojas());
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [colaboradores] = useState<Colaborador[]>(getColaboradores());
  const [cargos] = useState<Cargo[]>(getCargos());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [produtosEstoque] = useState<Produto[]>(getProdutos());
  const [produtosCadastro] = useState<ProdutoCadastro[]>(getProdutosCadastro());
  const [produtosPendentes] = useState<ProdutoPendente[]>(getProdutosPendentes());
  const [acessoriosEstoque, setAcessoriosEstoque] = useState<Acessorio[]>(getAcessorios());
  
  // Acessórios
  const [acessoriosVenda, setAcessoriosVenda] = useState<VendaAcessorio[]>([]);
  const [showAcessorioModal, setShowAcessorioModal] = useState(false);
  const [buscaAcessorio, setBuscaAcessorio] = useState('');
  
  // Info da venda (alguns campos bloqueados do pré-cadastro)
  const [lojaVenda, setLojaVenda] = useState('');
  
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
  const [origemVenda, setOrigemVenda] = useState('Digital');
  const [localRetirada, setLocalRetirada] = useState('');
  const [tipoRetirada, setTipoRetirada] = useState<'Retirada Balcão' | 'Entrega' | 'Retirada em Outra Loja'>('Retirada Balcão');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  
  // Itens da venda
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showPendentesTab, setShowPendentesTab] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaModeloProduto, setBuscaModeloProduto] = useState('');
  const [filtroLojaProduto, setFiltroLojaProduto] = useState('');
  
  // Timer
  const [timer, setTimer] = useState<number | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  
  // Trade-in
  const [tradeIns, setTradeIns] = useState<ItemTradeIn[]>([]);
  const [showTradeInModal, setShowTradeInModal] = useState(false);
  const [novoTradeIn, setNovoTradeIn] = useState<Partial<ItemTradeIn>>({});
  
  // Pagamentos
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [novoPagamento, setNovoPagamento] = useState<Partial<Pagamento>>({});
  
  // Confirmação
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  
  // Nota fiscal
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Detalhes do produto
  const [showDetalheProduto, setShowDetalheProduto] = useState(false);
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  
  // Garantias por item
  interface GarantiaItemVenda {
    itemId: string;
    tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
    mesesGarantia: number;
    dataFimGarantia: string;
  }
  const [garantiaItens, setGarantiaItens] = useState<GarantiaItemVenda[]>([]);

  // Draft (rascunho automático)
  const draftKey = `draft_venda_digital_${id}`;
  const { saveDraft, loadDraft, clearDraft, hasDraft, getDraftAge, formatDraftAge } = useDraftVenda(draftKey);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const isLoadingDraft = useRef(false);
  const lastSaveTime = useRef<number>(0);

  // Carregar dados do pré-cadastro
  useEffect(() => {
    if (id) {
      const vendaData = getVendaDigitalById(id);
      if (vendaData) {
        setVenda(vendaData);
        // Pré-preencher cliente nome do pré-cadastro
        setClienteNome(vendaData.clienteNome);
        
        // Verificar se existe rascunho após carregar a venda
        setTimeout(() => {
          if (hasDraft()) {
            setDraftAge(getDraftAge());
            setShowDraftModal(true);
          }
        }, 100);
      } else {
        toast.error('Venda não encontrada');
        navigate('/vendas/pendentes-digitais');
      }
    }
  }, [id, navigate]);

  // Carregar rascunho
  const handleLoadDraft = () => {
    isLoadingDraft.current = true;
    const draft = loadDraft();
    if (draft) {
      setLojaVenda(draft.lojaVenda || '');
      setClienteId(draft.clienteId || '');
      setClienteNome(draft.clienteNome || '');
      setClienteCpf(draft.clienteCpf || '');
      setClienteTelefone(draft.clienteTelefone || '');
      setClienteEmail(draft.clienteEmail || '');
      setClienteCidade(draft.clienteCidade || '');
      setOrigemVenda(draft.origemVenda || 'Digital');
      setLocalRetirada(draft.localRetirada || '');
      setTipoRetirada(draft.tipoRetirada || 'Retirada Balcão');
      setTaxaEntrega(draft.taxaEntrega || 0);
      setObservacoes(draft.observacoes || '');
      setItens(draft.itens || []);
      setAcessoriosVenda(draft.acessoriosVenda || []);
      setTradeIns(draft.tradeIns || []);
      setPagamentos(draft.pagamentos || []);
      setGarantiaItens(draft.garantiaItens || []);
      toast.success('Rascunho carregado');
    }
    setShowDraftModal(false);
    setTimeout(() => { isLoadingDraft.current = false; }, 500);
  };

  // Descartar rascunho
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftModal(false);
    toast.success('Rascunho descartado');
  };

  // Auto-save com debounce
  useEffect(() => {
    if (isLoadingDraft.current || !id) return;
    
    const now = Date.now();
    if (now - lastSaveTime.current < 2000) return;
    
    const hasData = lojaVenda || clienteId || itens.length > 0 || acessoriosVenda.length > 0 || pagamentos.length > 0;
    if (!hasData) return;

    const timeout = setTimeout(() => {
      saveDraft({
        lojaVenda,
        clienteId,
        clienteNome,
        clienteCpf,
        clienteTelefone,
        clienteEmail,
        clienteCidade,
        origemVenda,
        localRetirada,
        tipoRetirada,
        taxaEntrega,
        observacoes,
        itens,
        acessoriosVenda,
        tradeIns,
        pagamentos,
        garantiaItens
      });
      lastSaveTime.current = Date.now();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [lojaVenda, clienteId, clienteNome, origemVenda, localRetirada, tipoRetirada, taxaEntrega, observacoes, itens, acessoriosVenda, tradeIns, pagamentos, garantiaItens, id]);

  // Timer effect
  useEffect(() => {
    if (timerStart && itens.length > 0) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining <= 0) {
          setItens([]);
          setTimer(null);
          setTimerStart(null);
          toast.error('Tempo esgotado - Produtos liberados novamente para o estoque');
        } else {
          setTimer(remaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerStart, itens.length]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Cálculos
  const subtotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorVenda, 0), [itens]);
  const totalAcessorios = useMemo(() => acessoriosVenda.reduce((acc, a) => acc + a.valorTotal, 0), [acessoriosVenda]);
  const totalTradeIn = useMemo(() => tradeIns.reduce((acc, t) => acc + t.valorCompraUsado, 0), [tradeIns]);
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  const total = useMemo(() => subtotal + totalAcessorios - totalTradeIn + taxaEntrega, [subtotal, totalAcessorios, totalTradeIn, taxaEntrega]);
  const valorPendente = useMemo(() => total - totalPagamentos, [total, totalPagamentos]);
  
  const valorCustoAcessorios = useMemo(() => acessoriosVenda.reduce((acc, a) => {
    const acessorio = acessoriosEstoque.find(ae => ae.id === a.acessorioId);
    return acc + (acessorio?.valorCusto || 0) * a.quantidade;
  }, 0), [acessoriosVenda, acessoriosEstoque]);
  const valorCustoTotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0) + valorCustoAcessorios, [itens, valorCustoAcessorios]);
  const lucroProjetado = useMemo(() => total - valorCustoTotal, [total, valorCustoTotal]);
  
  // Acessórios filtrados
  const acessoriosFiltrados = useMemo(() => {
    return acessoriosEstoque.filter(a => {
      if (a.quantidade <= 0) return false;
      if (buscaAcessorio && !a.descricao.toLowerCase().includes(buscaAcessorio.toLowerCase())) return false;
      return true;
    });
  }, [acessoriosEstoque, buscaAcessorio]);

  // Adicionar acessório à venda
  const handleAddAcessorio = (acessorio: Acessorio) => {
    const existente = acessoriosVenda.find(a => a.acessorioId === acessorio.id);
    
    if (existente) {
      if (existente.quantidade + 1 > acessorio.quantidade) {
        toast.error(`Apenas ${acessorio.quantidade} unidades disponíveis.`);
        return;
      }
      const updated = acessoriosVenda.map(a => 
        a.acessorioId === acessorio.id 
          ? { ...a, quantidade: a.quantidade + 1, valorTotal: (a.quantidade + 1) * a.valorUnitario }
          : a
      );
      setAcessoriosVenda(updated);
    } else {
      const valorRecomendado = acessorio.valorRecomendado || acessorio.valorCusto * 1.5;
      const novoAcessorio: VendaAcessorio = {
        id: `ACESSV-${Date.now()}`,
        acessorioId: acessorio.id,
        descricao: acessorio.descricao,
        quantidade: 1,
        valorRecomendado: valorRecomendado,
        valorUnitario: valorRecomendado,
        valorTotal: valorRecomendado
      };
      setAcessoriosVenda([...acessoriosVenda, novoAcessorio]);
    }
    
    setShowAcessorioModal(false);
    setBuscaAcessorio('');
    toast.success(`${acessorio.descricao} adicionado à venda`);
  };

  // Remover acessório
  const handleRemoveAcessorio = (acessorioId: string) => {
    setAcessoriosVenda(acessoriosVenda.filter(a => a.id !== acessorioId));
  };
  const margemProjetada = useMemo(() => {
    if (valorCustoTotal === 0) return 0;
    return ((lucroProjetado / valorCustoTotal) * 100);
  }, [lucroProjetado, valorCustoTotal]);
  const isPrejuizo = lucroProjetado < 0;

  const tradeInNaoValidado = useMemo(() => tradeIns.some(t => !t.imeiValidado), [tradeIns]);

  // Buscar cliente
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) || 
      c.cpf.includes(busca)
    );
  }, [clientes, buscaCliente]);

  // Selecionar cliente
  const handleSelectCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast.error('Cliente bloqueado — não permitido');
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
      toast.error('Nome e CPF/CNPJ são obrigatórios');
      return;
    }
    
    const cpfLimpo = novoCliente.cpf.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cpfLimpo);
    
    if (clienteExistente) {
      if (clienteExistente.status === 'Inativo') {
        toast.error('Cliente bloqueado — não permitido cadastrar novamente');
        return;
      } else {
        toast.error('Este CPF/CNPJ já está cadastrado');
        return;
      }
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
    toast.success('Cliente cadastrado com sucesso!');
  };

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (filtroLojaProduto && p.loja !== filtroLojaProduto) return false;
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, filtroLojaProduto, buscaProduto, buscaModeloProduto]);

  const handleAddProduto = (produto: Produto) => {
    const novoItem: ItemVenda = {
      id: `ITEM-${Date.now()}`,
      produtoId: produto.id,
      produto: produto.modelo,
      imei: produto.imei,
      categoria: produto.marca,
      quantidade: 1,
      valorRecomendado: produto.valorVendaSugerido,
      valorVenda: produto.vendaRecomendada || produto.valorVendaSugerido,
      valorCusto: produto.valorCusto,
      loja: produto.loja
    };
    
    setItens([...itens, novoItem]);
    setShowProdutoModal(false);
    setBuscaProduto('');
    setFiltroLojaProduto('');
    
    if (itens.length === 0) {
      setTimerStart(Date.now());
      setTimer(TIMER_DURATION);
    }
    
    toast.success(`${produto.modelo} adicionado à venda`);
  };

  const handleRemoveItem = (itemId: string) => {
    setItens(itens.filter(i => i.id !== itemId));
    if (itens.length === 1) {
      setTimer(null);
      setTimerStart(null);
    }
  };

  const handleAddTradeIn = () => {
    if (!novoTradeIn.modelo || !novoTradeIn.valorCompraUsado || !novoTradeIn.condicao) {
      toast.error('Modelo, condição e valor são obrigatórios');
      return;
    }
    
    const tradeIn: ItemTradeIn = {
      id: `TRADE-${Date.now()}`,
      modelo: novoTradeIn.modelo!,
      descricao: novoTradeIn.descricao || '',
      imei: novoTradeIn.imei || '',
      valorCompraUsado: novoTradeIn.valorCompraUsado!,
      imeiValidado: novoTradeIn.imeiValidado || false,
      condicao: novoTradeIn.condicao as 'Novo' | 'Semi-novo'
    };
    
    setTradeIns([...tradeIns, tradeIn]);
    setShowTradeInModal(false);
    setNovoTradeIn({});
  };

  const handleAddPagamento = () => {
    if (!novoPagamento.meioPagamento || !novoPagamento.valor || !novoPagamento.contaDestino) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }
    
    // Validar parcelas para cartão crédito
    if (novoPagamento.meioPagamento === 'Cartão Crédito' && !novoPagamento.parcelas) {
      toast.error('Selecione o número de parcelas');
      return;
    }
    
    const parcelas = novoPagamento.meioPagamento === 'Cartão Crédito' 
      ? novoPagamento.parcelas 
      : novoPagamento.meioPagamento === 'Cartão Débito' 
        ? 1 
        : undefined;
    
    const valorParcela = parcelas && parcelas > 0 ? novoPagamento.valor! / parcelas : undefined;
    
    const pagamento: Pagamento = {
      id: `PAG-${Date.now()}`,
      meioPagamento: novoPagamento.meioPagamento!,
      valor: novoPagamento.valor!,
      contaDestino: novoPagamento.contaDestino!,
      parcelas,
      valorParcela,
      descricao: novoPagamento.descricao
    };
    
    setPagamentos([...pagamentos, pagamento]);
    setShowPagamentoModal(false);
    setNovoPagamento({});
  };

  const handleVerDetalhes = (produto: Produto) => {
    setProdutoDetalhe(produto);
    setShowDetalheProduto(true);
  };

  const handleGerarNota = async () => {
    const qrData = JSON.stringify({
      id: venda?.id,
      valor: total,
      cliente: clienteNome,
      data: new Date().toISOString()
    });
    
    try {
      const url = await QRCode.toDataURL(qrData);
      setQrCodeUrl(url);
      setShowNotaModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const canSubmit = useMemo(() => {
    return (
      lojaVenda &&
      clienteId &&
      origemVenda &&
      localRetirada &&
      itens.length > 0 &&
      valorPendente <= 0 &&
      !tradeInNaoValidado
    );
  }, [lojaVenda, clienteId, origemVenda, localRetirada, itens.length, valorPendente, tradeInNaoValidado]);

  const handleRegistrarVenda = () => {
    if (!canSubmit) return;
    setShowConfirmacaoModal(true);
  };

  const handleConfirmarVenda = () => {
    if (!venda) return;
    
    // Subtrair produtos do estoque
    itens.forEach(item => {
      const produto = produtosEstoque.find(p => p.id === item.produtoId);
      if (produto) {
        updateProduto(produto.id, { quantidade: produto.quantidade - item.quantidade });
      }
    });

    // Registrar venda
    addVenda({
      dataHora: new Date().toISOString(),
      lojaVenda,
      vendedor: venda.responsavelVendaId,
      clienteId,
      clienteNome,
      clienteCpf,
      clienteTelefone,
      clienteEmail,
      clienteCidade,
      origemVenda,
      localRetirada,
      tipoRetirada,
      taxaEntrega,
      itens,
      tradeIns,
      pagamentos,
      subtotal,
      totalTradeIn,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes,
      status: 'Concluída'
    });

    // Atualizar status da venda digital
    finalizarVendaDigital(
      venda.id,
      'COL-010',
      'Lucas Finalizador',
      clienteId,
      {
        itens,
        tradeIns,
        pagamentos,
        observacoes,
        origemVenda,
        localRetirada
      }
    );

    // Limpar rascunho
    clearDraft();

    toast.success(`Venda ${venda.id} finalizada com sucesso!`, {
      description: 'Estoque atualizado e enviada para Conferência de Contas'
    });

    setShowConfirmacaoModal(false);
    navigate('/vendas/pendentes-digitais');
  };

  const getColaboradorNome = (id: string) => colaboradores.find(c => c.id === id)?.nome || id;
  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  const getContaNome = (id: string) => contasFinanceiras.find(c => c.id === id)?.nome || id;

  if (!venda) {
    return (
      <PageLayout title="Finalizar Venda Digital">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Finalizar Venda Digital">
      {/* Botão Voltar */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/vendas/pendentes-digitais')} className="gap-2">
          <span>←</span> Voltar
        </Button>
      </div>

      {/* Timer */}
      {timer !== null && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          timer <= 30 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'
        }`}>
          <Clock className="h-5 w-5" />
          <span className="text-2xl font-mono font-bold">{formatTimer(timer)}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header com dados do pré-cadastro (bloqueados) */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Dados do Pré-Cadastro (Bloqueados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID Venda</label>
                <Input value={venda.id} disabled className="bg-muted font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                <Input value={new Date(venda.dataHora).toLocaleString('pt-BR')} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Responsável pela Venda</label>
                <Input value={venda.responsavelVendaNome} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente (informado)</label>
                <Input value={venda.clienteNome} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Total Informado</label>
                <Input value={formatCurrency(venda.valorTotal)} disabled className="bg-muted font-semibold text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info da Venda - campos editáveis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informações da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Loja de Venda *</label>
                <Select value={lojaVenda} onValueChange={setLojaVenda}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.filter(l => l.status === 'Ativo').map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Origem da Venda</label>
                <Input value="Digital" disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Local de Retirada *</label>
                <Select value={localRetirada} onValueChange={setLocalRetirada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.filter(l => l.status === 'Ativo').map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
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
              Cliente (Cadastro Completo) *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    value={clienteNome} 
                    placeholder="Nome do Cliente"
                    className="flex-1"
                    readOnly
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                
                {clienteId && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div>
                      <label className="text-sm text-muted-foreground">CPF</label>
                      <p className="font-medium">{clienteCpf}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="font-medium">{clienteTelefone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">E-mail</label>
                      <p className="font-medium">{clienteEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Cidade</label>
                      <p className="font-medium">{clienteCidade}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {clienteId && historicoCliente.length > 0 && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Últimas 3 Compras</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {historicoCliente.slice(0, 3).map(compra => (
                      <div key={compra.id} className="flex justify-between text-sm">
                        <span>{compra.data} - {compra.produto}</span>
                        <span className="font-medium">{formatCurrency(compra.valor)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Itens da Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens da Venda
              </span>
              <Button onClick={() => setShowProdutoModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Produto
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto adicionado. Clique em "Selecionar Produto" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.produto}</TableCell>
                      <TableCell>{item.imei}</TableCell>
                      <TableCell>{item.loja}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.valorRecomendado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input 
                              type="text"
                              value={item.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const numValue = Number(value) / 100;
                                const updated = itens.map(i => 
                                  i.id === item.id ? { ...i, valorVenda: numValue } : i
                                );
                                setItens(updated);
                              }}
                              className="w-36 text-right pl-8"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Acessórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Acessórios
              </span>
              <Button onClick={() => setShowAcessorioModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Acessórios
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acessoriosVenda.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum acessório adicionado. Clique em "Selecionar Acessórios" para adicionar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acessório</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessoriosVenda.map(acessorio => (
                    <TableRow key={acessorio.id}>
                      <TableCell className="font-medium">{acessorio.descricao}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              if (acessorio.quantidade > 1) {
                                const updated = acessoriosVenda.map(a => 
                                  a.id === acessorio.id 
                                    ? { ...a, quantidade: a.quantidade - 1, valorTotal: (a.quantidade - 1) * a.valorUnitario }
                                    : a
                                );
                                setAcessoriosVenda(updated);
                              }
                            }}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{acessorio.quantidade}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => {
                              const acessorioEstoque = acessoriosEstoque.find(a => a.id === acessorio.acessorioId);
                              if (acessorioEstoque && acessorio.quantidade < acessorioEstoque.quantidade) {
                                const updated = acessoriosVenda.map(a => 
                                  a.id === acessorio.id 
                                    ? { ...a, quantidade: a.quantidade + 1, valorTotal: (a.quantidade + 1) * a.valorUnitario }
                                    : a
                                );
                                setAcessoriosVenda(updated);
                              } else {
                                toast.error('Quantidade máxima atingida.');
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(acessorio.valorRecomendado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input 
                              type="text"
                              value={acessorio.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                const numValue = Number(value) / 100;
                                const updated = acessoriosVenda.map(a => 
                                  a.id === acessorio.id ? { ...a, valorUnitario: numValue, valorTotal: numValue * a.quantidade } : a
                                );
                                setAcessoriosVenda(updated);
                              }}
                              className="w-28 text-right pl-8"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(acessorio.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveAcessorio(acessorio.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalAcessorios > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg flex justify-between items-center">
                <span className="font-medium">Total Acessórios:</span>
                <span className="font-bold">{formatCurrency(totalAcessorios)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Base de Troca */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Base de Troca
              </span>
              <Button variant="outline" onClick={() => setShowTradeInModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item de Troca
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradeIns.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum item de troca adicionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>IMEI Validado</TableHead>
                    <TableHead className="text-right">Valor de Compra Usado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeIns.map(trade => (
                    <TableRow key={trade.id} className={!trade.imeiValidado ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-medium">{trade.modelo}</TableCell>
                      <TableCell>
                        <Badge variant={trade.condicao === 'Novo' ? 'default' : 'secondary'}>{trade.condicao}</Badge>
                      </TableCell>
                      <TableCell>{trade.imei || '-'}</TableCell>
                      <TableCell>
                        {trade.imeiValidado ? (
                          <Badge variant="default" className="bg-green-500">Sim</Badge>
                        ) : (
                          <Badge variant="destructive">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        -{formatCurrency(trade.valorCompraUsado)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setTradeIns(tradeIns.filter(t => t.id !== trade.id))}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {tradeInNaoValidado && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Há item de troca com IMEI NÃO validado! Registrar venda desabilitado.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Garantia dos Produtos */}
        {itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Garantia dos Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Tipo Garantia</TableHead>
                    <TableHead>Meses</TableHead>
                    <TableHead>Data Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => {
                    // Buscar condição do produto no estoque
                    const produto = produtosEstoque.find(p => p.id === item.produtoId);
                    const condicao = produto?.tipo || 'Semi-novo';
                    const isNovo = condicao === 'Novo';
                    
                    // Buscar garantia configurada para este item
                    const garantiaItem = garantiaItens.find(g => g.itemId === item.id);
                    
                    // Calcular data fim garantia
                    const meses = garantiaItem?.mesesGarantia || 12;
                    const dataFim = format(addMonths(new Date(), meses), 'dd/MM/yyyy');
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.produto}</TableCell>
                        <TableCell className="font-mono text-sm">{item.imei}</TableCell>
                        <TableCell>
                          <Badge variant={isNovo ? 'default' : 'secondary'}>
                            {condicao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isNovo ? (
                            <Badge variant="outline">Garantia - Apple</Badge>
                          ) : (
                            <Select 
                              value={garantiaItem?.tipoGarantia || 'Garantia - Apple'} 
                              onValueChange={(val: 'Garantia - Apple' | 'Garantia - Thiago Imports') => {
                                setGarantiaItens(prev => {
                                  const existing = prev.find(g => g.itemId === item.id);
                                  const mesesDefault = val === 'Garantia - Thiago Imports' ? 12 : (existing?.mesesGarantia || 12);
                                  if (existing) {
                                    return prev.map(g => 
                                      g.itemId === item.id 
                                        ? { ...g, tipoGarantia: val, mesesGarantia: mesesDefault, dataFimGarantia: format(addMonths(new Date(), mesesDefault), 'yyyy-MM-dd') }
                                        : g
                                    );
                                  } else {
                                    return [...prev, { 
                                      itemId: item.id, 
                                      tipoGarantia: val,
                                      mesesGarantia: mesesDefault,
                                      dataFimGarantia: format(addMonths(new Date(), mesesDefault), 'yyyy-MM-dd')
                                    }];
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Garantia - Apple">Garantia - Apple</SelectItem>
                                <SelectItem value="Garantia - Thiago Imports">Garantia - Thiago Imports</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isNovo ? (
                            <span className="text-muted-foreground">12</span>
                          ) : (garantiaItem?.tipoGarantia || 'Garantia - Apple') === 'Garantia - Apple' ? (
                            <Input 
                              type="number" 
                              min={1} 
                              max={12}
                              className="w-20"
                              value={garantiaItem?.mesesGarantia || 12}
                              onChange={(e) => {
                                const meses = parseInt(e.target.value) || 12;
                                setGarantiaItens(prev => {
                                  const existing = prev.find(g => g.itemId === item.id);
                                  if (existing) {
                                    return prev.map(g => 
                                      g.itemId === item.id 
                                        ? { ...g, mesesGarantia: meses, dataFimGarantia: format(addMonths(new Date(), meses), 'yyyy-MM-dd') }
                                        : g
                                    );
                                  } else {
                                    return [...prev, { 
                                      itemId: item.id, 
                                      tipoGarantia: 'Garantia - Apple',
                                      mesesGarantia: meses,
                                      dataFimGarantia: format(addMonths(new Date(), meses), 'yyyy-MM-dd')
                                    }];
                                  }
                                });
                              }}
                              placeholder="1-12"
                            />
                          ) : (
                            <span className="text-muted-foreground">12</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {garantiaItem?.dataFimGarantia 
                              ? format(new Date(garantiaItem.dataFimGarantia), 'dd/MM/yyyy')
                              : dataFim
                            }
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamentos
              </span>
              <Button variant="outline" onClick={() => setShowPagamentoModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pagamento
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum pagamento adicionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meio de Pagamento</TableHead>
                    <TableHead>Conta de Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map(pag => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                      <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pag.valor)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setPagamentos(pagamentos.filter(p => p.id !== pag.id))}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {valorPendente > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Valor Pendente: {formatCurrency(valorPendente)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retirada e Logística */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Retirada / Logística
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo de Retirada</label>
                <Select 
                  value={tipoRetirada} 
                  onValueChange={(v) => setTipoRetirada(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Retirada Balcão">Retirada Balcão</SelectItem>
                    <SelectItem value="Entrega">Entrega</SelectItem>
                    <SelectItem value="Retirada em Outra Loja">Retirada em Outra Loja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {tipoRetirada === 'Entrega' && (
                <div>
                  <label className="text-sm font-medium">Taxa de Entrega</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                    <Input 
                      type="text"
                      value={taxaEntrega.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setTaxaEntrega(Number(value) / 100);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              
              <div className="md:col-span-3">
                <label className="text-sm font-medium">Observações</label>
                <Textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre a venda..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline da Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {venda.timeline.map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">{entry.acao}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.responsavel} • {new Date(entry.data).toLocaleString('pt-BR')}
                    </p>
                    {entry.detalhes && (
                      <p className="text-sm mt-1 p-2 bg-muted rounded">{entry.detalhes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card className={isPrejuizo ? 'border-destructive bg-destructive/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo
              </span>
              {isPrejuizo && (
                <Badge variant="destructive" className="text-lg px-4 py-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  PREJUÍZO
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Subtotal Itens</p>
                <p className="text-xl font-bold">{formatCurrency(subtotal)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Subtotal Acessórios</p>
                <p className="text-xl font-bold">{formatCurrency(totalAcessorios)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Base de Troca</p>
                <p className="text-xl font-bold text-green-600">-{formatCurrency(totalTradeIn)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa Entrega</p>
                <p className="text-xl font-bold">{formatCurrency(taxaEntrega)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total da Venda</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-lg font-medium">{formatCurrency(valorCustoTotal)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isPrejuizo ? 'bg-destructive/20' : 'bg-green-100 dark:bg-green-950/30'}`}>
                <p className="text-sm text-muted-foreground">{isPrejuizo ? 'Prejuízo' : 'Lucro'} Projetado</p>
                <p className={`text-lg font-bold ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(lucroProjetado)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isPrejuizo ? 'bg-destructive/20' : 'bg-muted'}`}>
                <p className="text-sm text-muted-foreground">Margem</p>
                <p className={`text-lg font-medium ${isPrejuizo ? 'text-destructive' : ''}`}>
                  {margemProjetada.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Pagamentos</p>
                <p className="text-lg font-medium text-blue-600">{formatCurrency(totalPagamentos)}</p>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={handleGerarNota}
              disabled={itens.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Nota Fiscal Simplificada
            </Button>
          </CardContent>
        </Card>

        {/* Botões Finais */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate('/vendas/pendentes-digitais')}>
            Cancelar
          </Button>
          <Button 
            onClick={handleRegistrarVenda}
            disabled={!canSubmit}
            size="lg"
          >
            <Check className="h-4 w-4 mr-2" />
            Finalizar Venda
          </Button>
        </div>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="flex gap-2">
              <Input 
                placeholder="Buscar por nome ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowNovoClienteModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
            
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo Pessoa</TableHead>
                    <TableHead>Tipo Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map(cliente => (
                    <TableRow key={cliente.id} className={cliente.status === 'Inativo' ? 'bg-destructive/10' : ''}>
                      <TableCell>{cliente.cpf}</TableCell>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <Badge className={cliente.tipoPessoa === 'Pessoa Jurídica' ? 'bg-blue-500' : 'bg-green-500'}>
                          {cliente.tipoPessoa === 'Pessoa Jurídica' ? 'PJ' : 'PF'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cliente.tipoCliente === 'VIP' ? 'default' : 'secondary'}>
                          {cliente.tipoCliente}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.status === 'Inativo' ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="outline">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell>
                        {cliente.status === 'Inativo' ? (
                          <span className="text-destructive text-sm font-medium">Bloqueado</span>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleSelectCliente(cliente)}
                          >
                            Selecionar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Cliente */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(novoCliente.cpf?.replace(/\D/g, '').length || 0) <= 11 ? 'CPF' : 'CNPJ'}
              </p>
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
              <label className="text-sm font-medium">Data de Nascimento</label>
              <Input 
                type="date"
                value={novoCliente.dataNascimento || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, dataNascimento: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CEP</label>
              <Input 
                value={novoCliente.cep || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cep: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Endereço</label>
              <Input 
                value={novoCliente.endereco || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Número</label>
              <Input 
                value={novoCliente.numero || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, numero: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bairro</label>
              <Input 
                value={novoCliente.bairro || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, bairro: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <Input 
                value={novoCliente.cidade || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Input 
                value={novoCliente.estado || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, estado: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoClienteModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCliente}>Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Produto */}
      <Dialog open={showProdutoModal} onOpenChange={setShowProdutoModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Buscar por IMEI..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="w-[200px]"
              />
              <Input 
                placeholder="Buscar por modelo..."
                value={buscaModeloProduto}
                onChange={(e) => setBuscaModeloProduto(e.target.value)}
                className="flex-1"
              />
              <Select value={filtroLojaProduto || 'all'} onValueChange={(val) => setFiltroLojaProduto(val === 'all' ? '' : val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead className="text-right">Valor Recomendado</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.map(produto => (
                  <TableRow key={produto.id} className={produto.quantidade === 0 ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                    <TableCell className="font-medium">{produto.modelo}</TableCell>
                    <TableCell>
                      <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                        {produto.tipo || 'Semi-novo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{produto.imei}</TableCell>
                    <TableCell>
                      {produto.quantidade === 0 ? (
                        <Badge variant="destructive">Indisponível</Badge>
                      ) : (
                        produto.quantidade
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(produto.valorVendaSugerido)}</TableCell>
                    <TableCell>{produto.loja}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleVerDetalhes(produto)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          disabled={produto.quantidade === 0}
                          onClick={() => handleAddProduto(produto)}
                        >
                          Selecionar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Base de Troca */}
      <Dialog open={showTradeInModal} onOpenChange={setShowTradeInModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item de Troca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Modelo *</label>
              <Select 
                value={novoTradeIn.modelo || ''} 
                onValueChange={(v) => setNovoTradeIn({ ...novoTradeIn, modelo: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {produtosCadastro.map(p => (
                    <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Condição *</label>
              <Select 
                value={novoTradeIn.condicao || ''} 
                onValueChange={(v) => setNovoTradeIn({ ...novoTradeIn, condicao: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Semi-novo">Semi-novo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">IMEI</label>
              <Input 
                value={novoTradeIn.imei || ''}
                onChange={(e) => {
                  const formatted = e.target.value.replace(/\D/g, '').slice(0, 15);
                  let masked = '';
                  for (let i = 0; i < formatted.length; i++) {
                    if (i === 2 || i === 8 || i === 14) masked += '-';
                    masked += formatted[i];
                  }
                  setNovoTradeIn({ ...novoTradeIn, imei: masked });
                }}
                placeholder="00-000000-000000-0"
                maxLength={18}
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={novoTradeIn.imeiValidado || false}
                onChange={(e) => setNovoTradeIn({ ...novoTradeIn, imeiValidado: e.target.checked })}
                className="h-4 w-4"
              />
              <label className="text-sm">IMEI Validado</label>
            </div>
            <div>
              <label className="text-sm font-medium">Valor de Compra Usado *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="text"
                  value={(novoTradeIn.valorCompraUsado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNovoTradeIn({ ...novoTradeIn, valorCompraUsado: Number(value) / 100 });
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeInModal(false)}>Cancelar</Button>
            <Button onClick={handleAddTradeIn}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pagamento */}
      <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Meio de Pagamento *</label>
              <Select 
                value={novoPagamento.meioPagamento || ''} 
                onValueChange={(v) => {
                  if (v === 'Cartão Débito') {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: 1 });
                  } else if (v === 'Cartão Crédito') {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: novoPagamento.parcelas || 1 });
                  } else {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: undefined });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input 
                  type="text"
                  value={(novoPagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNovoPagamento({ ...novoPagamento, valor: Number(value) / 100 });
                  }}
                  className="pl-10"
                />
              </div>
              {valorPendente > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-1 h-auto p-0"
                  onClick={() => setNovoPagamento({ ...novoPagamento, valor: valorPendente })}
                >
                  Preencher valor pendente ({formatCurrency(valorPendente)})
                </Button>
              )}
            </div>
            
            {novoPagamento.meioPagamento === 'Cartão Crédito' && (
              <div>
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Select 
                  value={String(novoPagamento.parcelas || 1)} 
                  onValueChange={(v) => setNovoPagamento({ ...novoPagamento, parcelas: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {novoPagamento.valor && novoPagamento.parcelas && novoPagamento.parcelas > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {novoPagamento.parcelas}x de {formatCurrency(novoPagamento.valor / novoPagamento.parcelas)}
                  </p>
                )}
              </div>
            )}
            
            {novoPagamento.meioPagamento === 'Cartão Débito' && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Cartão de Débito: pagamento à vista (1x)
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">Conta de Destino *</label>
              <Select 
                value={novoPagamento.contaDestino || ''} 
                onValueChange={(v) => setNovoPagamento({ ...novoPagamento, contaDestino: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasFinanceiras.filter(c => c.status === 'Ativo').map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea 
                value={novoPagamento.descricao || ''}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, descricao: e.target.value })}
                placeholder="Observações..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoModal(false)}>Cancelar</Button>
            <Button onClick={handleAddPagamento}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação */}
      <Dialog open={showConfirmacaoModal} onOpenChange={setShowConfirmacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Finalização da Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Você está prestes a finalizar a venda digital <strong>{venda?.id}</strong>.
            </p>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-medium">{clienteNome}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold text-primary">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Itens:</span>
                <span>{itens.length}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta ação irá subtrair os produtos do estoque e enviar a venda para conferência financeira.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacaoModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarVenda}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Finalização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nota Fiscal */}
      <Dialog open={showNotaModal} onOpenChange={setShowNotaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota Fiscal Simplificada</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />}
            <p className="text-sm text-muted-foreground">
              Escaneie o QR Code para verificar a nota fiscal
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNotaModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes Produto */}
      <Dialog open={showDetalheProduto} onOpenChange={setShowDetalheProduto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {produtoDetalhe && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{produtoDetalhe.modelo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{produtoDetalhe.marca}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-medium font-mono">{produtoDetalhe.imei}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cor</p>
                  <p className="font-medium">{produtoDetalhe.cor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loja</p>
                  <p className="font-medium">{produtoDetalhe.loja}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saúde Bateria</p>
                  <p className="font-medium">{produtoDetalhe.saudeBateria}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Custo</p>
                  <p className="font-medium">{formatCurrency(produtoDetalhe.valorCusto)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Venda Sugerido</p>
                  <p className="font-medium">{formatCurrency(produtoDetalhe.valorVendaSugerido)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetalheProduto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Acessórios */}
      <Dialog open={showAcessorioModal} onOpenChange={setShowAcessorioModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Acessórios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Buscar acessório..."
              value={buscaAcessorio}
              onChange={(e) => setBuscaAcessorio(e.target.value)}
            />
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd Disp.</TableHead>
                  <TableHead className="text-right">Valor Custo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acessoriosFiltrados.map(acessorio => (
                  <TableRow key={acessorio.id} className={acessorio.quantidade < 10 ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-mono text-sm">{acessorio.id}</TableCell>
                    <TableCell className="font-medium">{acessorio.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{acessorio.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={acessorio.quantidade < 10 ? "destructive" : "secondary"}>
                        {acessorio.quantidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(acessorio.valorCusto)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddAcessorio(acessorio)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcessorioModal(false)}>Fechar</Button>
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
    </PageLayout>
  );
}