import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, Search, Plus, X, Eye, Trash2, 
  User, Package, CreditCard, Truck, FileText, AlertTriangle, Check, Save,
  Headphones, ArrowLeftRight, Star, ArrowLeft, History, Camera, Image
} from 'lucide-react';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { format, addMonths, addDays } from 'date-fns';

import { 
  getClientes, getOrigensVenda, 
  getContasFinanceiras, Cliente, OrigemVenda, ContaFinanceira,
  addCliente
} from '@/utils/cadastrosApi';
import { getTaxasEntregaAtivas, TaxaEntrega } from '@/utils/taxasEntregaApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getProdutos, Produto, bloquearProdutosEmVenda, desbloquearProdutosDeVenda, getLojaEstoqueReal } from '@/utils/estoqueApi';
import { getVendaById, updateVenda, registrarEdicaoVenda, ItemVenda, ItemTradeIn, Pagamento, Venda, AnexoTradeIn } from '@/utils/vendasApi';
import { getVendaComFluxo, registrarEdicaoFluxo, VendaComFluxo } from '@/utils/fluxoVendasApi';
import { getAcessorios, Acessorio, VendaAcessorio } from '@/utils/acessoriosApi';
import { getProdutosCadastro, ProdutoCadastro } from '@/utils/cadastrosApi';
import { getProdutosPendentes, ProdutoPendente } from '@/utils/osApi';
import { getPlanosPorModelo, PlanoGarantia } from '@/utils/planosGarantiaApi';
import { formatarMoeda } from '@/utils/formatUtils';
import { calcularComissaoVenda, getComissaoColaborador } from '@/utils/comissoesApi';
import { addTimelineEntry } from '@/utils/timelineApi';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { ValoresRecomendadosTroca } from '@/components/vendas/ValoresRecomendadosTroca';
import { displayIMEI, formatIMEI } from '@/utils/imeiMask';

const formatCurrency = formatarMoeda;

// Interface para garantia do item
interface GarantiaItemVenda {
  itemId: string;
  tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
  mesesGarantia: number;
  dataFimGarantia: string;
  garantiaComplementar?: {
    meses: number;
    dataInicio: string;
    dataFim: string;
  };
}

export default function VendasEditar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { obterLojasAtivas, obterVendedores, obterMotoboys, obterLojaById, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  
  // Dados de cadastros - usando Zustand store
  const lojas = obterLojasAtivas();
  const vendedoresDisponiveis = obterVendedores();
  const motoboys = obterMotoboys();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [produtosEstoque] = useState<Produto[]>(getProdutos());
  const [produtosCadastro] = useState<ProdutoCadastro[]>(getProdutosCadastro());
  const [produtosPendentes] = useState<ProdutoPendente[]>(getProdutosPendentes());
  const [acessoriosEstoque, setAcessoriosEstoque] = useState<Acessorio[]>(getAcessorios());
  
  // Venda original (para comparação)
  const [vendaOriginal, setVendaOriginal] = useState<Venda | null>(null);
  const [vendaFluxo, setVendaFluxo] = useState<VendaComFluxo | null>(null);
  
  // Info da venda (bloqueada)
  const [vendaId, setVendaId] = useState('');
  const [vendaNumero, setVendaNumero] = useState(0);
  const [lojaVenda, setLojaVenda] = useState('');
  const [vendedor, setVendedor] = useState('');
  
  // Cliente
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');
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
  
  // Trade-in
  const [tradeIns, setTradeIns] = useState<ItemTradeIn[]>([]);
  const [showTradeInModal, setShowTradeInModal] = useState(false);
  const [novoTradeIn, setNovoTradeIn] = useState<Partial<ItemTradeIn>>({});
  const [tipoOperacaoTroca, setTipoOperacaoTroca] = useState<'Upgrade' | 'Downgrade'>('Upgrade');
  const [chavePix, setChavePix] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  // Preview de anexos Trade-In
  const [previewAnexo, setPreviewAnexo] = useState<{
    aberto: boolean;
    tipo: 'termo' | 'fotos';
    trade: ItemTradeIn | null;
  }>({ aberto: false, tipo: 'termo', trade: null });

  const abrirPreviewAnexo = (trade: ItemTradeIn, tipo: 'termo' | 'fotos') => {
    setPreviewAnexo({ aberto: true, tipo, trade });
  };
  
  // Pagamentos
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
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
  const [garantiaItens, setGarantiaItens] = useState<GarantiaItemVenda[]>([]);
  
  // Modal de confirmação
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [alteracoesDetectadas, setAlteracoesDetectadas] = useState<{ campo: string; valorAnterior: any; valorNovo: any }[]>([]);
  
  // Detalhes do produto
  const [showDetalheProduto, setShowDetalheProduto] = useState(false);
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  
  // Loading
  const [loading, setLoading] = useState(true);

  // Carregar venda existente
  useEffect(() => {
    if (!id) {
      navigate('/vendas');
      return;
    }
    
    const venda = getVendaById(id);
    const fluxo = getVendaComFluxo(id);
    
    if (!venda) {
      toast({ title: "Erro", description: "Venda não encontrada", variant: "destructive" });
      navigate('/vendas');
      return;
    }
    
    setVendaOriginal(venda);
    setVendaFluxo(fluxo);
    
    // Preencher campos
    setVendaId(venda.id);
    setVendaNumero(venda.numero);
    setLojaVenda(venda.lojaVenda);
    setVendedor(venda.vendedor);
    setClienteId(venda.clienteId);
    setClienteNome(venda.clienteNome);
    setClienteCpf(venda.clienteCpf);
    setClienteTelefone(venda.clienteTelefone || '');
    setClienteEmail(venda.clienteEmail || '');
    setClienteCidade(venda.clienteCidade || '');
    setOrigemVenda(venda.origemVenda);
    setLocalRetirada(venda.localRetirada);
    setTipoRetirada(venda.tipoRetirada || 'Retirada Balcão');
    setTaxaEntrega(venda.taxaEntrega || 0);
    setMotoboyId(venda.motoboyId || '');
    
    // Carregar dados de entrega se existirem
    if ((venda as any).localEntregaId) {
      setLocalEntregaId((venda as any).localEntregaId);
      const taxa = getTaxasEntregaAtivas().find(t => t.id === (venda as any).localEntregaId);
      if (taxa) {
        setLocalEntregaNome(taxa.local);
        setValorRecomendadoEntrega(taxa.valor);
      }
    }
    setObservacoes(venda.observacoes || '');
    setItens(venda.itens || []);
    setTradeIns(venda.tradeIns || []);
    setPagamentos(venda.pagamentos || []);
    
    // Carregar acessórios se existirem
    if (venda.acessorios && venda.acessorios.length > 0) {
      setAcessoriosVenda(venda.acessorios);
    } else if ((venda as any).acessoriosVenda) {
      setAcessoriosVenda((venda as any).acessoriosVenda);
    }
    
    // Carregar garantia extendida se existir
    if ((venda as any).garantiaExtendida) {
      setGarantiaExtendida((venda as any).garantiaExtendida);
    }
    
    setLoading(false);
  }, [id, navigate]);

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
  
  // Detecção automática do tipo de operação baseado nos valores
  useEffect(() => {
    if (tradeIns.length === 0) return;
    if (totalTradeIn > valorProdutos) {
      if (tipoOperacaoTroca !== 'Downgrade') setTipoOperacaoTroca('Downgrade');
    } else {
      if (tipoOperacaoTroca !== 'Upgrade') setTipoOperacaoTroca('Upgrade');
    }
  }, [totalTradeIn, valorProdutos, tradeIns.length]);
  
  // Validação de Upgrade inválido
  const isUpgradeInvalido = useMemo(() => {
    if (tipoOperacaoTroca !== 'Upgrade') return false;
    return totalTradeIn > valorProdutos && tradeIns.length > 0;
  }, [tipoOperacaoTroca, totalTradeIn, valorProdutos, tradeIns.length]);
  
  const total = useMemo(() => subtotal + totalAcessorios - totalTradeIn + taxaEntrega + valorGarantiaExtendida, [subtotal, totalAcessorios, totalTradeIn, taxaEntrega, valorGarantiaExtendida]);
  const valorPendente = useMemo(() => total - totalPagamentos, [total, totalPagamentos]);
  
  // Cálculos de custo
  const valorCustoAcessorios = useMemo(() => acessoriosVenda.reduce((acc, a) => {
    const acessorio = acessoriosEstoque.find(ae => ae.id === a.acessorioId);
    return acc + (acessorio?.valorCusto || 0) * a.quantidade;
  }, 0), [acessoriosVenda, acessoriosEstoque]);
  const valorCustoTotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0) + valorCustoAcessorios, [itens, valorCustoAcessorios]);
  const lucroProjetado = useMemo(() => total - valorCustoTotal, [total, valorCustoTotal]);
  const margemProjetada = useMemo(() => {
    if (valorCustoTotal === 0) return 0;
    return ((lucroProjetado / valorCustoTotal) * 100);
  }, [lucroProjetado, valorCustoTotal]);
  const isPrejuizo = total > 0 && lucroProjetado < 0;
  
  // Cálculo de prejuízo em acessórios
  const prejuizoAcessorios = useMemo(() => {
    const vendaAcessorios = acessoriosVenda.reduce((acc, a) => acc + a.valorTotal, 0);
    if (vendaAcessorios <= 0) return 0;
    return valorCustoAcessorios > vendaAcessorios ? valorCustoAcessorios - vendaAcessorios : 0;
  }, [acessoriosVenda, valorCustoAcessorios]);
  
  // Planos de garantia extendida disponíveis
  const planosExtendidaDisponiveis = useMemo(() => {
    if (itens.length === 0) return [];
    const item = itens[0];
    const produto = produtosEstoque.find(p => p.id === item.produtoId);
    const condicao = produto?.tipo === 'Novo' ? 'Novo' : 'Seminovo';
    return getPlanosPorModelo(item.produto, condicao).filter(p => p.nome === 'Silver' || p.nome === 'Gold');
  }, [itens, produtosEstoque]);

  // É venda com sinal?
  const isSinalVenda = vendaFluxo?.statusFluxo === 'Feito Sinal';
  const valorSinalOriginal = vendaOriginal?.valorSinal || 0;
  const valorPendenteSinal = total - totalPagamentos;

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
      toast({ title: "Cliente bloqueado", description: "Este cliente está inativo e não pode realizar compras.", variant: "destructive" });
      return;
    }
    
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteCpf(cliente.cpf);
    setClienteTelefone(cliente.telefone);
    setClienteEmail(cliente.email);
    setClienteCidade(cliente.cidade);
    setShowClienteModal(false);
    setBuscaCliente('');
  };

  // Formatar CPF/CNPJ
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

  // Adicionar novo cliente
  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast({ title: "Erro", description: "Nome e CPF/CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    
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

  // Produtos filtrados - FILTRA PELA LOJA DA VENDA (como VendasNova)
  const produtosFiltrados = useMemo(() => {
    const produtosNaVenda = itens.map(i => i.produtoId);
    
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (produtosNaVenda.includes(p.id)) return false;
      if (p.bloqueadoEmVendaId && p.bloqueadoEmVendaId !== vendaId) return false;
      if (p.statusMovimentacao) return false;
      if (p.statusEmprestimo) return false;
      
      // Filtrar pela loja da venda
      if (lojaVenda) {
        const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
        const lojaEfetivaProduto = p.lojaAtualId || p.loja;
        if (lojaEfetivaProduto !== lojaEstoqueReal) return false;
      }
      
      if (filtroLojaProduto && filtroLojaProduto !== 'todas') {
        const lojaEfetivaProduto = p.lojaAtualId || p.loja;
        if (lojaEfetivaProduto !== filtroLojaProduto) return false;
      }
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, lojaVenda, filtroLojaProduto, buscaProduto, buscaModeloProduto, itens, vendaId]);

  // Produtos de OUTRAS lojas (apenas visualização)
  const produtosOutrasLojas = useMemo(() => {
    if (!lojaVenda) return [];
    const lojaEstoqueReal = getLojaEstoqueReal(lojaVenda);
    const produtosNaVenda = itens.map(i => i.produtoId);
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (produtosNaVenda.includes(p.id)) return false;
      if (p.bloqueadoEmVendaId && p.bloqueadoEmVendaId !== vendaId) return false;
      if (p.statusMovimentacao) return false;
      if (p.statusEmprestimo) return false;
      const lojaEfetivaProduto = p.lojaAtualId || p.loja;
      if (lojaEfetivaProduto === lojaEstoqueReal) return false;
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, lojaVenda, buscaProduto, buscaModeloProduto, itens, vendaId]);

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
    
    setItens([...itens, novoItem]);
    setShowProdutoModal(false);
    setBuscaProduto('');
    setFiltroLojaProduto('');
    
    toast({ title: "Produto adicionado", description: `${produto.modelo} adicionado à venda` });
  };

  // Remover item
  const handleRemoveItem = (itemId: string) => {
    setItens(itens.filter(i => i.id !== itemId));
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
  const handleAddAcessorio = (acessorio: Acessorio) => {
    const existente = acessoriosVenda.find(a => a.acessorioId === acessorio.id);
    
    if (existente) {
      if (existente.quantidade + 1 > acessorio.quantidade) {
        toast({ title: "Estoque insuficiente", description: `Apenas ${acessorio.quantidade} unidades disponíveis.`, variant: "destructive" });
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
    toast({ title: "Acessório adicionado", description: `${acessorio.descricao} adicionado à venda` });
  };

  // Remover acessório
  const handleRemoveAcessorio = (acessorioId: string) => {
    setAcessoriosVenda(acessoriosVenda.filter(a => a.id !== acessorioId));
  };

  // Adicionar trade-in
  const handleAddTradeIn = () => {
    if (!novoTradeIn.modelo || !novoTradeIn.valorCompraUsado || !novoTradeIn.condicao) {
      toast({ title: "Erro", description: "Modelo, condição e valor são obrigatórios", variant: "destructive" });
      return;
    }
    
    // Validar tipo de entrega
    if (!novoTradeIn.tipoEntrega) {
      toast({ title: "Erro", description: "Selecione o tipo de entrega do aparelho", variant: "destructive" });
      return;
    }
    
    // Validar anexos obrigatórios para "Com o Cliente"
    if (novoTradeIn.tipoEntrega === 'Com o Cliente') {
      if (!novoTradeIn.termoResponsabilidade) {
        toast({ title: "Erro", description: "Termo de Responsabilidade é obrigatório para aparelho com o cliente", variant: "destructive" });
        return;
      }
      if (!novoTradeIn.fotosAparelho || novoTradeIn.fotosAparelho.length === 0) {
        toast({ title: "Erro", description: "Adicione pelo menos uma foto do aparelho", variant: "destructive" });
        return;
      }
    }
    
    const tradeIn: ItemTradeIn = {
      id: `TRADE-${Date.now()}`,
      modelo: novoTradeIn.modelo!,
      descricao: novoTradeIn.descricao || '',
      imei: novoTradeIn.imei || '',
      valorCompraUsado: novoTradeIn.valorCompraUsado!,
      imeiValidado: novoTradeIn.imeiValidado || false,
      condicao: novoTradeIn.condicao as 'Novo' | 'Semi-novo',
      tipoEntrega: novoTradeIn.tipoEntrega,
      termoResponsabilidade: novoTradeIn.termoResponsabilidade,
      fotosAparelho: novoTradeIn.fotosAparelho,
      dataRegistro: new Date().toISOString()
    };
    
    setTradeIns([...tradeIns, tradeIn]);
    setShowTradeInModal(false);
    setNovoTradeIn({});
  };

  // Remover trade-in
  const handleRemoveTradeIn = (tradeInId: string) => {
    setTradeIns(tradeIns.filter(t => t.id !== tradeInId));
  };

  // Calcular vigência da garantia extendida
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

  // Detectar alterações
  const detectarAlteracoes = (): { campo: string; valorAnterior: any; valorNovo: any }[] => {
    if (!vendaOriginal) return [];
    
    const alteracoes: { campo: string; valorAnterior: any; valorNovo: any }[] = [];
    
    // Comparar campos simples
    if (vendaOriginal.clienteId !== clienteId) {
      alteracoes.push({ campo: 'Cliente', valorAnterior: vendaOriginal.clienteNome, valorNovo: clienteNome });
    }
    if (vendaOriginal.origemVenda !== origemVenda) {
      alteracoes.push({ campo: 'Origem da Venda', valorAnterior: vendaOriginal.origemVenda, valorNovo: origemVenda });
    }
    if (vendaOriginal.localRetirada !== localRetirada) {
      alteracoes.push({ campo: 'Local de Retirada', valorAnterior: vendaOriginal.localRetirada, valorNovo: localRetirada });
    }
    if ((vendaOriginal.taxaEntrega || 0) !== taxaEntrega) {
      alteracoes.push({ campo: 'Taxa de Entrega', valorAnterior: vendaOriginal.taxaEntrega || 0, valorNovo: taxaEntrega });
    }
    if (vendaOriginal.observacoes !== observacoes) {
      alteracoes.push({ campo: 'Observações', valorAnterior: vendaOriginal.observacoes || '', valorNovo: observacoes });
    }
    
    // Comparar itens
    const itensOriginais = vendaOriginal.itens || [];
    if (itens.length !== itensOriginais.length) {
      alteracoes.push({ campo: 'Itens da Venda', valorAnterior: `${itensOriginais.length} itens`, valorNovo: `${itens.length} itens` });
    } else {
      // Verificar mudanças de valor
      itens.forEach((item, index) => {
        const original = itensOriginais.find(i => i.id === item.id);
        if (original && original.valorVenda !== item.valorVenda) {
          alteracoes.push({ 
            campo: `Valor de ${item.produto}`, 
            valorAnterior: formatCurrency(original.valorVenda), 
            valorNovo: formatCurrency(item.valorVenda) 
          });
        }
      });
    }
    
    // Comparar trade-ins
    const tradeInsOriginais = vendaOriginal.tradeIns || [];
    if (tradeIns.length !== tradeInsOriginais.length) {
      alteracoes.push({ campo: 'Base de Troca', valorAnterior: `${tradeInsOriginais.length} itens`, valorNovo: `${tradeIns.length} itens` });
    }
    
    // Comparar pagamentos
    const pagamentosOriginais = vendaOriginal.pagamentos || [];
    if (pagamentos.length !== pagamentosOriginais.length || totalPagamentos !== pagamentosOriginais.reduce((acc, p) => acc + p.valor, 0)) {
      alteracoes.push({ 
        campo: 'Pagamentos', 
        valorAnterior: formatCurrency(pagamentosOriginais.reduce((acc, p) => acc + p.valor, 0)), 
        valorNovo: formatCurrency(totalPagamentos) 
      });
    }
    
    // Comparar totais
    if (vendaOriginal.total !== total) {
      alteracoes.push({ campo: 'Total da Venda', valorAnterior: formatCurrency(vendaOriginal.total), valorNovo: formatCurrency(total) });
    }
    
    return alteracoes;
  };

  // Verificar se há trade-in não validado
  const tradeInNaoValidado = useMemo(() => {
    return tradeIns.some(t => !t.imeiValidado);
  }, [tradeIns]);

  // Validar antes de salvar
  // Para vendas com sinal (Fiado), verificar se os pagamentos cobrem o total
  const canSubmit = useMemo(() => {
    const motoboyValido = tipoRetirada !== 'Entrega' || !!motoboyId;
    
    // Tolerância maior para arredondamentos (1 centavo)
    const pagamentoCompleto = Math.abs(valorPendente) <= 0.01 || valorPendente <= 0;
    
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      (itens.length > 0 || acessoriosVenda.length > 0) &&
      pagamentoCompleto &&
      !tradeInNaoValidado &&
      motoboyValido
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, itens.length, acessoriosVenda.length, valorPendente, tradeInNaoValidado, tipoRetirada, motoboyId]);

  // Preparar salvamento
  const handlePrepararSalvar = () => {
    const alteracoes = detectarAlteracoes();
    
    if (alteracoes.length === 0) {
      toast({ title: "Sem alterações", description: "Nenhuma alteração foi detectada." });
      return;
    }
    
    setAlteracoesDetectadas(alteracoes);
    setShowConfirmacaoModal(true);
  };

  // Confirmar e salvar
  const handleConfirmarSalvar = () => {
    if (!vendaOriginal || !id) return;
    
    const usuarioLogado = { id: 'COL-001', nome: 'João Gestor' }; // Mock
    
    // Registrar edição na timeline existente
    registrarEdicaoVenda(id, usuarioLogado.id, usuarioLogado.nome, alteracoesDetectadas);
    
    if (vendaFluxo) {
      registrarEdicaoFluxo(id, usuarioLogado.id, usuarioLogado.nome, alteracoesDetectadas);
    }
    
    // Registrar na timeline unificada
    const descricaoAlteracoes = alteracoesDetectadas.map(a => a.campo).join(', ');
    addTimelineEntry({
      entidadeId: id,
      entidadeTipo: 'Produto',
      dataHora: new Date().toISOString(),
      tipo: 'edicao_venda',
      titulo: 'Venda Editada',
      descricao: `Alterações: ${descricaoAlteracoes}`,
      usuarioId: usuarioLogado.id,
      usuarioNome: usuarioLogado.nome,
      metadata: { alteracoesDetectadas }
    });
    
    // Atualizar bloqueio de produtos
    const produtosAtuais = itens.map(i => i.produtoId);
    desbloquearProdutosDeVenda(id);
    bloquearProdutosEmVenda(id, produtosAtuais);
    
    // Determinar novo status
    let novoStatus = vendaOriginal.statusAtual;
    if (isSinalVenda && (Math.abs(valorPendente) <= 0.01 || valorPendente <= 0)) {
      novoStatus = 'Aguardando Conferência';
    }
    
    // Atualizar venda
    updateVenda(id, {
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
      pagamentos: hasValidDowngrade ? [] : pagamentos,
      subtotal,
      totalTradeIn,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes,
      acessorios: acessoriosVenda,
      statusAtual: novoStatus as any,
      valorSinal: isSinalVenda ? valorSinalOriginal : undefined,
      valorPendenteSinal: isSinalVenda ? valorPendenteSinal : undefined,
      tipoOperacao: tipoOperacaoTroca,
      saldoDevolver: hasValidDowngrade ? saldoDevolver : 0,
      chavePix: hasValidDowngrade ? chavePix : undefined,
    } as any);
    
    if (garantiaExtendida) {
      updateVenda(id, { garantiaExtendida } as any);
    }
    
    toast({
      title: "Venda atualizada!",
      description: `${alteracoesDetectadas.length} alteração(ões) salva(s) com sucesso.`
    });
    
    setShowConfirmacaoModal(false);
    navigate(-1);
  };

  const getColaboradorNome = (colId: string) => obterNomeColaborador(colId);
  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);

  if (loading) {
    return (
      <VendasLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados da venda...</p>
        </div>
      </VendasLayout>
    );
  }

  return (
    <VendasLayout title={`Editar Venda ${vendaId}`}>
      {/* Botão Voltar */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        {vendaFluxo && (
          <Badge variant={isSinalVenda ? "destructive" : "secondary"} className="text-sm">
            {vendaFluxo.statusFluxo}
          </Badge>
        )}
      </div>

      {/* Alerta de Sinal */}
      {isSinalVenda && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">Venda com Sinal Pendente</p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Sinal: {formatCurrency(valorSinalOriginal)} | Pendente: {formatCurrency(valorPendenteSinal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Info da Venda (Bloqueada) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informações da Venda
              <Badge variant="outline" className="ml-2">Bloqueado</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">ID da Venda</label>
                <Input value={vendaId} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Nº da Venda</label>
                <Input value={vendaNumero} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Loja de Venda</label>
                <Input value={getLojaNome(lojaVenda)} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Responsável pela Venda</label>
                <Input value={getColaboradorNome(vendedor)} disabled className="bg-muted" />
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
          </CardContent>
        </Card>

        {/* Cliente - Bloqueado na edição */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
              <Badge variant="outline" className="ml-2">Bloqueado</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input value={clienteNome} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">CPF</label>
                <Input value={clienteCpf} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input value={clienteTelefone} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input value={clienteEmail || '-'} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input value={clienteCidade} disabled className="bg-muted" />
              </div>
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
                Adicionar Produto
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Recomendado</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.produto}</TableCell>
                      <TableCell className="font-mono text-sm">{displayIMEI(item.imei)}</TableCell>
                      <TableCell>{getLojaNome(item.loja)}</TableCell>
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
                Adicionar Acessório
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acessoriosVenda.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum acessório adicionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acessório</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
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
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
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
                    <TableHead>Produto</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>IMEI Validado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anexos</TableHead>
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
                      {/* Coluna Status Entrega */}
                      <TableCell>
                        {trade.tipoEntrega === 'Entregue no Ato' ? (
                          <Badge className="bg-green-500 text-white">Entregue</Badge>
                        ) : trade.tipoEntrega === 'Com o Cliente' ? (
                          <Badge className="bg-amber-500 text-white">Com Cliente</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {/* Coluna Anexos */}
                      <TableCell>
                        {trade.tipoEntrega === 'Com o Cliente' && (
                          <div className="flex items-center gap-2">
                            {trade.termoResponsabilidade && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    type="button"
                                    onClick={() => abrirPreviewAnexo(trade, 'termo')}
                                    className="text-blue-500 hover:text-blue-600 cursor-pointer"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Termo de Responsabilidade</TooltipContent>
                              </Tooltip>
                            )}
                            {trade.fotosAparelho && trade.fotosAparelho.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    type="button"
                                    onClick={() => abrirPreviewAnexo(trade, 'fotos')}
                                    className="relative text-green-500 hover:text-green-600 cursor-pointer"
                                  >
                                    <Image className="h-4 w-4" />
                                    <span className="absolute -top-1 -right-2 text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                                      {trade.fotosAparelho.length}
                                    </span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{trade.fotosAparelho.length} foto(s)</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        -{formatCurrency(trade.valorCompraUsado)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveTradeIn(trade.id)}
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
                <span className="font-medium">Há item de troca com IMEI NÃO validado! Salvar alterações desabilitado.</span>
              </div>
            )}
            
            {/* Alerta de Upgrade Inválido */}
            {isUpgradeInvalido && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border-2 border-destructive flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-bold text-destructive">Valor da Base de Troca maior que produtos!</p>
                  <p className="text-sm text-muted-foreground">
                    Altere para a aba "DOWNGRADE" ou ajuste os valores.
                  </p>
                </div>
              </div>
            )}
            
            {/* Card de Conformidade - UPGRADE */}
            {tipoOperacaoTroca === 'Upgrade' && tradeIns.length > 0 && !isUpgradeInvalido && (
              <div className="mt-4 p-4 bg-green-500/10 rounded-lg border-2 border-green-500">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-green-600">UPGRADE em Conformidade</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Valor da Base de Troca ({formatCurrency(totalTradeIn)}) menor ou igual aos produtos ({formatCurrency(valorProdutos)}).
                </p>
              </div>
            )}
            
            {/* Card de Conformidade - DOWNGRADE */}
            {tipoOperacaoTroca === 'Downgrade' && tradeIns.length > 0 && saldoDevolver > 0 && chavePix.trim() !== '' && (
              <div className="mt-4 p-4 bg-green-500/10 rounded-lg border-2 border-green-500">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-green-600">DOWNGRADE em Conformidade</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Chave PIX informada. Saldo de {formatCurrency(saldoDevolver)} será devolvido ao cliente.
                </p>
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
                
                {/* Campo Chave PIX do Cliente - OBRIGATÓRIO */}
                <div className="mt-4 pt-4 border-t border-destructive/30">
                  <label className="text-sm font-medium text-destructive flex items-center gap-1">
                    Chave PIX do Cliente *
                  </label>
                  <Input
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="mt-1 border-destructive focus:ring-destructive"
                  />
                  {!chavePix.trim() && (
                    <p className="text-xs text-destructive mt-1">
                      * Obrigatório para operações de Downgrade
                    </p>
                  )}
                </div>
                
                <p className="text-xs text-destructive/80 mt-3">
                  * Em operações de Downgrade, o cliente recebe a diferença via PIX após aprovação do Financeiro.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Garantia Extendida */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Garantia Extendida
              </span>
              <Button 
                variant="outline" 
                onClick={() => setShowGarantiaExtendidaModal(true)} 
                disabled={itens.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Incluir Garantia
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {garantiaExtendida ? (
              <div className="p-4 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Plano {garantiaExtendida.planoNome}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {garantiaExtendida.meses} meses - Vigência: {format(new Date(garantiaExtendida.dataInicio), 'dd/MM/yyyy')} a {format(new Date(garantiaExtendida.dataFim), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(garantiaExtendida.valor)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setGarantiaExtendida(null)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma garantia extendida adicionada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retirada e Logística - ACIMA de Pagamentos */}
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
                  onValueChange={(v) => {
                    setTipoRetirada(v as any);
                    // Zerar valores de entrega quando não for "Entrega"
                    if (v !== 'Entrega') {
                      setTaxaEntrega(0);
                      setLocalEntregaId('');
                      setLocalEntregaNome('');
                      setValorRecomendadoEntrega(0);
                      setMotoboyId('');
                    }
                  }}
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
                    <label className={`text-sm font-medium ${!motoboyId ? 'text-destructive' : ''}`}>
                      Motoboy *
                    </label>
                    <Select value={motoboyId} onValueChange={setMotoboyId}>
                      <SelectTrigger className={!motoboyId ? 'border-destructive' : ''}>
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
        <Card className={`border-2 ${hasValidDowngrade ? 'border-orange-500' : isPrejuizo ? 'border-destructive' : 'border-primary'}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resumo
                {hasValidDowngrade && (
                  <Badge className="bg-orange-500 text-white ml-2">
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    DOWN
                  </Badge>
                )}
              </span>
              {isPrejuizo && !hasValidDowngrade && (
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
                <p className="text-sm text-muted-foreground">Aparelhos</p>
                <p className="text-xl font-bold">{formatCurrency(subtotal)}</p>
              </div>
              {totalAcessorios > 0 && (
                <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Acessórios</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(totalAcessorios)}</p>
                </div>
              )}
              {valorGarantiaExtendida > 0 && (
                <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Garantia Ext.</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(valorGarantiaExtendida)}</p>
                </div>
              )}
              <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Trade-in</p>
                <p className="text-xl font-bold text-green-600">-{formatCurrency(totalTradeIn)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Entrega</p>
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
                <p className="text-sm text-muted-foreground">Custo</p>
                <p className="text-lg font-medium">{formatCurrency(valorCustoTotal)}</p>
              </div>
              <div className={`p-3 rounded-lg ${hasValidDowngrade ? 'bg-destructive/20' : isPrejuizo ? 'bg-destructive/20' : 'bg-green-100 dark:bg-green-950/30'}`}>
                <p className="text-sm text-muted-foreground">
                  {hasValidDowngrade ? 'Devolver' : (isPrejuizo ? 'Prejuízo' : 'Lucro')}
                </p>
                <p className={`text-lg font-bold ${hasValidDowngrade || isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                  {hasValidDowngrade ? formatCurrency(saldoDevolver) : formatCurrency(lucroProjetado)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${hasValidDowngrade || isPrejuizo ? 'bg-destructive/20' : 'bg-muted'}`}>
                <p className="text-sm text-muted-foreground">Margem</p>
                <p className={`text-lg font-medium ${(hasValidDowngrade || isPrejuizo) ? 'text-destructive' : ''}`}>
                  {hasValidDowngrade ? '-' : `${margemProjetada.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Pagos</p>
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
            
            {/* Card de Prejuízo em Acessórios */}
            {prejuizoAcessorios > 0 && (
              <div className="mt-4 p-3 bg-destructive/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Prejuízo em Acessórios</p>
                <p className="text-lg font-bold text-destructive">-{formatCurrency(prejuizoAcessorios)}</p>
              </div>
            )}

            {/* Card de informação quando há Sinal */}
            {isSinalVenda && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">Venda com Sinal</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor do Sinal</p>
                    <p className="font-bold text-red-600">{formatCurrency(valorSinalOriginal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Pendente</p>
                    <p className="font-bold text-red-600">{formatCurrency(valorPendenteSinal)}</p>
                  </div>
                </div>
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
                <p className="text-sm text-muted-foreground mt-2">
                  Chave PIX: {chavePix || 'Não informada'}
                </p>
              </div>
            )}
            
            {/* Valor Pendente */}
            {!hasValidDowngrade && valorPendente > 0.01 && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-700 dark:text-red-300">Valor Pendente</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(valorPendente)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botões Finais */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePrepararSalvar}
            disabled={!canSubmit}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Alterar Cliente</DialogTitle>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.slice(0, 10).map(cliente => (
                  <TableRow key={cliente.id} className={cliente.status === 'Inativo' ? 'bg-destructive/10' : ''}>
                    <TableCell>{cliente.cpf}</TableCell>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>
                      {cliente.status === 'Inativo' ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>{cliente.telefone}</TableCell>
                    <TableCell>
                      {cliente.status !== 'Inativo' && (
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
            <div className="col-span-2">
              <label className="text-sm font-medium">Nome Completo *</label>
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
                maxLength={18}
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
                type="email"
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
            <Button variant="outline" onClick={() => setShowNovoClienteModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCliente}>Adicionar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Produto */}
      <Dialog open={showProdutoModal} onOpenChange={setShowProdutoModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Selecionar Produto</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Tabs para Estoque e Pendentes */}
            <div className="flex border-b flex-shrink-0">
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
            
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <Input 
                placeholder="Buscar por IMEI..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="sm:w-[200px]"
              />
              <Input 
                placeholder="Buscar por modelo..."
                value={buscaModeloProduto}
                onChange={(e) => setBuscaModeloProduto(e.target.value)}
                className="flex-1"
              />
              <Select value={filtroLojaProduto || 'all'} onValueChange={(val) => setFiltroLojaProduto(val === 'all' ? '' : val)}>
                <SelectTrigger className="sm:w-[200px]">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 overflow-y-auto">
            {!showPendentesTab ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead className="text-right">Valor Rec.</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.slice(0, 20).map(produto => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.modelo}</TableCell>
                      <TableCell className="font-mono text-sm">{displayIMEI(produto.imei)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(produto.vendaRecomendada || produto.valorVendaSugerido)}</TableCell>
                      <TableCell>{getLojaNome(produto.loja)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setProdutoDetalhe(produto);
                              setShowDetalheProduto(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
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
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        Nenhum produto disponível nesta loja
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Produtos de outras lojas */}
                  {lojaVenda && produtosOutrasLojas.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="text-center py-2 font-medium text-muted-foreground">
                          📍 Produtos em outras lojas (apenas visualização)
                        </TableCell>
                      </TableRow>
                      {produtosOutrasLojas.slice(0, 10).map(produto => (
                        <TableRow key={produto.id} className="opacity-60 bg-muted/20">
                          <TableCell className="font-medium">{produto.modelo}</TableCell>
                          <TableCell className="font-mono text-sm">{displayIMEI(produto.imei)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(produto.vendaRecomendada || produto.valorVendaSugerido)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                              {getLojaNome(produto.loja)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setProdutoDetalhe(produto);
                                  setShowDetalheProduto(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" disabled className="text-muted-foreground">
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
              /* Aba Produtos Pendentes */
              <Table>
                <TableHeader>
                  <TableRow>
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
                    if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
                    if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
                    return true;
                  }).map(produto => (
                    <TableRow key={produto.id}>
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
                      <TableCell>{getLojaNome(produto.loja)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum produto pendente de conferência
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Acessório */}
      <Dialog open={showAcessorioModal} onOpenChange={setShowAcessorioModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Acessório</DialogTitle>
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
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd Disp.</TableHead>
                  <TableHead className="text-right">Valor Custo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acessoriosFiltrados.slice(0, 20).map(acessorio => (
                  <TableRow key={acessorio.id}>
                    <TableCell className="font-medium">{acessorio.descricao}</TableCell>
                    <TableCell>{acessorio.categoria}</TableCell>
                    <TableCell className="text-center">{acessorio.quantidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(acessorio.valorCusto)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddAcessorio(acessorio)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Item de Troca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Valores Recomendados para Troca - no topo */}
            <div className="border-b pb-4">
              <p className="text-sm font-medium mb-2">📊 Valores Recomendados para Troca</p>
              <ValoresRecomendadosTroca
                onUsarValor={(valor, modelo, condicao) => {
                  setNovoTradeIn({ ...novoTradeIn, valorCompraUsado: valor, modelo, condicao });
                }}
              />
            </div>
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
              <div className="flex gap-2">
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
                  className="flex-1"
                />
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowBarcodeScanner(true)}
                  title="Escanear código de barras"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
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
            
            {/* Tipo de Entrega */}
            <div>
              <label className="text-sm font-medium">Entrega do Aparelho *</label>
              <Select 
                value={novoTradeIn.tipoEntrega || ''} 
                onValueChange={(v) => setNovoTradeIn({ 
                  ...novoTradeIn, 
                  tipoEntrega: v as 'Entregue no Ato' | 'Com o Cliente',
                  termoResponsabilidade: v === 'Entregue no Ato' ? undefined : novoTradeIn.termoResponsabilidade,
                  fotosAparelho: v === 'Entregue no Ato' ? undefined : novoTradeIn.fotosAparelho
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entregue no Ato">Aparelho entregue no ato da Venda</SelectItem>
                  <SelectItem value="Com o Cliente">Aparelho com o Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos obrigatórios para "Com o Cliente" */}
            {novoTradeIn.tipoEntrega === 'Com o Cliente' && (
              <>
                <Separator />
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Documentação Obrigatória</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Para aparelhos que ficam com o cliente, é obrigatório o Termo de Responsabilidade e pelo menos uma foto do aparelho.
                  </p>
                </div>
                
                {/* Upload Termo de Responsabilidade */}
                <div>
                  <label className="text-sm font-medium">Termo de Responsabilidade *</label>
                  <Input 
                    type="file"
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNovoTradeIn({
                            ...novoTradeIn,
                            termoResponsabilidade: {
                              id: `TERMO-${Date.now()}`,
                              nome: file.name,
                              tipo: file.type,
                              tamanho: file.size,
                              dataUrl: reader.result as string
                            }
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {novoTradeIn.termoResponsabilidade && (
                    <Badge className="mt-1 bg-green-500">✓ {novoTradeIn.termoResponsabilidade.nome}</Badge>
                  )}
                </div>
                
                {/* Upload Fotos do Aparelho */}
                <div>
                  <label className="text-sm font-medium">Fotos do Aparelho *</label>
                  <Input 
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const fotosPromises = files.map(file => {
                          return new Promise<AnexoTradeIn>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                              resolve({
                                id: `FOTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                nome: file.name,
                                tipo: file.type,
                                tamanho: file.size,
                                dataUrl: reader.result as string
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        });
                        
                        Promise.all(fotosPromises).then(fotos => {
                          setNovoTradeIn({
                            ...novoTradeIn,
                            fotosAparelho: [...(novoTradeIn.fotosAparelho || []), ...fotos]
                          });
                        });
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {novoTradeIn.fotosAparelho && novoTradeIn.fotosAparelho.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {novoTradeIn.fotosAparelho.map(foto => (
                        <div key={foto.id} className="relative">
                          <img src={foto.dataUrl} alt={foto.nome} className="w-16 h-16 object-cover rounded" />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
                            onClick={() => {
                              setNovoTradeIn({
                                ...novoTradeIn,
                                fotosAparelho: novoTradeIn.fotosAparelho?.filter(f => f.id !== foto.id)
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="imeiValidadoEdit"
                checked={novoTradeIn.imeiValidado || false}
                onChange={(e) => setNovoTradeIn({ ...novoTradeIn, imeiValidado: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="imeiValidadoEdit" className="text-sm font-medium">IMEI Validado</label>
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

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          open={showBarcodeScanner}
          onScan={(result) => {
            const digits = result.replace(/\D/g, '').slice(0, 15);
            let masked = '';
            for (let i = 0; i < digits.length; i++) {
              if (i === 2 || i === 8 || i === 14) masked += '-';
              masked += digits[i];
            }
            setNovoTradeIn({ ...novoTradeIn, imei: masked });
            setShowBarcodeScanner(false);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Modal Garantia Extendida */}
      <Dialog open={showGarantiaExtendidaModal} onOpenChange={setShowGarantiaExtendidaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incluir Garantia Extendida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {planosExtendidaDisponiveis.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum plano disponível para este produto.
              </p>
            ) : (
              planosExtendidaDisponiveis.map(plano => (
                <div 
                  key={plano.id} 
                  className="p-4 border rounded-lg hover:bg-muted cursor-pointer flex justify-between items-center"
                  onClick={() => handleAddGarantiaExtendida(plano)}
                >
                  <div>
                    <p className="font-medium">Plano {plano.nome}</p>
                    <p className="text-sm text-muted-foreground">{plano.meses} meses de cobertura adicional</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(plano.valor)}</span>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGarantiaExtendidaModal(false)}>Cancelar</Button>
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalheProduto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação de Alterações */}
      <Dialog open={showConfirmacaoModal} onOpenChange={setShowConfirmacaoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Confirmar Alterações
            </DialogTitle>
            <DialogDescription>
              Revise as alterações antes de salvar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {alteracoesDetectadas.map((alteracao, index) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{alteracao.campo}</p>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="text-red-600 line-through">
                    {typeof alteracao.valorAnterior === 'object' 
                      ? JSON.stringify(alteracao.valorAnterior) 
                      : alteracao.valorAnterior || '(vazio)'}
                  </span>
                  <span>→</span>
                  <span className="text-green-600 font-medium">
                    {typeof alteracao.valorNovo === 'object' 
                      ? JSON.stringify(alteracao.valorNovo) 
                      : alteracao.valorNovo || '(vazio)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacaoModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarSalvar}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Anexos Trade-In */}
      <Dialog open={previewAnexo.aberto} onOpenChange={(open) => 
        setPreviewAnexo({ ...previewAnexo, aberto: open })}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {previewAnexo.tipo === 'termo' 
                ? 'Termo de Responsabilidade' 
                : `Fotos do Aparelho (${previewAnexo.trade?.fotosAparelho?.length || 0})`}
            </DialogTitle>
          </DialogHeader>
          
          {previewAnexo.tipo === 'termo' && previewAnexo.trade?.termoResponsabilidade && (
            <div className="space-y-4">
              {previewAnexo.trade.termoResponsabilidade.tipo.includes('image') ? (
                <img 
                  src={previewAnexo.trade.termoResponsabilidade.dataUrl} 
                  alt="Termo de Responsabilidade"
                  className="max-h-[60vh] object-contain mx-auto rounded" 
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="mt-2 font-medium">{previewAnexo.trade.termoResponsabilidade.nome}</p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewAnexo.trade?.termoResponsabilidade?.dataUrl || '';
                      link.download = previewAnexo.trade?.termoResponsabilidade?.nome || 'termo.pdf';
                      link.click();
                    }}
                  >
                    Baixar Documento
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {previewAnexo.tipo === 'fotos' && previewAnexo.trade?.fotosAparelho && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previewAnexo.trade.fotosAparelho.map((foto) => (
                <img 
                  key={foto.id} 
                  src={foto.dataUrl} 
                  alt={foto.nome}
                  className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(foto.dataUrl, '_blank')} 
                />
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewAnexo({ aberto: false, tipo: 'termo', trade: null })}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
