import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getNextOSNumber, 
  addOrdemServico, 
  updateOrdemServico,
  getHistoricoOSCliente, 
  verificarIMEIEmOSAtiva,
  formatCurrency,
  PecaServico,
  Pagamento,
  TimelineOS
} from '@/utils/assistenciaApi';
import { addSolicitacao } from '@/utils/solicitacaoPecasApi';
import { 
  getClientes, 
  getFornecedores,
  addCliente,
  Cliente,
  calcularTipoPessoa,
  getProdutosCadastro,
  ProdutoCadastro
} from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { getVendaById } from '@/utils/vendasApi';
import { getGarantiaById } from '@/utils/garantiasApi';
import { getRegistrosAnaliseGarantia } from '@/utils/garantiasApi';
import { getProdutoPendenteById } from '@/utils/osApi';
import { getPecas, Peca, darBaixaPeca, initializePecasWithLojaIds } from '@/utils/pecasApi';
import { Plus, Trash2, Search, AlertTriangle, Clock, User, History, ArrowLeft, Smartphone, Save, Package, Info, Camera } from 'lucide-react';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { Pagamento as PagamentoVenda } from '@/utils/vendasApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatIMEI, applyIMEIMask } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { useDraftVenda } from '@/hooks/useDraftVenda';
import { format } from 'date-fns';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';

const TIMER_DURATION = 1800; // 30 minutos em segundos
const DRAFT_KEY = 'draft_os_assistencia';

interface PecaForm {
  peca: string;
  pecaEstoqueId: string;
  valor: string;
  percentual: string;
  servicoTerceirizado: boolean;
  descricaoTerceirizado: string;
  fornecedorId: string;
  unidadeServico: string;
  pecaNoEstoque: boolean;
  pecaDeFornecedor: boolean;
  nomeRespFornecedor: string;
}

interface SolicitacaoPecaForm {
  peca: string;
  quantidade: number;
  justificativa: string;
  modeloCompativel: string;
  prioridade: 'Baixa' | 'Normal' | 'Alta' | 'Urgente';
}

interface PagamentoForm {
  meio: string;
  valor: string;
  parcelas: string;
}

export default function OSAssistenciaNova() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Parâmetros de origem
  const vendaIdParam = searchParams.get('vendaId');
  const garantiaIdParam = searchParams.get('garantiaId');
  const produtoIdParam = searchParams.get('produtoId');
  const itemIndexParam = searchParams.get('itemIndex');
  const analiseIdParam = searchParams.get('analiseId');
  const origemAnaliseParam = searchParams.get('origemAnalise');
  
  const [osInfo] = useState(getNextOSNumber());
  const [dataHora] = useState(new Date().toISOString());
  
  const clientes = getClientes();
  const { obterLojasTipoLoja, obterNomeLoja, obterTecnicos, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const tecnicos = obterTecnicos();
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');
  const produtosCadastro = getProdutosCadastro();

  // Pré-preenchimento e campos bloqueados
  const [camposBloqueados, setCamposBloqueados] = useState<string[]>([]);
  const [origemOS, setOrigemOS] = useState<'venda' | 'garantia' | 'estoque' | null>(null);
  const [dadosOrigem, setDadosOrigem] = useState<any>(null);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [itensVenda, setItensVenda] = useState<any[]>([]);

  // Aparelho state
  const [origemAparelho, setOrigemAparelho] = useState<'Thiago Imports' | 'Externo' | ''>('');
  const [modeloAparelho, setModeloAparelho] = useState('');
  const [imeiAparelho, setImeiAparelho] = useState('');
  const [idVendaAntiga, setIdVendaAntiga] = useState('');

  // Form state
  const [lojaId, setLojaId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [vendedorId, setVendedorId] = useState(''); // NOVO: campo vendedor
  const [setor, setSetor] = useState<'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA' | ''>('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'Serviço concluído' | 'Em serviço' | 'Aguardando Peça'>('Em serviço');

  // Peças
  const [pecas, setPecas] = useState<PecaForm[]>([
    { peca: '', pecaEstoqueId: '', valor: '', percentual: '', servicoTerceirizado: false, descricaoTerceirizado: '', fornecedorId: '', unidadeServico: '', pecaNoEstoque: false, pecaDeFornecedor: false, nomeRespFornecedor: '' }
  ]);

  // Peças do estoque (carregadas dinamicamente)
  // Inicializar peças com IDs válidos de loja
  useEffect(() => {
    const lojaIds = lojas.map(l => l.id);
    if (lojaIds.length > 0) {
      initializePecasWithLojaIds(lojaIds);
    }
  }, [lojas]);

  const pecasEstoque = useMemo(() => getPecas().filter(p => p.status === 'Disponível'), [lojas]);

  // Pagamentos (usando PagamentoQuadro)
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>([
    { meio: '', valor: '', parcelas: '' }
  ]);
  const [pagamentosQuadro, setPagamentosQuadro] = useState<PagamentoVenda[]>([]);

  // Solicitações de Peças
  const [solicitacoesPecas, setSolicitacoesPecas] = useState<SolicitacaoPecaForm[]>([]);
  const [novaSolicitacao, setNovaSolicitacao] = useState<SolicitacaoPecaForm>({
    peca: '',
    quantidade: 1,
    justificativa: '',
    modeloCompativel: '',
    prioridade: 'Normal'
  });

  // Dialogs
  const [buscarClienteOpen, setBuscarClienteOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [buscarClienteTermo, setBuscarClienteTermo] = useState('');
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Timer
  const [timer, setTimer] = useState<number | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);

  // Draft (rascunho automático)
  const { saveDraft, loadDraft, clearDraft, hasDraft, getDraftAge, formatDraftAge } = useDraftVenda(DRAFT_KEY);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const isLoadingDraft = useRef(false);
  const lastSaveTime = useRef<number>(0);

  // Novo cliente form
  const [novoClienteForm, setNovoClienteForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    tipoPessoa: 'Física' as 'Física' | 'Jurídica',
    tipoCliente: 'Normal' as 'VIP' | 'Normal' | 'Novo'
  });

  // Confirmação form
  const [confirmTecnico, setConfirmTecnico] = useState('');
  const [confirmLoja, setConfirmLoja] = useState('');
  const [confirmData, setConfirmData] = useState(new Date().toISOString().split('T')[0]);

  // Cliente selecionado
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  // Clientes filtrados para busca
  const clientesFiltrados = clientes.filter(c => {
    if (!buscarClienteTermo) return true;
    const termo = buscarClienteTermo.toLowerCase();
    return c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo);
  });

  // Verificar se existe rascunho ao montar (apenas se não houver origem)
  useEffect(() => {
    if (!vendaIdParam && !garantiaIdParam && !produtoIdParam && !analiseIdParam && hasDraft()) {
      setDraftAge(getDraftAge());
      setShowDraftModal(true);
    }
  }, []);

  // Pré-preencher dados da origem
  useEffect(() => {
    if (vendaIdParam) {
      const venda = getVendaById(vendaIdParam);
      if (venda) {
        setOrigemOS('venda');
        setDadosOrigem(venda);
        
        if (venda.itens.length > 1 && !itemIndexParam) {
          // Múltiplos itens - mostrar modal de seleção
          setItensVenda(venda.itens);
          setShowItemSelectionModal(true);
        } else {
          // Item único ou já selecionado
          const item = venda.itens[parseInt(itemIndexParam || '0')];
          preencherDadosVenda(venda, item);
        }
      }
    } else if (garantiaIdParam) {
      const garantia = getGarantiaById(garantiaIdParam);
      if (garantia) {
        setOrigemOS('garantia');
        setDadosOrigem(garantia);
        preencherDadosGarantia(garantia);
      }
    } else if (produtoIdParam) {
      const produto = getProdutoPendenteById(produtoIdParam);
      if (produto) {
        setOrigemOS('estoque');
        setDadosOrigem(produto);
        preencherDadosProduto(produto);
      }
    }
  }, [vendaIdParam, garantiaIdParam, produtoIdParam, itemIndexParam]);

  // Pré-preencher dados da Análise de Tratativas
  useEffect(() => {
    if (analiseIdParam && origemAnaliseParam) {
      const registros = getRegistrosAnaliseGarantia();
      const registro = registros.find(r => r.id === analiseIdParam);
      if (registro) {
        setOrigemOS(registro.origem === 'Garantia' ? 'garantia' : 'estoque');
        setDescricao(`Origem: ${registro.origem} - ${registro.clienteDescricao}`);
        
        if (registro.origem === 'Garantia' && registro.origemId) {
          const garantia = getGarantiaById(registro.origemId);
          if (garantia) {
            setDadosOrigem(garantia);
            const cliente = clientes.find(c => c.nome === garantia.clienteNome || c.id === garantia.clienteId);
            if (cliente) setClienteId(cliente.id);
            setModeloAparelho(garantia.modelo || '');
            setImeiAparelho(garantia.imei || '');
            setOrigemAparelho('Thiago Imports');
            const loja = lojas.find(l => l.nome === garantia.lojaVenda || l.id === garantia.lojaVenda);
            if (loja) setLojaId(loja.id);
            setSetor('GARANTIA');
            setCamposBloqueados(['clienteId', 'modeloAparelho', 'imeiAparelho', 'lojaId', 'origemAparelho']);
          }
        }
        
        if (registro.tecnicoId) setTecnicoId(registro.tecnicoId);
        
        toast({ title: 'Dados pré-preenchidos', description: `Origem: Análise de Tratativas (${registro.id})` });
      }
    }
  }, [analiseIdParam, origemAnaliseParam]);

  // Funções de pré-preenchimento
  const preencherDadosVenda = (venda: any, item: any) => {
    // Buscar cliente pelo nome
    const cliente = clientes.find(c => c.nome === venda.clienteNome);
    if (cliente) setClienteId(cliente.id);
    
    setModeloAparelho(item?.produto || '');
    setImeiAparelho(item?.imei || '');
    setOrigemAparelho('Thiago Imports');
    
    // Buscar loja pelo nome
    const loja = lojas.find(l => l.nome === venda.lojaVenda || l.id === venda.lojaVenda);
    if (loja) setLojaId(loja.id);
    
    setSetor('GARANTIA');
    setCamposBloqueados(['clienteId', 'modeloAparelho', 'imeiAparelho', 'lojaId', 'origemAparelho']);
    
    toast({ title: 'Dados pré-preenchidos', description: `Origem: Venda ${venda.id}` });
  };

  const preencherDadosGarantia = (garantia: any) => {
    // Buscar cliente pelo nome
    const cliente = clientes.find(c => c.nome === garantia.clienteNome);
    if (cliente) setClienteId(cliente.id);
    
    setModeloAparelho(garantia.modelo || '');
    setImeiAparelho(garantia.imei || '');
    setOrigemAparelho('Thiago Imports');
    
    // Buscar loja
    const loja = lojas.find(l => l.nome === garantia.lojaVenda || l.id === garantia.lojaVenda);
    if (loja) setLojaId(loja.id);
    
    setSetor('GARANTIA');
    setCamposBloqueados(['clienteId', 'modeloAparelho', 'imeiAparelho', 'lojaId', 'origemAparelho']);
    
    toast({ title: 'Dados pré-preenchidos', description: `Origem: Garantia ${garantia.id}` });
  };

  const preencherDadosProduto = (produto: any) => {
    setModeloAparelho(produto.modelo || '');
    setImeiAparelho(produto.imei || '');
    setOrigemAparelho('Thiago Imports');
    
    // Buscar loja pelo nome
    const loja = lojas.find(l => l.nome === produto.loja || l.id === produto.loja);
    if (loja) setLojaId(loja.id);
    
    setSetor(produto.origemEntrada === 'Base de Troca' ? 'TROCA' : 'ASSISTÊNCIA');
    setCamposBloqueados(['modeloAparelho', 'imeiAparelho', 'lojaId', 'origemAparelho']);
    
    toast({ title: 'Dados pré-preenchidos', description: `Origem: Estoque ${produto.id}` });
  };

  const handleSelecionarItem = (index: number) => {
    if (dadosOrigem) {
      const item = dadosOrigem.itens[index];
      preencherDadosVenda(dadosOrigem, item);
      setShowItemSelectionModal(false);
    }
  };

  // Carregar rascunho
  const handleLoadDraft = () => {
    isLoadingDraft.current = true;
    const draft = loadDraft();
    if (draft) {
      setOrigemAparelho(draft.origemAparelho || '');
      setModeloAparelho(draft.modeloAparelho || '');
      setImeiAparelho(draft.imeiAparelho || '');
      setLojaId(draft.lojaId || '');
      setTecnicoId(draft.tecnicoId || '');
      setVendedorId(draft.vendedorId || '');
      setSetor(draft.setor || '');
      setClienteId(draft.clienteId || '');
      setDescricao(draft.descricao || '');
      setStatus(draft.status || 'Em serviço');
      setPecas(draft.pecas || [{ peca: '', pecaEstoqueId: '', valor: '', percentual: '', servicoTerceirizado: false, descricaoTerceirizado: '', fornecedorId: '', unidadeServico: '', pecaNoEstoque: false, pecaDeFornecedor: false, nomeRespFornecedor: '' }]);
      setPagamentos(draft.pagamentos || [{ meio: '', valor: '', parcelas: '' }]);
      toast({ title: "Rascunho carregado", description: "Dados da OS anterior foram restaurados" });
    }
    setShowDraftModal(false);
    setTimeout(() => { isLoadingDraft.current = false; }, 500);
  };

  // Descartar rascunho
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftModal(false);
    toast({ title: "Rascunho descartado", description: "Iniciando nova OS" });
  };

  // Auto-save com debounce
  useEffect(() => {
    if (isLoadingDraft.current) return;
    
    const now = Date.now();
    if (now - lastSaveTime.current < 2000) return;
    
    const hasData = lojaId || tecnicoId || clienteId || origemAparelho || modeloAparelho || imeiAparelho || pecas.some(p => p.peca || p.valor) || pagamentos.some(p => p.meio || p.valor);
    if (!hasData) return;

    const timeout = setTimeout(() => {
      saveDraft({
        origemAparelho,
        modeloAparelho,
        imeiAparelho,
        lojaId,
        tecnicoId,
        vendedorId,
        setor,
        clienteId,
        descricao,
        status,
        pecas,
        pagamentos
      });
      lastSaveTime.current = Date.now();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [origemAparelho, modeloAparelho, imeiAparelho, lojaId, tecnicoId, vendedorId, setor, clienteId, descricao, status, pecas, pagamentos]);

  // Timer effect
  useEffect(() => {
    if (timerStart && (origemAparelho || modeloAparelho)) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining <= 0) {
          setTimer(null);
          setTimerStart(null);
          toast({
            title: "Tempo esgotado",
            description: "O tempo de reserva expirou",
            variant: "destructive"
          });
        } else {
          setTimer(remaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerStart, origemAparelho, modeloAparelho]);

  // Formatar timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Carregar histórico do cliente quando selecionado
  useEffect(() => {
    if (clienteId) {
      const historico = getHistoricoOSCliente(clienteId);
      setHistoricoCliente(historico);
    }
  }, [clienteId]);

  // Calcular totais
  const calcularValorTotalPeca = (peca: PecaForm) => {
    const valor = parseFloat(peca.valor.replace(/\D/g, '')) / 100 || 0;
    const percentual = parseFloat(peca.percentual) || 0;
    return valor - (valor * percentual / 100);
  };

  const valorTotalPecas = pecas.reduce((acc, p) => acc + calcularValorTotalPeca(p), 0);
  const valorTotalPagamentos = pagamentos.reduce((acc, p) => {
    const valor = parseFloat(p.valor.replace(/\D/g, '')) / 100 || 0;
    return acc + valor;
  }, 0);

  // Format currency input
  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handlers
  const handlePecaChange = (index: number, field: keyof PecaForm, value: any) => {
    const newPecas = [...pecas];
    newPecas[index] = { ...newPecas[index], [field]: value };
    setPecas(newPecas);
  };

  const addPeca = () => {
    setPecas([...pecas, { peca: '', pecaEstoqueId: '', valor: '', percentual: '', servicoTerceirizado: false, descricaoTerceirizado: '', fornecedorId: '', unidadeServico: '', pecaNoEstoque: false, pecaDeFornecedor: false, nomeRespFornecedor: '' }]);
  };

  const removePeca = (index: number) => {
    if (pecas.length > 1) {
      setPecas(pecas.filter((_, i) => i !== index));
    }
  };

  const handlePagamentoChange = (index: number, field: keyof PagamentoForm, value: string) => {
    const newPagamentos = [...pagamentos];
    newPagamentos[index] = { ...newPagamentos[index], [field]: value };
    setPagamentos(newPagamentos);
  };

  const addPagamento = () => {
    setPagamentos([...pagamentos, { meio: '', valor: '', parcelas: '' }]);
  };

  const removePagamento = (index: number) => {
    if (pagamentos.length > 1) {
      setPagamentos(pagamentos.filter((_, i) => i !== index));
    }
  };

  // Solicitações de peças handlers
  const handleAddSolicitacao = () => {
    if (!novaSolicitacao.peca || !novaSolicitacao.justificativa) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a peça e a justificativa',
        variant: 'destructive'
      });
      return;
    }
    setSolicitacoesPecas([...solicitacoesPecas, { ...novaSolicitacao }]);
    setNovaSolicitacao({
      peca: '',
      quantidade: 1,
      justificativa: '',
      modeloCompativel: modeloAparelho,
      prioridade: 'Normal'
    });
    toast({
      title: 'Solicitação adicionada',
      description: `Peça "${novaSolicitacao.peca}" adicionada à lista`
    });
  };

  const handleRemoveSolicitacao = (index: number) => {
    setSolicitacoesPecas(solicitacoesPecas.filter((_, i) => i !== index));
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast({
        title: 'Cliente Bloqueado',
        description: 'Este cliente está inativo e não pode ser selecionado.',
        variant: 'destructive'
      });
      return;
    }
    setClienteId(cliente.id);
    setBuscarClienteOpen(false);
  };

  const handleSalvarNovoCliente = () => {
    if (!novoClienteForm.nome || !novoClienteForm.cpf) {
      toast({
        title: 'Erro',
        description: 'Nome e CPF são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    const novoCliente = addCliente({
      ...novoClienteForm,
      status: 'Ativo',
      origemCliente: 'Assistência',
      idsCompras: []
    });

    setClienteId(novoCliente.id);
    setNovoClienteOpen(false);
    setBuscarClienteOpen(false);
    toast({
      title: 'Sucesso',
      description: 'Cliente cadastrado com sucesso!'
    });
  };

  const validarIMEIs = () => {
    // Validação de IMEI do aparelho
    if (imeiAparelho) {
      const osAtiva = verificarIMEIEmOSAtiva(imeiAparelho);
      if (osAtiva) {
        toast({
          title: 'IMEI em OS Aberta',
          description: `O IMEI ${imeiAparelho} já está em uma OS aberta (${osAtiva.id}). Não é permitido registrar.`,
          variant: 'destructive'
        });
        return false;
      }
    }
    return true;
  };

  const validarFormulario = () => {
    if (!lojaId) {
      toast({ title: 'Erro', description: 'Selecione uma loja', variant: 'destructive' });
      return false;
    }
    if (!tecnicoId) {
      toast({ title: 'Erro', description: 'Selecione um técnico', variant: 'destructive' });
      return false;
    }
    if (!clienteId) {
      toast({ title: 'Erro', description: 'Selecione um cliente', variant: 'destructive' });
      return false;
    }
    if (!status) {
      toast({ title: 'Erro', description: 'Selecione um status', variant: 'destructive' });
      return false;
    }

    // Verificar se há alguma peça aguardando -> forçar status
    const temPecaAguardando = pecas.some(p => !p.pecaNoEstoque && p.pecaDeFornecedor);
    if (temPecaAguardando && status === 'Serviço concluído') {
      toast({ 
        title: 'Status Inválido', 
        description: 'Há peças aguardando do fornecedor. O status não pode ser "Serviço concluído".', 
        variant: 'destructive' 
      });
      return false;
    }

    return validarIMEIs();
  };

  const handleAbrirConfirmacao = () => {
    if (!validarFormulario()) return;
    setConfirmTecnico(tecnicoId);
    setConfirmLoja(lojaId);
    setConfirmarOpen(true);
  };

  const handleRegistrarOS = () => {
    const tecnicoObj = tecnicos.find(t => t.id === confirmTecnico);
    const lojaObj = lojas.find(l => l.id === confirmLoja);

    if (confirmTecnico !== tecnicoId || confirmLoja !== lojaId) {
      toast({
        title: 'Confirmação Inválida',
        description: 'Os dados de confirmação não conferem.',
        variant: 'destructive'
      });
      return;
    }

    const pecasFormatadas: PecaServico[] = pecas.map((p, i) => ({
      id: `PC-${Date.now()}-${i}`,
      peca: p.peca,
      pecaEstoqueId: p.pecaEstoqueId || undefined,
      valor: parseFloat(p.valor.replace(/\D/g, '')) / 100 || 0,
      percentual: parseFloat(p.percentual) || 0,
      valorTotal: calcularValorTotalPeca(p),
      servicoTerceirizado: p.servicoTerceirizado,
      descricaoTerceirizado: p.descricaoTerceirizado || undefined,
      fornecedorId: p.fornecedorId || undefined,
      unidadeServico: p.unidadeServico,
      pecaNoEstoque: p.pecaNoEstoque,
      pecaDeFornecedor: p.pecaDeFornecedor
    }));

    // Usar pagamentos do PagamentoQuadro
    const pagamentosFormatados: Pagamento[] = pagamentosQuadro.map((p, i) => ({
      id: p.id || `PAG-${Date.now()}-${i}`,
      meio: p.meioPagamento || '',
      valor: p.valor || 0,
      parcelas: p.parcelas
    }));

    const timeline: TimelineOS[] = [
      {
        data: dataHora,
        tipo: 'registro',
        descricao: 'OS registrada',
        responsavel: tecnicoObj?.nome || ''
      }
    ];

    // Mapear origem da OS
    const origemOSFormatada = origemOS === 'venda' ? 'Venda' as const
      : origemOS === 'garantia' ? 'Garantia' as const
      : origemOS === 'estoque' ? 'Estoque' as const
      : 'Avulso' as const;

    const novaOS = addOrdemServico({
      dataHora,
      clienteId,
      setor: (setor || 'ASSISTÊNCIA') as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      tecnicoId,
      lojaId,
      status,
      pecas: pecasFormatadas,
      pagamentos: pagamentosFormatados,
      descricao,
      timeline,
      valorTotal: valorTotalPecas,
      custoTotal: 0,
      origemOS: origemOSFormatada,
      vendaId: vendaIdParam || undefined,
      garantiaId: garantiaIdParam || undefined,
      produtoId: produtoIdParam || undefined,
      modeloAparelho: modeloAparelho || undefined,
      imeiAparelho: imeiAparelho || undefined,
      valorProdutoOrigem: dadosOrigem?.valorProduto || dadosOrigem?.valor || undefined,
      idVendaAntiga: idVendaAntiga || undefined
    });

    // Dar baixa automática nas peças do estoque
    const pecasComBaixa = pecas.filter(p => p.pecaNoEstoque && p.pecaEstoqueId);
    const resultadosBaixa: string[] = [];
    
    for (const peca of pecasComBaixa) {
      const resultado = darBaixaPeca(peca.pecaEstoqueId, 1);
      if (resultado.sucesso) {
        resultadosBaixa.push(resultado.mensagem);
        // Adicionar registro na timeline
        timeline.push({
          data: new Date().toISOString(),
          tipo: 'baixa_estoque',
          descricao: `Baixa de peça: ${peca.peca}`,
          responsavel: tecnicoObj?.nome || ''
        });
      } else {
        toast({
          title: 'Aviso - Baixa de Peça',
          description: resultado.mensagem,
          variant: 'destructive'
        });
      }
    }

    // Persistir timeline de baixa de estoque na OS recém-criada
    if (pecasComBaixa.length > 0 && timeline.length > 1) {
      updateOrdemServico(novaOS.id, { timeline: [...timeline] });
    }

    // Persistir solicitações de peças na API
    if (solicitacoesPecas.length > 0) {
      solicitacoesPecas.forEach(sol => {
        addSolicitacao({
          osId: novaOS.id,
          peca: sol.peca,
          quantidade: sol.quantidade,
          justificativa: sol.justificativa,
          modeloImei: imeiAparelho || modeloAparelho,
          lojaSolicitante: lojaId
        });
      });

      // Atualizar status da OS para "Solicitação Enviada"
      const timelineAtual = novaOS.timeline || timeline;
      updateOrdemServico(novaOS.id, {
        status: 'Solicitação Enviada',
        timeline: [...timelineAtual, {
          data: new Date().toISOString(),
          tipo: 'peca',
          descricao: `${solicitacoesPecas.length} solicitação(ões) de peça(s) enviada(s) para a matriz`,
          responsavel: tecnicoObj?.nome || ''
        }]
      });
    }

    // Limpar rascunho
    clearDraft();

    // Mostrar toast de sucesso
    if (resultadosBaixa.length > 0) {
      toast({
        title: 'Sucesso!',
        description: `OS ${novaOS.id} registrada. ${resultadosBaixa.length} peça(s) baixada(s) do estoque.`
      });
    } else {
      toast({
        title: 'Sucesso!',
        description: `OS ${novaOS.id} registrada com sucesso!`
      });
    }

    setConfirmarOpen(false);
    navigate('/os/assistencia');
  };

  // Format CPF/CNPJ
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

  return (
    <PageLayout title="Nova Assistência">
      {/* Timer */}
      {timer !== null && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          timer <= 30 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'
        }`}>
          <Clock className="h-5 w-5" />
          <span className="text-2xl font-mono font-bold">{formatTimer(timer)}</span>
        </div>
      )}

      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Card de Contexto da Origem */}
      {origemOS && dadosOrigem && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-primary" />
              Origem: {origemOS === 'venda' ? 'Venda' : origemOS === 'garantia' ? 'Garantia' : 'Estoque'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {origemOS === 'venda' && (
                <>
                  <div><span className="text-muted-foreground">ID Venda:</span> <strong>{dadosOrigem.id}</strong></div>
                  <div><span className="text-muted-foreground">Cliente:</span> <strong>{dadosOrigem.clienteNome}</strong></div>
                  <div><span className="text-muted-foreground">Data:</span> <strong>{format(new Date(dadosOrigem.dataHora), 'dd/MM/yyyy')}</strong></div>
                </>
              )}
              {origemOS === 'garantia' && (
                <>
                  <div><span className="text-muted-foreground">ID Garantia:</span> <strong>{dadosOrigem.id}</strong></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <strong>{dadosOrigem.tipoGarantia}</strong></div>
                  <div><span className="text-muted-foreground">Válida até:</span> <strong>{format(new Date(dadosOrigem.dataFimGarantia), 'dd/MM/yyyy')}</strong></div>
                </>
              )}
              {origemOS === 'estoque' && (
                <>
                  <div><span className="text-muted-foreground">ID Produto:</span> <strong>{dadosOrigem.id}</strong></div>
                  <div><span className="text-muted-foreground">Origem:</span> <strong>{dadosOrigem.origemEntrada}</strong></div>
                  <div><span className="text-muted-foreground">Valor Origem:</span> <strong>{formatCurrency(dadosOrigem.valorOrigem || dadosOrigem.valorCusto)}</strong></div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Seleção de Item */}
      <Dialog open={showItemSelectionModal} onOpenChange={setShowItemSelectionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecione o Item para a OS</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensVenda.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-medium">{item.produto}</TableCell>
                  <TableCell className="font-mono text-xs">{formatIMEI(item.imei || '')}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleSelecionarItem(index)}>Selecionar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Quadro Aparelho */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Aparelho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className={!origemAparelho ? 'text-destructive' : ''}>Origem da Compra *</Label>
                <Select value={origemAparelho} onValueChange={(v) => {
                  setOrigemAparelho(v as any);
                  if (!timerStart) {
                    setTimerStart(Date.now());
                    setTimer(TIMER_DURATION);
                  }
                }}>
                  <SelectTrigger className={!origemAparelho ? 'border-destructive' : ''}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Thiago Imports">Compra realizada na Thiago Imports</SelectItem>
                    <SelectItem value="Externo">Aparelho adquirido fora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={!modeloAparelho ? 'text-destructive' : ''}>Modelo do Aparelho *</Label>
                <Select value={modeloAparelho} onValueChange={setModeloAparelho}>
                  <SelectTrigger className={!modeloAparelho ? 'border-destructive' : ''}><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                  <SelectContent>
                    {produtosCadastro.map(p => (
                      <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IMEI do Aparelho</Label>
                <div className="flex gap-2">
                  <Input
                    value={imeiAparelho}
                    onChange={(e) => setImeiAparelho(applyIMEIMask(e.target.value))}
                    placeholder="WW-XXXXXX-YYYYYY-Z"
                    maxLength={18}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScannerOpen(true)}
                    title="Escanear IMEI com câmera"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {origemAparelho && (
              <div className={cn(
                "mt-4 p-3 rounded-lg text-sm",
                origemAparelho === 'Thiago Imports' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
              )}>
                {origemAparelho === 'Thiago Imports' 
                  ? "✓ O aparelho foi adquirido na Thiago Imports e possui garantia da loja."
                  : "⚠ O aparelho foi adquirido externamente. Verificar documentação."}
              </div>
            )}
            {origemAparelho === 'Thiago Imports' && (
              <div className="mt-4 space-y-2">
                <Label>ID da Venda Antiga</Label>
                <Input
                  value={idVendaAntiga}
                  onChange={(e) => setIdVendaAntiga(e.target.value)}
                  placeholder="Insira o ID da venda no sistema antigo..."
                  disabled={camposBloqueados.includes('idVendaAntiga')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações da OS */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da OS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Nº OS</Label>
                <Input value={osInfo.id} disabled className="font-mono bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora</Label>
                <Input value={new Date(dataHora).toLocaleString('pt-BR')} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className={!lojaId ? 'text-destructive' : ''}>Loja *</Label>
                <AutocompleteLoja
                  value={lojaId}
                  onChange={setLojaId}
                  apenasLojasTipoLoja={true}
                  className={!lojaId ? 'border-destructive' : ''}
                  placeholder="Selecione a loja..."
                />
              </div>
              <div className="space-y-2">
                <Label className={!tecnicoId ? 'text-destructive' : ''}>Técnico *</Label>
                <AutocompleteColaborador
                  value={tecnicoId}
                  onChange={setTecnicoId}
                  filtrarPorTipo="tecnicos"
                  className={!tecnicoId ? 'border-destructive' : ''}
                  placeholder="Selecione o técnico..."
                />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <AutocompleteColaborador
                  value={vendedorId}
                  onChange={setVendedorId}
                  filtrarPorTipo="vendedoresEGestores"
                  placeholder="Selecione o vendedor..."
                />
              </div>
              <div className="space-y-2">
                <Label className={!status ? 'text-destructive' : ''}>Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className={!status ? 'border-destructive' : ''}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                    <SelectItem value="Em serviço">Em serviço</SelectItem>
                    <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
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
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={clienteSelecionado?.nome || ''} 
                  placeholder="Nenhum cliente selecionado" 
                  disabled 
                  className={cn("flex-1", !clienteId && "border-destructive")}
                />
                <Button onClick={() => setBuscarClienteOpen(true)}>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Cliente
                </Button>
              </div>

              {clienteSelecionado && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium">{clienteSelecionado.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{clienteSelecionado.telefone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{clienteSelecionado.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{clienteSelecionado.cidade}/{clienteSelecionado.estado}</p>
                  </div>
                </div>
              )}

              {clienteId && historicoCliente.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico do Cliente (Últimas 3 OS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      {historicoCliente.map(h => (
                        <div key={h.osId} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                          <div>
                            <span className="font-mono">{h.osId}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(h.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{h.setor}</Badge>
                            <span className="font-medium">{formatCurrency(h.valorTotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Peças/Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Peças/Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pecas.map((peca, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Peça/Serviço</Label>
                      {peca.pecaNoEstoque ? (
                        <div className="space-y-2">
                          <Select
                            value={peca.pecaEstoqueId}
                            onValueChange={(v) => {
                              const pecaSelecionada = pecasEstoque.find(p => p.id === v);
                              handlePecaChange(index, 'pecaEstoqueId', v);
                              if (pecaSelecionada) {
                                handlePecaChange(index, 'peca', pecaSelecionada.descricao);
                                handlePecaChange(index, 'valor', formatCurrencyInput(String(pecaSelecionada.valorRecomendado * 100)));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a peça do estoque..." />
                            </SelectTrigger>
                            <SelectContent>
                             {pecasEstoque
                                .filter(p => !lojaId || p.lojaId === lojaId)
                                .map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{p.descricao}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {p.quantidade} un.
                                      </Badge>
                                      <Badge variant="secondary" className="ml-1 text-xs">
                                        {p.origem}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {peca.pecaEstoqueId && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Package className="h-4 w-4" />
                              <span>
                                Estoque atual: {pecasEstoque.find(p => p.id === peca.pecaEstoqueId)?.quantidade || 0} unidades
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={peca.peca}
                          onChange={e => handlePecaChange(index, 'peca', e.target.value)}
                          placeholder="Descrição da peça ou serviço"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        value={peca.valor}
                        onChange={e => handlePecaChange(index, 'valor', formatCurrencyInput(e.target.value))}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (%)</Label>
                      <InputComMascara
                        mascara="percentual"
                        value={peca.percentual}
                        onChange={(formatted, raw) => handlePecaChange(index, 'percentual', String(raw))}
                        placeholder="0%"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Unidade de Serviço</Label>
                      <AutocompleteLoja
                        value={peca.unidadeServico}
                        onChange={v => handlePecaChange(index, 'unidadeServico', v)}
                        apenasLojasTipoLoja={true}
                        placeholder="Selecione..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input 
                        value={formatCurrency(calcularValorTotalPeca(peca))} 
                        disabled 
                        className="bg-muted font-medium"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.pecaNoEstoque}
                            onCheckedChange={checked => handlePecaChange(index, 'pecaNoEstoque', checked)}
                          />
                          <Label className="text-sm">Peça no estoque</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.pecaDeFornecedor}
                            onCheckedChange={checked => handlePecaChange(index, 'pecaDeFornecedor', checked)}
                          />
                          <Label className="text-sm">Fornecedor</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.servicoTerceirizado}
                            onCheckedChange={checked => handlePecaChange(index, 'servicoTerceirizado', checked)}
                          />
                          <Label className="text-sm">Serviço Terceirizado</Label>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removePeca(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {peca.pecaDeFornecedor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Fornecedor</Label>
                        <AutocompleteFornecedor
                          value={peca.fornecedorId}
                          onChange={v => handlePecaChange(index, 'fornecedorId', v)}
                          placeholder="Selecione o fornecedor..."
                        />
                      </div>
                    </div>
                  )}

                  {peca.servicoTerceirizado && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Descrição do Serviço Terceirizado</Label>
                        <Input
                          value={peca.descricaoTerceirizado}
                          onChange={e => handlePecaChange(index, 'descricaoTerceirizado', e.target.value)}
                          placeholder="Descreva o serviço..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fornecedor do Serviço</Label>
                        <AutocompleteFornecedor
                          value={peca.fornecedorId}
                          onChange={v => handlePecaChange(index, 'fornecedorId', v)}
                          placeholder="Selecione..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome Resp. Fornecedor *</Label>
                        <Input
                          value={peca.nomeRespFornecedor}
                          onChange={e => handlePecaChange(index, 'nomeRespFornecedor', e.target.value)}
                          placeholder="Nome do responsável..."
                          className={!peca.nomeRespFornecedor ? 'border-destructive' : ''}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addPeca}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Peça/Serviço
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Solicitar Peças */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Solicitar Peças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Formulário de nova solicitação */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome da Peça *</Label>
                    <Input
                      value={novaSolicitacao.peca}
                      onChange={e => setNovaSolicitacao({ ...novaSolicitacao, peca: e.target.value })}
                      placeholder="Ex: Tela iPhone 14 Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={novaSolicitacao.quantidade}
                      onChange={e => setNovaSolicitacao({ ...novaSolicitacao, quantidade: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select 
                      value={novaSolicitacao.prioridade} 
                      onValueChange={(v) => setNovaSolicitacao({ ...novaSolicitacao, prioridade: v as any })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modelo Compatível</Label>
                    <Select 
                      value={novaSolicitacao.modeloCompativel} 
                      onValueChange={(v) => setNovaSolicitacao({ ...novaSolicitacao, modeloCompativel: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                      <SelectContent>
                        {produtosCadastro.map(p => (
                          <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Justificativa *</Label>
                    <Input
                      value={novaSolicitacao.justificativa}
                      onChange={e => setNovaSolicitacao({ ...novaSolicitacao, justificativa: e.target.value })}
                      placeholder="Motivo da solicitação..."
                    />
                  </div>
                </div>
                <Button onClick={handleAddSolicitacao}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Solicitação
                </Button>
              </div>

              {/* Lista de solicitações */}
              {solicitacoesPecas.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peça</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead>Modelo Compatível</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitacoesPecas.map((sol, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{sol.peca}</TableCell>
                          <TableCell className="text-center">{sol.quantidade}</TableCell>
                          <TableCell>{sol.modeloCompativel || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sol.justificativa}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={sol.prioridade === 'Urgente' ? 'destructive' : sol.prioridade === 'Alta' ? 'default' : 'secondary'}
                            >
                              {sol.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSolicitacao(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {solicitacoesPecas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma solicitação de peça adicionada. Adicione peças que precisam ser compradas para este serviço.
                </p>
              )}

              {solicitacoesPecas.length > 0 && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Ao registrar a OS, as solicitações serão enviadas para aprovação do gestor. O status da OS será "Aguardando Aprovação do Gestor".
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <PagamentoQuadro
          valorTotalProdutos={valorTotalPecas}
          custoTotalProdutos={0}
          lojaVendaId={lojaId}
          onPagamentosChange={(pags) => setPagamentosQuadro(pags)}
        />

        {/* Descrição */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição Detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Peças/Serviços</div>
                <div className="text-2xl font-bold">{formatCurrency(valorTotalPecas)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Pagamentos</div>
                <div className="text-2xl font-bold">{formatCurrency(pagamentosQuadro.reduce((acc, p) => acc + p.valor, 0))}</div>
              </div>
              <div className={cn(
                "p-4 rounded-lg",
                pagamentosQuadro.reduce((acc, p) => acc + p.valor, 0) >= valorTotalPecas ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                <div className="text-sm text-muted-foreground">Diferença</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(pagamentosQuadro.reduce((acc, p) => acc + p.valor, 0) - valorTotalPecas)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerta de Campos Obrigatórios */}
        {(() => {
          const camposFaltando: string[] = [];
          if (!origemAparelho) camposFaltando.push('Origem da Compra');
          if (!modeloAparelho) camposFaltando.push('Modelo do Aparelho');
          if (!lojaId) camposFaltando.push('Loja');
          if (!tecnicoId) camposFaltando.push('Técnico');
          // Setor não é mais obrigatório
          if (!clienteId) camposFaltando.push('Cliente');
          if (!status) camposFaltando.push('Status');
          
          // Verificar serviço terceirizado sem responsável
          const pecasSemResp = pecas.filter(p => 
            p.servicoTerceirizado && !p.nomeRespFornecedor
          );
          if (pecasSemResp.length > 0) {
            camposFaltando.push('Nome do Responsável (Serviço Terceirizado)');
          }
          
          if (camposFaltando.length > 0) {
            return (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Campos obrigatórios não preenchidos:</p>
                  <ul className="mt-1 text-muted-foreground list-disc list-inside">
                    {camposFaltando.map((campo, i) => <li key={i}>{campo}</li>)}
                  </ul>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Botão Registrar */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAbrirConfirmacao}
            disabled={!lojaId || !tecnicoId || !clienteId || !status}
          >
            Registrar Assistência
          </Button>
        </div>
      </div>

      {/* Dialog Buscar Cliente - Layout idêntico ao de Vendas */}
      <Dialog open={buscarClienteOpen} onOpenChange={setBuscarClienteOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Selecionar Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={buscarClienteTermo}
                onChange={e => setBuscarClienteTermo(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setNovoClienteOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
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
                  {clientesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesFiltrados.map(c => (
                      <TableRow 
                        key={c.id} 
                        className={cn(
                          c.status === 'Inativo' && 'bg-destructive/10',
                          'cursor-pointer hover:bg-muted/50'
                        )}
                        onClick={() => c.status !== 'Inativo' && handleSelecionarCliente(c)}
                      >
                        <TableCell className="font-mono text-xs">{c.cpf}</TableCell>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>
                          <Badge className={c.tipoPessoa === 'Pessoa Jurídica' ? 'bg-blue-500' : 'bg-green-500'}>
                            {c.tipoPessoa === 'Pessoa Jurídica' ? 'PJ' : 'PF'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.tipoCliente === 'VIP' ? 'default' : 'secondary'}>
                            {c.tipoCliente}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.status === 'Inativo' ? (
                            <Badge variant="destructive">Bloqueado</Badge>
                          ) : (
                            <Badge variant="outline">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>{c.telefone}</TableCell>
                        <TableCell>
                          {c.status === 'Inativo' ? (
                            <span className="text-destructive text-sm font-medium">Bloqueado</span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelecionarCliente(c);
                              }}
                            >
                              Selecionar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Cliente - Layout igual ao Cadastros > Clientes */}
      <Dialog open={novoClienteOpen} onOpenChange={setNovoClienteOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {/* Tipo de Pessoa */}
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select 
                value={novoClienteForm.tipoPessoa} 
                onValueChange={(v) => setNovoClienteForm({ ...novoClienteForm, tipoPessoa: v as 'Física' | 'Jurídica' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Física">Pessoa Física</SelectItem>
                  <SelectItem value="Jurídica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={novoClienteForm.nome}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>{novoClienteForm.tipoPessoa === 'Física' ? 'CPF' : 'CNPJ'} *</Label>
              <Input
                value={novoClienteForm.cpf}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cpf: formatCpfCnpj(e.target.value) })}
                maxLength={novoClienteForm.tipoPessoa === 'Física' ? 14 : 18}
                placeholder={novoClienteForm.tipoPessoa === 'Física' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select 
                value={novoClienteForm.tipoCliente} 
                onValueChange={(v) => setNovoClienteForm({ ...novoClienteForm, tipoCliente: v as 'VIP' | 'Normal' | 'Novo' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Novo">Novo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                value={novoClienteForm.telefone}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={novoClienteForm.dataNascimento}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, dataNascimento: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={novoClienteForm.email}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={novoClienteForm.cep}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cep: e.target.value })}
                placeholder="00000-000"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={novoClienteForm.endereco}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, endereco: e.target.value })}
                placeholder="Rua, Avenida..."
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={novoClienteForm.numero}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, numero: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={novoClienteForm.bairro}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, bairro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={novoClienteForm.cidade}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select 
                value={novoClienteForm.estado} 
                onValueChange={(v) => setNovoClienteForm({ ...novoClienteForm, estado: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoClienteOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarNovoCliente}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação */}
      <Dialog open={confirmarOpen} onOpenChange={setConfirmarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Registro de OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Confirme os dados abaixo para registrar a OS {osInfo.id}:
            </p>
            <div className="space-y-2">
              <Label>Técnico</Label>
              <AutocompleteColaborador
                value={confirmTecnico}
                onChange={setConfirmTecnico}
                filtrarPorTipo="tecnicos"
              />
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <AutocompleteLoja
                value={confirmLoja}
                onChange={setConfirmLoja}
                apenasLojasTipoLoja={true}
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={confirmData}
                onChange={e => setConfirmData(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleRegistrarOS}
              disabled={confirmTecnico !== tecnicoId || confirmLoja !== lojaId}
            >
              Confirmar Registro
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
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Encontramos um rascunho salvo automaticamente {formatDraftAge(draftAge)}.
            </p>
            <p className="text-sm text-muted-foreground">
              Deseja continuar de onde parou ou iniciar uma nova OS?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>
              Descartar
            </Button>
            <Button onClick={handleLoadDraft}>
              Continuar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner IMEI */}
      <BarcodeScanner
        open={scannerOpen}
        onScan={(code) => {
          setImeiAparelho(applyIMEIMask(code));
          setScannerOpen(false);
          toast({ title: 'IMEI escaneado', description: `IMEI ${applyIMEIMask(code)} capturado com sucesso` });
        }}
        onClose={() => setScannerOpen(false)}
      />
    </PageLayout>
  );
}
