import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Lock, AlertCircle, Info, FileText, Zap, Plus, Trash2, Save, RotateCcw, ChevronsUpDown, Check, Wrench } from 'lucide-react';
import { getNotasCompra } from '@/utils/estoqueApi';
import { 
  criarNotaEntrada, 
  TipoPagamentoNota, 
  definirAtuacaoInicial,
  AtuacaoAtual,
  verificarImeiUnicoSistema
} from '@/utils/notaEntradaFluxoApi';
import { encaminharParaAnaliseGarantia } from '@/utils/garantiasApi';
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

interface ProdutoLinha {
  tipoProduto: 'Aparelho' | 'Acessorio';
  marca: string;
  modelo: string;
  imei: string;
  cor: string;
  categoria: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  explodido?: boolean;
}

interface MarcacaoAssistencia {
  index: number;
  motivo: string;
  timestamp: string;
}

const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

const produtoLinhaVazia = (): ProdutoLinha => ({
  tipoProduto: 'Aparelho',
  marca: 'Apple',
  modelo: '',
  imei: '',
  cor: '',
  categoria: '',
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

  // Carregar draft do localStorage
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }, []);

  const draft = loadDraft();

  // Informações da Nota
  const [fornecedor, setFornecedor] = useState(draft?.fornecedor || '');
  const [dataEntrada] = useState(new Date().toISOString().split('T')[0]);
  const [responsavelLancamento, setResponsavelLancamento] = useState(draft?.responsavelLancamento || user?.colaborador?.id || '');
  
  // Flag de Urgência
  const [urgente, setUrgente] = useState(draft?.urgente || false);
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>(draft?.formaPagamento || '');
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoNota | ''>(draft?.tipoPagamento || '');
  const [observacaoPagamento, setObservacaoPagamento] = useState(draft?.observacaoPagamento || '');
  
  // Campos PIX obrigatórios
  const [pixBanco, setPixBanco] = useState(draft?.pixBanco || '');
  const [pixRecebedor, setPixRecebedor] = useState(draft?.pixRecebedor || '');
  const [pixChave, setPixChave] = useState(draft?.pixChave || '');
  
  // Atuação Atual (somente leitura, calculado automaticamente)
  const [atuacaoAtual, setAtuacaoAtual] = useState<AtuacaoAtual | ''>('');
  
  // Buffer de anexos temporários
  const [anexos, setAnexos] = useState<AnexoTemporario[]>([]);

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoLinha[]>(draft?.produtos?.length ? draft.produtos : [produtoLinhaVazia()]);
  
  // IMEI duplicado por índice
  const [imeiDuplicados, setImeiDuplicados] = useState<Record<number, string | null>>({});
  const [imeiTimers, setImeiTimers] = useState<Record<number, NodeJS.Timeout>>({});

  // Estado para marcação de assistência
  const [produtosMarcadosAssistencia, setProdutosMarcadosAssistencia] = useState<MarcacaoAssistencia[]>([]);
  const [modalAssistenciaAberto, setModalAssistenciaAberto] = useState(false);
  const [indiceProdutoAssistencia, setIndiceProdutoAssistencia] = useState<number | null>(null);
  const [motivoAssistencia, setMotivoAssistencia] = useState('');
  const [confirmarAssistencia, setConfirmarAssistencia] = useState(false);

  // Estado para popover do autocomplete modelo
  const [openModeloPopover, setOpenModeloPopover] = useState<number | null>(null);

  // Indicador de draft carregado
  const [hasDraft, setHasDraft] = useState(!!draft);

  // Salvar draft
  const handleSalvarDraft = useCallback(() => {
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
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setHasDraft(true);
    toast.success('Rascunho salvo com sucesso!');
  }, [fornecedor, responsavelLancamento, urgente, formaPagamento, tipoPagamento, observacaoPagamento, produtos]);

  // Descartar draft
  const handleDescartarDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setFornecedor('');
    setResponsavelLancamento(user?.colaborador?.id || '');
    setUrgente(false);
    setFormaPagamento('');
    setTipoPagamento('');
    setObservacaoPagamento('');
    setPixBanco('');
    setPixRecebedor('');
    setPixChave('');
    setProdutos([produtoLinhaVazia()]);
    setHasDraft(false);
    toast.info('Rascunho descartado.');
  }, [user]);

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

  const getModelosAparelhos = (marca: string) => {
    return produtosCadastro.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
  };


  const adicionarProduto = () => {
    setProdutos([...produtos, produtoLinhaVazia()]);
  };

  const removerProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
      // Remover marcação de assistência se existir
      setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index).map(m => ({
        ...m,
        index: m.index > index ? m.index - 1 : m.index
      })));
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
      setImeiDuplicados(prev => ({ ...prev, [index]: null }));
      // Remover marcação de assistência ao trocar tipo
      setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index));
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

  // Assistência handlers
  const isMarcadoAssistencia = (index: number) => produtosMarcadosAssistencia.some(m => m.index === index);

  const abrirModalAssistencia = (index: number) => {
    setIndiceProdutoAssistencia(index);
    setMotivoAssistencia('');
    setConfirmarAssistencia(false);
    setModalAssistenciaAberto(true);
  };

  const confirmarEncaminhamento = () => {
    if (indiceProdutoAssistencia === null) return;
    if (!motivoAssistencia.trim()) {
      toast.error('Informe o motivo do encaminhamento');
      return;
    }
    if (!confirmarAssistencia) {
      toast.error('Confirme o encaminhamento');
      return;
    }

    setProdutosMarcadosAssistencia(prev => [
      ...prev,
      { index: indiceProdutoAssistencia, motivo: motivoAssistencia, timestamp: new Date().toISOString() }
    ]);
    setModalAssistenciaAberto(false);
    toast.success('Produto marcado para assistência');
  };

  const desmarcarAssistencia = (index: number) => {
    setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index));
    toast.info('Marcação de assistência removida');
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
    
    // Encaminhar produtos marcados para assistência
    if (novaNota && produtosMarcadosAssistencia.length > 0) {
      produtosMarcadosAssistencia.forEach(marcacao => {
        const prod = produtos[marcacao.index];
        if (prod) {
          const descricao = `${prod.marca} ${prod.modelo}${prod.imei ? ` - IMEI: ${prod.imei}` : ''}`;
          encaminharParaAnaliseGarantia(novaNota.id, 'Estoque', descricao, marcacao.motivo);
        }
      });
    }

    const prodMsg = temProdutosPreenchidos ? ' com produtos registrados' : '';
    const assistMsg = produtosMarcadosAssistencia.length > 0 ? ` | ${produtosMarcadosAssistencia.length} encaminhado(s) para assistência` : '';
    
    toast.success(`Nota ${novaNota.id} lançada com sucesso${prodMsg}!${assistMsg}`, {
      description: `Atuação inicial: ${atuacao}. ${atuacao === 'Estoque' ? 'Acesse Notas Pendências para cadastrar/conferir produtos.' : 'Aguardando ação do Financeiro.'}`
    });
    // Limpar draft ao salvar com sucesso
    localStorage.removeItem(DRAFT_KEY);
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

        {/* Banner de Rascunho */}
        {hasDraft && (
          <Alert className="border-yellow-500/30 bg-yellow-500/5">
            <Save className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm flex items-center justify-between">
              <span>
                <strong>Rascunho restaurado.</strong> Os dados do último rascunho foram carregados automaticamente.
              </span>
              <Button variant="ghost" size="sm" onClick={handleDescartarDraft} className="text-destructive ml-2">
                <RotateCcw className="h-3 w-3 mr-1" />
                Descartar
              </Button>
            </AlertDescription>
          </Alert>
        )}

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
                    <TableHead>Qtd *</TableHead>
                    <TableHead className="min-w-[130px]">Custo Unit. *</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index} className={isMarcadoAssistencia(index) ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
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
                            <Input
                              value={produto.cor}
                              onChange={(e) => atualizarProduto(index, 'cor', e.target.value)}
                              className="w-32"
                              placeholder="Cor"
                            />
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
                              <SelectContent>
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
                        <div className="flex items-center gap-1">
                          {isMarcadoAssistencia(index) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => desmarcarAssistencia(index)}
                              title="Remover marcação de assistência"
                            >
                              <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                                Assistência ✕
                              </Badge>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirModalAssistencia(index)}
                              disabled={produto.tipoProduto !== 'Aparelho' || !produto.imei?.trim()}
                              title={
                                produto.tipoProduto !== 'Aparelho'
                                  ? 'Apenas aparelhos podem ser encaminhados'
                                  : !produto.imei?.trim()
                                    ? 'Preencha o IMEI para habilitar'
                                    : 'Encaminhar para assistência'
                              }
                            >
                              <Wrench className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerProduto(index)}
                            disabled={produtos.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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

        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSalvarDraft}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            {hasDraft && (
              <Button variant="ghost" onClick={handleDescartarDraft} className="text-destructive">
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar Rascunho
              </Button>
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
      </div>

      {/* Modal de Encaminhamento para Assistência */}
      <Dialog open={modalAssistenciaAberto} onOpenChange={setModalAssistenciaAberto}>
        <DialogContent className="max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Encaminhar para Assistência
            </DialogTitle>
          </DialogHeader>

          {indiceProdutoAssistencia !== null && produtos[indiceProdutoAssistencia] && (
            <div className="space-y-4">
              {/* Info do aparelho */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-1 border border-border/30">
                <p className="text-sm"><span className="text-muted-foreground">Marca:</span> <span className="font-medium">{produtos[indiceProdutoAssistencia].marca}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Modelo:</span> <span className="font-medium">{produtos[indiceProdutoAssistencia].modelo}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">IMEI:</span> <span className="font-mono font-medium">{produtos[indiceProdutoAssistencia].imei ? formatIMEI(produtos[indiceProdutoAssistencia].imei) : 'Não informado'}</span></p>
              </div>

              {/* Data/hora e responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                  <p className="text-sm font-medium">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <p className="text-sm font-medium">{user?.colaborador?.nome || user?.username || 'Usuário'}</p>
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label htmlFor="motivo-assistencia">Motivo do encaminhamento *</Label>
                <Textarea
                  id="motivo-assistencia"
                  value={motivoAssistencia}
                  onChange={(e) => setMotivoAssistencia(e.target.value)}
                  placeholder="Descreva o motivo pelo qual este aparelho deve ser encaminhado para assistência..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Checkbox de confirmação */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <Checkbox
                  id="confirm-assist"
                  checked={confirmarAssistencia}
                  onCheckedChange={(checked) => setConfirmarAssistencia(checked as boolean)}
                  className="mt-1"
                />
                <Label htmlFor="confirm-assist" className="text-sm leading-tight cursor-pointer">
                  Confirmo que este aparelho apresenta defeito e deve ser encaminhado para Análise de Tratativas na Assistência
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalAssistenciaAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarEncaminhamento}
              disabled={!motivoAssistencia.trim() || !confirmarAssistencia}
              className="bg-orange-500 hover:bg-orange-600 text-white border-none"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Confirmar Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
