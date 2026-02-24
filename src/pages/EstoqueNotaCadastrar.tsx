import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDraftVenda } from '@/hooks/useDraftVenda';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { ArrowLeft, Lock, AlertCircle, Info, FileText, Zap, Plus, Trash2, Save, RotateCcw, ChevronsUpDown, Check } from 'lucide-react';
import { getNotasCompra } from '@/utils/estoqueApi';
import { 
  criarNotaEntrada, 
  TipoPagamentoNota, 
  definirAtuacaoInicial,
  AtuacaoAtual,
  verificarImeiUnicoSistema,
} from '@/utils/notaEntradaFluxoApi';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { formatCurrency } from '@/utils/formatUtils';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BufferAnexos, AnexoTemporario } from '@/components/estoque/BufferAnexos';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import { getAcessorios } from '@/utils/acessoriosApi';
import { formatIMEI } from '@/utils/imeiMask';
import { getCores } from '@/utils/coresApi';

interface ProdutoLinha {
  tipoProduto: 'Aparelho' | 'Acessorio';
  marca: string;
  modelo: string;
  imei: string;
  cor: string;
  categoria: string;
  saudeBateria: number;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  explodido?: boolean;
}

const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

const produtoLinhaVazia = (): ProdutoLinha => ({
  tipoProduto: 'Aparelho',
  marca: 'Apple',
  modelo: '',
  imei: '',
  cor: '',
  categoria: '',
  saudeBateria: 100,
  quantidade: 1,
  custoUnitario: 0,
  custoTotal: 0,
  explodido: false
});

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  const produtosCadastro = getProdutosCadastro();
  const acessoriosCadastro = getAcessorios();
  const { user } = useAuthStore();
  
  const DRAFT_KEY = 'draft_nota_entrada';

  // Draft via hook (idêntico ao VendasNova)
  const { saveDraft, loadDraft: loadDraftHook, clearDraft, hasDraft: checkHasDraft, getDraftAge, formatDraftAge } = useDraftVenda(DRAFT_KEY);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftAge, setDraftAge] = useState<number | null>(null);
  const isLoadingDraft = useRef(false);

  // Informações da Nota (iniciam vazios, carregam só se user confirmar)
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [responsavelLancamento, setResponsavelLancamento] = useState(user?.colaborador?.id || '');
  
  // Flag de Urgência
  const [urgente, setUrgente] = useState(false);
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>('');
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoNota | ''>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  
  // Campos PIX obrigatórios
  const [pixBanco, setPixBanco] = useState('');
  const [pixRecebedor, setPixRecebedor] = useState('');
  const [pixChave, setPixChave] = useState('');
  
  // Atuação Atual (somente leitura, calculado automaticamente)
  const [atuacaoAtual, setAtuacaoAtual] = useState<AtuacaoAtual | ''>('');
  
  // Buffer de anexos temporários
  const [anexos, setAnexos] = useState<AnexoTemporario[]>([]);

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([produtoLinhaVazia()]);
  
  // IMEI duplicado por índice
  const [imeiDuplicados, setImeiDuplicados] = useState<Record<number, string | null>>({});
  const [imeiTimers, setImeiTimers] = useState<Record<number, NodeJS.Timeout>>({});

  // Estado para popover do autocomplete modelo
  const [openModeloPopover, setOpenModeloPopover] = useState<number | null>(null);

  // Indicador visual de auto-save
  const [draftSalvoRecente, setDraftSalvoRecente] = useState(false);

  // Verificar se existe rascunho ao montar
  useEffect(() => {
    if (checkHasDraft()) {
      setDraftAge(getDraftAge());
      setShowDraftModal(true);
    }
  }, []);

  // Carregar rascunho
  const handleLoadDraft = () => {
    isLoadingDraft.current = true;
    const draft = loadDraftHook();
    if (draft) {
      setFornecedor(draft.fornecedor || '');
      setResponsavelLancamento(draft.responsavelLancamento || user?.colaborador?.id || '');
      setUrgente(draft.urgente || false);
      setFormaPagamento(draft.formaPagamento || '');
      setTipoPagamento(draft.tipoPagamento || '');
      setObservacaoPagamento(draft.observacaoPagamento || '');
      setPixBanco(draft.pixBanco || '');
      setPixRecebedor(draft.pixRecebedor || '');
      setPixChave(draft.pixChave || '');
      setProdutos(draft.produtos?.length ? draft.produtos : [produtoLinhaVazia()]);
      toast.success('Rascunho carregado com sucesso');
    }
    setShowDraftModal(false);
    setTimeout(() => { isLoadingDraft.current = false; }, 500);
  };

  // Descartar rascunho
  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftModal(false);
    toast.info('Rascunho descartado.');
  };

  // Salvar draft (sem toast, usado pelo auto-save)
  const salvarDraftSilencioso = useCallback(() => {
    const draftData = {
      fornecedor,
      responsavelLancamento,
      urgente,
      formaPagamento,
      tipoPagamento,
      observacaoPagamento,
      pixBanco,
      pixRecebedor,
      pixChave,
      produtos,
    };
    saveDraft(draftData);
    setDraftSalvoRecente(true);
    setTimeout(() => setDraftSalvoRecente(false), 2500);
  }, [fornecedor, responsavelLancamento, urgente, formaPagamento, tipoPagamento, observacaoPagamento, pixBanco, pixRecebedor, pixChave, produtos, saveDraft]);

  // Auto-save com debounce de 2 segundos
  useEffect(() => {
    if (isLoadingDraft.current) return;
    const timer = setTimeout(() => {
      if (fornecedor || tipoPagamento || produtos.some(p => p.modelo)) {
        salvarDraftSilencioso();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [fornecedor, responsavelLancamento, urgente, formaPagamento, tipoPagamento, observacaoPagamento, pixBanco, pixRecebedor, pixChave, produtos, salvarDraftSilencioso]);

  // Campos simplificados (oculta IMEI, Cor, Categoria)
  const camposSimplificados = useMemo(() => {
    return tipoPagamento === 'Pagamento 100% Antecipado' || tipoPagamento === 'Pagamento Parcial';
  }, [tipoPagamento]);

  // Atualizar atuação automaticamente quando tipo de pagamento muda
  useEffect(() => {
    if (tipoPagamento) {
      setAtuacaoAtual(definirAtuacaoInicial(tipoPagamento));
    } else {
      setAtuacaoAtual('');
    }
  }, [tipoPagamento]);

  // Valor total calculado dos produtos
  const valorTotalProdutos = useMemo(() => {
    return produtos.reduce((acc, p) => acc + p.custoTotal, 0);
  }, [produtos]);

  // Categorias que são acessórios/não-aparelhos — excluir do filtro de Aparelhos
  const categoriasNaoAparelho = ['Watch', 'AirPods', 'Acessórios', 'MacBook', 'iPad'];

  const getModelosAparelhos = (marca: string) => {
    return produtosCadastro.filter(p => 
      p.marca.toLowerCase() === marca.toLowerCase() &&
      !categoriasNaoAparelho.includes(p.categoria)
    );
  };


  const adicionarProduto = () => {
    setProdutos([...produtos, produtoLinhaVazia()]);
  };

  const removerProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const atualizarProduto = (index: number, campo: keyof ProdutoLinha, valor: any) => {
    const novosProdutos = [...produtos];
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor };

    if (campo === 'tipoProduto') {
      novosProdutos[index].marca = valor === 'Aparelho' ? 'Apple' : '';
      novosProdutos[index].modelo = '';
      novosProdutos[index].imei = '';
      novosProdutos[index].cor = '';
      novosProdutos[index].categoria = '';
      novosProdutos[index].saudeBateria = 100;
      setImeiDuplicados(prev => ({ ...prev, [index]: null }));
    }

    // Auto-set saudeBateria when categoria changes
    if (campo === 'categoria') {
      if (valor === 'Novo') {
        novosProdutos[index].saudeBateria = 100;
      }
    }

    if (campo === 'marca') {
      novosProdutos[index].modelo = '';
    }

    if (campo === 'quantidade' || campo === 'custoUnitario') {
      novosProdutos[index].custoTotal = novosProdutos[index].quantidade * novosProdutos[index].custoUnitario;
    }

    // Limpar IMEI se quantidade passou de 1 para > 1
    if (campo === 'quantidade' && valor > 1 && novosProdutos[index].imei) {
      novosProdutos[index].imei = '';
      setImeiDuplicados(prev => ({ ...prev, [index]: null }));
    }

    // Validação assíncrona de IMEI
    if (campo === 'imei' && valor && String(valor).replace(/[^0-9]/g, '').length >= 10) {
      if (imeiTimers[index]) clearTimeout(imeiTimers[index]);
      const timer = setTimeout(() => {
        const resultado = verificarImeiUnicoSistema(valor);
        if (resultado.duplicado) {
          setImeiDuplicados(prev => ({ ...prev, [index]: resultado.localExistente || 'Outro local' }));
        } else {
          setImeiDuplicados(prev => ({ ...prev, [index]: null }));
        }
      }, 500);
      setImeiTimers(prev => ({ ...prev, [index]: timer }));
    } else if (campo === 'imei') {
      setImeiDuplicados(prev => ({ ...prev, [index]: null }));
    }

    setProdutos(novosProdutos);
  };

  const handleCustoChange = (index: number, formatted: string, raw: string | number) => {
    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
    atualizarProduto(index, 'custoUnitario', valor);
  };

  const validarCampos = (): string[] => {
    const camposFaltando: string[] = [];
    
    if (!fornecedor) camposFaltando.push('Fornecedor');
    if (!dataEntrada) camposFaltando.push('Data de Entrada');
    if (!responsavelLancamento) camposFaltando.push('Responsável pelo Lançamento');
    if (!tipoPagamento) camposFaltando.push('Tipo de Pagamento');
    
    // Validar campos PIX quando forma = Pix
    if (formaPagamento === 'Pix') {
      if (!pixBanco) camposFaltando.push('Banco (PIX)');
      if (!pixRecebedor) camposFaltando.push('Recebedor (PIX)');
      if (!pixChave) camposFaltando.push('Chave PIX');
    }
    
    return camposFaltando;
  };

  const temImeiDuplicadoCadastro = useMemo(() => {
    return Object.values(imeiDuplicados).some(v => v !== null && v !== undefined);
  }, [imeiDuplicados]);

  const validarProdutos = (): boolean => {
    // Bloquear se houver IMEI duplicado
    if (temImeiDuplicadoCadastro) {
      toast.error('Existem IMEIs duplicados. Corrija antes de salvar.');
      return false;
    }
    
    // Pelo menos verificar campos obrigatórios simplificados
    for (const p of produtos) {
      if (!p.modelo) {
        toast.error('Selecione o modelo de todos os produtos');
        return false;
      }
      if (p.custoUnitario <= 0) {
        toast.error('Informe o custo unitário de todos os produtos');
        return false;
      }
      // Se Pagamento Pós, exigir campos completos
      if (!camposSimplificados) {
        if (p.tipoProduto === 'Aparelho' && p.quantidade === 1 && !p.imei) {
          toast.error('Informe o IMEI de todos os aparelhos com quantidade 1');
          return false;
        }
        if (p.tipoProduto === 'Aparelho' && !p.cor) {
          toast.error('Selecione a cor de todos os aparelhos');
          return false;
        }
        if (p.tipoProduto === 'Aparelho' && !p.categoria) {
          toast.error('Selecione a categoria de todos os aparelhos');
          return false;
        }
      }
    }
    return true;
  };

  const temProdutosPreenchidos = useMemo(() => {
    return produtos.some(p => p.modelo && p.custoUnitario > 0);
  }, [produtos]);

  const handleSalvar = () => {
    const camposFaltando = validarCampos();
    
    if (camposFaltando.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', {
        description: camposFaltando.join(', ')
      });
      return;
    }

    // Se tem produtos preenchidos, validá-los
    if (temProdutosPreenchidos && !validarProdutos()) return;

    // Valor total é sempre a soma dos produtos
    const valorFinal = valorTotalProdutos;

    // Criar nota via API
    const novaNota = criarNotaEntrada({
      data: dataEntrada,
      fornecedor,
      tipoPagamento: tipoPagamento as TipoPagamentoNota,
      valorTotal: valorFinal || undefined,
      formaPagamento: formaPagamento || undefined,
      responsavel: responsavelLancamento,
      observacoes: observacaoPagamento || undefined,
      pixBanco: formaPagamento === 'Pix' ? pixBanco : undefined,
      pixRecebedor: formaPagamento === 'Pix' ? pixRecebedor : undefined,
      pixChave: formaPagamento === 'Pix' ? pixChave : undefined,
      urgente: urgente,
      produtos: temProdutosPreenchidos ? produtos.filter(p => p.modelo && p.custoUnitario > 0).map(p => ({
        tipoProduto: p.tipoProduto,
        marca: p.marca,
        modelo: p.modelo,
        imei: p.imei || undefined,
        cor: p.cor || undefined,
        categoria: (p.categoria as 'Novo' | 'Seminovo') || undefined,
        quantidade: p.quantidade,
        custoUnitario: p.custoUnitario,
        custoTotal: p.custoTotal
      })) : undefined
    });

    // Mensagem de sucesso
    const atuacao = definirAtuacaoInicial(tipoPagamento as TipoPagamentoNota);
    
    const prodMsg = temProdutosPreenchidos ? ' com produtos registrados' : '';
    
    toast.success(`Nota ${novaNota.id} lançada com sucesso${prodMsg}!`, {
      description: `Atuação inicial: ${atuacao}. ${atuacao === 'Estoque' ? 'Acesse Notas Pendências para cadastrar/conferir produtos.' : 'Aguardando ação do Financeiro.'}`
    });
    // Limpar draft ao salvar com sucesso
    clearDraft();
    navigate('/estoque/notas-pendencias');
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual | '') => {
    if (!atuacao) return null;
    
    switch (atuacao) {
      case 'Estoque':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Estoque</Badge>;
      case 'Financeiro':
        return <Badge className="bg-accent text-accent-foreground border-accent">Financeiro</Badge>;
      case 'Encerrado':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return null;
    }
  };

  return (
    <EstoqueLayout title="Cadastrar Nova Nota de Compra">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas Pendências
        </Button>

        {/* Banner de Rascunho - removido, agora usa modal */}

        {/* Alerta informativo */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Lançamento Inicial:</strong> Registre a nota e, opcionalmente, os produtos. 
            {camposSimplificados 
              ? ' Para pagamentos Antecipado/Parcial, campos simplificados (sem IMEI, Cor, Categoria).'
              : ' Para Pagamento Pós, todos os campos de produto são obrigatórios.'}
          </AlertDescription>
        </Alert>

        {/* Informações da Nota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input 
                  id="dataEntrada" 
                  type="date"
                  value={dataEntrada}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <AutocompleteFornecedor
                  value={fornecedor}
                  onChange={setFornecedor}
                  placeholder="Selecione um fornecedor"
                />
              </div>
              <div>
                <Label>Responsável pelo Lançamento *</Label>
                <AutocompleteColaborador
                  value={responsavelLancamento}
                  onChange={setResponsavelLancamento}
                  placeholder="Selecione o responsável"
                  filtrarPorTipo="estoquistas"
                />
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>Nº da Nota:</strong> Será gerado automaticamente ao salvar (formato: NE-{new Date().getFullYear()}-XXXXX)
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <Checkbox
                id="urgente"
                checked={urgente}
                onCheckedChange={(checked) => setUrgente(checked as boolean)}
              />
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${urgente ? 'text-destructive' : 'text-muted-foreground'}`} />
                <Label htmlFor="urgente" className={`cursor-pointer ${urgente ? 'text-destructive font-medium' : ''}`}>
                  Solicitação de Urgência
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento *</CardTitle>
            <CardDescription>
              O tipo de pagamento define o fluxo da nota e a atuação inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="mb-3 block">Forma de Pagamento</Label>
                <RadioGroup 
                  value={formaPagamento} 
                  onValueChange={(v) => setFormaPagamento(v as 'Dinheiro' | 'Pix')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Dinheiro" id="dinheiro" />
                    <Label htmlFor="dinheiro" className="font-normal cursor-pointer">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Pix" id="pix" />
                    <Label htmlFor="pix" className="font-normal cursor-pointer">Pix</Label>
                  </div>
              </RadioGroup>
              
              {/* Campos PIX obrigatórios */}
              {formaPagamento === 'Pix' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div>
                    <Label htmlFor="pixBanco">Banco *</Label>
                    <Input
                      id="pixBanco"
                      value={pixBanco}
                      onChange={(e) => setPixBanco(e.target.value)}
                      placeholder="Ex: Nubank, Itaú..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="pixRecebedor">Nome do Recebedor *</Label>
                    <Input
                      id="pixRecebedor"
                      value={pixRecebedor}
                      onChange={(e) => setPixRecebedor(e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pixChave">Chave PIX *</Label>
                    <Input
                      id="pixChave"
                      value={pixChave}
                      onChange={(e) => setPixChave(e.target.value)}
                      placeholder="CPF, e-mail, telefone..."
                    />
                  </div>
                </div>
              )}
              </div>
              <div>
                <Label className="mb-3 block">Tipo de Pagamento *</Label>
                <Select 
                  value={tipoPagamento} 
                  onValueChange={(v) => setTipoPagamento(v as TipoPagamentoNota)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagamento Pos">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Pós</span>
                        <span className="text-xs text-muted-foreground">100% após conferência do estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento Parcial">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Parcial</span>
                        <span className="text-xs text-muted-foreground">Adiantamento + restante após conferência</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento 100% Antecipado">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento 100% Antecipado</span>
                        <span className="text-xs text-muted-foreground">Pagamento total antes da conferência</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  Atuação Atual
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                  {atuacaoAtual ? (
                    <>
                      {getAtuacaoBadge(atuacaoAtual)}
                      <span className="text-sm text-muted-foreground">
                        (definido automaticamente)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Selecione o tipo de pagamento
                    </span>
                  )}
                </div>
                {atuacaoAtual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {atuacaoAtual === 'Estoque' 
                      ? 'Estoque cadastra e confere primeiro' 
                      : 'Financeiro realiza pagamento primeiro'}
                  </p>
                )}
              </div>
            </div>
            {tipoPagamento && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {tipoPagamento === 'Pagamento Pos' && (
                    <>
                      <strong>Fluxo Pagamento Pós:</strong> Estoque cadastra produtos → Estoque realiza conferência → 
                      Ao atingir 100% conferência → Financeiro realiza pagamento total → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento Parcial' && (
                    <>
                      <strong>Fluxo Pagamento Parcial:</strong> Financeiro realiza primeiro pagamento → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → 
                      Financeiro realiza pagamento restante → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento 100% Antecipado' && (
                    <>
                      <strong>Fluxo 100% Antecipado:</strong> Financeiro realiza pagamento total → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → Nota encerrada automaticamente
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea 
                id="observacao"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                placeholder="Informações adicionais sobre o pagamento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quadro de Produtos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Produtos
                  {camposSimplificados && (
                    <Badge variant="outline" className="text-xs">Simplificado</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {camposSimplificados 
                    ? 'Campos simplificados: IMEI, Cor e Categoria serão preenchidos na conferência'
                    : 'Todos os campos habilitados para Pagamento Pós'}
                </CardDescription>
              </div>
              <Button onClick={adicionarProduto} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo Produto *</TableHead>
                    <TableHead>Marca *</TableHead>
                    <TableHead>Modelo *</TableHead>
                    {!camposSimplificados && <TableHead>IMEI</TableHead>}
                    {!camposSimplificados && <TableHead>Cor</TableHead>}
                    {!camposSimplificados && <TableHead className="min-w-[120px]">Categoria</TableHead>}
                    {!camposSimplificados && <TableHead className="min-w-[100px]">Saúde Bateria</TableHead>}
                    <TableHead>Qtd *</TableHead>
                    <TableHead className="min-w-[130px]">Custo Unit. *</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={produto.tipoProduto}
                          onValueChange={(value) => atualizarProduto(index, 'tipoProduto', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aparelho">Aparelho</SelectItem>
                            <SelectItem value="Acessorio">Acessório</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {produto.tipoProduto === 'Aparelho' ? (
                          <Select 
                            value={produto.marca}
                            onValueChange={(value) => atualizarProduto(index, 'marca', value)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {marcasAparelhos.map(marca => (
                                <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled placeholder="N/A" className="w-28 bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Popover open={openModeloPopover === index} onOpenChange={(open) => setOpenModeloPopover(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-44 justify-between font-normal text-left px-3">
                              <span className="truncate">{produto.modelo || 'Selecione...'}</span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start" style={{ zIndex: 100 }}>
                            <Command>
                              <CommandInput placeholder="Pesquisar modelo..." />
                              <CommandList className="max-h-64 overflow-y-auto">
                                <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                                {produto.tipoProduto === 'Acessorio'
                                  ? acessoriosCadastro.map(a => (
                                      <CommandItem
                                        key={a.id}
                                        value={a.descricao}
                                        onSelect={() => {
                                          atualizarProduto(index, 'modelo', a.descricao);
                                          setOpenModeloPopover(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", produto.modelo === a.descricao ? "opacity-100" : "opacity-0")} />
                                        {a.descricao}
                                      </CommandItem>
                                    ))
                                  : getModelosAparelhos(produto.marca).map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.produto}
                                        onSelect={() => {
                                          atualizarProduto(index, 'modelo', p.produto);
                                          setOpenModeloPopover(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", produto.modelo === p.produto ? "opacity-100" : "opacity-0")} />
                                        {p.produto}
                                      </CommandItem>
                                    ))
                                }
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            produto.quantidade > 1 ? (
                              <div className="relative">
                                <Input
                                  disabled
                                  value=""
                                  placeholder="Conferência"
                                  className="w-40 bg-muted cursor-not-allowed"
                                  title="IMEI será preenchido na conferência (explosão)"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Preenchido na conferência
                                </p>
                              </div>
                            ) : (
                              <div className="relative">
                                <InputComMascara
                                  mascara="imei"
                                  value={produto.imei}
                                  onChange={(formatted, raw) => atualizarProduto(index, 'imei', String(raw))}
                                  className={`w-40 ${imeiDuplicados[index] ? 'border-destructive ring-destructive/30 ring-2' : ''}`}
                                  placeholder="00-000000-000000-0"
                                />
                                {imeiDuplicados[index] && (
                                  <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[160px]">
                                    Duplicado: {imeiDuplicados[index]}
                                  </p>
                                )}
                              </div>
                            )
                          ) : (
                            <Input disabled placeholder="N/A" className="w-40 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            <Select
                              value={produto.cor || 'selecione'}
                              onValueChange={(value) => atualizarProduto(index, 'cor', value === 'selecione' ? '' : value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Cor" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border z-[100]">
                                <SelectItem value="selecione">Selecione</SelectItem>
                                {getCores().filter(c => c.status === 'Ativo').map(cor => (
                                  <SelectItem key={cor.id} value={cor.nome}>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-block w-3 h-3 rounded-full border border-border/50 shrink-0"
                                        style={{ backgroundColor: cor.hexadecimal }}
                                      />
                                      {cor.nome}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input disabled placeholder="N/A" className="w-32 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            <Select
                              value={produto.categoria || 'selecione'}
                              onValueChange={(value) => atualizarProduto(index, 'categoria', value === 'selecione' ? '' : value)}
                            >
                              <SelectTrigger className="min-w-[120px]">
                                <SelectValue placeholder="Cat" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border z-[100]">
                                <SelectItem value="selecione">Selecione</SelectItem>
                                <SelectItem value="Novo">Novo</SelectItem>
                                <SelectItem value="Seminovo">Seminovo</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input disabled placeholder="N/A" className="w-24 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            produto.categoria === 'Novo' ? (
                              <div className="flex items-center gap-1 w-20">
                                <Input
                                  type="number"
                                  value={100}
                                  readOnly
                                  className="w-16 bg-muted cursor-not-allowed text-center"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            ) : produto.categoria === 'Seminovo' ? (
                              <div className="flex items-center gap-1 w-20">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={produto.saudeBateria}
                                  onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                    atualizarProduto(index, 'saudeBateria', val);
                                  }}
                                  className="w-16 text-center"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 w-20">
                                <Input
                                  type="number"
                                  disabled
                                  placeholder="-"
                                  className="w-16 bg-muted cursor-not-allowed text-center"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            )
                          ) : (
                            <Input disabled placeholder="N/A" className="w-20 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <InputComMascara 
                          mascara="moeda"
                          value={produto.custoUnitario}
                          onChange={(formatted, raw) => handleCustoChange(index, formatted, raw)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(produto.custoTotal)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerProduto(index)}
                          disabled={produtos.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total dos Produtos</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(valorTotalProdutos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buffer de Anexos */}
        <BufferAnexos 
          anexos={anexos}
          onAnexosChange={setAnexos}
          maxFiles={10}
          maxSizeMB={5}
        />

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            {draftSalvoRecente && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3" />
                Rascunho salvo automaticamente
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/estoque/notas-pendencias')}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              Salvar Lançamento Inicial
            </Button>
          </div>
        </div>

        {/* Modal Rascunho (idêntico ao VendasNova) */}
        <Dialog open={showDraftModal} onOpenChange={setShowDraftModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Rascunho Encontrado
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Foi encontrado um rascunho de nota de compra salvo {formatDraftAge(draftAge)}. Deseja continuar de onde parou?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={handleDiscardDraft}>Descartar</Button>
              <Button onClick={handleLoadDraft}>Carregar Rascunho</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
