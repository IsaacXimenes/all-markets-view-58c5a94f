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
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, Search, Plus, X, Eye, Trash2, 
  User, Package, Truck, FileText, AlertTriangle, Check, Save,
  Headphones, ArrowLeftRight, Star, ArrowLeft, History
} from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';

import { 
  getLojas, getClientes, getColaboradores, getCargos, getOrigensVenda, 
  getContasFinanceiras, getMotoboys, getLojaById, Loja, Cliente, Colaborador, Cargo, OrigemVenda, ContaFinanceira,
  addCliente
} from '@/utils/cadastrosApi';
import { getProdutos, Produto, bloquearProdutosEmVenda, desbloquearProdutosDeVenda } from '@/utils/estoqueApi';
import { getVendaById, updateVenda, registrarEdicaoVenda, ItemVenda, ItemTradeIn, Pagamento, Venda } from '@/utils/vendasApi';
import { getVendaComFluxo, registrarEdicaoFluxo, VendaComFluxo } from '@/utils/fluxoVendasApi';
import { getAcessorios, Acessorio, VendaAcessorio } from '@/utils/acessoriosApi';
import { getProdutosCadastro, ProdutoCadastro } from '@/utils/cadastrosApi';
import { getPlanosPorModelo, PlanoGarantia } from '@/utils/planosGarantiaApi';
import { formatarMoeda } from '@/utils/formatUtils';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';

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
  
  // Dados de cadastros
  const [lojas] = useState<Loja[]>(getLojas());
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [colaboradores] = useState<Colaborador[]>(getColaboradores());
  const [cargos] = useState<Cargo[]>(getCargos());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [produtosEstoque] = useState<Produto[]>(getProdutos());
  const [produtosCadastro] = useState<ProdutoCadastro[]>(getProdutosCadastro());
  const [acessoriosEstoque, setAcessoriosEstoque] = useState<Acessorio[]>(getAcessorios());
  const [motoboys] = useState(getMotoboys());
  
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
  const [motoboyId, setMotoboyId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // Itens da venda
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [showProdutoModal, setShowProdutoModal] = useState(false);
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

  // Vendedores com permissão de vendas
  const vendedoresDisponiveis = useMemo(() => {
    const cargosVendas = cargos.filter(c => c.permissoes.includes('Vendas')).map(c => c.id);
    return colaboradores.filter(col => cargosVendas.includes(col.cargo));
  }, [colaboradores, cargos]);

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
    setObservacoes(venda.observacoes || '');
    setItens(venda.itens || []);
    setTradeIns(venda.tradeIns || []);
    setPagamentos(venda.pagamentos || []);
    
    // Carregar acessórios se existirem
    if ((venda as any).acessoriosVenda) {
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
  const isPrejuizo = lucroProjetado < 0;
  
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

  // Produtos filtrados
  const produtosFiltrados = useMemo(() => {
    // IDs dos produtos já na venda
    const produtosNaVenda = itens.map(i => i.produtoId);
    
    return produtosEstoque.filter(p => {
      if (p.quantidade <= 0) return false;
      if (produtosNaVenda.includes(p.id)) return false;
      if (filtroLojaProduto && p.loja !== filtroLojaProduto) return false;
      if (buscaProduto && !p.imei.includes(buscaProduto)) return false;
      if (buscaModeloProduto && !p.modelo.toLowerCase().includes(buscaModeloProduto.toLowerCase())) return false;
      return true;
    });
  }, [produtosEstoque, filtroLojaProduto, buscaProduto, buscaModeloProduto, itens]);

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
  const canSubmit = useMemo(() => {
    const motoboyValido = tipoRetirada !== 'Entrega' || !!motoboyId;
    
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      localRetirada &&
      (itens.length > 0 || acessoriosVenda.length > 0) &&
      valorPendente <= 0.01 && // Tolerância de centavo
      !tradeInNaoValidado &&
      motoboyValido
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, localRetirada, itens.length, acessoriosVenda.length, valorPendente, tradeInNaoValidado, tipoRetirada, motoboyId]);

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
    
    // Registrar edição na timeline
    registrarEdicaoVenda(id, usuarioLogado.id, usuarioLogado.nome, alteracoesDetectadas);
    
    if (vendaFluxo) {
      registrarEdicaoFluxo(id, usuarioLogado.id, usuarioLogado.nome, alteracoesDetectadas);
    }
    
    // Atualizar bloqueio de produtos
    const produtosOriginais = (vendaOriginal.itens || []).map(i => i.produtoId);
    const produtosAtuais = itens.map(i => i.produtoId);
    
    // Desbloquear produtos removidos
    desbloquearProdutosDeVenda(id);
    
    // Bloquear novos produtos
    bloquearProdutosEmVenda(id, produtosAtuais);
    
    // Determinar novo status
    let novoStatus = vendaOriginal.statusAtual;
    if (isSinalVenda && valorPendente <= 0.01) {
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
      pagamentos,
      subtotal,
      totalTradeIn,
      total,
      lucro: lucroProjetado,
      margem: margemProjetada,
      observacoes,
      statusAtual: novoStatus as any,
      valorSinal: isSinalVenda ? valorSinalOriginal : undefined,
      valorPendenteSinal: isSinalVenda ? valorPendenteSinal : undefined
    });
    
    toast({
      title: "Venda atualizada!",
      description: `${alteracoesDetectadas.length} alteração(ões) salva(s) com sucesso.`
    });
    
    setShowConfirmacaoModal(false);
    navigate(-1);
  };

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || id;
  };

  const getLojaNome = (id: string) => {
    const loja = lojas.find(l => l.id === id);
    return loja?.nome || id;
  };

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    className="flex-1"
                    readOnly
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Alterar
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                      <TableCell className="font-mono text-sm">{item.imei}</TableCell>
                      <TableCell>{item.loja}</TableCell>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Base de Troca
              </span>
              <Button variant="outline" onClick={() => setShowTradeInModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Troca
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
                    <TableHead>Validado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeIns.map(tradeIn => (
                    <TableRow key={tradeIn.id}>
                      <TableCell className="font-medium">{tradeIn.modelo}</TableCell>
                      <TableCell>{tradeIn.condicao}</TableCell>
                      <TableCell className="font-mono text-sm">{tradeIn.imei || '-'}</TableCell>
                      <TableCell>
                        {tradeIn.imeiValidado ? (
                          <Badge variant="default" className="bg-green-600">Sim</Badge>
                        ) : (
                          <Badge variant="destructive">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        -{formatCurrency(tradeIn.valorCompraUsado)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveTradeIn(tradeIn.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalTradeIn > 0 && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-950/30 rounded-lg flex justify-between items-center">
                <span className="font-medium">Total Base de Troca:</span>
                <span className="font-bold text-green-600">-{formatCurrency(totalTradeIn)}</span>
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
              <div className="p-4 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-100">Plano {garantiaExtendida.planoNome}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {garantiaExtendida.meses} meses - Vigência: {format(new Date(garantiaExtendida.dataInicio), 'dd/MM/yyyy')} a {format(new Date(garantiaExtendida.dataFim), 'dd/MM/yyyy')}
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
                Nenhuma garantia extendida adicionada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <PagamentoQuadro
          valorTotalProdutos={total}
          custoTotalProdutos={valorCustoTotal}
          lojaVendaId={lojaVenda}
          onPagamentosChange={setPagamentos}
          pagamentosIniciais={pagamentos}
        />

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
                <>
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
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nome do Motoboy *</label>
                    <Select value={motoboyId} onValueChange={setMotoboyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motoboy" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoboys.map(motoboy => {
                          const loja = getLojaById(motoboy.loja);
                          return (
                            <SelectItem key={motoboy.id} value={motoboy.id}>
                              {motoboy.nome} - {loja?.nome || motoboy.loja}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
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
                  <p className="text-sm text-muted-foreground">Garantia Extendida</p>
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
                <p className="text-sm text-muted-foreground">{isPrejuizo ? 'Prejuízo' : 'Lucro'}</p>
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
            
            {/* Valor Pendente */}
            {valorPendente > 0.01 && (
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Input 
                placeholder="Buscar por IMEI..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
              />
              <Input 
                placeholder="Buscar por modelo..."
                value={buscaModeloProduto}
                onChange={(e) => setBuscaModeloProduto(e.target.value)}
              />
              <Select value={filtroLojaProduto} onValueChange={setFiltroLojaProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Sugerido</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.slice(0, 20).map(produto => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.modelo}</TableCell>
                    <TableCell className="font-mono text-sm">{produto.imei}</TableCell>
                    <TableCell>{produto.cor}</TableCell>
                    <TableCell>{produto.loja}</TableCell>
                    <TableCell className="text-right">{formatCurrency(produto.valorCusto)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(produto.valorVendaSugerido)}</TableCell>
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
                          <Plus className="h-4 w-4" />
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
              <label className="text-sm font-medium">Descrição</label>
              <Textarea 
                value={novoTradeIn.descricao || ''}
                onChange={(e) => setNovoTradeIn({ ...novoTradeIn, descricao: e.target.value })}
                placeholder="Estado do aparelho..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">IMEI</label>
              <Input 
                value={novoTradeIn.imei || ''}
                onChange={(e) => {
                  const formatted = e.target.value.replace(/\D/g, '').slice(0, 15);
                  setNovoTradeIn({ ...novoTradeIn, imei: formatted });
                }}
                placeholder="IMEI do aparelho"
                maxLength={15}
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
                  <span className="text-lg font-bold text-purple-600">{formatCurrency(plano.valor)}</span>
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
    </VendasLayout>
  );
}
