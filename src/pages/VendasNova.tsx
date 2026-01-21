import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { 
  ShoppingCart, Search, Plus, X, Eye, Clock, Trash2, 
  User, Package, CreditCard, Truck, FileText, AlertTriangle, Check, Shield, Save,
  Headphones, ArrowLeftRight, Star
} from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';

import { 
  getClientes, getOrigensVenda, 
  getContasFinanceiras, Cliente, OrigemVenda, ContaFinanceira,
  addCliente
} from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getProdutos, Produto, updateProduto, bloquearProdutosEmVenda, getLojaEstoqueReal, LOJA_MATRIZ_ID, LOJA_ONLINE_ID } from '@/utils/estoqueApi';
import { addVenda, getNextVendaNumber, getHistoricoComprasCliente, ItemVenda, ItemTradeIn, Pagamento } from '@/utils/vendasApi';
import { inicializarVendaNoFluxo } from '@/utils/fluxoVendasApi';
import { getAcessorios, Acessorio, subtrairEstoqueAcessorio, VendaAcessorio } from '@/utils/acessoriosApi';
import { calcularComissaoVenda, getComissaoColaborador } from '@/utils/comissoesApi';
import { getProdutosCadastro, ProdutoCadastro, calcularTipoPessoa } from '@/utils/cadastrosApi';
import { getProdutosPendentes, ProdutoPendente } from '@/utils/osApi';
import { useDraftVenda } from '@/hooks/useDraftVenda';
import { getPlanosPorModelo, PlanoGarantia } from '@/utils/planosGarantiaApi';
import { displayIMEI, formatIMEI } from '@/utils/imeiMask';
import { formatarMoeda, moedaMask, parseMoeda } from '@/utils/formatUtils';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { getTaxasEntregaAtivas, TaxaEntrega } from '@/utils/taxasEntregaApi';

// Alias para compatibilidade
const formatCurrency = formatarMoeda;

const TIMER_DURATION = 1800; // 30 minutos em segundos
const DRAFT_KEY = 'draft_venda_nova';

export default function VendasNova() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterLojasTipoLoja, obterVendedores, obterMotoboys, obterLojaById, obterNomeLoja, obterNomeColaborador, obterLojaMatriz, obterLojaOnline } = useCadastroStore();
  
  // Dados do cadastros - usando Zustand store
  const lojas = obterLojasAtivas();
  const lojasTipoLoja = obterLojasTipoLoja(); // Apenas lojas tipo 'Loja' para seleção
  const vendedoresDisponiveis = obterVendedores();
  const motoboys = obterMotoboys();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [produtosEstoque] = useState<Produto[]>(getProdutos());
  const [produtosCadastro] = useState<ProdutoCadastro[]>(getProdutosCadastro());
  const [produtosPendentes] = useState<ProdutoPendente[]>(getProdutosPendentes());
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
  const [valorRecomendadoEntrega, setValorRecomendadoEntrega] = useState(0);
  const [localEntregaId, setLocalEntregaId] = useState('');
  const [localEntregaNome, setLocalEntregaNome] = useState('');
  const [buscaLocalEntrega, setBuscaLocalEntrega] = useState('');
  const [taxasEntrega] = useState<TaxaEntrega[]>(getTaxasEntregaAtivas());
  const [showLocaisEntrega, setShowLocaisEntrega] = useState(false);
  const [motoboyId, setMotoboyId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // Itens da venda
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [showPendentesTab, setShowPendentesTab] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [buscaModeloProduto, setBuscaModeloProduto] = useState('');
  const [filtroLojaProduto, setFiltroLojaProduto] = useState('');
  
  // Acessórios
  const [acessoriosVenda, setAcessoriosVenda] = useState<VendaAcessorio[]>([]);
  const [showAcessorioModal, setShowAcessorioModal] = useState(false);
  const [buscaAcessorio, setBuscaAcessorio] = useState('');
  
  // Timer
  const [timer, setTimer] = useState<number | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  
  // Trade-in
  const [tradeIns, setTradeIns] = useState<ItemTradeIn[]>([]);
  const [showTradeInModal, setShowTradeInModal] = useState(false);
  const [novoTradeIn, setNovoTradeIn] = useState<Partial<ItemTradeIn>>({});
  const [tipoOperacaoTroca, setTipoOperacaoTroca] = useState<'Upgrade' | 'Downgrade'>('Upgrade');
  
  // Pagamentos
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  // Confirmação
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [confirmVendedor, setConfirmVendedor] = useState('');
  const [confirmLoja, setConfirmLoja] = useState('');
  
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
    // Garantia complementar para completar 12 meses
    garantiaComplementar?: {
      meses: number;
      dataInicio: string;
      dataFim: string;
    };
  }
  const [garantiaItens, setGarantiaItens] = useState<GarantiaItemVenda[]>([]);
  
  // Garantia Extendida
  const [garantiaExtendida, setGarantiaExtendida] = useState<{
    planoId: string;
    planoNome: string;
    valor: number;
    meses: number;
    dataInicio: string;
    dataFim: string;
  } | null>(null);
  const [showGarantiaExtendidaModal, setShowGarantiaExtendidaModal] = useState(false);

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
      setLocalRetirada(draft.localRetirada || '');
      setTipoRetirada(draft.tipoRetirada || 'Retirada Balcão');
      setTaxaEntrega(draft.taxaEntrega || 0);
      setMotoboyId(draft.motoboyId || '');
      setObservacoes(draft.observacoes || '');
      setItens(draft.itens || []);
      setAcessoriosVenda(draft.acessoriosVenda || []);
      setTradeIns(draft.tradeIns || []);
      setPagamentos(draft.pagamentos || []);
      setGarantiaItens(draft.garantiaItens || []);
      setGarantiaExtendida(draft.garantiaExtendida || null);
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
    
    const hasData = lojaVenda || vendedor || clienteId || itens.length > 0 || acessoriosVenda.length > 0 || pagamentos.length > 0 || garantiaExtendida;
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
        localRetirada,
        tipoRetirada,
        taxaEntrega,
        motoboyId,
        observacoes,
        itens,
        acessoriosVenda,
        tradeIns,
        pagamentos,
        garantiaItens,
        garantiaExtendida
      });
      lastSaveTime.current = Date.now();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [lojaVenda, vendedor, clienteId, clienteNome, origemVenda, localRetirada, tipoRetirada, taxaEntrega, motoboyId, observacoes, itens, acessoriosVenda, tradeIns, pagamentos, garantiaItens, garantiaExtendida]);

  // Timer effect
  useEffect(() => {
    if (timerStart && itens.length > 0) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining <= 0) {
          // Tempo esgotado - remove itens
          setItens([]);
          setTimer(null);
          setTimerStart(null);
          toast({
            title: "Tempo esgotado",
            description: "Produtos liberados novamente para o estoque",
            variant: "destructive"
          });
        } else {
          setTimer(remaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerStart, itens.length]);

  // Formatar timer
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
  const valorGarantiaExtendida = garantiaExtendida?.valor || 0;
  const valorProdutos = subtotal + totalAcessorios;
  
  // Cálculos para Downgrade
  const isDowngrade = tipoOperacaoTroca === 'Downgrade';
  const saldoDevolver = useMemo(() => {
    if (!isDowngrade) return 0;
    const saldo = totalTradeIn - valorProdutos - taxaEntrega;
    return saldo > 0 ? saldo : 0;
  }, [isDowngrade, totalTradeIn, valorProdutos, taxaEntrega]);
  const hasValidDowngrade = isDowngrade && saldoDevolver > 0;
  
  // Total considera Downgrade
  const total = useMemo(() => {
    if (isDowngrade) {
      // Em downgrade, o total é o valor dos produtos menos o trade-in (pode ser negativo)
      return subtotal + totalAcessorios - totalTradeIn + taxaEntrega + valorGarantiaExtendida;
    }
    return subtotal + totalAcessorios - totalTradeIn + taxaEntrega + valorGarantiaExtendida;
  }, [subtotal, totalAcessorios, totalTradeIn, taxaEntrega, valorGarantiaExtendida, isDowngrade]);
  const valorPendente = useMemo(() => total - totalPagamentos, [total, totalPagamentos]);
  
  // Planos de garantia extendida disponíveis
  const planosExtendidaDisponiveis = useMemo(() => {
    if (itens.length === 0) return [];
    const item = itens[0];
    const produto = produtosEstoque.find(p => p.id === item.produtoId);
    const condicao = produto?.tipo === 'Novo' ? 'Novo' : 'Seminovo';
    return getPlanosPorModelo(item.produto, condicao).filter(p => p.nome === 'Silver' || p.nome === 'Gold');
  }, [itens, produtosEstoque]);
  
  // Calcular garantia complementar para completar 12 meses
  const calcularGarantiaComplementar = (mesesApple: number) => {
    if (mesesApple >= 12) return null;
    const mesesComplementar = 12 - mesesApple;
    const dataInicioComplementar = addMonths(new Date(), mesesApple);
    const dataFimComplementar = addMonths(dataInicioComplementar, mesesComplementar);
    return { 
      meses: mesesComplementar, 
      dataInicio: format(dataInicioComplementar, 'yyyy-MM-dd'), 
      dataFim: format(dataFimComplementar, 'yyyy-MM-dd') 
    };
  };
  
  // Calcular vigência da garantia extendida (sempre inicia no dia seguinte ao término da garantia padrão de 12 meses)
  const calcularVigenciaExtendida = (plano: PlanoGarantia) => {
    const dataFimGarantiaPadrao = addMonths(new Date(), 12);
    const dataInicioGarantiaExtendida = addDays(dataFimGarantiaPadrao, 1);
    const dataFim = addMonths(dataInicioGarantiaExtendida, plano.meses);
    return { 
      dataInicio: format(dataInicioGarantiaExtendida, 'yyyy-MM-dd'), 
      dataFim: format(dataFim, 'yyyy-MM-dd') 
    };
  };
  
  // Adicionar garantia extendida
  const handleAddGarantiaExtendida = (plano: PlanoGarantia) => {
    const vigencia = calcularVigenciaExtendida(plano);
    setGarantiaExtendida({
      planoId: plano.id,
      planoNome: plano.nome,
      valor: plano.valor,
      meses: plano.meses,
      dataInicio: vigencia.dataInicio,
      dataFim: vigencia.dataFim
    });
    setShowGarantiaExtendidaModal(false);
  };
  
  // Cálculos corretos
  const valorCustoAcessorios = useMemo(() => acessoriosVenda.reduce((acc, a) => {
    const acessorio = acessoriosEstoque.find(ae => ae.id === a.acessorioId);
    return acc + (acessorio?.valorCusto || 0) * a.quantidade;
  }, 0), [acessoriosVenda, acessoriosEstoque]);
  const valorCustoTotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0) + valorCustoAcessorios, [itens, valorCustoAcessorios]);
  const valorRecomendadoTotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorRecomendado * item.quantidade, 0), [itens]);
  const lucroProjetado = useMemo(() => total - valorCustoTotal, [total, valorCustoTotal]);
  const margemProjetada = useMemo(() => {
    if (valorCustoTotal === 0) return 0;
    return ((lucroProjetado / valorCustoTotal) * 100);
  }, [lucroProjetado, valorCustoTotal]);
  const isPrejuizo = lucroProjetado < 0;
  
  // Cálculo de prejuízo em acessórios
  const prejuizoAcessorios = useMemo(() => {
    const vendaAcessorios = acessoriosVenda.reduce((acc, a) => acc + a.valorTotal, 0);
    return valorCustoAcessorios > vendaAcessorios ? valorCustoAcessorios - vendaAcessorios : 0;
  }, [acessoriosVenda, valorCustoAcessorios]);

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
    // Verificar se cliente está inativo/bloqueado
    if (cliente.status === 'Inativo') {
      toast({ title: "Cliente bloqueado", description: "Este cliente está inativo e não pode realizar compras.", variant: "destructive" });
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

  // Formatar CPF/CNPJ dinamicamente
  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  // Adicionar novo cliente
  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast({ title: "Erro", description: "Nome e CPF/CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    
    // Verificar se CPF já existe e está inativo
    const cpfLimpo = novoCliente.cpf.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cpfLimpo);
    
    if (clienteExistente) {
      if (clienteExistente.status === 'Inativo') {
        toast({ title: "Cliente bloqueado", description: "Cliente bloqueado — não permitido cadastrar novamente.", variant: "destructive" });
        return;
      } else {
        toast({ title: "Cliente já cadastrado", description: "Este CPF/CNPJ já está cadastrado no sistema.", variant: "destructive" });
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
    toast({ title: "Sucesso", description: "Cliente cadastrado com sucesso!" });
  };

  // Produtos filtrados - FILTRA PELA LOJA SELECIONADA NA VENDA (considerando compartilhamento Online/Matriz)
  const produtosFiltrados = useMemo(() => {
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (p.bloqueadoEmVendaId) return false; // Não mostrar produtos bloqueados
      if (p.statusMovimentacao) return false; // Não mostrar produtos em movimentação
      
      // Se uma loja foi selecionada para a venda
      if (lojaVenda) {
        // Obter a loja de estoque real (considerando compartilhamento Online/Matriz)
        const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
        if (p.loja !== lojaEstoqueReal) return false;
      }
      
      // Filtros adicionais do modal
      if (filtroLojaProduto && p.loja !== filtroLojaProduto) return false;
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, lojaVenda, filtroLojaProduto, buscaProduto, buscaModeloProduto]);

  // Produtos de OUTRAS lojas (para visualização apenas - bloqueados para seleção)
  const produtosOutrasLojas = useMemo(() => {
    if (!lojaVenda) return [];
    const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (p.bloqueadoEmVendaId) return false;
      if (p.statusMovimentacao) return false;
      if (p.loja === lojaEstoqueReal) return false; // Excluir loja de estoque real
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, lojaVenda, buscaProduto, buscaModeloProduto]);

  // Adicionar produto à venda
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
    
    const isFirstItem = itens.length === 0;
    
    setItens([...itens, novoItem]);
    setShowProdutoModal(false);
    setBuscaProduto('');
    setFiltroLojaProduto('');
    
    // Iniciar timer se for o primeiro item
    if (isFirstItem) {
      console.log('Iniciando timer - primeiro item adicionado');
      setTimerStart(Date.now());
      setTimer(TIMER_DURATION);
    }
    
    console.log('Timer state:', { isFirstItem, timerStart, timer });
    
    toast({ title: "Produto adicionado", description: `${produto.modelo} adicionado à venda` });
  };

  // Remover item
  const handleRemoveItem = (itemId: string) => {
    setItens(itens.filter(i => i.id !== itemId));
    if (itens.length === 1 && acessoriosVenda.length === 0) {
      setTimer(null);
      setTimerStart(null);
    }
  };

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
    // Verificar se já existe na venda
    const existente = acessoriosVenda.find(a => a.acessorioId === acessorio.id);
    
    if (existente) {
      // Verificar estoque
      if (existente.quantidade + 1 > acessorio.quantidade) {
        toast({ title: "Estoque insuficiente", description: `Apenas ${acessorio.quantidade} unidades disponíveis.`, variant: "destructive" });
        return;
      }
      // Incrementar quantidade
      const updated = acessoriosVenda.map(a => 
        a.acessorioId === acessorio.id 
          ? { ...a, quantidade: a.quantidade + 1, valorTotal: (a.quantidade + 1) * a.valorUnitario }
          : a
      );
      setAcessoriosVenda(updated);
    } else {
      // Adicionar novo
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
      
      // Iniciar timer se for o primeiro item
      if (itens.length === 0 && acessoriosVenda.length === 0) {
        setTimerStart(Date.now());
        setTimer(TIMER_DURATION);
      }
    }
    
    setShowAcessorioModal(false);
    setBuscaAcessorio('');
    toast({ title: "Acessório adicionado", description: `${acessorio.descricao} adicionado à venda` });
  };

  // Remover acessório
  const handleRemoveAcessorio = (acessorioId: string) => {
    setAcessoriosVenda(acessoriosVenda.filter(a => a.id !== acessorioId));
    if (itens.length === 0 && acessoriosVenda.length === 1) {
      setTimer(null);
      setTimerStart(null);
    }
  };

  // Adicionar trade-in
  const handleAddTradeIn = () => {
    if (!novoTradeIn.modelo || !novoTradeIn.valorCompraUsado || !novoTradeIn.condicao) {
      toast({ title: "Erro", description: "Modelo, condição e valor são obrigatórios", variant: "destructive" });
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


  // Ver detalhes do produto
  const handleVerDetalhes = (produto: Produto) => {
    setProdutoDetalhe(produto);
    setShowDetalheProduto(true);
  };

  // Gerar nota fiscal
  const handleGerarNota = async () => {
    const qrData = JSON.stringify({
      id: vendaInfo.id,
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

  // Verificar se há trade-in com IMEI não validado
  const tradeInNaoValidado = useMemo(() => {
    return tradeIns.some(t => !t.imeiValidado);
  }, [tradeIns]);

  // Verificar se tem pagamento Sinal
  const temPagamentoSinal = useMemo(() => {
    return pagamentos.some(p => p.meioPagamento === 'Sinal');
  }, [pagamentos]);

  // Calcular valor do sinal e valor pendente do sinal
  const valorSinal = useMemo(() => {
    const pagSinal = pagamentos.find(p => p.meioPagamento === 'Sinal');
    return pagSinal?.valor || 0;
  }, [pagamentos]);

  const valorPendenteSinal = useMemo(() => {
    return total - valorSinal;
  }, [total, valorSinal]);

  // Validar venda normal (pagamento completo)
  const canSubmit = useMemo(() => {
    // Se for entrega, motoboy é obrigatório
    const motoboyValido = tipoRetirada !== 'Entrega' || !!motoboyId;
    
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      localRetirada &&
      (itens.length > 0 || acessoriosVenda.length > 0) &&
      valorPendente <= 0 &&
      !tradeInNaoValidado &&
      motoboyValido &&
      !temPagamentoSinal // Não permite registrar venda normal se tem sinal
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, localRetirada, itens.length, acessoriosVenda.length, valorPendente, tradeInNaoValidado, tipoRetirada, motoboyId, temPagamentoSinal]);

  // Validar se pode salvar com sinal
  const canSubmitSinal = useMemo(() => {
    const motoboyValido = tipoRetirada !== 'Entrega' || !!motoboyId;
    
    // Debug: verificar cada condição
    console.log('=== DEBUG canSubmitSinal ===');
    console.log('lojaVenda:', lojaVenda);
    console.log('vendedor:', vendedor);
    console.log('clienteId:', clienteId);
    console.log('origemVenda:', origemVenda);
    console.log('localRetirada:', localRetirada);
    console.log('itens.length:', itens.length, 'acessoriosVenda.length:', acessoriosVenda.length);
    console.log('temPagamentoSinal:', temPagamentoSinal);
    console.log('valorSinal:', valorSinal);
    console.log('total:', total);
    console.log('valorSinal < total:', valorSinal < total);
    console.log('tradeInNaoValidado:', tradeInNaoValidado);
    console.log('motoboyValido:', motoboyValido);
    
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      localRetirada &&
      (itens.length > 0 || acessoriosVenda.length > 0) &&
      temPagamentoSinal &&
      valorSinal > 0 &&
      valorSinal < total &&
      !tradeInNaoValidado &&
      motoboyValido
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, localRetirada, itens.length, acessoriosVenda.length, temPagamentoSinal, valorSinal, total, tradeInNaoValidado, tipoRetirada, motoboyId]);

  // Registrar venda
  const handleRegistrarVenda = () => {
    if (!canSubmit) return;
    setConfirmVendedor(vendedor);
    setConfirmLoja(lojaVenda);
    setShowConfirmacaoModal(true);
  };

  // Salvar com sinal (pré-cadastro)
  const handleSalvarComSinal = () => {
    if (!canSubmitSinal) return;
    
    // Obter nome do vendedor
    const vendedorNome = obterNomeColaborador(vendedor);

    // Criar timeline inicial
    const timelineInicial = [{
      id: `timeline-${Date.now()}`,
      dataHora: new Date().toISOString(),
      tipo: 'criacao' as const,
      usuarioId: vendedor,
      usuarioNome: vendedorNome,
      descricao: `Venda com sinal criada por ${vendedorNome}. Valor do sinal: ${formatCurrency(valorSinal)}. Valor pendente: ${formatCurrency(valorPendenteSinal)}`
    }];

    // Registrar venda com status "Feito Sinal"
    const venda = addVenda({
      dataHora: new Date().toISOString(),
      lojaVenda,
      vendedor,
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
      motoboyId: tipoRetirada === 'Entrega' ? motoboyId : undefined,
      itens,
      tradeIns,
      pagamentos,
      subtotal,
      totalTradeIn,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes,
      status: 'Pendente',
      statusAtual: 'Feito Sinal' as any,
      timeline: timelineInicial,
      bloqueadoParaEdicao: false,
      valorSinal,
      valorPendenteSinal,
      dataSinal: new Date().toISOString(),
      observacaoSinal: pagamentos.find(p => p.meioPagamento === 'Sinal')?.descricao || ''
    });

    // Inicializar venda no fluxo com status "Feito Sinal"
    inicializarVendaNoFluxo(venda.id, vendedor, vendedorNome, 'Feito Sinal');

    // Bloquear produtos no estoque
    const produtoIds = itens.map(item => item.produtoId);
    bloquearProdutosEmVenda(venda.id, produtoIds);

    // Limpar rascunho
    clearDraft();

    toast({
      title: "Venda com sinal salva!",
      description: `Produtos bloqueados. Valor pendente: ${formatCurrency(valorPendenteSinal)}`,
    });

    navigate('/vendas/conferencia-lancamento');
  };

  // Confirmar venda
  const handleConfirmarVenda = () => {
    // Subtrair produtos do estoque
    itens.forEach(item => {
      const produto = produtosEstoque.find(p => p.id === item.produtoId);
      if (produto) {
        updateProduto(produto.id, { quantidade: produto.quantidade - item.quantidade });
      }
    });

    // Subtrair acessórios do estoque
    acessoriosVenda.forEach(acessorio => {
      subtrairEstoqueAcessorio(acessorio.acessorioId, acessorio.quantidade);
    });
    setAcessoriosEstoque(getAcessorios());

    // Obter nome do vendedor para timeline
    const vendedorNome = obterNomeColaborador(confirmVendedor);

    // Criar timeline inicial
    const timelineInicial = [{
      id: `timeline-${Date.now()}`,
      dataHora: new Date().toISOString(),
      tipo: 'criacao' as const,
      usuarioId: confirmVendedor,
      usuarioNome: vendedorNome,
      descricao: `Venda criada por ${vendedorNome}`
    }];

    // Registrar venda com status "Aguardando Conferência"
    const vendaData: any = {
      dataHora: new Date().toISOString(),
      lojaVenda: confirmLoja,
      vendedor: confirmVendedor,
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
      motoboyId: tipoRetirada === 'Entrega' ? motoboyId : undefined,
      itens,
      tradeIns,
      pagamentos: hasValidDowngrade ? [] : pagamentos, // Sem pagamentos em Downgrade
      subtotal,
      totalTradeIn,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes,
      status: 'Concluída',
      statusAtual: 'Aguardando Conferência',
      timeline: timelineInicial,
      bloqueadoParaEdicao: false,
      // Campos de Downgrade
      tipoOperacao: tipoOperacaoTroca,
      saldoDevolver: hasValidDowngrade ? saldoDevolver : 0
    };
    
    const venda = addVenda(vendaData);

    // Inicializar venda no fluxo de conferência (registra no localStorage)
    inicializarVendaNoFluxo(venda.id, confirmVendedor, vendedorNome);

    // Limpar rascunho
    clearDraft();

    toast({
      title: "Venda registrada!",
      description: "Venda aguardando conferência do lançador.",
    });

    setShowConfirmacaoModal(false);
    navigate('/vendas/conferencia-lancamento');
  };

  const getColaboradorNome = (colId: string) => obterNomeColaborador(colId);
  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);


  return (
    <VendasLayout title="Nova Venda">
      {/* Botão Voltar */}
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/vendas')} className="gap-2">
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
                <label className="text-sm font-medium">Loja de Venda *</label>
                <AutocompleteLoja
                  value={lojaVenda}
                  onChange={setLojaVenda}
                  placeholder="Selecione a loja"
                  apenasLojasTipoLoja={true}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Responsável pela Venda *</label>
                <AutocompleteColaborador
                  value={vendedor}
                  onChange={setVendedor}
                  placeholder="Selecione o responsável"
                  filtrarPorTipo="vendedores"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Origem da Venda *</label>
                <Select value={origemVenda} onValueChange={setOrigemVenda}>
                  <SelectTrigger>
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

            {/* Botão Limpar Tudo */}
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm('Limpar todos os campos? Esta ação não pode ser desfeita.')) {
                    // Informações da Venda
                    setLojaVenda('');
                    setVendedor('');
                    setOrigemVenda('');
                    setObservacoes('');
                    
                    // Cliente
                    setClienteId('');
                    setClienteNome('');
                    setClienteCpf('');
                    setClienteTelefone('');
                    setClienteEmail('');
                    setClienteCidade('');
                    setHistoricoCliente([]);
                    
                    // Itens e Acessórios
                    setItens([]);
                    setAcessoriosVenda([]);
                    
                    // Trade-In
                    setTradeIns([]);
                    setTipoOperacaoTroca('Upgrade');
                    
                    // Retirada/Logística
                    setLocalRetirada('');
                    setTipoRetirada('Retirada Balcão');
                    setMotoboyId('');
                    setTaxaEntrega(0);
                    
                    // Pagamentos
                    setPagamentos([]);
                    
                    // Garantias
                    setGarantiaItens([]);
                    setGarantiaExtendida(null);
                    
                    // Timer
                    setTimer(null);
                    setTimerStart(null);
                    
                    // Limpar rascunho salvo
                    clearDraft();
                  }
                }}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
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
                  <Input 
                    value={clienteNome} 
                    placeholder="Nome do Cliente"
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="flex-1"
                    readOnly
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                
                {clienteId && (
                  <div className="grid grid-cols-2 gap-4">
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
              
              {/* Histórico do cliente */}
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
                    <TableHead className="text-right">Custo do Produto</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.produto}</TableCell>
                      <TableCell className="font-mono text-sm">{displayIMEI(item.imei)}</TableCell>
                      <TableCell>{obterNomeLoja(item.loja)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.valorCusto)}
                      </TableCell>
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
                <Headphones className="h-5 w-5" />
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
                    <TableHead className="text-right">Custo Produto</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor de Venda</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessoriosVenda.map(acessorio => {
                    const acessorioOriginal = acessoriosEstoque.find(a => a.id === acessorio.acessorioId);
                    const custoUnit = acessorioOriginal?.valorCusto || 0;
                    const lucroItem = acessorio.valorTotal - (custoUnit * acessorio.quantidade);
                    return (
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
                                toast({ title: "Estoque insuficiente", description: "Quantidade máxima atingida.", variant: "destructive" });
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatCurrency(custoUnit)}
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
                      <TableCell className="text-right">
                        <span className={`font-bold ${lucroItem >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(lucroItem)}
                        </span>
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
                  );})}
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

        <Card className={hasValidDowngrade ? 'border-2 border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Base de Troca (Aparelhos de Troca)
                {hasValidDowngrade && (
                  <Badge variant="destructive" className="ml-2">DOWNGRADE</Badge>
                )}
              </span>
              <Button variant="outline" onClick={() => setShowTradeInModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item de Troca
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Abas UPGRADE / DOWNGRADE */}
            {tradeIns.length > 0 && (
              <div className="mb-4 border-b">
                <div className="flex gap-1">
                  <button
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      tipoOperacaoTroca === 'Upgrade'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setTipoOperacaoTroca('Upgrade')}
                  >
                    UPGRADE
                  </button>
                  <button
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                      tipoOperacaoTroca === 'Downgrade'
                        ? 'border-destructive text-destructive'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setTipoOperacaoTroca('Downgrade')}
                  >
                    DOWNGRADE
                  </button>
                </div>
              </div>
            )}
            
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
            
            {/* Card de Saldo a Devolver - Downgrade */}
            {hasValidDowngrade && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border-2 border-destructive">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-bold text-destructive text-lg">OPERAÇÃO DOWNGRADE</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Base de Troca</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalTradeIn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Produtos</p>
                    <p className="text-lg font-bold">{formatCurrency(valorProdutos)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PIX a Devolver</p>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(saldoDevolver)}</p>
                  </div>
                </div>
                <p className="text-xs text-destructive/80 mt-2">
                  * Em operações de Downgrade, o cliente recebe a diferença via PIX após aprovação do Financeiro.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Garantia dos Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Garantia dos Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto adicionado. Adicione produtos para configurar a garantia.
              </div>
            ) : (
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
                    
                    // Determinar tipo de garantia atual
                    const tipoGarantiaAtual = isNovo 
                      ? 'Garantia - Apple' 
                      : (garantiaItem?.tipoGarantia || 'Garantia - Thiago Imports');
                    
                    // Calcular garantia complementar se Apple < 12 meses
                    const complementar = tipoGarantiaAtual === 'Garantia - Apple' && meses < 12 
                      ? calcularGarantiaComplementar(meses) 
                      : null;
                    
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          <TableCell className="font-medium">{item.produto}</TableCell>
                          <TableCell className="font-mono text-sm">{displayIMEI(item.imei)}</TableCell>
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
                                value={garantiaItem?.tipoGarantia || 'Garantia - Thiago Imports'} 
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
                                <SelectTrigger className="w-auto min-w-[200px]">
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
                            ) : tipoGarantiaAtual === 'Garantia - Apple' ? (
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
                        {/* Linha complementar automática */}
                        {complementar && (
                          <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                            <TableCell className="pl-8 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                └ {item.produto}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{displayIMEI(item.imei)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300">
                                Complementar
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                Garantia - Thiago Imports
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-blue-700 dark:text-blue-300 font-medium">{complementar.meses}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-blue-700 dark:text-blue-300">
                                {format(new Date(complementar.dataInicio), 'dd/MM/yyyy')} a {format(new Date(complementar.dataFim), 'dd/MM/yyyy')}
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Adesão da Garantia Extendida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Adesão da Garantia Extendida
              </span>
              <Button 
                variant="outline" 
                onClick={() => setShowGarantiaExtendidaModal(true)} 
                disabled={itens.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Incluir Garantia Extendida
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {garantiaExtendida ? (
              <div className="p-4 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-100">Plano {garantiaExtendida.planoNome}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {garantiaExtendida.meses} meses - Vigência: {format(new Date(garantiaExtendida.dataInicio), 'dd/MM/yyyy')} a {format(new Date(garantiaExtendida.dataFim), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    * Inicia após o término da garantia padrão de 12 meses
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-purple-600">{formatCurrency(garantiaExtendida.valor)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setGarantiaExtendida(null)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma garantia extendida adicionada. Clique em "Incluir Garantia Extendida" para adicionar.
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
            <div className={`grid gap-4 ${tipoRetirada === 'Entrega' ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}>
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
                <>
                  {/* Autocomplete de Local de Entrega */}
                  <div className="relative">
                    <label className="text-sm font-medium">Local de Entrega *</label>
                    <Input
                      value={localEntregaNome || buscaLocalEntrega}
                      onChange={(e) => {
                        setBuscaLocalEntrega(e.target.value);
                        setLocalEntregaNome('');
                        setLocalEntregaId('');
                        setValorRecomendadoEntrega(0);
                        setShowLocaisEntrega(true);
                      }}
                      onFocus={() => setShowLocaisEntrega(true)}
                      placeholder="Digite para buscar local..."
                    />
                    {showLocaisEntrega && (buscaLocalEntrega || !localEntregaNome) && (
                      <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {taxasEntrega
                          .filter(t => t.local.toLowerCase().includes((buscaLocalEntrega || '').toLowerCase()))
                          .map(taxa => (
                            <div
                              key={taxa.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                              onClick={() => {
                                setLocalEntregaId(taxa.id);
                                setLocalEntregaNome(taxa.local);
                                setValorRecomendadoEntrega(taxa.valor);
                                setTaxaEntrega(taxa.valor);
                                setBuscaLocalEntrega('');
                                setShowLocaisEntrega(false);
                              }}
                            >
                              <span>{taxa.local}</span>
                              <span className="text-sm text-muted-foreground">{formatCurrency(taxa.valor)}</span>
                            </div>
                          ))}
                        {taxasEntrega.filter(t => t.local.toLowerCase().includes((buscaLocalEntrega || '').toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-muted-foreground text-sm">
                            Nenhum local encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valor Recomendado (read-only) */}
                  <div>
                    <label className="text-sm font-medium">Valor Recom.</label>
                    <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium text-muted-foreground">
                      {valorRecomendadoEntrega > 0 ? formatCurrency(valorRecomendadoEntrega) : '-'}
                    </div>
                  </div>

                  {/* Valor da Entrega (editável) */}
                  <div>
                    <label className="text-sm font-medium">Valor Entrega *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                      <Input 
                        type="text"
                        value={taxaEntrega.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setTaxaEntrega(Number(value) / 100);
                        }}
                        className={`pl-10 ${taxaEntrega < valorRecomendadoEntrega && valorRecomendadoEntrega > 0 ? 'border-destructive text-destructive' : ''}`}
                        placeholder="0,00"
                      />
                    </div>
                    {taxaEntrega < valorRecomendadoEntrega && valorRecomendadoEntrega > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>-{formatCurrency(valorRecomendadoEntrega - taxaEntrega)}</span>
                      </div>
                    )}
                  </div>

                  {/* Motoboy (obrigatório) */}
                  <div>
                    <label className="text-sm font-medium">Motoboy *</label>
                    <Select value={motoboyId} onValueChange={setMotoboyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motoboy" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoboys.map(motoboy => {
                          const lojaNome = obterNomeLoja(motoboy.loja_id);
                          return (
                            <SelectItem key={motoboy.id} value={motoboy.id}>
                              {motoboy.nome} - {lojaNome}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {tipoRetirada === 'Retirada em Outra Loja' && (
                <div>
                  <label className="text-sm font-medium">Loja de Retirada</label>
                  <Select value={localRetirada} onValueChange={setLocalRetirada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas.filter(l => l.ativa).map(loja => (
                        <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <label className="text-sm font-medium">Observações</label>
              <Textarea 
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos - Bloqueado em Downgrade */}
        {hasValidDowngrade ? (
          <Card className="border-2 border-muted opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-5 w-5" />
                Pagamentos
                <Badge variant="outline" className="ml-2">Bloqueado - Downgrade</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Quadro de pagamentos bloqueado</p>
                <p className="text-sm mt-2">
                  Em operações de Downgrade, não há pagamento do cliente. 
                  O valor de <span className="font-bold text-destructive">{formatCurrency(saldoDevolver)}</span> será 
                  devolvido ao cliente via PIX após aprovação do Financeiro.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PagamentoQuadro
            valorTotalProdutos={total}
            custoTotalProdutos={valorCustoTotal}
            lojaVendaId={lojaVenda}
            onPagamentosChange={setPagamentos}
            pagamentosIniciais={pagamentos}
          />
        )}

        {/* Resumo */}
        <Card className={`border-2 ${isPrejuizo ? 'border-destructive' : 'border-primary'}`}>
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
                <p className="text-sm text-muted-foreground">Valor dos Produtos</p>
                <p className="text-xl font-bold">{formatCurrency(valorProdutos)}</p>
              </div>
              {valorGarantiaExtendida > 0 && (
                <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor Garantia Extendida</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(valorGarantiaExtendida)}</p>
                </div>
              )}
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
            
            {/* Card de Comissão do Vendedor */}
            {vendedor && lucroProjetado > 0 && (
              <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Comissão do Vendedor</p>
                  <p className="text-xs text-muted-foreground">
                    ({getComissaoColaborador(vendedor).comissao}% sobre o lucro)
                  </p>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(calcularComissaoVenda(vendedor, lucroProjetado))}
                </p>
              </div>
            )}
            
            {/* Card de Prejuízo em Acessórios - exibido apenas se houver prejuízo */}
            {prejuizoAcessorios > 0 && (
              <div className="mt-4 p-3 bg-destructive/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Prejuízo em Acessórios</p>
                <p className="text-lg font-bold text-destructive">-{formatCurrency(prejuizoAcessorios)}</p>
              </div>
            )}

            {/* Card de informação quando há Sinal */}
            {temPagamentoSinal && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">Venda com Sinal</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor do Sinal</p>
                    <p className="font-bold text-red-600">{formatCurrency(valorSinal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Pendente</p>
                    <p className="font-bold text-red-600">{formatCurrency(valorPendenteSinal)}</p>
                  </div>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
                  Os produtos serão bloqueados até o pagamento do valor restante.
                </p>
              </div>
            )}
            
            {/* Card de PIX a Devolver - Downgrade */}
            {hasValidDowngrade && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border-2 border-destructive">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="font-bold text-destructive">PIX a Devolver</span>
                  </div>
                  <span className="text-2xl font-bold text-destructive">{formatCurrency(saldoDevolver)}</span>
                </div>
                <p className="text-xs text-destructive/80 mt-2">
                  Valor será pago ao cliente via PIX após aprovação do Gestor e execução pelo Financeiro.
                </p>
              </div>
            )}
            
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
          <Button variant="outline" onClick={() => navigate('/vendas')}>
            Cancelar
          </Button>
          
          {/* Botão Salvar com Sinal - aparece quando tem pagamento Sinal */}
          {temPagamentoSinal && !hasValidDowngrade && (
            <Button 
              onClick={handleSalvarComSinal}
              disabled={!canSubmitSinal}
              className="bg-red-600 hover:bg-red-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Registro (Sinal)
            </Button>
          )}
          
          {/* Botão Registrar Venda Downgrade */}
          {hasValidDowngrade && (
            <Button 
              onClick={handleRegistrarVenda}
              disabled={!canSubmit || tradeInNaoValidado}
              className="bg-destructive hover:bg-destructive/90"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Registrar Downgrade
            </Button>
          )}
          
          {/* Botão Registrar Venda normal - só aparece se não tem sinal e não é downgrade */}
          {!temPagamentoSinal && !hasValidDowngrade && (
            <Button 
              onClick={handleRegistrarVenda}
              disabled={!canSubmit}
            >
              <Check className="h-4 w-4 mr-2" />
              Registrar Venda
            </Button>
          )}
        </div>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            {/* Tabs para Estoque e Pendentes */}
            <div className="flex border-b">
              <button
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  !showPendentesTab 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setShowPendentesTab(false)}
              >
                Produtos – Estoque
              </button>
              <button
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  showPendentesTab 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setShowPendentesTab(true)}
              >
                Produtos – Pendentes
              </button>
            </div>
            
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
                  {lojasTipoLoja.map(loja => (
                    <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!showPendentesTab ? (
              /* Aba Produtos Estoque */
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
                      <TableCell className="font-mono text-sm">{displayIMEI(produto.imei)}</TableCell>
                      <TableCell>
                        {produto.quantidade === 0 ? (
                          <Badge variant="destructive">Indisponível</Badge>
                        ) : (
                          produto.quantidade
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(produto.valorVendaSugerido)}</TableCell>
                      <TableCell>{obterNomeLoja(produto.loja)}</TableCell>
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
                  {produtosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                        Nenhum produto disponível nesta loja
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Separador visual para produtos de outras lojas */}
                  {lojaVenda && produtosOutrasLojas.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={8} className="text-center py-2 font-medium text-muted-foreground">
                          📍 Produtos em outras lojas (apenas visualização)
                        </TableCell>
                      </TableRow>
                      {produtosOutrasLojas.map(produto => (
                        <TableRow key={produto.id} className="opacity-60 bg-muted/20">
                          <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                          <TableCell className="font-medium">{produto.modelo}</TableCell>
                          <TableCell>
                            <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                              {produto.tipo || 'Semi-novo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{displayIMEI(produto.imei)}</TableCell>
                          <TableCell>{produto.quantidade}</TableCell>
                          <TableCell className="text-right">{formatCurrency(produto.valorVendaSugerido)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                              {obterNomeLoja(produto.loja)}
                            </Badge>
                          </TableCell>
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
                                variant="outline"
                                disabled
                                className="text-muted-foreground"
                              >
                                Outra loja
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            ) : (
              /* Aba Produtos Pendentes (apenas consulta) */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosPendentes.filter(p => {
                    // Comparar pelo nome da loja (filtroLojaProduto contém nome)
                    if (filtroLojaProduto && obterNomeLoja(p.loja) !== filtroLojaProduto) return false;
                    if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
                    if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
                    return true;
                  }).map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                      <TableCell className="font-medium">{produto.modelo}</TableCell>
                      <TableCell className="font-mono text-sm">{displayIMEI(produto.imei)}</TableCell>
                      <TableCell>
                        <Badge variant={produto.origemEntrada === 'Base de Troca' ? 'secondary' : 'outline'}>
                          {produto.origemEntrada}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Bloqueado</Badge>
                      </TableCell>
                      <TableCell>{obterNomeLoja(produto.loja)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            // Exibir detalhes do produto pendente
                            setProdutoDetalhe({
                              id: produto.id,
                              imei: produto.imei,
                              modelo: produto.modelo,
                              cor: produto.cor,
                              marca: produto.marca,
                              tipo: produto.tipo,
                              quantidade: 0,
                              valorCusto: produto.valorCusto,
                              valorVendaSugerido: 0,
                              saudeBateria: produto.saudeBateria,
                              loja: produto.loja,
                              conferidoEstoque: false,
                              conferidoAssistencia: false
                            } as any);
                            setShowDetalheProduto(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {produtosPendentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum produto pendente de conferência
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
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
                onValueChange={(v) => setNovoTradeIn({ ...novoTradeIn, condicao: v as 'Novo' | 'Semi-novo' })}
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
              <label className="text-sm font-medium">Descrição Detalhada</label>
              <Textarea 
                value={novoTradeIn.descricao || ''}
                onChange={(e) => setNovoTradeIn({ ...novoTradeIn, descricao: e.target.value })}
                placeholder="Estado do aparelho, condições, etc."
              />
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
            <div>
              <label className="text-sm font-medium">Valor de Compra Usado *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  type="text"
                  value={novoTradeIn.valorCompraUsado ? novoTradeIn.valorCompraUsado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNovoTradeIn({ ...novoTradeIn, valorCompraUsado: Number(value) / 100 });
                  }}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="imeiValidado"
                checked={novoTradeIn.imeiValidado || false}
                onChange={(e) => setNovoTradeIn({ ...novoTradeIn, imeiValidado: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="imeiValidado" className="text-sm font-medium">IMEI Validado</label>
            </div>
            {!novoTradeIn.imeiValidado && (
              <div className="bg-destructive/10 p-3 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">IMEI não validado bloqueia o registro da venda</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTradeInModal(false)}>Cancelar</Button>
            <Button onClick={handleAddTradeIn}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmacaoModal} onOpenChange={setShowConfirmacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Responsável pela Venda</label>
              <Select value={confirmVendedor} onValueChange={setConfirmVendedor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendedoresDisponiveis.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Loja de Origem</label>
              <Select value={confirmLoja} onValueChange={setConfirmLoja}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lojas.filter(l => l.ativa).map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Data da Venda</label>
              <Input value={new Date().toLocaleString('pt-BR')} disabled className="bg-muted" />
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total da Venda:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Lucro:</span>
                <span className="font-medium">{formatCurrency(lucroProjetado)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacaoModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarVenda}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nota Fiscal */}
      <Dialog open={showNotaModal} onOpenChange={setShowNotaModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nota Fiscal Simplificada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4 border rounded-lg bg-background">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">Thiago Imports</h2>
              <p className="text-sm text-muted-foreground">CNPJ: 12.345.678/0001-01</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nº da Venda:</span>
                <span className="ml-2 font-medium">{vendaInfo.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data:</span>
                <span className="ml-2 font-medium">{new Date().toLocaleString('pt-BR')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="ml-2 font-medium">{clienteNome} - CPF: {clienteCpf}</span>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Itens:</h3>
              {itens.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span>{item.produto}</span>
                  <span>{formatCurrency(item.valorVenda)}</span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {totalTradeIn > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Base de Troca:</span>
                  <span>-{formatCurrency(totalTradeIn)}</span>
                </div>
              )}
              {taxaEntrega > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega:</span>
                  <span>{formatCurrency(taxaEntrega)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            
            {qrCodeUrl && (
              <div className="text-center pt-4">
                <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-32 h-32" />
                <p className="text-xs text-muted-foreground mt-2">Escaneie para verificar</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotaModal(false)}>Fechar</Button>
            <Button onClick={() => window.print()}>Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Produto */}
      <Dialog open={showDetalheProduto} onOpenChange={setShowDetalheProduto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {produtoDetalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Modelo</label>
                  <p className="font-medium">{produtoDetalhe.modelo}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">IMEI</label>
                  <p className="font-medium">{produtoDetalhe.imei}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cor</label>
                  <p className="font-medium">{produtoDetalhe.cor}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Condição</label>
                  <p className="font-medium">{produtoDetalhe.tipo}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Saúde da Bateria</label>
                  <Badge variant={produtoDetalhe.saudeBateria >= 85 ? "default" : "destructive"}>
                    {produtoDetalhe.saudeBateria}%
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Loja</label>
                  <p className="font-medium">{produtoDetalhe.loja}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Valor de Custo</label>
                  <p className="font-medium">{formatCurrency(produtoDetalhe.valorCusto)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Valor Sugerido</label>
                  <p className="font-medium">{formatCurrency(produtoDetalhe.valorVendaSugerido)}</p>
                </div>
              </div>
              {produtoDetalhe.pareceres && (
                <div>
                  <label className="text-sm text-muted-foreground">Pareceres</label>
                  <p className="text-sm">{produtoDetalhe.pareceres}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalheProduto(false)}>Fechar</Button>
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

      {/* Modal Garantia Extendida */}
      <Dialog open={showGarantiaExtendidaModal} onOpenChange={setShowGarantiaExtendidaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Garantia Extendida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {planosExtendidaDisponiveis.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum plano de garantia extendida disponível para este modelo.
              </div>
            ) : (
              <div className="space-y-3">
                {planosExtendidaDisponiveis.map(plano => {
                  const vigencia = calcularVigenciaExtendida(plano);
                  return (
                    <div 
                      key={plano.id} 
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddGarantiaExtendida(plano)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-lg">{plano.nome}</p>
                          <p className="text-sm text-muted-foreground">+{plano.meses} meses de garantia</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Vigência: {format(new Date(vigencia.dataInicio), 'dd/MM/yyyy')} a {format(new Date(vigencia.dataFim), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-primary">{formatCurrency(plano.valor)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              * A garantia extendida sempre inicia após o término da garantia padrão de 12 meses.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGarantiaExtendidaModal(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
